import asyncio
import aiohttp
import csv
import json
from bs4 import BeautifulSoup
from datetime import datetime

ZENSERP_API_KEY = "048221e0-182a-11f1-9d3f-87a2a32700e3"



def load_restaurants(filepath: str) -> list:
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)
        return data["restaurants"]


# ── Search for Yelp URL ──────────────────────────────────────────────────────
async def get_yelp_url(session: aiohttp.ClientSession, name: str, address: str) -> str | None:
    params = {
        "q": f"{name} {address} site:yelp.com",
        "apikey": ZENSERP_API_KEY,
        "num": 1,
    }
    async with session.get("https://app.zenserp.com/api/v2/search", params=params) as resp:
        if resp.status != 200:
            print(f"[{name}] Search failed with status {resp.status}")
            return None
        data = await resp.json()
        results = data.get("organic", [])
        if not results:
            print(f"[{name}] No Yelp results found")
            return None
        return results[0].get("url")


# ── Scrape Yelp page HTML ────────────────────────────────────────────────────
async def scrape_page(session: aiohttp.ClientSession, url: str, name: str) -> str | None:
    params = {
        "apikey": ZENSERP_API_KEY,
        "url": url,
    }
    async with session.get("https://app.zenserp.com/api/v2/scrape", params=params) as resp:
        if resp.status != 200:
            print(f"[{name}] Scrape failed with status {resp.status}")
            return None
        data = await resp.json()
        return data.get("html", "")


# ── Parse menu + reviews from HTML ──────────────────────────────────────────
def parse_html(html: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")

    # Menu items
    menu_items = []
    for item in soup.select("div.y-css-maehnx p.y-css-d5upo, div.y-css-maehnx p[data-font-weight='bold']"):
        text = item.get_text(strip=True)
        if text:
            menu_items.append(text)

    # Popular dishes section
    for item in soup.select("section#popular_dishes p.y-css-d5upo, section#popular_dishes p[data-font-weight='bold']"):
        text = item.get_text(strip=True)
        if text and text not in menu_items:
            menu_items.append(text)

    # Reviews
    score, review_count = None, None
    review_section = soup.find(attrs={"data-testid": "BizHeaderReviewCount"})
    if review_section:
        spans = review_section.find_all("span")
        if len(spans) >= 2:
            score = spans[0].get_text(strip=True)
            review_count = spans[1].get_text(strip=True)

    return {
        "menu_items": " | ".join(menu_items) if menu_items else "N/A",
        "score": score or "N/A",
        "review_count": review_count or "N/A",
    }


# ── Scrape a single restaurant ───────────────────────────────────────────────
async def scrape_restaurant(session: aiohttp.ClientSession, restaurant: dict) -> dict:
    name = restaurant.get("name", "")
    address = restaurant.get("address", "")
    cuisine = restaurant.get("cuisine", "")
    type_ = restaurant.get("type", "")

    print(f"[{name}] Searching...")
    yelp_url = await get_yelp_url(session, name, address)
    if not yelp_url:
        return {"name": name, "address": address, "cuisine": cuisine, "type": type_, "yelp_url": "N/A", "menu_items": "N/A", "score": "N/A", "review_count": "N/A"}

    print(f"[{name}] Found: {yelp_url}")
    html = await scrape_page(session, yelp_url, name)
    if not html:
        return {"name": name, "address": address, "cuisine": cuisine, "type": type_, "yelp_url": yelp_url, "menu_items": "N/A", "score": "N/A", "review_count": "N/A"}

    print(f"[{name}] Parsing...")
    parsed = parse_html(html)

    return {
        "name": name,
        "address": address,
        "cuisine": cuisine,
        "type": type_,
        "yelp_url": yelp_url,
        **parsed,
    }


# ── Save results to CSV ──────────────────────────────────────────────────────
def save_to_csv(results: list, filepath: str):
    fieldnames = ["name", "cuisine", "type", "address", "yelp_url", "score", "review_count", "menu_items"]
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results)
    print(f"\nSaved {len(results)} results to {filepath}")


# ── Main ─────────────────────────────────────────────────────────────────────
async def main():
    restaurants = load_restaurants(r"C:\Users\micoc\OneDrive\Documents\GitHub\GauchoGrapevine\Website\restaurants.json")
    print(f"Loaded {len(restaurants)} restaurants\n")

    async with aiohttp.ClientSession() as session:
        tasks = [scrape_restaurant(session, r) for r in restaurants]
        results = await asyncio.gather(*tasks)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    save_to_csv(results, f"yelp_results_{timestamp}.csv")
    print("All done!")


if __name__ == "__main__":
    asyncio.run(main())