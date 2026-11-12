
import sqlite3
from pathlib import Path

DATABASE_PATH = (
    Path(__file__).resolve().parent.parent
    / "data"
    / "artwork_additionals.db"
)


def get_connection():
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)

    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")

    return connection


def init_db():
    with get_connection() as connection:

        # Supporting images and their relationships.
        connection.execute("""
            CREATE TABLE IF NOT EXISTS artwork_additionals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,

                artwork_id INTEGER NOT NULL,
                piwigo_image_id INTEGER NOT NULL,

                type TEXT NOT NULL
                    CHECK (type IN ('source', 'cmyk')),

                channel TEXT
                    CHECK (
                        channel IS NULL
                        OR channel IN ('C', 'M', 'Y', 'K')
                    ),

                label TEXT,
                sort_order INTEGER NOT NULL DEFAULT 0,

                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

                CHECK (
                    (type = 'source' AND channel IS NULL)
                    OR
                    (type = 'cmyk' AND channel IS NOT NULL)
                ),

                UNIQUE (artwork_id, piwigo_image_id)
            )
        """)

        connection.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS
            unique_artwork_cmyk_channel
            ON artwork_additionals (artwork_id, channel)
            WHERE type = 'cmyk'
        """)

        connection.execute("""
            CREATE INDEX IF NOT EXISTS
            idx_artwork_additionals_artwork
            ON artwork_additionals (artwork_id)
        """)

        # Creative information for each artwork.
        connection.execute("""
            CREATE TABLE IF NOT EXISTS artwork_metadata (
                artwork_id INTEGER PRIMARY KEY,

                year INTEGER,
                medium TEXT,
                physical_dimensions TEXT,
                description TEXT,
                process_notes TEXT,

                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """)

    return DATABASE_PATH
