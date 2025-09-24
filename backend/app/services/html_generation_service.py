import os
import shutil
import logging
from pathlib import Path
from typing import Dict, Any
from app.schemas.html_generation import SimpleHTMLGenerationRequest, HTMLGenerationResponse

logger = logging.getLogger(__name__)


class HTMLGenerationService:
    def __init__(self):
        self.web_root = Path("/var/www/html")
        self.video_filename = "isl.mp4"
        self.html_filename = "index.html"
    
    async def generate_html_page(self, request: SimpleHTMLGenerationRequest) -> HTMLGenerationResponse:
        """Generate HTML page with ISL video"""
        try:
            # Ensure web root directory exists
            self.web_root.mkdir(parents=True, exist_ok=True)
            
            # Copy video file to web root
            video_copied = await self._copy_video_file(request.video_path)
            if not video_copied:
                return HTMLGenerationResponse(
                    success=False,
                    message="Failed to copy video file",
                    error="Video file not found or could not be copied"
                )
            
            # Generate HTML content
            html_content = self._generate_html_content()
            
            # Write HTML file
            html_path = self.web_root / self.html_filename
            with open(html_path, 'w', encoding='utf-8') as f:
                f.write(html_content)
            
            logger.info(f"HTML page generated successfully at {html_path}")
            
            return HTMLGenerationResponse(
                success=True,
                html_path=str(html_path),
                video_path=str(self.web_root / self.video_filename),
                message="HTML page generated successfully"
            )
            
        except Exception as e:
            logger.error(f"Failed to generate HTML page: {str(e)}")
            return HTMLGenerationResponse(
                success=False,
                message="Failed to generate HTML page",
                error=str(e)
            )
    
    async def _copy_video_file(self, source_path: str) -> bool:
        """Copy video file to web root directory"""
        try:
            source_file = Path(source_path)
            if not source_file.exists():
                logger.error(f"Source video file not found: {source_path}")
                return False
            
            destination = self.web_root / self.video_filename
            
            # Copy the file
            shutil.copy2(source_file, destination)
            logger.info(f"Video file copied from {source_path} to {destination}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to copy video file: {str(e)}")
            return False
    
    def _generate_html_content(self) -> str:
        """Generate HTML content with responsive video player"""
        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ISL Announcement Display</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            background-color: #000;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            font-family: Arial, sans-serif;
        }}
        
        .video-container {{
            position: relative;
            width: 100%;
            max-width: 1200px;
            height: auto;
            background-color: #000;
        }}
        
        .video-container video {{
            width: 100%;
            height: auto;
            display: block;
            object-fit: contain;
        }}
        
        /* Responsive design */
        @media (max-width: 768px) {{
            .video-container {{
                max-width: 100%;
                padding: 10px;
            }}
        }}
        
        @media (max-width: 480px) {{
            .video-container {{
                padding: 5px;
            }}
        }}
        
        /* Loading indicator */
        .loading {{
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-size: 18px;
            z-index: 10;
        }}
        
        .loading.hidden {{
            display: none;
        }}
    </style>
</head>
<body>
    <div class="video-container">
        <div class="loading" id="loading">Loading video...</div>
        <video 
            id="islVideo" 
            autoplay 
            muted 
            loop 
            playsinline
            onloadstart="hideLoading()"
            oncanplay="hideLoading()"
        >
            <source src="{self.video_filename}" type="video/mp4">
            Your browser does not support the video tag.
        </video>
    </div>

    <script>
        function hideLoading() {{
            const loading = document.getElementById('loading');
            if (loading) {{
                loading.classList.add('hidden');
            }}
        }}
        
        // Ensure video plays automatically
        document.addEventListener('DOMContentLoaded', function() {{
            const video = document.getElementById('islVideo');
            if (video) {{
                video.play().catch(function(error) {{
                    console.log('Autoplay failed:', error);
                    // Try to play again after user interaction
                    document.addEventListener('click', function() {{
                        video.play();
                    }}, {{ once: true }});
                }});
            }}
        }});
        
        // Handle video errors
        document.getElementById('islVideo').addEventListener('error', function(e) {{
            console.error('Video error:', e);
            document.getElementById('loading').textContent = 'Error loading video';
        }});
    </script>
</body>
</html>"""
        
        return html_content


def get_html_generation_service() -> HTMLGenerationService:
    """Get HTML generation service instance"""
    return HTMLGenerationService()