from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, select
from typing import List, Optional
import os
import subprocess
import asyncio
from pathlib import Path

from app.db.database import get_db
from app.schemas.isl_video import (
    ISLVideo, ISLVideoCreate, ISLVideoUpdate, ISLVideoSearch, ISLVideoListResponse,
    ISLVideoStatistics, DuplicateCheckRequest, DuplicateCheckResponse,
    UploadResponse, SyncRequest, SyncResponse
)
from app.models.isl_video import ISLVideo as ISLVideoModel
from app.services.isl_video_service import get_isl_video_service, ISLVideoService

router = APIRouter()


def get_public_videos_path():
    """Get the public videos directory path"""
    # Use relative path from current working directory (backend)
    # Go up one level to signverse, then to frontend/public/videos/isl
    return Path("../frontend/public/videos/isl").resolve()


@router.get("/test")
def test_endpoint():
    """Test endpoint to verify the router is working"""
    return {"message": "ISL videos endpoint is working"}


def get_video_duration(video_path: str) -> float:
    """Get video duration using ffprobe"""
    try:
        cmd = [
            "ffprobe", "-v", "quiet", "-show_entries", "format=duration",
            "-of", "csv=p=0", video_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            return float(result.stdout.strip())
    except Exception:
        pass
    return 0.0


async def process_video_async(video_id: int, input_path: str, output_folder: str):
    """Background video processing with FFmpeg"""
    from app.db.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        try:
            # Generate output filename
            filename = os.path.basename(input_path)
            name_without_ext = os.path.splitext(filename)[0]
            output_filename = f"{name_without_ext}_processed.mp4"
            output_path = f"{output_folder}/{output_filename}"

            # FFmpeg command
            cmd = [
                "ffmpeg", "-i", input_path,
                "-vf", "fps=30:round=up,scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2",
                "-c:v", "libx264", "-preset", "fast", "-crf", "23",
                "-an", "-movflags", "+faststart", "-pix_fmt", "yuv420p",
                output_path, "-y"
            ]

            # Execute FFmpeg
            result = subprocess.run(cmd, capture_output=True, text=True)

            if result.returncode == 0:
                # Get video metadata
                duration = get_video_duration(output_path)
                file_size = os.path.getsize(output_path)

                # Remove original file
                if os.path.exists(input_path):
                    os.remove(input_path)

                # Rename processed file to original filename
                original_filename = os.path.basename(input_path)
                final_path = f"{output_folder}/{original_filename}"
                os.rename(output_path, final_path)

                # Update database with processed video info
                video_service = get_isl_video_service(db)
                update_data = ISLVideoUpdate(
                    video_path=final_path,
                    file_size=file_size,
                    duration_seconds=duration
                )
                await video_service.update_isl_video(video_id, update_data)

                print(f"✅ Video {video_id} processed successfully")

            else:
                # Handle processing error
                video_service = get_isl_video_service(db)
                update_data = ISLVideoUpdate(is_active=False)
                await video_service.update_isl_video(video_id, update_data)
                print(
                    f"❌ FFmpeg processing failed for video {video_id}: {result.stderr}")

        except Exception as e:
            print(f"❌ Error processing video {video_id}: {e}")
            # Mark as failed in database
            try:
                video_service = get_isl_video_service(db)
                update_data = ISLVideoUpdate(is_active=False)
                await video_service.update_isl_video(video_id, update_data)
            except:
                pass


@router.post("/check-duplicate", response_model=DuplicateCheckResponse)
async def check_duplicate_video(
    request: DuplicateCheckRequest,
    db: AsyncSession = Depends(get_db)
):
    """Check if a video with the same filename/display_name already exists"""

    video_service = get_isl_video_service(db)

    # Check for exact duplicates
    if request.file_size:
        duplicate_video = await video_service.check_duplicate_video(
            request.filename, request.model_type, request.file_size
        )
        if duplicate_video:
            return DuplicateCheckResponse(
                is_duplicate=True,
                duplicate_type="exact_match",
                duplicate_video=duplicate_video
            )

    # Check for display name duplicates
    if request.display_name:
        display_name_duplicate = await video_service.check_duplicate_by_display_name(
            request.display_name, request.model_type
        )
        if display_name_duplicate:
            return DuplicateCheckResponse(
                is_duplicate=True,
                duplicate_type="display_name_match",
                duplicate_video=display_name_duplicate
            )

    return DuplicateCheckResponse(
        is_duplicate=False,
        duplicate_type=None,
        duplicate_video=None
    )


@router.post("/upload", response_model=UploadResponse)
async def upload_isl_video(
    file: UploadFile = File(...),
    model_type: str = Form(...),
    display_name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db)
):
    """Upload ISL video with automatic folder creation and processing"""

    # Validate file type
    if not file.filename or not file.filename.lower().endswith('.mp4'):
        raise HTTPException(
            status_code=400, detail="Only MP4 files are allowed")

    # Validate model type
    if model_type not in ['male', 'female']:
        raise HTTPException(
            status_code=400, detail="Model type must be 'male' or 'female'")

    # Extract folder name from filename
    filename = file.filename
    folder_name = os.path.splitext(filename)[0]  # Remove .mp4 extension

    # Check for duplicates before processing
    video_service = get_isl_video_service(db)

    # Read file content to get file size
    content = await file.read()
    file_size = len(content)

    # Check for duplicates but allow upload to continue
    duplicate_warnings = []

    # Check for exact duplicates
    duplicate_video = await video_service.check_duplicate_video(filename, model_type, file_size)
    if duplicate_video:
        duplicate_warnings.append({
            "type": "exact_match",
            "message": f"Exact duplicate found: '{filename}' with same file size",
            "duplicate_video": {
                "id": duplicate_video.id,
                "filename": duplicate_video.filename,
                "display_name": duplicate_video.display_name,
                "file_size": duplicate_video.file_size,
                "created_at": duplicate_video.created_at.isoformat() if duplicate_video.created_at else None
            }
        })

    # Check for potential duplicates (same display name)
    final_display_name = display_name or folder_name
    display_name_duplicate = await video_service.check_duplicate_by_display_name(final_display_name, model_type)
    if display_name_duplicate and display_name_duplicate != duplicate_video:
        duplicate_warnings.append({
            "type": "display_name_match",
            "message": f"Display name duplicate found: '{final_display_name}'",
            "duplicate_video": {
                "id": display_name_duplicate.id,
                "filename": display_name_duplicate.filename,
                "display_name": display_name_duplicate.display_name,
                "file_size": display_name_duplicate.file_size,
                "created_at": display_name_duplicate.created_at.isoformat() if display_name_duplicate.created_at else None
            }
        })

    # Create directory structure in public folder
    base_path = get_public_videos_path()
    model_path = base_path / f"{model_type}-model"
    video_folder = model_path / folder_name

    # Create folder
    os.makedirs(str(video_folder), exist_ok=True)

    # Check if file already exists and get existing video record
    original_path = video_folder / filename
    path_str = str(original_path)
    result = await db.execute(select(ISLVideoModel).where(ISLVideoModel.video_path == path_str))
    existing_video = result.scalar_one_or_none()

    try:
        with open(str(original_path), "wb") as buffer:
            buffer.write(content)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to save file: {str(e)}")

    # Create or update database record
    video_service = get_isl_video_service(db)

    if existing_video:
        # Update existing record
        update_data = ISLVideoUpdate(
            filename=filename,
            display_name=display_name or folder_name,
            file_size=len(content),
            model_type=model_type,
            mime_type="video/mp4",
            file_extension="mp4",
            description=description,
            tags=tags
        )
        db_video = await video_service.update_isl_video(existing_video.id, update_data)

        # Add replacement info to duplicate warnings
        if duplicate_warnings:
            duplicate_warnings.append({
                "type": "file_replaced",
                "message": f"Existing file '{filename}' was replaced with new version",
                "replaced_video": {
                    "id": existing_video.id,
                    "filename": existing_video.filename,
                    "display_name": existing_video.display_name,
                    "file_size": existing_video.file_size,
                    "created_at": existing_video.created_at.isoformat() if existing_video.created_at else None
                }
            })
    else:
        # Create new record
        video_data = ISLVideoCreate(
            filename=filename,
            display_name=display_name or folder_name,
            video_path=str(original_path),
            file_size=len(content),
            model_type=model_type,
            mime_type="video/mp4",
            file_extension="mp4",
            description=description,
            tags=tags
        )
        db_video = await video_service.create_isl_video(video_data)

    # Start background processing
    asyncio.create_task(process_video_async(
        db_video.id, str(original_path), str(video_folder)))

    return UploadResponse(
        message="Video uploaded successfully",
        video_id=db_video.id,
        processing_status="processing",
        duplicate_warnings=duplicate_warnings if duplicate_warnings else None,
        file_replaced=existing_video is not None
    )


@router.get("/", response_model=ISLVideoListResponse)
async def get_isl_videos(
    model_type: Optional[str] = Query(
        None, description="Filter by model type (male/female)"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(12, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search term"),
    db: AsyncSession = Depends(get_db)
):
    """Get ISL videos with pagination and filtering"""

    try:
        print(
            f"Getting videos with model_type={model_type}, page={page}, limit={limit}, search={search}")
        video_service = get_isl_video_service(db)
        print("Video service created successfully")

        # Create search parameters
        search_params = ISLVideoSearch(
            model_type=model_type,
            search_text=search,
            limit=limit,
            offset=(page - 1) * limit
        )

        # Get videos
        print("Search parameters created successfully")
        videos = await video_service.search_isl_videos(search_params)
        print(f"Found {len(videos)} videos")

        # Get total count for pagination
        total_search_params = ISLVideoSearch(
            model_type=model_type,
            search_text=search,
            limit=100,  # Use maximum allowed limit
            offset=0
        )
        total_videos_list = await video_service.search_isl_videos(total_search_params)
        total_videos = len(total_videos_list)
        print(f"Total videos: {total_videos}")

        return ISLVideoListResponse(
            videos=videos,
            total=total_videos,
            page=page,
            limit=limit,
            total_pages=(total_videos + limit - 1) // limit
        )
    except Exception as e:
        print(f"Error in get_isl_videos: {e}")
        raise HTTPException(
            status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{video_id}", response_model=ISLVideo)
async def get_isl_video(
    video_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific ISL video by ID"""

    video_service = get_isl_video_service(db)
    video = await video_service.get_isl_video(video_id)

    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    return video


@router.put("/{video_id}", response_model=ISLVideo)
async def update_isl_video(
    video_id: int,
    video_update: ISLVideoUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update ISL video metadata"""

    video_service = get_isl_video_service(db)
    video = await video_service.update_isl_video(video_id, video_update)

    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    return video


@router.delete("/{video_id}")
async def delete_isl_video(
    video_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete ISL video (soft delete and remove file)"""

    video_service = get_isl_video_service(db)
    success = await video_service.delete_isl_video(video_id)

    if not success:
        raise HTTPException(status_code=404, detail="Video not found")

    return {"message": "Video deleted successfully"}


@router.delete("/{video_id}/permanent")
async def permanently_delete_isl_video(
    video_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Permanently delete ISL video (hard delete)"""

    video_service = get_isl_video_service(db)
    success = await video_service.hard_delete_isl_video(video_id)

    if not success:
        raise HTTPException(status_code=404, detail="Video not found")

    return {"message": "Video permanently deleted"}


@router.get("/statistics/summary", response_model=ISLVideoStatistics)
async def get_video_statistics(db: AsyncSession = Depends(get_db)):
    """Get ISL video statistics"""

    video_service = get_isl_video_service(db)
    stats = await video_service.get_video_statistics()

    return stats


@router.options("/{video_id}/stream")
def stream_video_options(video_id: int):
    """Handle preflight requests for video streaming"""
    return {"message": "OK"}


@router.get("/{video_id}/stream")
async def stream_video(video_id: int, db: AsyncSession = Depends(get_db)):
    """Stream video file"""
    try:
        video_service = get_isl_video_service(db)
        video = await video_service.get_isl_video(video_id)

        if not video:
            raise HTTPException(status_code=404, detail="Video not found")

        # Dynamically resolve the video path instead of using stored path
        public_videos_path = get_public_videos_path()
        
        # Extract the relative path from the stored path
        # e.g., "/home/funix/Projects/SignVerse/frontend/public/videos/isl/female-model/please/please.mp4"
        # becomes "female-model/please/please.mp4"
        stored_path = video.video_path
        if "/videos/isl/" in stored_path:
            relative_path = stored_path.split("/videos/isl/")[-1]
        else:
            # Fallback: use filename if path structure is different
            relative_path = f"{video.model_type}-model/{video.filename}"
        
        # Construct the actual file path
        actual_video_path = public_videos_path / relative_path
        
        # Check if the video file exists
        if not os.path.exists(actual_video_path):
            raise HTTPException(
                status_code=404, detail=f"Video file not found at: {actual_video_path}")

        def iterfile():
            try:
                with open(actual_video_path, mode="rb") as file_like:
                    yield from file_like
            except Exception as e:
                print(f"Error reading file: {e}")
                raise

        return StreamingResponse(
            iterfile(),
            media_type="video/mp4",
            headers={
                "Accept-Ranges": "bytes",
                "Content-Disposition": f"inline; filename={video.filename}",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges"
            }
        )
    except Exception as e:
        print(f"Error in stream_video: {e}")
        raise HTTPException(
            status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/sync", response_model=SyncResponse)
async def sync_isl_videos(
    model_type: str = Form(...),
    force_reprocess: str = Form("false"),
    db: AsyncSession = Depends(get_db)
):
    """
    Sync ISL videos from file system with database
    Scans the public/videos/isl/{model_type}-model folders
    and processes any new or updated videos
    """
    try:
        # Convert string to boolean
        force_reprocess_bool = force_reprocess.lower() in ('true', '1', 'yes', 'on')
        # Get the public videos path
        base_path = get_public_videos_path()
        model_path = base_path / f"{model_type}-model"

        print(f"🔍 Sync Debug - Base path: {base_path}")
        print(f"🔍 Sync Debug - Model path: {model_path}")
        print(f"🔍 Sync Debug - Model path exists: {model_path.exists()}")

        if not model_path.exists():
            return SyncResponse(
                success=False,
                message=f"Model path does not exist: {model_path}",
                processed=0,
                errors=[]
            )

        # Scan folders
        folders_to_process = []
        all_folders = list(model_path.iterdir())
        print(f"🔍 Sync Debug - Found {len(all_folders)} items in model path")

        for folder in all_folders:
            print(
                f"🔍 Sync Debug - Checking item: {folder.name} (is_dir: {folder.is_dir()})")
            if folder.is_dir():
                # Check if folder name matches expected pattern
                expected_video_file = folder / f"{folder.name}.mp4"
                print(
                    f"🔍 Sync Debug - Expected video file: {expected_video_file} (exists: {expected_video_file.exists()})")
                if expected_video_file.exists():
                    folders_to_process.append({
                        "folder_name": folder.name,
                        "folder_path": str(folder),
                        "video_path": str(expected_video_file)
                    })
                    print(
                        f"✅ Sync Debug - Added folder to process: {folder.name}")

        print(
            f"🔍 Sync Debug - Total folders to process: {len(folders_to_process)}")

        if not folders_to_process:
            return SyncResponse(
                success=True,
                message=f"No valid video folders found in {model_path}",
                processed=0,
                errors=[]
            )

        # Process each folder
        processed_count = 0
        errors = []
        video_service = get_isl_video_service(db)

        for folder_info in folders_to_process:
            try:
                folder_name = folder_info["folder_name"]
                video_path = folder_info["video_path"]

                print(f"🔍 Sync Debug - Processing folder: {folder_name}")
                print(f"🔍 Sync Debug - Video path: {video_path}")

                # Check if video already exists in database using proper duplicate check
                filename = f"{folder_name}.mp4"
                file_size = os.path.getsize(video_path)
                existing_video = await video_service.check_duplicate_video(filename, model_type, file_size)

                print(
                    f"🔍 Sync Debug - Existing video found: {existing_video is not None}")
                print(
                    f"🔍 Sync Debug - Force reprocess: {force_reprocess_bool}")

                # Skip if exists and not forcing reprocess
                if existing_video and not force_reprocess_bool:
                    print(
                        f"⏭️ Sync Debug - Skipping {folder_name} (already exists)")
                    continue

                # File info already retrieved above

                # Create or update video record
                if existing_video:
                    # Update existing record
                    update_data = ISLVideoUpdate(
                        file_size=file_size
                    )
                    await video_service.update_isl_video(existing_video.id, update_data)
                    video_id = existing_video.id
                else:
                    # Create new record
                    video_data = ISLVideoCreate(
                        filename=filename,
                        display_name=folder_name,
                        video_path=video_path,
                        file_size=file_size,
                        model_type=model_type,
                        mime_type="video/mp4",
                        file_extension="mp4"
                    )
                    new_video = await video_service.create_isl_video(video_data)
                    video_id = new_video.id

                # Process video with ffmpeg (async)
                asyncio.create_task(process_video_async(
                    video_id, video_path, folder_info["folder_path"]))
                processed_count += 1

            except Exception as e:
                error_msg = f"Error processing {folder_info['folder_name']}: {str(e)}"
                errors.append(error_msg)
                print(f"❌ {error_msg}")

        return SyncResponse(
            success=True,
            message=f"Sync completed. Processed {processed_count} videos.",
            processed=processed_count,
            errors=errors,
            total_folders=len(folders_to_process)
        )

    except Exception as e:
        print(f"❌ Sync error: {e}")
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")
