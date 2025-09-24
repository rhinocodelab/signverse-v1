from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from typing import List, Optional
from app.db.database import get_db
from app.models.train_route_translation import TrainRouteTranslation
from app.models.train_route import TrainRoute
from app.schemas.train_route_translation import (
    TrainRouteTranslationCreate,
    TrainRouteTranslationUpdate,
    TrainRouteTranslationResponse,
    TrainRouteWithTranslations
)

router = APIRouter()


@router.post("/", response_model=TrainRouteTranslationResponse, status_code=status.HTTP_201_CREATED)
async def create_train_route_translation(
    translation: TrainRouteTranslationCreate,
    db: AsyncSession = Depends(get_db)
) -> TrainRouteTranslationResponse:
    """Create a new train route translation"""
    # Check if train route exists
    result = await db.execute(
        select(TrainRoute).where(TrainRoute.id == translation.train_route_id)
    )
    train_route = result.scalar_one_or_none()

    if not train_route:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Train route not found"
        )

    # Check if translation already exists for this train route
    existing_result = await db.execute(
        select(TrainRouteTranslation).where(
            TrainRouteTranslation.train_route_id == translation.train_route_id
        )
    )
    existing_translation = existing_result.scalar_one_or_none()

    if existing_translation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Translation already exists for this train route"
        )

    # Create new translation
    db_translation = TrainRouteTranslation(**translation.model_dump())
    db.add(db_translation)
    await db.commit()
    await db.refresh(db_translation)

    return db_translation


@router.get("/", response_model=List[TrainRouteTranslationResponse])
async def get_train_route_translations(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000,
                       description="Number of records to return"),
    train_route_id: Optional[int] = Query(
        None, description="Filter by train route ID"),
    db: AsyncSession = Depends(get_db)
) -> List[TrainRouteTranslationResponse]:
    """Get all train route translations with optional filtering"""
    query = select(TrainRouteTranslation)

    if train_route_id:
        query = query.where(
            TrainRouteTranslation.train_route_id == train_route_id)

    query = query.offset(skip).limit(limit).order_by(TrainRouteTranslation.id)

    result = await db.execute(query)
    translations = result.scalars().all()

    return translations


@router.get("/{translation_id}", response_model=TrainRouteTranslationResponse)
async def get_train_route_translation(
    translation_id: int,
    db: AsyncSession = Depends(get_db)
) -> TrainRouteTranslationResponse:
    """Get a specific train route translation by ID"""
    result = await db.execute(
        select(TrainRouteTranslation).where(
            TrainRouteTranslation.id == translation_id)
    )
    translation = result.scalar_one_or_none()

    if not translation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Train route translation not found"
        )

    return translation


@router.get("/train-route/{train_route_id}", response_model=TrainRouteTranslationResponse)
async def get_translation_by_train_route(
    train_route_id: int,
    db: AsyncSession = Depends(get_db)
) -> TrainRouteTranslationResponse:
    """Get translation for a specific train route"""
    result = await db.execute(
        select(TrainRouteTranslation).where(
            TrainRouteTranslation.train_route_id == train_route_id
        )
    )
    translation = result.scalar_one_or_none()

    if not translation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Translation not found for this train route"
        )

    return translation


@router.put("/{translation_id}", response_model=TrainRouteTranslationResponse)
async def update_train_route_translation(
    translation_id: int,
    translation_update: TrainRouteTranslationUpdate,
    db: AsyncSession = Depends(get_db)
) -> TrainRouteTranslationResponse:
    """Update a train route translation"""
    # Check if translation exists
    result = await db.execute(
        select(TrainRouteTranslation).where(
            TrainRouteTranslation.id == translation_id)
    )
    existing_translation = result.scalar_one_or_none()

    if not existing_translation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Train route translation not found"
        )

    # Update only provided fields
    update_data = translation_update.model_dump(exclude_unset=True)
    if update_data:
        await db.execute(
            update(TrainRouteTranslation)
            .where(TrainRouteTranslation.id == translation_id)
            .values(**update_data)
        )
        await db.commit()

        # Fetch updated record
        result = await db.execute(
            select(TrainRouteTranslation).where(
                TrainRouteTranslation.id == translation_id)
        )
        updated_translation = result.scalar_one()
        return updated_translation

    return existing_translation


@router.delete("/{translation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_train_route_translation(
    translation_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete a train route translation"""
    # Check if translation exists
    result = await db.execute(
        select(TrainRouteTranslation).where(
            TrainRouteTranslation.id == translation_id)
    )
    existing_translation = result.scalar_one_or_none()

    if not existing_translation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Train route translation not found"
        )

    await db.execute(
        delete(TrainRouteTranslation).where(
            TrainRouteTranslation.id == translation_id)
    )
    await db.commit()


@router.get("/train-routes/with-translations", response_model=List[TrainRouteWithTranslations])
async def get_train_routes_with_translations(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000,
                       description="Number of records to return"),
    db: AsyncSession = Depends(get_db)
) -> List[TrainRouteWithTranslations]:
    """Get all train routes with their translations"""
    query = select(TrainRoute).offset(skip).limit(
        limit).order_by(TrainRoute.train_number)

    result = await db.execute(query)
    train_routes = result.scalars().all()

    # For each train route, get its translation if it exists
    routes_with_translations = []
    for route in train_routes:
        translation_result = await db.execute(
            select(TrainRouteTranslation).where(
                TrainRouteTranslation.train_route_id == route.id
            )
        )
        translation = translation_result.scalar_one_or_none()

        route_data = {
            "id": route.id,
            "train_number": route.train_number,
            "train_name": route.train_name,
            "from_station_name": route.from_station_name,
            "from_station_code": route.from_station_code,
            "to_station_name": route.to_station_name,
            "to_station_code": route.to_station_code,
            "created_at": route.created_at,
            "updated_at": route.updated_at,
            "translations": translation
        }
        routes_with_translations.append(route_data)

    return routes_with_translations
