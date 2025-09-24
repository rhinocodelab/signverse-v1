import uvicorn
import os
from app.main import asgi_app
from app.core.config import settings

if __name__ == "__main__":
    # Get the project root directory dynamically
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    cert_dir = os.path.join(project_root, "scripts", "certs")

    uvicorn.run(
        "app.main:asgi_app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="debug" if settings.DEBUG else "info",
        ssl_keyfile=os.path.join(cert_dir, "server.key"),
        ssl_certfile=os.path.join(cert_dir, "server.crt")
    )
