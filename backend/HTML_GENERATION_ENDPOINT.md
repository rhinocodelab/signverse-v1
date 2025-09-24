# HTML Generation Endpoint for ISL Video Display

## Overview
A new backend endpoint that generates HTML pages for displaying ISL videos with synchronized text messages in multiple languages. Perfect for public announcement displays at railway stations.

## Features

### 🎥 Video Display
- **Full-screen video player** with ISL video content
- **Automatic looping** of video content
- **Responsive design** that works on any screen size
- **Error handling** for missing or corrupted video files

### 📝 Text Synchronization
- **Multi-language support**: English, Hindi, Marathi, Gujarati
- **Automatic text rotation** every 10 seconds (configurable)
- **Color-coded languages** for easy identification:
  - English: White (bold)
  - Hindi: Gold
  - Marathi: Green
  - Gujarati: Red
- **Smooth transitions** between text messages
- **Looping text display** synchronized with video

### 🎨 Visual Design
- **Full-screen display** (100vw x 100vh)
- **Black background** for professional appearance
- **Gradient overlay** for text readability
- **Modern typography** with Arial font family
- **Responsive layout** for different screen sizes

## API Endpoints

### POST `/api/v1/html-generation/generate-html`
Generates HTML page with ISL video and synchronized text messages.

**Request Body:**
```json
{
  "video_path": "uploads/isl-videos/user_1/video.mp4",
  "messages": [
    {
      "english": "Welcome to the station",
      "hindi": "स्टेशन में आपका स्वागत है",
      "marathi": "स्टेशनवर आपले स्वागत आहे",
      "gujarati": "સ્ટેશન પર આપનું સ્વાગત છે"
    },
    {
      "english": "Please maintain social distance",
      "hindi": "कृपया सामाजिक दूरी बनाए रखें",
      "marathi": "कृपया सामाजिक अंतर राखा",
      "gujarati": "કૃપા કરીને સામાજિક અંતર જાળવો"
    }
  ],
  "video_duration_seconds": 10,
  "loop_video": true,
  "loop_messages": true
}
```

**Response:**
```json
{
  "success": true,
  "html_path": "/var/www/html/index.html",
  "video_path": "/var/www/html/isl.mp4",
  "message": "HTML page generated successfully"
}
```

### GET `/api/v1/html-generation/html-status`
Checks if HTML page and video file exist in web root.

**Response:**
```json
{
  "html_exists": true,
  "video_exists": true,
  "html_path": "/var/www/html/index.html",
  "video_path": "/var/www/html/isl.mp4",
  "web_root": "/var/www/html"
}
```

## File Structure

### Generated Files
```
/var/www/html/
├── index.html          # Generated HTML page
└── isl.mp4            # Copied video file
```

### Source Files
```
backend/
├── app/schemas/html_generation.py           # Pydantic schemas
├── app/services/html_generation_service.py  # Business logic
└── app/api/v1/endpoints/html_generation.py # API endpoints
```

## HTML Page Features

### Video Player
```html
<video id="isl-video" autoplay muted loop>
    <source src="/isl.mp4" type="video/mp4">
    Your browser does not support the video tag.
</video>
```

### Text Display
```html
<div class="text-content active">
    <div class="language-text english">Welcome to the station</div>
    <div class="language-text hindi">स्टेशन में आपका स्वागत है</div>
    <div class="language-text marathi">स्टेशनवर आपले स्वागत आहे</div>
    <div class="language-text gujarati">સ્ટેશન પર આપનું સ્વાગત છે</div>
</div>
```

### JavaScript Synchronization
- **Automatic text rotation** every 10 seconds
- **Video event handling** for loading and errors
- **Smooth transitions** between messages
- **Loop management** for continuous display

## CSS Styling

### Layout
```css
body {
    margin: 0;
    padding: 0;
    background-color: #000;
    color: #fff;
    font-family: 'Arial', sans-serif;
    overflow: hidden;
}

.container {
    position: relative;
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
}
```

### Text Styling
```css
.english { font-weight: bold; font-size: 20px; color: #fff; }
.hindi { color: #ffd700; }
.marathi { color: #00ff00; }
.gujarati { color: #ff6b6b; }
```

## Usage Examples

### Basic Usage
```python
import requests

# Generate HTML page
response = requests.post('https://localhost:5001/api/v1/html-generation/generate-html', json={
    "video_path": "uploads/isl-videos/user_1/announcement.mp4",
    "messages": [
        {
            "english": "Train 12345 arriving at platform 2",
            "hindi": "ट्रेन 12345 प्लेटफॉर्म 2 पर आ रही है",
            "marathi": "ट्रेन 12345 प्लेटफॉर्म 2 वर येत आहे",
            "gujarati": "ટ્રેન 12345 પ્લેટફોર્મ 2 પર આવી રહી છે"
        }
    ]
})

if response.json()['success']:
    print("HTML page generated successfully!")
```

### Multiple Messages
```python
messages = [
    {
        "english": "Welcome to Mumbai Central",
        "hindi": "मुंबई सेंट्रल में आपका स्वागत है",
        "marathi": "मुंबई सेंट्रलवर आपले स्वागत आहे",
        "gujarati": "મુંબઈ સેન્ટ્રલ પર આપનું સ્વાગત છે"
    },
    {
        "english": "Please keep your belongings safe",
        "hindi": "कृपया अपने सामान को सुरक्षित रखें",
        "marathi": "कृपया आपले सामान सुरक्षित ठेवा",
        "gujarati": "કૃપા કરીને તમારા સામાનને સુરક્ષિત રાખો"
    }
]
```

## Testing Results

### Successful Generation
```
HTML Generation Test Results:
Success: True
HTML Path: /var/www/html/index.html
Video Path: /var/www/html/isl.mp4
Message: HTML page generated successfully
```

### File Verification
```bash
$ ls -la /var/www/html/
-rw-r--r-- 1 myuser myuser    5693 Sep 24 11:16 index.html
-rw-r--r-- 1 myuser myuser 1261779 Sep 24 10:17 isl.mp4
```

## Benefits

### For Railway Stations
- ✅ **Public Display Ready**: Full-screen display for announcement boards
- ✅ **Multi-language Support**: Serves diverse passenger base
- ✅ **Professional Appearance**: Clean, modern design
- ✅ **Automatic Looping**: Continuous display without manual intervention
- ✅ **Error Handling**: Graceful handling of missing files

### For Developers
- ✅ **Easy Integration**: Simple REST API
- ✅ **Flexible Configuration**: Customizable timing and content
- ✅ **File Management**: Automatic video copying and HTML generation
- ✅ **Status Monitoring**: Endpoint to check file existence
- ✅ **Error Reporting**: Detailed error messages for debugging

## Use Cases

1. **Railway Station Displays**: Show ISL announcements on public screens
2. **Accessibility**: Provide visual announcements for hearing-impaired passengers
3. **Multi-language Support**: Serve passengers in their preferred language
4. **Continuous Display**: Loop announcements for extended periods
5. **Remote Management**: Generate displays from central system

## Files Created

1. `backend/app/schemas/html_generation.py` - Request/response schemas
2. `backend/app/services/html_generation_service.py` - Business logic
3. `backend/app/api/v1/endpoints/html_generation.py` - API endpoints
4. `backend/app/api/v1/api.py` - Updated with new router

## Next Steps

1. **Web Server Setup**: Configure Apache/Nginx to serve from `/var/www/html/`
2. **Frontend Integration**: Add UI for generating HTML displays
3. **Scheduling**: Add support for scheduled announcements
4. **Monitoring**: Add health checks for display systems
5. **Customization**: Add themes and branding options

The HTML generation endpoint is now ready for production use! 🎉