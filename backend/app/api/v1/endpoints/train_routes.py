from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, or_
from typing import List, Optional
from app.db.database import get_db
from app.models.train_route import TrainRoute
from app.schemas.train_route import TrainRouteCreate, TrainRouteUpdate, TrainRouteResponse

router = APIRouter()


@router.post("/", response_model=TrainRouteResponse, status_code=status.HTTP_201_CREATED)
async def create_train_route(
    train_route: TrainRouteCreate,
    db: AsyncSession = Depends(get_db)
) -> TrainRouteResponse:
    """Create a new train route"""
    # Check if train number already exists
    result = await db.execute(
        select(TrainRoute).where(
            TrainRoute.train_number == train_route.train_number)
    )
    existing_route = result.scalar_one_or_none()

    if existing_route:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Train number already exists"
        )

    # Create new train route
    db_train_route = TrainRoute(**train_route.model_dump())
    db.add(db_train_route)
    await db.commit()
    await db.refresh(db_train_route)

    return db_train_route


@router.get("/", response_model=List[TrainRouteResponse])
async def get_train_routes(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000,
                       description="Number of records to return"),
    train_number: Optional[str] = Query(
        None, description="Filter by train number"),
    db: AsyncSession = Depends(get_db)
) -> List[TrainRouteResponse]:
    """Get all train routes with optional filtering"""
    query = select(TrainRoute)

    if train_number:
        query = query.where(TrainRoute.train_number == train_number)

    query = query.offset(skip).limit(limit).order_by(TrainRoute.train_number)

    result = await db.execute(query)
    train_routes = result.scalars().all()

    return train_routes


@router.get("/search", response_model=List[TrainRouteResponse])
async def search_train_routes(
    q: str = Query(..., min_length=1, description="Search query for train number or name"),
    limit: int = Query(10, ge=1, le=50, description="Maximum number of results to return"),
    db: AsyncSession = Depends(get_db)
) -> List[TrainRouteResponse]:
    """Search train routes by train number or train name"""
    # Create search query that matches either train number or train name
    query = select(TrainRoute).where(
        or_(
            TrainRoute.train_number.ilike(f"%{q}%"),
            TrainRoute.train_name.ilike(f"%{q}%")
        )
    ).limit(limit).order_by(TrainRoute.train_number)

    result = await db.execute(query)
    train_routes = result.scalars().all()

    return train_routes


@router.get("/{train_route_id}", response_model=TrainRouteResponse)
async def get_train_route(
    train_route_id: int,
    db: AsyncSession = Depends(get_db)
) -> TrainRouteResponse:
    """Get a specific train route by ID"""
    result = await db.execute(
        select(TrainRoute).where(TrainRoute.id == train_route_id)
    )
    train_route = result.scalar_one_or_none()

    if not train_route:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Train route not found"
        )

    return train_route


@router.get("/train/{train_number}", response_model=TrainRouteResponse)
async def get_train_route_by_number(
    train_number: str,
    db: AsyncSession = Depends(get_db)
) -> TrainRouteResponse:
    """Get a specific train route by train number"""
    result = await db.execute(
        select(TrainRoute).where(TrainRoute.train_number == train_number)
    )
    train_route = result.scalar_one_or_none()

    if not train_route:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Train route not found"
        )

    return train_route


@router.put("/{train_route_id}", response_model=TrainRouteResponse)
async def update_train_route(
    train_route_id: int,
    train_route_update: TrainRouteUpdate,
    db: AsyncSession = Depends(get_db)
) -> TrainRouteResponse:
    """Update a train route"""
    # Check if train route exists
    result = await db.execute(
        select(TrainRoute).where(TrainRoute.id == train_route_id)
    )
    existing_route = result.scalar_one_or_none()

    if not existing_route:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Train route not found"
        )

    # Update only provided fields
    update_data = train_route_update.model_dump(exclude_unset=True)
    if update_data:
        await db.execute(
            update(TrainRoute)
            .where(TrainRoute.id == train_route_id)
            .values(**update_data)
        )
        await db.commit()

        # Fetch updated record
        result = await db.execute(
            select(TrainRoute).where(TrainRoute.id == train_route_id)
        )
        updated_route = result.scalar_one()
        return updated_route

    return existing_route


@router.delete("/{train_route_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_train_route(
    train_route_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete a train route and its associated translations"""
    # Check if train route exists
    result = await db.execute(
        select(TrainRoute).where(TrainRoute.id == train_route_id)
    )
    existing_route = result.scalar_one_or_none()

    if not existing_route:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Train route not found"
        )

    # Delete the train route (cascade will automatically delete translations)
    await db.delete(existing_route)
    await db.commit()
