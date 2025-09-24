# ISL Announcements Table

## Overview
A new database table `isl_announcements` has been created specifically for storing ISL announcements generated from the "Generate ISL Announcement" page. This table is separate from the existing `general_announcements` table and provides more detailed tracking of video generation and user-specific data.

## Table Structure

### Core Fields
- `id` (INTEGER, PRIMARY KEY) - Unique identifier
- `announcement_name` (VARCHAR(255), NOT NULL) - Name of the announcement
- `category` (VARCHAR(100), NOT NULL) - Category of the announcement
- `model` (VARCHAR(20), NOT NULL) - AI model used ('male' or 'female')
- `user_id` (INTEGER, NOT NULL) - ID of the user who created the announcement

### Text Content Fields
- `announcement_text_english` (TEXT, NOT NULL) - English text content
- `announcement_text_hindi` (TEXT, NULL) - Hindi translation
- `announcement_text_gujarati` (TEXT, NULL) - Gujarati translation
- `announcement_text_marathi` (TEXT, NULL) - Marathi translation

### Video Information Fields
- `temp_video_id` (VARCHAR(100), NULL) - Temporary video ID during generation
- `preview_url` (VARCHAR(500), NULL) - Preview URL for temporary video
- `final_video_path` (VARCHAR(500), NULL) - Final saved video file path
- `final_video_url` (VARCHAR(500), NULL) - Final video URL for streaming
- `video_duration` (FLOAT, NULL) - Video duration in seconds
- `signs_used` (TEXT, NULL) - JSON string of signs used in video
- `signs_skipped` (TEXT, NULL) - JSON string of signs that were skipped
- `video_generation_status` (VARCHAR(50), NOT NULL) - Status: 'pending', 'generating', 'completed', 'failed'

### Status Fields
- `is_active` (BOOLEAN, NOT NULL, DEFAULT TRUE) - Whether announcement is active
- `is_saved` (BOOLEAN, NOT NULL, DEFAULT FALSE) - Whether video is saved permanently
- `created_at` (DATETIME, NOT NULL) - Creation timestamp
- `updated_at` (DATETIME, NOT NULL) - Last update timestamp

## API Endpoints

The new table is accessible through the following API endpoints:

### Base URL: `/api/v1/isl-announcements`

#### CRUD Operations
- `POST /` - Create new ISL announcement
- `GET /{announcement_id}` - Get specific announcement
- `GET /` - List announcements with filtering and pagination
- `PUT /{announcement_id}` - Update announcement
- `DELETE /{announcement_id}` - Delete announcement

#### Video Operations
- `PUT /{announcement_id}/video` - Update video information
- `POST /{announcement_id}/generate-video` - Generate ISL video
- `POST /{announcement_id}/save-video` - Save temporary video to permanent location

#### Statistics and User Data
- `GET /statistics/overview` - Get announcement statistics
- `GET /user/{user_id}` - Get announcements for specific user

## Key Features

### 1. Video Generation Tracking
- Tracks the complete lifecycle of video generation
- Stores temporary video IDs and preview URLs
- Records final video paths and URLs
- Tracks generation status and any errors

### 2. User-Specific Data
- Each announcement is associated with a user ID
- Supports filtering by user
- Tracks user-specific statistics

### 3. Multi-Language Support
- Stores text in multiple languages (English, Hindi, Gujarati, Marathi)
- Supports translation workflows

### 4. Detailed Video Metadata
- Stores video duration
- Records which signs were used and which were skipped
- Tracks video generation status

### 5. Flexible Status Management
- Active/inactive status for announcements
- Saved/unsaved status for videos
- Generation status tracking

## Usage Examples

### Creating an ISL Announcement
```python
announcement_data = ISLAnnouncementCreate(
    announcement_name="Safety Announcement",
    category="Safety",
    model="male",
    announcement_text_english="Please maintain social distancing",
    user_id=1
)
```

### Generating Video
```python
video_request = ISLAnnouncementVideoGenerationRequest(
    announcement_id=1,
    text="Please maintain social distancing",
    model="male",
    user_id=1
)
```

### Updating Video Information
```python
video_update = ISLAnnouncementVideoUpdate(
    temp_video_id="uuid-123",
    preview_url="/isl-video-generation/preview/uuid-123",
    video_duration=5.2,
    signs_used=["please", "maintain", "social", "distancing"],
    video_generation_status="completed"
)
```

## Migration

The table was created using the migration script `migrate_isl_announcements.py`. The script:
1. Creates the new table without affecting existing data
2. Verifies the table was created successfully
3. Provides detailed logging of the migration process

## Integration

The new table integrates with:
- ISL video generation endpoints
- User management system
- Translation services
- Video streaming endpoints

This provides a complete solution for managing ISL announcements generated from the frontend interface.
