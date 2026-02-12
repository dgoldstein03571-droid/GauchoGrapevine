"""
Yelp Menu Scraper with Proxy Support
Educational purposes only - respect Yelp's Terms of Service
"""

import requests
from bs4 import BeautifulSoup
import time
import random
from typing import List, Dict, Optional
import json


class YelpMenuScraper:
    def __init__(self, proxies: Optional[List[str]] = None):
        """
        Initialize the scraper with optional proxy list
        
        Args:
            proxies: List of proxy URLs in format 'http://ip:port' or 'http://user:pass@ip:port'
        """
        self.proxies = proxies or []
        self.current_proxy_index = 0
        
        # User agents to rotate
        self.user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
        ]
    
    def get_next_proxy(self) -> Optional[Dict[str, str]]:
        """Rotate through proxies"""
        if not self.proxies:
            return None
        
        proxy = self.proxies[self.current_proxy_index]
        self.current_proxy_index = (self.current_proxy_index + 1) % len(self.proxies)
        
        return {
            'http': proxy,
            'https': proxy
        }
    
    def get_random_headers(self) -> Dict[str, str]:
        """Generate random headers to avoid detection"""
        return {
            'User-Agent': random.choice(self.user_agents),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0'
        }
    
    def fetch_page(self, url: str, max_retries: int = 3) -> Optional[str]:
        """
        Fetch a page with retry logic and proxy rotation
        
        Args:
            url: URL to fetch
            max_retries: Maximum number of retry attempts
            
        Returns:
            HTML content or None if failed
        """
        for attempt in range(max_retries):
            try:
                headers = self.get_random_headers()
                proxy = self.get_next_proxy()
                
                # Add random delay to avoid rate limiting
                time.sleep(random.uniform(2, 5))
                
                response = requests.get(
                    url,
                    headers=headers,
                    proxies=proxy,
                    timeout=30
                )
                
                if response.status_code == 200:
                    return response.text
                elif response.status_code == 429:
                    print(f"Rate limited. Waiting before retry... (Attempt {attempt + 1}/{max_retries})")
                    time.sleep(random.uniform(10, 20))
                else:
                    print(f"HTTP {response.status_code} received. Retrying... (Attempt {attempt + 1}/{max_retries})")
                    
            except requests.exceptions.RequestException as e:
                print(f"Request failed: {e}. Retrying... (Attempt {attempt + 1}/{max_retries})")
                
        return None
    
    def parse_menu_items(self, html: str) -> List[Dict[str, any]]:
        """
        Parse menu items from Yelp restaurant page
        
        Note: Yelp's HTML structure changes frequently. This is a general approach.
        
        Args:
            html: HTML content of the page
            
        Returns:
            List of menu items with names and prices
        """
        soup = BeautifulSoup(html, 'html.parser')
        menu_items = []
        
        # Method 1: Look for structured menu sections
        # Yelp often uses specific classes for menu items (these may change)
        menu_sections = soup.find_all('div', class_=lambda x: x and 'menu' in x.lower())
        
        for section in menu_sections:
            items = section.find_all(['div', 'li'], class_=lambda x: x and 'item' in x.lower())
            
            for item in items:
                try:
                    # Try to find item name
                    name_elem = item.find(['h3', 'h4', 'span', 'div'], class_=lambda x: x and ('name' in x.lower() or 'title' in x.lower()))
                    name = name_elem.get_text(strip=True) if name_elem else None
                    
                    # Try to find price
                    price_elem = item.find(['span', 'div'], class_=lambda x: x and 'price' in x.lower())
                    if not price_elem:
                        # Also look for dollar signs
                        price_elem = item.find(text=lambda x: x and '$' in x)
                    
                    price = price_elem.get_text(strip=True) if price_elem else None
                    
                    # Try to find description
                    desc_elem = item.find(['p', 'span', 'div'], class_=lambda x: x and 'desc' in x.lower())
                    description = desc_elem.get_text(strip=True) if desc_elem else None
                    
                    if name:
                        menu_items.append({
                            'name': name,
                            'price': price,
                            'description': description
                        })
                except Exception as e:
                    print(f"Error parsing menu item: {e}")
                    continue
        
        # Method 2: Look for any price patterns if Method 1 didn't work
        if not menu_items:
            price_elements = soup.find_all(text=lambda x: x and '$' in str(x))
            
            for price_elem in price_elements:
                parent = price_elem.parent
                if parent:
                    # Try to find associated name nearby
                    siblings = parent.find_all(['h3', 'h4', 'span', 'div'], limit=5)
                    for sibling in siblings:
                        text = sibling.get_text(strip=True)
                        if text and '$' not in text and len(text) > 3:
                            menu_items.append({
                                'name': text,
                                'price': price_elem.strip(),
                                'description': None
                            })
                            break
        
        return menu_items
    
    def scrape_restaurant(self, restaurant_url: str) -> Dict[str, any]:
        """
        Scrape menu information from a Yelp restaurant page
        
        Args:
            restaurant_url: Full URL to the Yelp restaurant page
            
        Returns:
            Dictionary containing restaurant info and menu items
        """
        print(f"Scraping: {restaurant_url}")
        
        html = self.fetch_page(restaurant_url)
        
        if not html:
            return {
                'url': restaurant_url,
                'success': False,
                'error': 'Failed to fetch page'
            }
        
        soup = BeautifulSoup(html, 'html.parser')
        
        # Extract restaurant name
        name_elem = soup.find('h1')
        restaurant_name = name_elem.get_text(strip=True) if name_elem else 'Unknown'
        
        # Extract menu items
        menu_items = self.parse_menu_items(html)
        
        return {
            'url': restaurant_url,
            'success': True,
            'restaurant_name': restaurant_name,
            'menu_items': menu_items,
            'total_items': len(menu_items)
        }


def main():
    """Example usage"""
    
    # Example proxy list (you would need to provide actual working proxies)
    proxies = [
        # 'http://proxy1.example.com:8080',
        # 'http://username:password@proxy2.example.com:8080',
        # Add your proxies here
    ]
    
    scraper = YelpMenuScraper(proxies=proxies)
    
    # Example restaurant URL
    # Replace with actual Yelp restaurant URL
    restaurant_url = "https://www.yelp.com/biz/restaurant-name-city"
    
    result = scraper.scrape_restaurant(restaurant_url)
    
    # Save results
    if result['success']:
        print(f"\nRestaurant: {result['restaurant_name']}")
        print(f"Found {result['total_items']} menu items\n")
        
        for item in result['menu_items']:
            print(f"- {item['name']}: {item['price']}")
            if item['description']:
                print(f"  {item['description']}")
        
        # Save to JSON
        with open('menu_data.json', 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        
        print(f"\nData saved to menu_data.json")
    else:
        print(f"Failed to scrape: {result.get('error')}")


if __name__ == "__main__":
    main()