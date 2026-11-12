
import os
import sqlite3
from contextlib import asynccontextmanager
from typing import Literal

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.database import init_db, get_connection
from app.piwigo import (
    PiwigoError,
    get_version,
    get_albums,
    get_images,
    get_tags,
    get_image_info,
    make_public_url,
)


# Piwigo album containing source images and CMYK separations.
SUPPORTING_ALBUM_ID = 18


class ArtworkMetadataInput(BaseModel):
    year: int | None = Field(default=None, ge=0, le=9999)
    medium: str | None = None
    physical_dimensions: str | None = None
    description: str | None = None
    process_notes: str | None = None


class ArtworkAdditionInput(BaseModel):
    type: Literal["source", "cmyk"]
    channel: Literal["C", "M", "Y", "K"] | None = None
    label: str | None = None
    sort_order: int = Field(default=0, ge=0)
    piwigo_image_id: int = Field(gt=0)

class ArtworkAdditionUpdate(BaseModel):
    label: str | None = None
    sort_order: int = Field(ge=0)


def format_metadata(artwork_id, row=None):
    if row is None:
        return {
            "artwork_id": artwork_id,
            "year": None,
            "medium": None,
            "physical_dimensions": None,
            "description": None,
            "process_notes": None,
            "created_at": None,
            "updated_at": None,
        }

    return dict(row)


def clean_text(value):
    if value is None:
        return None

    return value.strip() or None


async def validate_supporting_image(image_id: int):
    """Ensure an image belongs to the designated supporting-materials album."""

    try:
        image = await get_image_info(image_id)

    except PiwigoError as error:
        raise HTTPException(status_code=502, detail=str(error))

    categories = image.get("categories", [])

    belongs_to_album = any(
        category.get("id") == SUPPORTING_ALBUM_ID
        for category in categories
    )

    if not belongs_to_album:
        raise HTTPException(
            status_code=400,
            detail="This image does not belong to the supporting-materials album.",
        )

    return image


@asynccontextmanager
async def lifespan(app: FastAPI):
    database_path = init_db()
    print(f"Supporting-media database ready: {database_path}")
    yield


app = FastAPI(
    title="Snoops Archive API",
    description="Backend API for the Snoops Archive.",
    version="0.1.0",
    lifespan=lifespan,
)

DEFAULT_CORS_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"


def cors_origins():
    value = os.getenv("CORS_ORIGINS", DEFAULT_CORS_ORIGINS)

    return [
        origin.strip()
        for origin in value.split(",")
        if origin.strip()
    ]


app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "name": "Snoops Archive API",
        "status": "online",
    }


@app.get("/api/health")
async def health():
    return {
        "status": "online",
        "service": "Snoops Archive API",
    }


@app.get("/api/piwigo/status")
async def piwigo_status():
    try:
        version = await get_version()

        return {
            "status": "connected",
            "piwigo_version": version,
        }

    except PiwigoError as error:
        raise HTTPException(status_code=502, detail=str(error))


@app.get("/api/albums")
async def albums():
    try:
        result = await get_albums()

        categories = [
            category
            for category in result.get("categories", [])
            if category.get("id") != SUPPORTING_ALBUM_ID
        ]

        return {"albums": {**result, "categories": categories}}

    except PiwigoError as error:
        raise HTTPException(status_code=502, detail=str(error))


@app.get("/api/tags")
async def tags():
    try:
        result = await get_tags()
        return {"tags": result.get("tags", [])}

    except PiwigoError as error:
        raise HTTPException(status_code=502, detail=str(error))


@app.get("/api/supporting-images")
async def supporting_images(
    page: int = Query(default=0, ge=0),
    per_page: int = Query(default=100, ge=1, le=100),
):
    """Browse images from the dedicated supporting-materials album."""

    try:
        result = await get_images(
            category_id=SUPPORTING_ALBUM_ID,
            page=page,
            per_page=per_page,
        )

        return {
            "images": result.get("images", []),
            "paging": result.get("paging", {}),
        }

    except PiwigoError as error:
        raise HTTPException(status_code=502, detail=str(error))


@app.get("/api/images/{image_id}")
async def image_info(image_id: int):
    try:
        result = await get_image_info(image_id)

        for field in ("page_url", "element_url", "download_url"):
            if result.get(field):
                result[field] = make_public_url(result[field])

        derivatives = result.get("derivatives", {})

        for derivative in derivatives.values():
            if derivative.get("url"):
                derivative["url"] = make_public_url(derivative["url"])

        for category in result.get("categories", []):
            for field in ("url", "page_url"):
                if category.get(field):
                    category[field] = make_public_url(category[field])

        for tag in result.get("tags", []):
            for field in ("url", "page_url"):
                if tag.get(field):
                    tag[field] = make_public_url(tag[field])

        result["image_url"] = result.get("element_url", "")

        result["thumbnail_url"] = (
            derivatives.get("small", {}).get("url")
            or derivatives.get("thumb", {}).get("url")
            or result["image_url"]
        )

        return {"image": result}

    except PiwigoError as error:
        raise HTTPException(status_code=502, detail=str(error))


@app.get("/api/images")
async def images(
    category_id: int | None = None,
    page: int = Query(default=0, ge=0),
    per_page: int = Query(default=100, ge=1, le=100),
):
    try:
        result = await get_images(
            category_id=category_id,
            page=page,
            per_page=per_page,
            exclude_category_id=SUPPORTING_ALBUM_ID,
        )

        return {
            "images": result.get("images", []),
            "paging": result.get("paging", {}),
        }

    except PiwigoError as error:
        raise HTTPException(status_code=502, detail=str(error))


@app.get("/api/images/{artwork_id}/metadata")
async def get_artwork_metadata(artwork_id: int):
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT
                artwork_id,
                year,
                medium,
                physical_dimensions,
                description,
                process_notes,
                created_at,
                updated_at
            FROM artwork_metadata
            WHERE artwork_id = ?
            """,
            (artwork_id,),
        ).fetchone()

    return {
        "metadata": format_metadata(artwork_id, row)
    }


@app.put("/api/images/{artwork_id}/metadata")
async def update_artwork_metadata(
    artwork_id: int,
    metadata: ArtworkMetadataInput,
):
    values = metadata.dict()

    for field in (
        "medium",
        "physical_dimensions",
        "description",
        "process_notes",
    ):
        values[field] = clean_text(values[field])

    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO artwork_metadata (
                artwork_id,
                year,
                medium,
                physical_dimensions,
                description,
                process_notes
            )
            VALUES (?, ?, ?, ?, ?, ?)

            ON CONFLICT(artwork_id) DO UPDATE SET
                year = excluded.year,
                medium = excluded.medium,
                physical_dimensions = excluded.physical_dimensions,
                description = excluded.description,
                process_notes = excluded.process_notes,
                updated_at = CURRENT_TIMESTAMP
            """,
            (
                artwork_id,
                values["year"],
                values["medium"],
                values["physical_dimensions"],
                values["description"],
                values["process_notes"],
            ),
        )

        row = connection.execute(
            """
            SELECT
                artwork_id,
                year,
                medium,
                physical_dimensions,
                description,
                process_notes,
                created_at,
                updated_at
            FROM artwork_metadata
            WHERE artwork_id = ?
            """,
            (artwork_id,),
        ).fetchone()

    return {
        "message": "Artwork metadata saved successfully.",
        "metadata": format_metadata(artwork_id, row),
    }


@app.get("/api/images/{artwork_id}/additionals")
async def artwork_additionals(artwork_id: int):
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT
                id,
                artwork_id,
                piwigo_image_id,
                type,
                channel,
                label,
                sort_order
            FROM artwork_additionals
            WHERE artwork_id = ?
            ORDER BY
                CASE type
                    WHEN 'source' THEN 0
                    WHEN 'cmyk' THEN 1
                END,
                sort_order ASC,
                CASE channel
                    WHEN 'C' THEN 0
                    WHEN 'M' THEN 1
                    WHEN 'Y' THEN 2
                    WHEN 'K' THEN 3
                END
            """,
            (artwork_id,),
        ).fetchall()

    sources = []
    cmyk = {
        "C": None,
        "M": None,
        "Y": None,
        "K": None,
    }

    for row in rows:
        try:
            image = await get_image_info(row["piwigo_image_id"])

            image_url = make_public_url(
                image.get("element_url", "")
            )

            derivatives = image.get("derivatives", {})

            thumbnail_url = (
                make_public_url(derivatives.get("small", {}).get("url", ""))
                or make_public_url(derivatives.get("thumb", {}).get("url", ""))
                or image_url
            )

            supporting_image = {
                "id": row["id"],
                "piwigo_image_id": row["piwigo_image_id"],
                "type": row["type"],
                "channel": row["channel"],
                "label": row["label"],
                "sort_order": row["sort_order"],
                "name": image.get("name") or image.get("file"),
                "image_url": image_url,
                "thumbnail_url": thumbnail_url,
            }

            if row["type"] == "source":
                sources.append(supporting_image)
            else:
                cmyk[row["channel"]] = supporting_image

        except PiwigoError as error:
            print(
                f"Could not retrieve supporting image "
                f"{row['piwigo_image_id']}: {error}"
            )

    return {
        "artwork_id": artwork_id,
        "sources": sources,
        "cmyk": cmyk,
    }


@app.post("/api/images/{artwork_id}/additionals")
async def assign_artwork_additional(
    artwork_id: int,
    addition: ArtworkAdditionInput,
):
    """Assign a source image or CMYK separation to an artwork."""

    if addition.type == "source" and addition.channel is not None:
        raise HTTPException(
            status_code=400,
            detail="Source images cannot have a CMYK channel.",
        )

    if addition.type == "cmyk" and addition.channel is None:
        raise HTTPException(
            status_code=400,
            detail="A CMYK channel must be selected.",
        )

    await validate_supporting_image(addition.piwigo_image_id)

    try:
        with get_connection() as connection:
            # Replacing a CMYK channel removes its previous association
            # inside the same transaction as the new assignment.
            if addition.type == "cmyk":
                connection.execute(
                    """
                    DELETE FROM artwork_additionals
                    WHERE artwork_id = ?
                      AND type = 'cmyk'
                      AND channel = ?
                    """,
                    (artwork_id, addition.channel),
                )

            cursor = connection.execute(
                """
                INSERT INTO artwork_additionals (
                    artwork_id,
                    piwigo_image_id,
                    type,
                    channel,
                    label,
                    sort_order
                )
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    artwork_id,
                    addition.piwigo_image_id,
                    addition.type,
                    addition.channel,
                    clean_text(addition.label),
                    addition.sort_order,
                ),
            )

            relationship_id = cursor.lastrowid

    except sqlite3.IntegrityError as error:
        raise HTTPException(
            status_code=409,
            detail=(
                "This image is already assigned to this artwork, "
                "or the requested CMYK assignment conflicts with an existing one."
            ),
        ) from error

    return {
        "message": "Supporting image assigned successfully.",
        "relationship_id": relationship_id,
    }

@app.put("/api/images/{artwork_id}/additionals/{relationship_id}")
async def update_artwork_additional(
    artwork_id: int,
    relationship_id: int,
    update: ArtworkAdditionUpdate,
):
    label = clean_text(update.label)

    with get_connection() as connection:
        existing = connection.execute(
            """
            SELECT id
            FROM artwork_additionals
            WHERE id = ? AND artwork_id = ?
            """,
            (relationship_id, artwork_id),
        ).fetchone()

        if existing is None:
            raise HTTPException(
                status_code=404,
                detail="Supporting-image assignment not found.",
            )

        connection.execute(
            """
            UPDATE artwork_additionals
            SET label = ?, sort_order = ?
            WHERE id = ? AND artwork_id = ?
            """,
            (label, update.sort_order, relationship_id, artwork_id),
        )

    return {
        "message": "Supporting-image assignment updated successfully."
    }


@app.delete("/api/images/{artwork_id}/additionals/{relationship_id}")
async def remove_artwork_additional(
    artwork_id: int,
    relationship_id: int,
):
    """Remove an artwork relationship without deleting the Piwigo image."""

    with get_connection() as connection:
        cursor = connection.execute(
            """
            DELETE FROM artwork_additionals
            WHERE id = ? AND artwork_id = ?
            """,
            (relationship_id, artwork_id),
        )

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Supporting-image assignment not found.",
            )

    return {
        "message": "Supporting-image assignment removed successfully."
    }
