#!/usr/bin/env python3
"""
Migration script to add ISL announcements table to existing database.
This script creates the new isl_announcements table without affecting existing data.
"""

from app.utils.logger import get_logger
from app.models.isl_announcement import ISLAnnouncement
from app.db.database import engine, AsyncSessionLocal, Base
from sqlalchemy.ext.asyncio import AsyncSession
import asyncio
import sys
from pathlib import Path

# Add the app directory to the Python path
sys.path.append(str(Path(__file__).parent))

logger = get_logger(__name__)


async def create_isl_announcements_table():
    """Create the ISL announcements table."""
    logger.info("Creating ISL announcements table...")
    try:
        async with engine.begin() as conn:
            # Create only the ISL announcements table
            await conn.run_sync(ISLAnnouncement.metadata.create_all)
        logger.info("ISL announcements table created successfully!")
    except Exception as e:
        logger.error(f"Error creating ISL announcements table: {e}")
        raise


async def verify_table_creation():
    """Verify that the table was created successfully."""
    logger.info("Verifying table creation...")
    try:
        async with AsyncSessionLocal() as session:
            # Try to query the table to verify it exists
            from sqlalchemy import text
            result = await session.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='isl_announcements'"))
            table_exists = result.fetchone() is not None
            
            if table_exists:
                logger.info("ISL announcements table verified successfully!")
            else:
                logger.error("ISL announcements table was not created!")
                raise Exception("Table creation verification failed")
                
    except Exception as e:
        logger.error(f"Error verifying table creation: {e}")
        raise


async def migrate_database():
    """Run the migration."""
    try:
        logger.info("Starting ISL announcements table migration...")
        
        # Create the table
        await create_isl_announcements_table()
        
        # Verify the table was created
        await verify_table_creation()
        
        logger.info("ISL announcements table migration completed successfully!")
        
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        raise
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(migrate_database())
