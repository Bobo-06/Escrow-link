"""
Biz-Salama Marketplace Seeder
Populates MongoDB with realistic Tanzanian products across fashion,
electronics, home, beauty, food, and agriculture categories.

Run:
    cd /app/backend && python -m scripts.seed_marketplace

Idempotent: uses deterministic product_id based on slug, so re-running
will upsert rather than duplicate.
"""
import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

BACKEND_DIR = Path(__file__).parent.parent
load_dotenv(BACKEND_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

SEED_SELLER = {
    "user_id": "seed_seller_biz_salama",
    "name": "Biz-Salama Verified Sellers",
    "username": "biz_salama_verified",
    "phone": "+255700000001",
    "email": "verified@biz-salama.co.tz",
    "business_name": "Biz-Salama Verified Collective",
    "is_women_owned": True,
    "is_verified": True,
    "location": "Dar es Salaam",
}

# Curated product catalogue — realistic TZ prices in TZS,
# Unsplash CDN images (served via https so OG previews work).
PRODUCTS = [
    # FASHION (6)
    {"slug": "kitenge-5m-premium", "name": "Kitenge Premium Fabric (5m)", "price": 75000, "category": "fashion",
     "description": "Authentic African wax-print kitenge, 5 metres. Perfect for dresses, suits & headwraps.",
     "location": "Kariakoo, Dar es Salaam",
     "image": "https://images.unsplash.com/photo-1517940310602-26535839fe84?w=800&q=80"},
    {"slug": "maasai-leather-sandals", "name": "Handmade Maasai Leather Sandals", "price": 45000, "category": "fashion",
     "description": "Genuine cowhide leather sandals handcrafted by Maasai artisans. All sizes 36–46.",
     "location": "Arusha",
     "image": "https://images.unsplash.com/photo-1605733160314-4fc7dac4bb16?w=800&q=80"},
    {"slug": "kanga-traditional-pair", "name": "Kanga Traditional Pair (2pc)", "price": 38000, "category": "fashion",
     "description": "Classic Zanzibari kanga pair with Swahili proverb. Cotton, 100cm x 150cm each.",
     "location": "Stone Town, Zanzibar",
     "image": "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=800&q=80"},
    {"slug": "mens-kanzu-white", "name": "Men's Kanzu (White Embroidered)", "price": 85000, "category": "fashion",
     "description": "Hand-embroidered white kanzu for Eid & weddings. Cotton blend, sizes M–XXL.",
     "location": "Mwanza",
     "image": "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&q=80"},
    {"slug": "beaded-maasai-necklace", "name": "Beaded Maasai Statement Necklace", "price": 28000, "category": "fashion",
     "description": "Traditional multi-layer beaded collar, handmade by Maasai women cooperative.",
     "location": "Moshi",
     "image": "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80"},
    {"slug": "tingatinga-tshirt", "name": "Tingatinga Art T-Shirt", "price": 22000, "category": "fashion",
     "description": "Cotton tee featuring iconic Tingatinga wildlife art. Unisex, sizes S–XXL.",
     "location": "Bagamoyo",
     "image": "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80"},

    # ELECTRONICS (5)
    {"slug": "samsung-a54", "name": "Samsung Galaxy A54 5G (128GB)", "price": 850000, "category": "electronics",
     "description": "Brand new, sealed. 1-year official warranty. 50MP camera, 5000mAh battery.",
     "location": "Mlimani City, Dar",
     "image": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80"},
    {"slug": "tecno-camon-20", "name": "Tecno Camon 20 Pro (256GB)", "price": 620000, "category": "electronics",
     "description": "64MP RGBW-Pro camera, 120Hz AMOLED, 8GB RAM + 8GB extended.",
     "location": "Kariakoo",
     "image": "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800&q=80"},
    {"slug": "jbl-go3-speaker", "name": "JBL Go 3 Bluetooth Speaker", "price": 95000, "category": "electronics",
     "description": "Portable waterproof speaker, 5hr playtime, pro sound. Multiple colours.",
     "location": "Mwenge",
     "image": "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800&q=80"},
    {"slug": "solar-home-kit", "name": "Solar Home Kit 100W + 4 LEDs", "price": 320000, "category": "electronics",
     "description": "100W panel, battery, inverter, 4 LED bulbs, phone charging. Perfect for off-grid.",
     "location": "Dodoma",
     "image": "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&q=80"},
    {"slug": "hp-laptop-15", "name": "HP 15 Laptop (Core i5, 8GB, 512SSD)", "price": 1850000, "category": "electronics",
     "description": "11th gen i5, Windows 11, 15.6\" FHD. Refurbished grade A with 6-month warranty.",
     "location": "Masaki, Dar",
     "image": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80"},

    # HOME & LIVING (5)
    {"slug": "mahogany-coffee-table", "name": "Handcrafted Mahogany Coffee Table", "price": 180000, "category": "home",
     "description": "Solid mahogany, hand-polished, 120 × 60cm. Built to last generations.",
     "location": "Mwenge Carvers Market",
     "image": "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80"},
    {"slug": "woven-basket-set", "name": "Iringa Woven Basket Set (3pc)", "price": 55000, "category": "home",
     "description": "Sisal & raffia baskets, sizes S/M/L. Perfect storage or planters.",
     "location": "Iringa",
     "image": "https://images.unsplash.com/photo-1577083552431-6e5fd01988ec?w=800&q=80"},
    {"slug": "maasai-shuka-blanket", "name": "Maasai Shuka Blanket (Red Check)", "price": 32000, "category": "home",
     "description": "Authentic Maasai plaid throw blanket, 100% cotton, 150 × 200cm.",
     "location": "Arusha",
     "image": "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&q=80"},
    {"slug": "clay-cooking-pot-chungu", "name": "Traditional Clay Cooking Pot (Chungu)", "price": 18000, "category": "home",
     "description": "Authentic Tanzanian clay pot for pilau & mchuzi. 4L capacity, oven safe.",
     "location": "Pwani",
     "image": "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80"},
    {"slug": "tingatinga-painting-lions", "name": "Tingatinga Painting — Lions of Serengeti", "price": 125000, "category": "home",
     "description": "Original canvas Tingatinga art, signed. 60 × 80cm. Certificate of authenticity.",
     "location": "Bagamoyo Arts Village",
     "image": "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=800&q=80"},

    # BEAUTY & HEALTH (4)
    {"slug": "shea-butter-raw-500g", "name": "Raw Unrefined Shea Butter (500g)", "price": 25000, "category": "beauty",
     "description": "100% pure, unrefined shea butter from Northern Tanzania. For skin, hair & stretch marks.",
     "location": "Sinza, Dar",
     "image": "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800&q=80"},
    {"slug": "baobab-oil-cold-pressed", "name": "Cold-Pressed Baobab Oil (250ml)", "price": 42000, "category": "beauty",
     "description": "Pure baobab seed oil, cold-pressed in Dodoma. Anti-aging, hair growth, dry skin.",
     "location": "Dodoma",
     "image": "https://images.unsplash.com/photo-1570194065650-d99fb4bedf0a?w=800&q=80"},
    {"slug": "zanzibar-spice-soap", "name": "Zanzibar Spice Handmade Soap (Pack of 4)", "price": 20000, "category": "beauty",
     "description": "Cloves, cinnamon, ginger & nutmeg soaps. Cold process, natural ingredients.",
     "location": "Zanzibar",
     "image": "https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=800&q=80"},
    {"slug": "moringa-capsules-60", "name": "Moringa Leaf Capsules (60 × 500mg)", "price": 35000, "category": "beauty",
     "description": "Organic moringa grown in Morogoro. Energy, immunity, iron boost.",
     "location": "Morogoro",
     "image": "https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=800&q=80"},

    # FOOD & GROCERIES (5)
    {"slug": "tabora-honey-1kg", "name": "Pure Tabora Forest Honey (1kg)", "price": 35000, "category": "food",
     "description": "Raw, unfiltered miombo forest honey from Tabora beekeepers co-op.",
     "location": "Tabora",
     "image": "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&q=80"},
    {"slug": "kilimanjaro-coffee-500g", "name": "Kilimanjaro AA Coffee Beans (500g)", "price": 28000, "category": "food",
     "description": "Single-origin arabica, medium roast. Bright acidity, citrus notes.",
     "location": "Moshi",
     "image": "https://images.unsplash.com/photo-1559525839-d9acfd39b87f?w=800&q=80"},
    {"slug": "cashew-nuts-mtwara-1kg", "name": "Roasted Cashew Nuts Mtwara (1kg)", "price": 48000, "category": "food",
     "description": "Premium W240 cashews from Mtwara, lightly salted. Resealable pack.",
     "location": "Mtwara",
     "image": "https://images.unsplash.com/photo-1536591375634-2ebb0e0db1c2?w=800&q=80"},
    {"slug": "pilau-spice-mix-250g", "name": "Zanzibar Pilau Masala Spice Mix (250g)", "price": 12000, "category": "food",
     "description": "Hand-blended cardamom, cloves, cumin, cinnamon. Traditional Zanzibari recipe.",
     "location": "Stone Town",
     "image": "https://images.unsplash.com/photo-1509358271058-acd22cc93898?w=800&q=80"},
    {"slug": "red-rice-kyela-5kg", "name": "Kyela Red Rice (5kg)", "price": 32000, "category": "food",
     "description": "Aromatic Kyela red rice — Tanzania's finest. Unpolished, nutty flavour.",
     "location": "Mbeya",
     "image": "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&q=80"},

    # AGRICULTURE (4)
    {"slug": "broiler-chicks-day-old-50", "name": "Day-Old Broiler Chicks (50pcs)", "price": 95000, "category": "agriculture",
     "description": "Cobb 500 strain, vaccinated, delivered to farms in Dar/Arusha/Mwanza.",
     "location": "Kibaha",
     "image": "https://images.unsplash.com/photo-1569196770463-8e7a18ec9306?w=800&q=80"},
    {"slug": "maize-seeds-dk8031-10kg", "name": "DK8031 Hybrid Maize Seed (10kg)", "price": 58000, "category": "agriculture",
     "description": "Drought-tolerant hybrid maize, 120-day maturity. 1 acre coverage.",
     "location": "Iringa",
     "image": "https://images.unsplash.com/photo-1601593768793-fb95ef8aca73?w=800&q=80"},
    {"slug": "dairy-goat-toggenburg", "name": "Dairy Goat — Toggenburg Cross", "price": 450000, "category": "agriculture",
     "description": "Young female, 8 months, vaccinated. 2–3 litres milk/day when mature.",
     "location": "Kilimanjaro",
     "image": "https://images.unsplash.com/photo-1600443295706-7e83b4e81180?w=800&q=80"},
    {"slug": "drip-irrigation-kit-1acre", "name": "Drip Irrigation Kit (1 Acre)", "price": 680000, "category": "agriculture",
     "description": "Complete kit: main line, laterals, emitters, filter. Installation guide included.",
     "location": "Morogoro",
     "image": "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&q=80"},
]


def _fees(price_tzs: float) -> dict:
    """Fee calculation mirroring backend calculate_fees (2.5% buyer, 3.5% seller)."""
    buyer_protection_fee = round(price_tzs * 0.025)
    seller_acquisition_fee = round(price_tzs * 0.035)
    return {
        "buyer_protection_fee": buyer_protection_fee,
        "seller_acquisition_fee": seller_acquisition_fee,
        "total_buyer_pays": round(price_tzs + buyer_protection_fee),
        "seller_receives": round(price_tzs - seller_acquisition_fee),
    }


async def main():
    mclient = AsyncIOMotorClient(MONGO_URL)
    db = mclient[DB_NAME]

    # 1. Upsert seed seller user
    await db.users.update_one(
        {"user_id": SEED_SELLER["user_id"]},
        {"$set": {**SEED_SELLER, "created_at": datetime.now(timezone.utc)}},
        upsert=True,
    )
    print(f"✓ Seed seller ready: {SEED_SELLER['user_id']}")

    # 2. Upsert products
    inserted = 0
    updated = 0
    for idx, p in enumerate(PRODUCTS):
        product_id = f"seed_{p['slug']}"
        payment_link_code = f"SEED{idx:03d}"
        fees = _fees(p["price"])

        doc = {
            "product_id": product_id,
            "seller_id": SEED_SELLER["user_id"],
            "seller_name": SEED_SELLER["name"],
            "seller_business": SEED_SELLER["business_name"],
            "seller_is_women_owned": SEED_SELLER["is_women_owned"],
            "name": p["name"],
            "price": p["price"],
            "price_tzs": p["price"],
            "currency": "TZS",
            "description": p["description"],
            "image": p["image"],
            "payment_link_code": payment_link_code,
            "category": p["category"],
            "location": p["location"],
            "rating": 4.5 + (idx % 5) * 0.1,  # 4.5–4.9
            "is_verified": True,
            "is_active": True,
            "export_category": None,
            "international_shipping": False,
            "shipping_countries": [],
            **fees,
        }

        existing = await db.products.find_one({"product_id": product_id}, {"_id": 0})
        if existing:
            await db.products.update_one(
                {"product_id": product_id},
                {"$set": {k: v for k, v in doc.items() if k not in ("created_at",)}},
            )
            updated += 1
        else:
            doc["created_at"] = datetime.now(timezone.utc)
            await db.products.insert_one(doc)
            inserted += 1

    print(f"✓ Products — inserted: {inserted}, updated: {updated}, total in catalogue: {len(PRODUCTS)}")
    mclient.close()


if __name__ == "__main__":
    asyncio.run(main())
