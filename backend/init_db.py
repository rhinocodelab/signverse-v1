#!/usr/bin/env python3
"""
Database initialization script for SignVerse backend.
Creates database tables and adds default admin user.
"""

from app.utils.logger import get_logger
from app.core.security import get_password_hash
from app.models.user import User
from app.models.train_route import TrainRoute
from app.models.train_route_translation import TrainRouteTranslation
from app.models.isl_video import ISLVideo
from app.models.general_announcement import GeneralAnnouncement
from app.models.announcement_template import AnnouncementTemplateModel
from app.models.isl_announcement import ISLAnnouncement
from app.db.database import engine, AsyncSessionLocal, Base
from sqlalchemy.ext.asyncio import AsyncSession
import asyncio
import sys
from pathlib import Path

# Add the app directory to the Python path
sys.path.append(str(Path(__file__).parent))


logger = get_logger(__name__)


async def create_tables():
    """Create all database tables."""
    logger.info("Creating database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created successfully!")


async def create_default_admin():
    """Create default admin user if it doesn't exist."""
    async with AsyncSessionLocal() as session:
        try:
            # Check if admin user already exists
            from sqlalchemy import select
            result = await session.execute(
                select(User).where(User.username == "admin")
            )
            existing_admin = result.scalar_one_or_none()

            if existing_admin:
                logger.info("Admin user already exists, skipping creation.")
                return

            # Create admin user
            admin_user = User(
                username="admin",
                hashed_password=get_password_hash("admin"),
                is_active=True,
                is_superuser=True
            )

            session.add(admin_user)
            await session.commit()
            await session.refresh(admin_user)

            logger.info(f"Default admin user created successfully!")
            logger.info(f"Username: admin")
            logger.info(f"Password: admin")
            logger.info(f"User ID: {admin_user.id}")

        except Exception as e:
            logger.error(f"Error creating admin user: {e}")
            await session.rollback()
            raise


async def init_database():
    """Initialize the database with tables and default data."""
    try:
        logger.info("Starting database initialization...")

        # Create tables
        await create_tables()

        # Create default admin user
        await create_default_admin()

        logger.info("Database initialization completed successfully!")

    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(init_database())
