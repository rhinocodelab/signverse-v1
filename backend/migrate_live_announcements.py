#!/usr/bin/env python3
"""
Database migration script to create the live_announcements table
Run this script to add the new table to your database
"""

import asyncio
from app.db.database import get_db
from sqlalchemy import text

async def create_live_announcements_table():
    """Create the live_announcements table"""
    async for db in get_db():
        try:
            # Create the table
            await db.execute(text('''
                CREATE TABLE IF NOT EXISTS live_announcements (
                    id INTEGER PRIMARY KEY,
                    announcement_id VARCHAR(36) UNIQUE NOT NULL,
                    train_number VARCHAR(50) NOT NULL,
                    train_name VARCHAR(255) NOT NULL,
                    from_station VARCHAR(255) NOT NULL,
                    to_station VARCHAR(255) NOT NULL,
                    platform_number INTEGER NOT NULL,
                    announcement_category VARCHAR(100) NOT NULL,
                    ai_avatar_model VARCHAR(20) NOT NULL,
                    status VARCHAR(50) NOT NULL,
                    message TEXT NOT NULL,
                    progress_percentage INTEGER,
                    video_url VARCHAR(500),
                    error_message TEXT,
                    is_active BOOLEAN NOT NULL DEFAULT 1,
                    received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            '''))
            
            # Create indexes for better performance
            await db.execute(text('''
                CREATE INDEX IF NOT EXISTS idx_live_announcements_announcement_id 
                ON live_announcements(announcement_id)
            '''))
            
            await db.execute(text('''
                CREATE INDEX IF NOT EXISTS idx_live_announcements_train_number 
                ON live_announcements(train_number)
            '''))
            
            await db.execute(text('''
                CREATE INDEX IF NOT EXISTS idx_live_announcements_from_station 
                ON live_announcements(from_station)
            '''))
            
            await db.execute(text('''
                CREATE INDEX IF NOT EXISTS idx_live_announcements_status 
                ON live_announcements(status)
            '''))
            
            await db.execute(text('''
                CREATE INDEX IF NOT EXISTS idx_live_announcements_is_active 
                ON live_announcements(is_active)
            '''))
            
            await db.commit()
            print("✅ Live announcements table created successfully with indexes")
            
        except Exception as e:
            print(f"❌ Error creating live announcements table: {str(e)}")
            await db.rollback()
            raise
        finally:
            break

if __name__ == "__main__":
    asyncio.run(create_live_announcements_table())