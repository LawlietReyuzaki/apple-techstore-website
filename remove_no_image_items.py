"""
remove_no_image_items.py
------------------------
Finds all items across products / shop_items / spare_parts that have no
images (NULL or empty array), exports them to a timestamped CSV for
reference, then permanently deletes them from the database.

Usage:
    python remove_no_image_items.py [--dry-run]

    --dry-run   Show what would be deleted without actually deleting.
"""

import csv
import sys
import os
from datetime import datetime
import psycopg2
import psycopg2.extras

# ── DB connection ────────────────────────────────────────────────────────────
DB = dict(host="localhost", port=5433, user="admin", password="123456", dbname="mydatabase")

# ── Tables to check ──────────────────────────────────────────────────────────
# Each entry: (table_name, extra_columns_to_export)
TABLES = [
    ("products",    ["brand", "price", "stock", "category_id"]),
    ("shop_items",  ["price", "sale_price", "stock", "category_id"]),
    ("spare_parts", ["price", "stock", "part_category_id", "phone_model_id"]),
]

DRY_RUN = "--dry-run" in sys.argv


def no_image_query(table: str, extra_cols: list[str]) -> str:
    """SELECT rows that have no images (NULL or empty array)."""
    cols = ", ".join(["id", "name"] + extra_cols + ["created_at"])
    return f"""
        SELECT {cols}
        FROM {table}
        WHERE images IS NULL
           OR array_length(images, 1) IS NULL
        ORDER BY name
    """


def main():
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    csv_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        f"removed_no_image_items_{ts}.csv"
    )

    conn = psycopg2.connect(**DB)
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    all_rows: list[dict] = []
    counts: dict[str, int] = {}

    # ── 1. Collect ──────────────────────────────────────────────────────────
    for table, extra_cols in TABLES:
        cur.execute(no_image_query(table, extra_cols))
        rows = cur.fetchall()
        counts[table] = len(rows)

        for row in rows:
            record = {"_table": table}
            record.update(dict(row))
            all_rows.append(record)

    total = sum(counts.values())

    # ── 2. Report preview ───────────────────────────────────────────────────
    print(f"\n{'='*60}")
    print(f"  Items with NO images found:")
    print(f"{'='*60}")
    for table, count in counts.items():
        print(f"  {table:<20} {count:>4} item(s)")
    print(f"  {'TOTAL':<20} {total:>4}")
    print(f"{'='*60}")

    if total == 0:
        print("\n  Nothing to remove. All items have at least one image.\n")
        cur.close()
        conn.close()
        return

    # Print a preview table
    print("\n  Items to be removed:")
    print(f"  {'Table':<15} {'Name':<50} {'ID'}")
    print(f"  {'-'*15} {'-'*50} {'-'*36}")
    for r in all_rows:
        print(f"  {r['_table']:<15} {str(r['name']):<50} {r['id']}")

    # ── 3. Write CSV ─────────────────────────────────────────────────────────
    if all_rows:
        # Collect all unique keys across all rows (tables have different columns)
        fieldnames = ["_table", "id", "name"]
        seen = set(fieldnames)
        for r in all_rows:
            for k in r:
                if k not in seen:
                    fieldnames.append(k)
                    seen.add(k)

        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
            writer.writeheader()
            writer.writerows(all_rows)

        print(f"\n  CSV saved -> {csv_path}")

    # ── 4. Delete ────────────────────────────────────────────────────────────
    if DRY_RUN:
        print("\n  [DRY RUN] No deletions performed. Re-run without --dry-run to delete.\n")
        cur.close()
        conn.close()
        return

    print(f"\n  {'='*60}")
    print(f"  Deleting {total} item(s) from the database...")
    print(f"  {'='*60}")

    # FK column name in order_items for each table
    ORDER_ITEMS_FK = {
        "products":    "product_id",
        "shop_items":  "shop_item_id",
        "spare_parts": "spare_part_id",
    }

    deleted: dict[str, int] = {}
    for table, extra_cols in TABLES:
        # Fetch IDs again (safe, in case counts changed)
        cur.execute(f"""
            SELECT id FROM {table}
            WHERE images IS NULL OR array_length(images, 1) IS NULL
        """)
        ids = [row["id"] for row in cur.fetchall()]

        if not ids:
            deleted[table] = 0
            continue

        # Delete referencing order_items rows first (avoid FK violation)
        fk_col = ORDER_ITEMS_FK.get(table)
        if fk_col:
            cur.execute(
                f"DELETE FROM order_items WHERE {fk_col} = ANY(%s::uuid[])",
                (ids,)
            )

        cur.execute(
            f"DELETE FROM {table} WHERE id = ANY(%s::uuid[])",
            (ids,)
        )
        deleted[table] = cur.rowcount

    conn.commit()

    print("\n  Deleted:")
    for table, count in deleted.items():
        print(f"  {table:<20} {count:>4} row(s) removed")
    print(f"\n  Done. Backup CSV: {csv_path}\n")

    cur.close()
    conn.close()


if __name__ == "__main__":
    main()
