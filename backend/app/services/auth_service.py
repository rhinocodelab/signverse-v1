from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.models.user import User
from app.core.security import verify_password, create_access_token, get_password_hash
from typing import Optional


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user_by_username(self, username: str) -> Optional[User]:
        result = await self.db.execute(select(User).where(User.username == username))
        return result.scalar_one_or_none()

    async def authenticate_user(self, username: str, password: str) -> Optional[User]:
        user = await self.get_user_by_username(username)
        if not user:
            return None
        if not user.is_active:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

    def create_access_token(self, subject: str) -> str:
        return create_access_token(subject)

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return verify_password(plain_password, hashed_password)

    async def change_password(self, user_id: int, new_password: str) -> bool:
        """Change user password"""
        try:
            hashed_password = get_password_hash(new_password)
            await self.db.execute(
                update(User)
                .where(User.id == user_id)
                .values(hashed_password=hashed_password)
            )
            await self.db.commit()
            return True
        except Exception:
            await self.db.rollback()
            return False
