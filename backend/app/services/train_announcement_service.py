import re
import logging
from typing import Optional, Dict, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.announcement_template import AnnouncementTemplateModel
from app.models.general_announcement import GeneralAnnouncement
from app.models.train_route_translation import TrainRouteTranslation
from app.schemas.train_announcement import (
    TrainAnnouncementRequest,
    TrainAnnouncementResponse,
    TemplateSubstitutionRequest,
    TemplateSubstitutionResponse
)
from app.schemas.general_announcement import GeneralAnnouncementCreate
from app.services.announcement_template_service import get_announcement_template_service
from app.services.general_announcement_service import get_general_announcement_service

logger = logging.getLogger(__name__)


class TrainAnnouncementService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.announcement_template_service = get_announcement_template_service(db)
        self.general_announcement_service = get_general_announcement_service(db)

    async def generate_train_announcement(
        self, 
        request: TrainAnnouncementRequest,
        save_to_general_announcements: bool = True
    ) -> TrainAnnouncementResponse:
        """
        Generate a complete train announcement with ISL video in multiple languages
        """
        try:
            logger.info(f"Generating train announcement for {request.train_number} - {request.train_name}")

            # Step 1: Get announcement template
            template = await self._get_announcement_template(request.announcement_category)
            if not template:
                return TrainAnnouncementResponse(
                    success=False,
                    error=f"No template found for category: {request.announcement_category}"
                )

            # Step 2: Get train route translations
            train_translations = await self._get_train_route_translations(request.train_number)
            
            # Step 3: Generate announcements in all languages
            english_text = self._substitute_template_placeholders(
                template.template_text_english,
                request.train_number,
                request.train_name,
                request.from_station_name,
                request.to_station_name,
                request.platform,
                train_translations
            )

            hindi_text = None
            marathi_text = None
            gujarati_text = None

            if template.template_text_hindi and train_translations:
                hindi_text = self._substitute_template_placeholders(
                    template.template_text_hindi,
                    request.train_number,
                    train_translations.get('train_name_hi', request.train_name),
                    train_translations.get('from_station_name_hi', request.from_station_name),
                    train_translations.get('to_station_name_hi', request.to_station_name),
                    request.platform,
                    train_translations
                )

            if template.template_text_marathi and train_translations:
                marathi_text = self._substitute_template_placeholders(
                    template.template_text_marathi,
                    request.train_number,
                    train_translations.get('train_name_mr', request.train_name),
                    train_translations.get('from_station_name_mr', request.from_station_name),
                    train_translations.get('to_station_name_mr', request.to_station_name),
                    request.platform,
                    train_translations
                )

            if template.template_text_gujarati and train_translations:
                gujarati_text = self._substitute_template_placeholders(
                    template.template_text_gujarati,
                    request.train_number,
                    train_translations.get('train_name_gu', request.train_name),
                    train_translations.get('from_station_name_gu', request.from_station_name),
                    train_translations.get('to_station_name_gu', request.to_station_name),
                    request.platform,
                    train_translations
                )

            # Step 4: Create announcement name
            announcement_name = f"{request.train_number} {request.train_name} - {request.announcement_category}"

            # Step 5: Create general announcement record (only if requested)
            announcement = None
            if save_to_general_announcements:
                announcement_data = GeneralAnnouncementCreate(
                    announcement_name=announcement_name,
                    category=request.announcement_category,
                    model=request.model,
                    announcement_text_english=english_text,
                    announcement_text_hindi=hindi_text,
                    announcement_text_gujarati=gujarati_text,
                    announcement_text_marathi=marathi_text
                )

                # Create the announcement record
                announcement = await self.general_announcement_service.create_announcement(announcement_data)
                if not announcement:
                    return TrainAnnouncementResponse(
                        success=False,
                        error="Failed to create announcement record"
                    )

                logger.info(f"Created announcement record with ID: {announcement.id}")
            else:
                logger.info("Skipping general announcement creation for live announcement")

            # Step 6: Generate ISL video
            try:
                from app.api.v1.endpoints.isl_video_generation import generate_isl_video, VideoGenerationRequest
                
                video_request = VideoGenerationRequest(
                    text=english_text,
                    model=request.model,
                    user_id=request.user_id
                )
                
                announcement_id = announcement.id if announcement else None
                logger.info(f"Generating ISL video for announcement {announcement_id}")
                video_response = await generate_isl_video(video_request)
                
                if video_response.success:
                    logger.info(f"ISL video generated successfully: {video_response.temp_video_id}")
                    
                    # Update the announcement with the video path if we have an announcement record
                    if announcement and video_response.preview_url:
                        try:
                            await self.general_announcement_service.update_video_path(
                                announcement.id, 
                                video_response.preview_url
                            )
                            logger.info(f"Updated announcement {announcement.id} with video path: {video_response.preview_url}")
                        except Exception as update_error:
                            logger.error(f"Failed to update video path for announcement {announcement.id}: {str(update_error)}")
                    
                    return TrainAnnouncementResponse(
                        success=True,
                        announcement_id=announcement_id,
                        announcement_name=announcement_name,
                        generated_text=english_text,
                        generated_text_hindi=hindi_text,
                        generated_text_marathi=marathi_text,
                        generated_text_gujarati=gujarati_text,
                        temp_video_id=video_response.temp_video_id,
                        preview_url=video_response.preview_url,
                        signs_used=video_response.signs_used,
                        signs_skipped=video_response.signs_skipped,
                        error=None
                    )
                else:
                    logger.error(f"ISL video generation failed: {video_response.error}")
                    return TrainAnnouncementResponse(
                        success=True,
                        announcement_id=announcement_id,
                        announcement_name=announcement_name,
                        generated_text=english_text,
                        generated_text_hindi=hindi_text,
                        generated_text_marathi=marathi_text,
                        generated_text_gujarati=gujarati_text,
                        error=f"Announcement created but video generation failed: {video_response.error}"
                    )
                    
            except Exception as video_error:
                logger.error(f"Exception during ISL video generation: {str(video_error)}")
                return TrainAnnouncementResponse(
                    success=True,
                    announcement_id=announcement.id,
                    announcement_name=announcement_name,
                    generated_text=english_text,
                    generated_text_hindi=hindi_text,
                    generated_text_marathi=marathi_text,
                    generated_text_gujarati=gujarati_text,
                    error=f"Announcement created but video generation failed: {str(video_error)}"
                )

        except Exception as e:
            logger.error(f"Error generating train announcement: {str(e)}")
            return TrainAnnouncementResponse(
                success=False,
                error=f"Internal error: {str(e)}"
            )

    async def _get_announcement_template(self, category: str) -> Optional[AnnouncementTemplateModel]:
        """
        Get announcement template by category
        """
        try:
            result = await self.db.execute(
                select(AnnouncementTemplateModel).where(
                    AnnouncementTemplateModel.template_category == category
                )
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching template for category {category}: {str(e)}")
            return None

    async def _get_train_route_translations(self, train_number: str) -> Optional[Dict[str, str]]:
        """
        Get train route translations by train number
        """
        try:
            # First get the train route by train number
            from app.models.train_route import TrainRoute
            train_route_result = await self.db.execute(
                select(TrainRoute).where(TrainRoute.train_number == train_number)
            )
            train_route = train_route_result.scalar_one_or_none()
            
            if not train_route:
                logger.warning(f"Train route not found for train number: {train_number}")
                return None

            # Get translations for this train route
            translation_result = await self.db.execute(
                select(TrainRouteTranslation).where(
                    TrainRouteTranslation.train_route_id == train_route.id
                )
            )
            translation = translation_result.scalar_one_or_none()
            
            if not translation:
                logger.warning(f"No translations found for train route: {train_number}")
                return None

            # Return translations as dictionary
            return {
                'train_name_hi': translation.train_name_hi,
                'from_station_name_hi': translation.from_station_name_hi,
                'to_station_name_hi': translation.to_station_name_hi,
                'train_name_mr': translation.train_name_mr,
                'from_station_name_mr': translation.from_station_name_mr,
                'to_station_name_mr': translation.to_station_name_mr,
                'train_name_gu': translation.train_name_gu,
                'from_station_name_gu': translation.from_station_name_gu,
                'to_station_name_gu': translation.to_station_name_gu,
            }
        except Exception as e:
            logger.error(f"Error fetching train route translations for {train_number}: {str(e)}")
            return None

    def _substitute_template_placeholders(
        self,
        template_text: str,
        train_number: str,
        train_name: str,
        from_station: str,
        to_station: str,
        platform: int,
        translations: Optional[Dict[str, str]] = None
    ) -> str:
        """
        Substitute placeholders in template text with actual train data
        """
        try:
            # Define placeholder mappings
            placeholders = {
                '{train_number}': train_number,
                '{train_name}': train_name,
                '{from_station}': from_station,
                '{to_station}': to_station,
                '{from_station_name}': from_station,  # Alternative naming
                '{to_station_name}': to_station,      # Alternative naming
                '{start_station}': from_station,      # Alternative naming used in existing templates
                '{end_station}': to_station,          # Alternative naming used in existing templates
                '{platform}': str(platform),
            }

            # Find all placeholders in the template
            placeholder_pattern = r'\{[^}]+\}'
            found_placeholders = re.findall(placeholder_pattern, template_text)
            
            # Substitute placeholders
            substituted_text = template_text
            
            for placeholder in found_placeholders:
                if placeholder in placeholders:
                    substituted_text = substituted_text.replace(placeholder, placeholders[placeholder])
                else:
                    logger.warning(f"Unknown placeholder found: {placeholder}")

            return substituted_text

        except Exception as e:
            logger.error(f"Error substituting template placeholders: {str(e)}")
            return template_text  # Return original text if substitution fails

    async def get_available_categories(self) -> List[str]:
        """
        Get all available announcement categories
        """
        try:
            return await self.announcement_template_service.get_categories()
        except Exception as e:
            logger.error(f"Error fetching categories: {str(e)}")
            return []


def get_train_announcement_service(db: AsyncSession) -> TrainAnnouncementService:
    return TrainAnnouncementService(db)