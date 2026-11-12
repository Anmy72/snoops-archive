
import asyncio
import os
from urllib.parse import urlsplit, urlunsplit

import httpx
from dotenv import load_dotenv

load_dotenv()

# Internal address used by the backend to communicate with Piwigo.
PIWIGO_URL = os.getenv("PIWIGO_URL", "").rstrip("/")

# Browser-accessible address used when returning image URLs.
PIWIGO_PUBLIC_URL = os.getenv("PIWIGO_PUBLIC_URL", "").rstrip("/")

API_KEY_ID = os.getenv("PIWIGO_API_KEY_ID", "")
API_KEY_SECRET = os.getenv("PIWIGO_API_KEY_SECRET", "")

API_ENDPOINT = f"{PIWIGO_URL}/ws.php?format=json"


class PiwigoError(Exception):
    pass


def make_public_url(url: str) -> str:
    """Replace Piwigo's internal hostname with its browser-accessible address."""

    if not url or not PIWIGO_PUBLIC_URL:
        return url

    internal = urlsplit(PIWIGO_URL)
    image = urlsplit(url)
    public = urlsplit(PIWIGO_PUBLIC_URL)

    if image.netloc == internal.netloc:
        return urlunsplit((
            public.scheme,
            public.netloc,
            image.path,
            image.query,
            image.fragment,
        ))

    return url


async def call_piwigo(method: str, **params):
    if not PIWIGO_URL or not API_KEY_ID or not API_KEY_SECRET:
        raise PiwigoError("Piwigo configuration is incomplete.")

    headers = {
        "X-PIWIGO-API": f"{API_KEY_ID}:{API_KEY_SECRET}"
    }

    data = {
        "method": method,
        **params,
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                API_ENDPOINT,
                headers=headers,
                data=data,
            )

            response.raise_for_status()

            try:
                result = response.json()
            except ValueError as error:
                raise PiwigoError(
                    f"Piwigo returned unexpected content "
                    f"({response.headers.get('content-type', 'unknown type')})."
                ) from error

    except httpx.HTTPError as error:
        raise PiwigoError(
            f"Could not communicate with Piwigo: {error}"
        ) from error

    if result.get("stat") != "ok":
        raise PiwigoError(
            result.get("message", "Piwigo API request failed.")
        )

    return result.get("result", {})


async def get_version():
    return await call_piwigo("pwg.getVersion")


async def get_tags():
    return await call_piwigo("pwg.tags.getList")


async def get_image_info(image_id: int):
    return await call_piwigo(
        "pwg.images.getInfo",
        image_id=image_id,
        comments_page=0,
        comments_per_page=0,
    )


async def get_albums():
    return await call_piwigo(
        "pwg.categories.getList",
        recursive="true",
        fullname="true",
    )


PIWIGO_PAGE_SIZE = 100


async def fetch_images_excluding_category(
    params: dict,
    exclude_category_id: int,
    page: int,
    per_page: int,
):
    """Fetch every matching image, drop the excluded category, then paginate."""

    collected: list[dict] = []
    fetch_page = 0

    while True:
        result = await call_piwigo(
            "pwg.categories.getImages",
            **params,
            page=fetch_page,
            per_page=PIWIGO_PAGE_SIZE,
        )

        batch = result.get("images", [])
        collected.extend(batch)

        total_count = result.get("paging", {}).get("total_count", 0)

        if (
            not batch
            or len(batch) < PIWIGO_PAGE_SIZE
            or (total_count and len(collected) >= total_count)
        ):
            break

        fetch_page += 1

    images = [
        image
        for image in collected
        if not any(
            category.get("id") == exclude_category_id
            for category in image.get("categories", [])
        )
    ]

    start = page * per_page
    page_images = images[start:start + per_page]

    return page_images, {
        "page": page,
        "per_page": per_page,
        "count": len(page_images),
        "total_count": len(images),
    }


async def get_images(
    category_id: int | None = None,
    page: int = 0,
    per_page: int = 100,
    exclude_category_id: int | None = None,
):
    params = {
        "recursive": "true",
    }

    if category_id is not None:
        params["cat_id"] = category_id

    if exclude_category_id is None:
        result = await call_piwigo(
            "pwg.categories.getImages",
            **params,
            page=page,
            per_page=per_page,
        )

        images = result.get("images", [])
        paging = result.get("paging", {})

    else:
        result = {}
        images, paging = await fetch_images_excluding_category(
            params,
            exclude_category_id,
            page,
            per_page,
        )

    # Enrich each image with its associated tags.
    # Limit concurrent requests to avoid overloading Piwigo.
    semaphore = asyncio.Semaphore(5)

    async def add_image_tags(image: dict):
        async with semaphore:
            info = await get_image_info(image["id"])

        tags = info.get("tags", [])

        for tag in tags:
            for field in ("url", "page_url"):
                if tag.get(field):
                    tag[field] = make_public_url(tag[field])

        image["tags"] = tags

    await asyncio.gather(
        *(add_image_tags(image) for image in images)
    )

    # Prepare image URLs for browser access.
    for image in images:
        derivatives = image.get("derivatives", {})

        for derivative in derivatives.values():
            if derivative.get("url"):
                derivative["url"] = make_public_url(
                    derivative["url"]
                )

        # Thumbnail image.
        image["tn_url"] = make_public_url(
            image.get("tn_url")
            or derivatives.get("small", {}).get("url")
            or derivatives.get("thumb", {}).get("url", "")
        )

        # Full-size artwork.
        image["element_url"] = make_public_url(
            image.get("element_url")
            or derivatives.get("xlarge", {}).get("url", "")
        )

        # Other useful URLs.
        for field in ("page_url", "download_url"):
            if image.get(field):
                image[field] = make_public_url(image[field])

        # Album URLs.
        for category in image.get("categories", []):
            for field in ("url", "page_url"):
                if category.get(field):
                    category[field] = make_public_url(
                        category[field]
                    )

        # Frontend-friendly aliases.
        image["thumbnail_url"] = image["tn_url"]
        image["image_url"] = image["element_url"]

    return {
        **result,
        "images": images,
        "paging": paging,
    }
