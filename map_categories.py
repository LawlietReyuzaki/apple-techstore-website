"""
Category Mapping Script
Maps raw dmarket.pk categories → 6 valid app categories
"""
import csv

# ── Complete mapping: raw category → valid app category ──────────────────────
CATEGORY_MAP = {

    # ── NEW & USED PHONES ──────────────────────────────────────────────────────
    # Phone brands
    "Apple iPhones":          "New & Used Phones",
    "Samsung Galaxy Phones":  "New & Used Phones",
    "Huawei Phones":          "New & Used Phones",
    "Xiaomi Phones":          "New & Used Phones",
    "Oppo Phones":            "New & Used Phones",
    "Vivo Phones":            "New & Used Phones",
    "Realme Phones":          "New & Used Phones",
    "OnePlus Phones":         "New & Used Phones",
    "Motorola Phones":        "New & Used Phones",
    "Nokia Phones":           "New & Used Phones",
    "LG Phones":              "New & Used Phones",
    "Sony Xperia Phones":     "New & Used Phones",
    "Google Pixel Phones":    "New & Used Phones",
    "Lenovo Phones":          "New & Used Phones",
    "Sharp Aquos Phones":     "New & Used Phones",
    "Fujitsu Phones":         "New & Used Phones",
    "Rakuten Phones":         "New & Used Phones",
    "TCL Phones":             "New & Used Phones",
    "ZTE Phones":             "New & Used Phones",
    "T-Mobile Phones":        "New & Used Phones",
    "Kyocera Phones":         "New & Used Phones",
    "Other Brand Phones":     "New & Used Phones",
    "Gaming Mobile":          "New & Used Phones",
    "Used Mobile":            "New & Used Phones",
    # Tablets (closest valid category is New & Used Phones — mobile devices)
    "Apple iPad":             "New & Used Phones",
    "Samsung Tablet":         "New & Used Phones",
    "Huawei Tablet":          "New & Used Phones",
    "Lenovo Tablet":          "New & Used Phones",
    "Amazon Fire Tablet":     "New & Used Phones",
    "Alcatel Tablet":         "New & Used Phones",
    "Fujitsu Tablet":         "New & Used Phones",
    "Oppo Tablet":            "New & Used Phones",
    "TCL Tablet":             "New & Used Phones",

    # ── MOBILE SPARE PARTS ────────────────────────────────────────────────────
    # Brand-specific phone LCD Panel Units
    "iPhone LCD Panel Unit":        "Mobile Spare Parts",
    "Samsung Galaxy LCD Panel Unit":"Mobile Spare Parts",
    "Huawei LCD Panel Unit":        "Mobile Spare Parts",
    "Xiaomi LCD Panel Unit":        "Mobile Spare Parts",
    "Oppo LCD Panel Unit":          "Mobile Spare Parts",
    "Vivo LCD Panel Unit":          "Mobile Spare Parts",
    "Realme LCD Panel Unit":        "Mobile Spare Parts",
    "OnePlus LCD Panel Unit":       "Mobile Spare Parts",
    "Motorola LCD Panel Unit":      "Mobile Spare Parts",
    "Nokia LCD Panel Unit":         "Mobile Spare Parts",
    "LG LCD Panel Unit":            "Mobile Spare Parts",
    "Sony Xperia LCD Panel Unit":   "Mobile Spare Parts",
    "Google Pixel LCD Panel Unit":  "Mobile Spare Parts",
    "Lenovo LCD Panel Unit":        "Mobile Spare Parts",
    "HTC LCD Panel Unit":           "Mobile Spare Parts",
    "Infinix LCD Panel Unit":       "Mobile Spare Parts",
    "Tecno LCD Panel Unit":         "Mobile Spare Parts",
    "iTel LCD Panel Unit":          "Mobile Spare Parts",
    "Sparx LCD Panel Unit":         "Mobile Spare Parts",
    "Xsmart LCD Panel Unit":        "Mobile Spare Parts",
    "Sharp Aquos LCD Panel Unit":   "Mobile Spare Parts",
    "Fujitsu LCD Panel Unit":       "Mobile Spare Parts",
    "Rakuten LCD Panel Unit":       "Mobile Spare Parts",
    "TCL LCD Panel Unit":           "Mobile Spare Parts",
    "ZTE LCD Panel Unit":           "Mobile Spare Parts",
    "Asus LCD Panel Unit":          "Mobile Spare Parts",
    "AllCall LCD Panel Unit":       "Mobile Spare Parts",
    "DCode LCD Panel Unit":         "Mobile Spare Parts",
    "Digit LCD Panel Unit":         "Mobile Spare Parts",
    "Alcatel LCD Panel Unit":       "Mobile Spare Parts",
    "Nothing Phone LCD Panel Unit": "Mobile Spare Parts",
    # Internal phone components
    "Mobile Batteries":             "Mobile Spare Parts",
    "Mobile Touch Glass":           "Mobile Spare Parts",
    "Sim Tray Jacket":              "Mobile Spare Parts",
    "Charging Port":                "Mobile Spare Parts",
    "Charging Connector":           "Mobile Spare Parts",
    "Back Camera Glass Lens":       "Mobile Spare Parts",
    "Back Panel Glass":             "Mobile Spare Parts",
    "Back Rear Cameras Modules":    "Mobile Spare Parts",
    "Front Cameras Modules":        "Mobile Spare Parts",
    "Camera Modules":               "Mobile Spare Parts",
    "Camera Lift Motor":            "Mobile Spare Parts",
    "Motherboard Flex Strip":       "Mobile Spare Parts",
    "Motherboard":                  "Mobile Spare Parts",
    "Power Button & Volume Button Flex": "Mobile Spare Parts",
    "Side Keys Button":             "Mobile Spare Parts",
    "LCD Display Connectors":       "Mobile Spare Parts",
    "LCD Display Flex Cable":       "Mobile Spare Parts",
    "Loud Speakers Ringtone Buzzer":"Mobile Spare Parts",
    "Earpieces Ear Speaker":        "Mobile Spare Parts",
    "Fingerprint Sensor Flex":      "Mobile Spare Parts",
    "Fingerprint Sensor Scanner":   "Mobile Spare Parts",
    "Sensor Flex":                  "Mobile Spare Parts",
    "Handsfree Jack":               "Mobile Spare Parts",
    "SIM Card Reader Socket":       "Mobile Spare Parts",
    "S Pen":                        "Mobile Spare Parts",
    "Complete Housing Casing":      "Mobile Spare Parts",
    "Spin Axis Flex Cable":         "Mobile Spare Parts",
    "Smart Watch Touch Glass":      "Mobile Spare Parts",
    # Tablet spare parts (closest: Mobile Spare Parts)
    "Tablet Touch Glass":           "Mobile Spare Parts",
    "Tablet Batteries":             "Mobile Spare Parts",
    "Tablet Charging Port":         "Mobile Spare Parts",
    "Tablet LCD Panel Unit":        "Mobile Spare Parts",
    "Tablet Loud Speaker":          "Mobile Spare Parts",
    "Tablet Motherboard Flex Strips":"Mobile Spare Parts",

    # ── MOBILE ACCESSORIES ────────────────────────────────────────────────────
    "Cleaner Tools":                "Mobile Accessories",

    # ── LAPTOP ACCESSORIES ────────────────────────────────────────────────────
    "Laptop Charger":               "Laptop Accessories",

    # ── LAPTOP & COMPUTER SPARE PARTS ─────────────────────────────────────────
    "Laptop Batteries":             "Laptop & Computer Spare Parts",
}

# ── Apply mapping ─────────────────────────────────────────────────────────────
INPUT_FILE  = "dmarket_products_with_images.csv"
OUTPUT_FILE = "dmarket_products_mapped.csv"

unmapped = {}

with open(INPUT_FILE, newline='', encoding='utf-8') as infile, \
     open(OUTPUT_FILE, 'w', newline='', encoding='utf-8') as outfile:

    reader = csv.DictReader(infile)
    fieldnames = reader.fieldnames + ['mapped_category']
    writer = csv.DictWriter(outfile, fieldnames=fieldnames)
    writer.writeheader()

    for row in reader:
        raw_cat = row['category']
        mapped  = CATEGORY_MAP.get(raw_cat)
        if mapped is None:
            unmapped[raw_cat] = unmapped.get(raw_cat, 0) + 1
            mapped = "UNMAPPED"
        row['mapped_category'] = mapped
        writer.writerow(row)

# ── Report ────────────────────────────────────────────────────────────────────
print(f"\nOK: Mapped CSV written to: {OUTPUT_FILE}")

if unmapped:
    print(f"\nWARN: UNMAPPED categories ({len(unmapped)}):")
    for cat, count in sorted(unmapped.items()):
        print(f"   {count:5d}  {cat}")
else:
    print("\nOK: All categories mapped -- zero unmapped rows.")

# ── Summary by mapped_category ────────────────────────────────────────────────
from collections import Counter
counts = Counter()
with open(OUTPUT_FILE, newline='', encoding='utf-8') as f:
    for row in csv.DictReader(f):
        counts[row['mapped_category']] += 1

print("\nProducts per mapped category:")
for cat, n in sorted(counts.items()):
    print(f"   {n:5d}  {cat}")
