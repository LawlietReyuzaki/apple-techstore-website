#!/usr/bin/env python3
"""
Spare Parts Import Script
Reads scraped data from Excel → inserts into PostgreSQL spare_parts table.

Usage:
    python import_spare_parts.py <path_to_excel_file>
    python import_spare_parts.py scraped_data.xlsx
"""

import sys
import uuid
import logging
from datetime import datetime

import pandas as pd
import psycopg2
from psycopg2.extras import register_uuid

# ── DB Config ──────────────────────────────────────────────────────────────────
DB_CONFIG = {
    'host':     'localhost',
    'port':     5433,
    'database': 'mydatabase',
    'user':     'admin',
    'password': '123456',
}

# ── Part type suffixes (longest first so we match most specific first) ─────────
PART_SUFFIXES = sorted([
    'LCD Panel Unit', 'LCD Panel', 'Back Glass Panel', 'Back Glass',
    'Sim Tray', 'SIM Tray', 'Original Battery', 'Battery Pack', 'Battery',
    'Screen', 'Display', 'Charging Port', 'Charge Port', 'Back Cover',
    'Front Camera', 'Back Camera', 'Rear Camera', 'Fingerprint Sensor',
    'Ear Speaker', 'Loud Speaker', 'Power Button', 'Volume Button',
    'Home Button', 'Flex Cable', 'Motherboard', 'Housing',
], key=len, reverse=True)

APPLE_BRANDS = {'apple', 'iphone'}

# ── Logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s  %(levelname)-7s  %(message)s',
    handlers=[
        logging.FileHandler('import_log.txt', encoding='utf-8'),
        logging.StreamHandler(sys.stdout),
    ]
)
log = logging.getLogger(__name__)


# ── Helpers ────────────────────────────────────────────────────────────────────

def extract_model_and_brand(title: str):
    """Strip part-type suffix from end of title to get phone model + brand."""
    title = title.strip()
    model = title
    for suffix in PART_SUFFIXES:
        if title.lower().endswith(suffix.lower()):
            model = title[: len(title) - len(suffix)].strip()
            break
    brand = model.split()[0] if model else 'Unknown'
    return model or title, brand


def process_images(raw):
    """Pipe-separated Windows paths → list of forward-slash paths."""
    if not raw or (isinstance(raw, float)):
        return []
    return [p.strip().replace('\\', '/') for p in str(raw).split('|') if p.strip()]


def combine_key_features(row):
    cols = [
        'key_features_product', 'key_features_quality',
        'key_features_installation', 'key_features_delivery',
        'key_features_warranty',
    ]
    parts = []
    for col in cols:
        val = row.get(col)
        if val and str(val).strip().lower() not in ('', 'nan', 'none'):
            parts.append(str(val).strip())
    return '\n'.join(parts) or None


def safe_float(val):
    try:
        f = float(val)
        return None if pd.isna(f) else f
    except (TypeError, ValueError):
        return None


def safe_int(val):
    try:
        return int(float(val))
    except (TypeError, ValueError):
        return None


def safe_str(val):
    if val is None:
        return None
    s = str(val).strip()
    return None if s.lower() in ('nan', 'none', '') else s


def safe_bool(val):
    if val is True or str(val).lower() == 'true':
        return True
    return False


# ── Schema migration ───────────────────────────────────────────────────────────

def run_migrations(cur):
    log.info("Running ALTER TABLE migrations on spare_parts…")
    cur.execute("""
        ALTER TABLE spare_parts
          ADD COLUMN IF NOT EXISTS sale_price          NUMERIC,
          ADD COLUMN IF NOT EXISTS on_sale             BOOLEAN DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS product_type        TEXT,
          ADD COLUMN IF NOT EXISTS rating              NUMERIC,
          ADD COLUMN IF NOT EXISTS description         TEXT,
          ADD COLUMN IF NOT EXISTS key_features        TEXT,
          ADD COLUMN IF NOT EXISTS source_url          TEXT,
          ADD COLUMN IF NOT EXISTS scraped_at          TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS scraped_product_id  INTEGER
    """)
    log.info("Migrations done.")


# ── Lookup / create helpers ────────────────────────────────────────────────────

def get_or_create_part_category(cur, name: str, cache: dict) -> str:
    key = name.lower().strip()
    if key in cache:
        return cache[key]
    cur.execute("SELECT id FROM part_categories WHERE LOWER(name) = %s", (key,))
    row = cur.fetchone()
    if row:
        cache[key] = str(row[0])
        return cache[key]
    new_id = str(uuid.uuid4())
    cur.execute("INSERT INTO part_categories (id, name) VALUES (%s, %s)", (new_id, name.strip()))
    log.info(f"    + Created part_category: {name}")
    cache[key] = new_id
    return new_id


def get_or_create_brand(cur, brand_name: str, iphone_cat_id: str, android_cat_id: str, cache: dict) -> str:
    key = brand_name.lower().strip()
    if key in cache:
        return cache[key]
    cur.execute("SELECT id FROM spare_parts_brands WHERE LOWER(name) = %s", (key,))
    row = cur.fetchone()
    if row:
        cache[key] = str(row[0])
        return cache[key]
    new_id = str(uuid.uuid4())
    phone_cat_id = iphone_cat_id if key in APPLE_BRANDS else android_cat_id
    cur.execute(
        "INSERT INTO spare_parts_brands (id, name, phone_category_id) VALUES (%s, %s, %s)",
        (new_id, brand_name.strip(), phone_cat_id)
    )
    log.info(f"    + Created brand: {brand_name}")
    cache[key] = new_id
    return new_id


def get_or_create_phone_model(cur, model_name: str, brand_id: str, cache: dict) -> str:
    key = model_name.lower().strip()
    if key in cache:
        return cache[key]
    cur.execute("SELECT id FROM phone_models WHERE LOWER(name) = %s", (key,))
    row = cur.fetchone()
    if row:
        cache[key] = str(row[0])
        return cache[key]
    new_id = str(uuid.uuid4())
    cur.execute(
        "INSERT INTO phone_models (id, name, brand_id) VALUES (%s, %s, %s)",
        (new_id, model_name.strip(), brand_id)
    )
    log.info(f"    + Created phone_model: {model_name}")
    cache[key] = new_id
    return new_id


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        print("Usage: python import_spare_parts.py <excel_file>")
        print("Example: python import_spare_parts.py scraped_data.xlsx")
        sys.exit(1)

    excel_file = sys.argv[1]
    log.info(f"Reading: {excel_file}")

    try:
        df = pd.read_excel(excel_file, dtype=str)   # read all as str, we convert manually
    except FileNotFoundError:
        log.error(f"File not found: {excel_file}")
        sys.exit(1)

    # re-read booleans properly
    for bool_col in ('in_stock', 'on_sale'):
        if bool_col in df.columns:
            df[bool_col] = df[bool_col].map(
                lambda v: True if str(v).strip().lower() == 'true' else False
            )

    log.info(f"Loaded {len(df)} rows.")

    conn = psycopg2.connect(**DB_CONFIG)
    register_uuid()
    conn.autocommit = False
    cur = conn.cursor()

    try:
        # ── Migrations ──
        run_migrations(cur)
        conn.commit()

        # ── Fetch phone_categories ──
        cur.execute("SELECT id, name FROM phone_categories")
        phone_cats = cur.fetchall()
        iphone_cat_id = None
        android_cat_id = None
        for pid, pname in phone_cats:
            if 'iphone' in pname.lower() or 'apple' in pname.lower():
                iphone_cat_id = str(pid)
            else:
                android_cat_id = str(pid)

        # Fallback: if only one category exists use it for both
        if not iphone_cat_id:
            iphone_cat_id = android_cat_id
        if not android_cat_id:
            android_cat_id = iphone_cat_id

        if not iphone_cat_id:
            # Create a default one
            iphone_cat_id = str(uuid.uuid4())
            android_cat_id = str(uuid.uuid4())
            cur.execute("INSERT INTO phone_categories (id, name) VALUES (%s, 'iPhone'), (%s, 'Android')",
                        (iphone_cat_id, android_cat_id))
            conn.commit()
            log.info("Created iPhone and Android phone_categories.")

        log.info(f"iPhone category ID:  {iphone_cat_id}")
        log.info(f"Android category ID: {android_cat_id}")

        # ── Caches ──
        cat_cache   = {}
        brand_cache = {}
        model_cache = {}

        total    = len(df)
        inserted = 0
        skipped  = 0
        errors   = 0

        log.info(f"\nStarting import of {total} rows…\n")

        for idx, row in df.iterrows():
            row = row.to_dict()

            try:
                cur.execute("SAVEPOINT sp_row")

                title      = safe_str(row.get('title'))
                source_url = safe_str(row.get('url'))
                pid        = safe_int(row.get('product_id'))

                if not title:
                    log.warning(f"Row {idx}: Empty title — skipping.")
                    skipped += 1
                    cur.execute("RELEASE SAVEPOINT sp_row")
                    continue

                # ── Deduplication ──
                cur.execute(
                    "SELECT id FROM spare_parts WHERE scraped_product_id = %s OR source_url = %s",
                    (pid, source_url)
                )
                if cur.fetchone():
                    skipped += 1
                    cur.execute("RELEASE SAVEPOINT sp_row")
                    continue

                # ── Step 1: part_category ──
                cat_name        = safe_str(row.get('category')) or 'Uncategorized'
                part_cat_id     = get_or_create_part_category(cur, cat_name, cat_cache)

                # ── Step 2: phone_model ──
                model_name, brand_name = extract_model_and_brand(title)
                brand_id       = get_or_create_brand(cur, brand_name, iphone_cat_id, android_cat_id, brand_cache)
                phone_model_id = get_or_create_phone_model(cur, model_name, brand_id, model_cache)

                # ── Step 3: images ──
                images = process_images(row.get('local_image_paths'))

                # ── Step 4: key features ──
                key_features = combine_key_features(row)

                # ── Step 5: stock ──
                stock = 10 if safe_bool(row.get('in_stock')) else 0

                # ── Other fields ──
                price        = safe_float(row.get('original_price')) or 0
                sale_price   = safe_float(row.get('sale_price'))
                on_sale      = safe_bool(row.get('on_sale'))
                product_type = safe_str(row.get('product_type'))
                rating       = safe_float(row.get('rating'))
                description  = safe_str(row.get('description'))
                scraped_at   = pd.to_datetime(row.get('scraped_at'), errors='coerce')
                scraped_at   = scraped_at.to_pydatetime() if not pd.isna(scraped_at) else None

                # ── Step 6: Insert ──
                cur.execute("""
                    INSERT INTO spare_parts (
                        id, name, part_category_id, phone_model_id,
                        price, sale_price, on_sale, stock,
                        product_type, rating, description, key_features,
                        source_url, scraped_at, scraped_product_id,
                        images, featured, visible
                    ) VALUES (
                        %s, %s, %s, %s,
                        %s, %s, %s, %s,
                        %s, %s, %s, %s,
                        %s, %s, %s,
                        %s, FALSE, TRUE
                    )
                """, (
                    str(uuid.uuid4()), title, part_cat_id, phone_model_id,
                    price, sale_price, on_sale, stock,
                    product_type, rating, description, key_features,
                    source_url, scraped_at, pid,
                    images,
                ))

                cur.execute("RELEASE SAVEPOINT sp_row")
                inserted += 1

                # Commit every 200 rows
                if inserted % 200 == 0:
                    conn.commit()
                    log.info(f"  ✓ {inserted} inserted | {skipped} skipped | {errors} errors  ({idx+1}/{total})")

            except Exception as e:
                cur.execute("ROLLBACK TO SAVEPOINT sp_row")
                cur.execute("RELEASE SAVEPOINT sp_row")
                log.error(f"Row {idx} '{row.get('title','?')}': {e}")
                errors += 1

        conn.commit()

        log.info(f"""
{'='*55}
  IMPORT COMPLETE
  Total rows : {total}
  Inserted   : {inserted}
  Skipped    : {skipped}  (duplicates or empty title)
  Errors     : {errors}
{'='*55}
""")

    except Exception as e:
        conn.rollback()
        log.error(f"Fatal error: {e}")
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == '__main__':
    main()
