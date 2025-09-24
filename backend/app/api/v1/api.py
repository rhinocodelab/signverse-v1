from fastapi import APIRouter
from app.api.v1.endpoints import health, auth, credentials, train_routes, train_route_translations, translation, isl_videos, isl_video_generation, language_detection, audio_translation, audio_upload, speech_to_isl, general_announcements, announcement_templates, train_announcements, live_announcements, html_generation, isl_announcements

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(
    credentials.router, prefix="/credentials", tags=["credentials"])
api_router.include_router(
    train_routes.router, prefix="/train-routes", tags=["train-routes"])
api_router.include_router(
    train_route_translations.router, prefix="/train-route-translations", tags=["train-route-translations"])
api_router.include_router(
    translation.router, prefix="/translation", tags=["translation"])
api_router.include_router(
    isl_videos.router, prefix="/isl-videos", tags=["isl-videos"])
api_router.include_router(
    isl_video_generation.router, prefix="/isl-video-generation", tags=["isl-video-generation"])
api_router.include_router(
    language_detection.router, prefix="/language-detection", tags=["language-detection"])
api_router.include_router(
    audio_translation.router, prefix="/audio-translation", tags=["audio-translation"])
api_router.include_router(
    audio_upload.router, prefix="/audio-upload", tags=["audio-upload"])
api_router.include_router(
    speech_to_isl.router, prefix="/speech-to-isl", tags=["speech-to-isl"])
api_router.include_router(
    general_announcements.router, prefix="/general-announcements", tags=["general-announcements"])
api_router.include_router(
    announcement_templates.router, prefix="/announcement-templates", tags=["announcement-templates"])
api_router.include_router(
    train_announcements.router, prefix="/train-announcements", tags=["train-announcements"])
api_router.include_router(
    live_announcements.router, prefix="/live-announcements", tags=["live-announcements"])
api_router.include_router(
    html_generation.router, prefix="/html-generation", tags=["html-generation"])
api_router.include_router(
    isl_announcements.router, prefix="/isl-announcements", tags=["isl-announcements"])
