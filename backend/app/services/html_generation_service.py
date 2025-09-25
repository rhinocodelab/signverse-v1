import os
import shutil
import logging
import json
from pathlib import Path
from typing import Dict, Any, List
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
            
            # Generate HTML content with playback speed and text options
            html_content = self._generate_html_content(
                request.playback_speed, 
                request.show_text, 
                request.text_messages
            )
            
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
    
    def _generate_html_content(self, playback_speed: float = 1.0, show_text: bool = True, text_messages: List[Dict[str, str]] = None) -> str:
        """Generate HTML content with responsive video player and specified playback speed"""
        
        logger.info(f"Generating HTML with show_text={show_text}, text_messages={text_messages}")
        
        # Generate text section HTML if show_text is True and messages exist
        text_section_html = ""
        text_script = ""
        text_css = ""
        
        if show_text and text_messages:
            logger.info(f"Processing {len(text_messages)} text messages")
            # Filter out empty messages and create text display
            available_messages = []
            for message in text_messages:
                filtered_message = {k: v for k, v in message.items() if v and v.strip()}
                if filtered_message:
                    available_messages.append(filtered_message)
                    logger.info(f"Added message with languages: {list(filtered_message.keys())}")
            
            logger.info(f"Total available messages: {len(available_messages)}")
            if available_messages:
                text_section_html = f"""
    <footer class="footer">
        <div class="footer-text-container">
            <div class="footer-text-content active" id="textContent">
                <!-- Text will be populated by JavaScript -->
            </div>
        </div>
    </footer>"""
                
                # Generate CSS for text section
                text_css = """
        .footer {
            width: 100%;
            background-color: #000;
            padding: 10px 20px;
            border-top: 2px solid #333;
            height: 120px;
            overflow: hidden;
        }
        
        .footer {
            width: 100%;
            
            text-align: center;
            height: 100%;
        }
        
        .footer-text-content {
            width: 100%;
            min-height: 60px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: opacity 0.5s ease-in-out;
        }
        
        .language-text {
            font-size: 20px;
            font-weight: bold;
            line-height: 1.2;
            text-align: center;
            padding: 5px;
            max-height: 90px;
            overflow: hidden;
            opacity: 0;
            transition: opacity 1s ease-in-out;
        }
        
        .language-text.active {
            opacity: 1;
        }
        
        .footer-text-content .language-text {
            opacity: 1;
        }
        
        .language-text.english {
            font-weight: bold;
            color: #ffffff;
        }
        
        .language-text.hindi {
            color: #ffd700;
        }
        
        .language-text.marathi {
            color: #00ff00;
        }
        
        .language-text.gujarati {
            color: #ff6b6b;
        }
        
        /* Responsive design for text */
        @media (max-width: 768px) {
            .footer {
                width: 100%;
            min-height: 60px;
                padding: 8px 15px;
            }
            
            .footer-text-content {
                height: 80px;
            }
            
            .language-text {
                font-size: 18px;
                max-height: 70px;
            }
        }
        
        @media (max-width: 480px) {
            .footer {
                height: 80px;
                padding: 5px 10px;
            }
            
            .footer-text-content {
                height: 60px;
            }
            
            .language-text {
                font-size: 16px;
                max-height: 50px;
            }
        }"""
                
                # Create JavaScript for text rotation
                # Properly escape the messages for JavaScript
                messages_json = json.dumps(available_messages, ensure_ascii=False)
                text_script = f"""
        // Text rotation functionality
        const textMessages = {messages_json};
        let currentMessageIndex = 0;
        let currentLanguageIndex = 0;
        const languages = ['english', 'hindi', 'marathi', 'gujarati'];
        const languageColors = {{
            'english': '#ffffff',
            'hindi': '#ffd700',
            'marathi': '#00ff00',
            'gujarati': '#ff6b6b'
        }};
        
        function displayCurrentText() {{
            if (textMessages.length === 0) return;
            
            const currentMessage = textMessages[currentMessageIndex];
            const currentLanguage = languages[currentLanguageIndex];
            const textElement = document.getElementById('textContent');
            
            if (currentMessage[currentLanguage]) {{
                // Create the new text element
                const newTextElement = document.createElement('div');
                newTextElement.className = `language-text ${{currentLanguage}}`;
                newTextElement.style.color = languageColors[currentLanguage];
                newTextElement.textContent = currentMessage[currentLanguage];
                
                // Add fade effect by removing the active class before replacing the text
                const currentTextElement = textElement.querySelector('.language-text');
                if (currentTextElement) {{
                    currentTextElement.classList.remove('active');
                    
                    // Wait for fade-out to complete before switching text
                    setTimeout(() => {{
                        textElement.innerHTML = '';
                        textElement.appendChild(newTextElement);
                        
                        // Make text visible again
                        setTimeout(() => {{
                            newTextElement.classList.add('active');
                        }}, 50);
                    }}, 500); // Fade-out time (in ms)
                }} else {{
                    // First time - just add the text
                    textElement.appendChild(newTextElement);
                    setTimeout(() => {{
                        newTextElement.classList.add('active');
                    }}, 50);
                }}
            }} else {{
                // Find next available language for this message
                let nextLanguageIndex = (currentLanguageIndex + 1) % languages.length;
                let attempts = 0;
                while (!currentMessage[languages[nextLanguageIndex]] && attempts < languages.length) {{
                    nextLanguageIndex = (nextLanguageIndex + 1) % languages.length;
                    attempts++;
                }}
                
                if (currentMessage[languages[nextLanguageIndex]]) {{
                    currentLanguageIndex = nextLanguageIndex;
                    const language = languages[currentLanguageIndex];
                    
                    // Create the new text element
                    const newTextElement = document.createElement('div');
                    newTextElement.className = `language-text ${{language}}`;
                    newTextElement.style.color = languageColors[language];
                    newTextElement.textContent = currentMessage[language];
                    
                    // Add fade effect
                    const currentTextElement = textElement.querySelector('.language-text');
                    if (currentTextElement) {{
                        currentTextElement.classList.remove('active');
                        
                        setTimeout(() => {{
                            textElement.innerHTML = '';
                            textElement.appendChild(newTextElement);
                            
                            setTimeout(() => {{
                                newTextElement.classList.add('active');
                            }}, 50);
                        }}, 500);
                    }} else {{
                        textElement.appendChild(newTextElement);
                        setTimeout(() => {{
                            newTextElement.classList.add('active');
                        }}, 50);
                    }}
                }}
            }}
            
            // Move to next language
            currentLanguageIndex = (currentLanguageIndex + 1) % languages.length;
            
            // If we've shown all languages for this message, move to next message
            if (currentLanguageIndex === 0) {{
                currentMessageIndex = (currentMessageIndex + 1) % textMessages.length;
            }}
        }}
        
        // Start text rotation
        displayCurrentText();
        setInterval(displayCurrentText, 10000); // 10 seconds per language"""
            else:
                logger.info("No available messages found, skipping text section")
        else:
            logger.info(f"Text section not generated - show_text: {show_text}, has_messages: {bool(text_messages)}")
        
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
            color: #fff;
            font-family: Arial, sans-serif;
            display: flex;
            flex-direction: column;
            min-height: 100vh;
        }}
        
        .main-content {{
            flex: 1;
            display: flex;
            flex-direction: column;
        }}
        
        .footer {{
            background-color: #000;
            border-top: 2px solid #333;
            padding: 15px 20px;
            margin-top: auto;
        }}
        
        .video-container {{
            position: relative;
            width: 100%;
            max-width: 1200px;
            height: auto;
            max-height: calc(100vh - 120px);
            background-color: #000;
            margin: 0 auto;
            margin-top: 40px;
            margin-bottom: 20px;
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
                max-height: calc(100vh - 100px);
                padding: 10px;
                margin-top: 30px;
                margin-bottom: 15px;
            }}
        }}
        
        @media (max-width: 480px) {{
            .video-container {{
                max-height: calc(100vh - 80px);
                padding: 5px;
                margin-top: 20px;
                margin-bottom: 10px;
            }}
        }}
{text_css}
        
    </style>
</head>
<body>
    <div class="main-content">
        <div class="video-container">
            <video 
                id="islVideo" 
                autoplay 
                muted 
                loop 
                playsinline
            >
                <source src="{self.video_filename}" type="video/mp4">
                Your browser does not support the video tag.
            </video>
        </div>
    </div>
{text_section_html}

    <script>
        // Ensure video plays automatically with specified playback speed
        document.addEventListener('DOMContentLoaded', function() {{
            const video = document.getElementById('islVideo');
            if (video) {{
                // Set playback speed immediately
                video.playbackRate = {playback_speed};
                console.log('Video playback speed set to:', {playback_speed} + 'x');
                
                // Also set playback speed when video is ready
                video.addEventListener('loadedmetadata', function() {{
                    video.playbackRate = {playback_speed};
                    console.log('Playback speed re-applied on loadedmetadata:', {playback_speed} + 'x');
                }});
                
                video.addEventListener('canplay', function() {{
                    video.playbackRate = {playback_speed};
                    console.log('Playback speed re-applied on canplay:', {playback_speed} + 'x');
                }});
                
                video.play().catch(function(error) {{
                    console.log('Autoplay failed:', error);
                    // Try to play again after user interaction
                    document.addEventListener('click', function() {{
                        video.play();
                    }}, {{ once: true }});
                }});
            }}
        }});
        
        // Additional safety: Set playback speed on any video event
        document.addEventListener('DOMContentLoaded', function() {{
            const video = document.getElementById('islVideo');
            if (video) {{
                // Set playback speed on multiple events to ensure it sticks
                const setPlaybackSpeed = function() {{
                    video.playbackRate = {playback_speed};
                    console.log('Playback speed enforced:', {playback_speed} + 'x');
                }};
                
                video.addEventListener('loadstart', setPlaybackSpeed);
                video.addEventListener('loadeddata', setPlaybackSpeed);
                video.addEventListener('loadedmetadata', setPlaybackSpeed);
                video.addEventListener('canplay', setPlaybackSpeed);
                video.addEventListener('canplaythrough', setPlaybackSpeed);
                video.addEventListener('play', setPlaybackSpeed);
                video.addEventListener('playing', setPlaybackSpeed);
            }}
        }});
{text_script}
    </script>
</body>
</html>"""
        
        return html_content


def get_html_generation_service() -> HTMLGenerationService:
    """Get HTML generation service instance"""
    return HTMLGenerationService()