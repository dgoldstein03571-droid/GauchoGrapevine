// search.js — GauchoGrapevine
// Weighted search: higher-rated restaurants appear first
// Clicking a restaurant opens the review sidebar + pins map

const searchInput = document.getElementById('searchInput');
const mapIframe = document.querySelector('iframe');

let restaurantData = null;

// ─── Load restaurant data ────────────────────────────────────────────────────

async function loadRestaurants() {
    try {
        const response = await fetch('restaurants.json');
        const data = await response.json();
        restaurantData = data.restaurants;
        console.log('Loaded', restaurantData.length, 'restaurants');
    } catch (error) {
        console.error('Error loading restaurant data:', error);
        alert('Failed to load restaurant data. Make sure restaurants.json exists.');
    }
}

loadRestaurants();

// ─── Search input ────────────────────────────────────────────────────────────

searchInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        const searchTerm = searchInput.value.trim();
        if (searchTerm) {
            handleSearch(searchTerm);
        } else {
            if (restaurantData) displayResults(restaurantData, 'all');
        }
    }
});

// ─── Filter + sort ───────────────────────────────────────────────────────────

function handleSearch(searchTerm) {
    if (!restaurantData) {
        alert('Restaurant data is still loading. Please try again.');
        return;
    }

    const results = restaurantData.filter(restaurant => {
        const q = searchTerm.toLowerCase();
        return (
            restaurant.name.toLowerCase().includes(q) ||
            restaurant.cuisine.toLowerCase().includes(q) ||
            restaurant.type.toLowerCase().includes(q)
        );
    });

    if (results.length > 0) {
        displayResults(results, searchTerm);
    } else {
        alert(`No restaurants found matching "${searchTerm}". Try searching for: pizza, burger, mexican, japanese, cafe`);
    }
}

/**
 * Sort restaurants by their average review score (desc).
 * Unreviewed restaurants fall to the bottom, sorted by name.
 */
function sortByRating(restaurants) {
    return [...restaurants].sort((a, b) => {
        const ratingA = window.reviewSystem ? window.reviewSystem.getRestaurantRating(a.name) : null;
        const ratingB = window.reviewSystem ? window.reviewSystem.getRestaurantRating(b.name) : null;

        const scoreA = ratingA ? ratingA.average : -1;
        const scoreB = ratingB ? ratingB.average : -1;

        if (scoreB !== scoreA) return scoreB - scoreA;
        return a.name.localeCompare(b.name);
    });
}

// ─── Render results ──────────────────────────────────────────────────────────

function displayResults(restaurants, searchTerm) {
    let resultsDiv = document.getElementById('results');
    if (!resultsDiv) {
        resultsDiv = document.createElement('div');
        resultsDiv.id = 'results';
        resultsDiv.className = 'results-container';
        document.querySelector('.iframe-container').appendChild(resultsDiv);
    }

    resultsDiv.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
        padding: 12px 15px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid #e0e0e0;
        background: #fafafa;
    `;
    const label = searchTerm === 'all' ? 'restaurants' : `results for "${searchTerm}"`;
    header.innerHTML = `
        <span style="font-weight:700; font-size:14px; color:#333;">
            ${restaurants.length} ${label}
        </span>
        <button onclick="closeResults()" style="
            background:#dc3545; color:white; border:none;
            padding:4px 10px; border-radius:5px; cursor:pointer; font-size:13px;
        ">✕ Close</button>
    `;
    resultsDiv.appendChild(header);

    // Sort by rating
    const sorted = sortByRating(restaurants);

    sorted.forEach((restaurant, idx) => {
        const card = document.createElement('div');
        card.className = 'restaurant-card';
        card.style.cursor = 'pointer';

        const ratingInfo = window.reviewSystem
            ? window.reviewSystem.getRestaurantRating(restaurant.name)
            : null;

        let ratingBadge = '';
        let rankBadge = '';

        if (ratingInfo) {
            const stars = '★'.repeat(Math.round(ratingInfo.average)) + '☆'.repeat(5 - Math.round(ratingInfo.average));
            ratingBadge = `
                <span class="rating-badge">
                    <span class="star">★</span>
                    ${ratingInfo.average.toFixed(1)}
                    <span class="count">(${ratingInfo.count})</span>
                </span>
            `;
        } else {
            ratingBadge = `<span style="font-size:12px; color:#aaa; margin-left:8px;">No reviews</span>`;
        }

        // Rank medal for top 3 rated
        if (ratingInfo && idx < 3) {
            const medals = ['🥇', '🥈', '🥉'];
            rankBadge = `<span style="font-size:18px; margin-right:4px;">${medals[idx]}</span>`;
        }

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <h3 style="margin:0; display:flex; align-items:center; flex-wrap:wrap; gap:4px;">
                    ${rankBadge}${restaurant.name}${ratingBadge}
                </h3>
            </div>
            <p style="margin:6px 0 2px;"><strong>Type:</strong> ${restaurant.type}</p>
            <p style="margin:2px 0;"><strong>Cuisine:</strong> ${restaurant.cuisine}</p>
            <p style="margin:2px 0;"><strong>Address:</strong> ${restaurant.address}</p>
            <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">
                <button onclick="event.stopPropagation(); zoomToLocation(${restaurant.lat}, ${restaurant.lon}, '${restaurant.name.replace(/'/g, "\\'")}')">
                    📍 View on Map
                </button>
                <button class="review-btn" onclick="event.stopPropagation(); openReviewSidebar('${restaurant.name.replace(/'/g, "\\'")}')">
                    ⭐ Reviews
                </button>
            </div>
        `;

        // Clicking anywhere on card opens the review sidebar and pins map
        card.addEventListener('click', () => {
            pinAndOpenReviews(restaurant.lat, restaurant.lon, restaurant.name);
        });

        resultsDiv.appendChild(card);
    });
}

// ─── Map + sidebar ───────────────────────────────────────────────────────────

/**
 * Pin the restaurant on the map AND open the review sidebar.
 * This is the primary action when clicking a restaurant card.
 */
function pinAndOpenReviews(lat, lon, name) {
    zoomToLocation(lat, lon, name, /* keepResults= */ true);
    openReviewSidebar(name);
}

function zoomToLocation(lat, lon, name, keepResults = false) {
    console.log('Zooming to:', name, lat, lon);
    const offset = 0.002;
    const bbox = `${lon - offset},${lat - offset},${lon + offset},${lat + offset}`;
    mapIframe.src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (!keepResults) closeResults();
}

function closeResults() {
    const resultsDiv = document.getElementById('results');
    if (resultsDiv) resultsDiv.remove();
}

function openReviewSidebar(restaurantName) {
    if (window.reviewSystem) {
        window.reviewSystem.openSidebar(restaurantName);
    } else {
        console.error('Review system not loaded');
        alert('Review system is loading. Please try again in a moment.');
    }
}

// Expose for inline onclick handlers
window.zoomToLocation = zoomToLocation;
window.closeResults = closeResults;
window.openReviewSidebar = openReviewSidebar;
window.pinAndOpenReviews = pinAndOpenReviews;