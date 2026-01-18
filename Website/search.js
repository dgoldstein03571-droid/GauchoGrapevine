const searchInput = document.getElementById('searchInput');
const mapIframe = document.querySelector('iframe');

let restaurantData = null;

// Load restaurant data when page loads

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

// Load data on page load
loadRestaurants();

searchInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        const searchTerm = searchInput.value.trim();
        if (searchTerm) {
            handleSearch(searchTerm);
        } else {
            // Show all restaurants if search is empty
            if (restaurantData) {
                displayResults(restaurantData, 'all');
            }
        }
    }
});

function handleSearch(searchTerm) {
    if (!restaurantData) {
        alert('Restaurant data is still loading. Please try again.');
        return;
    }

    // Search through restaurants
    const results = restaurantData.filter(restaurant => {
        const searchLower = searchTerm.toLowerCase();
        return (
            restaurant.name.toLowerCase().includes(searchLower) ||
            restaurant.cuisine.toLowerCase().includes(searchLower) ||
            restaurant.type.toLowerCase().includes(searchLower)
        );
    });

    if (results.length > 0) {
        displayResults(results, searchTerm);
    } else {
        alert(`No restaurants found matching "${searchTerm}". Try searching for: pizza, burger, mexican, japanese, cafe`);
    }
}

function displayResults(restaurants, searchTerm) {
    // Create results container if it doesn't exist
    let resultsDiv = document.getElementById('results');
    if (!resultsDiv) {
        resultsDiv = document.createElement('div');
        resultsDiv.id = 'results';
        resultsDiv.className = 'results-container';
        document.querySelector('.iframe-container').appendChild(resultsDiv);
    }

    // Clear previous results
    resultsDiv.innerHTML = '';
    
    // Add header with close button
    const header = document.createElement('div');
    header.style.padding = '10px';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.borderBottom = '2px solid #ddd';
    header.innerHTML = `
        <span style="font-weight: bold;">Found ${restaurants.length} ${searchTerm === 'all' ? 'restaurants' : 'results'}</span>
        <button onclick="closeResults()" style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer;">✕</button>
    `;
    resultsDiv.appendChild(header);

    // Display restaurant cards
    restaurants.forEach(restaurant => {
        const card = document.createElement('div');
        card.className = 'restaurant-card';
        
        card.innerHTML = `
            <h3>${restaurant.name}</h3>
            <p><strong>Type:</strong> ${restaurant.type}</p>
            <p><strong>Cuisine:</strong> ${restaurant.cuisine}</p>
            <p><strong>Address:</strong> ${restaurant.address}</p>
            <button onclick="zoomToLocation(${restaurant.lat}, ${restaurant.lon}, '${restaurant.name.replace(/'/g, "\\'")}')">
                📍 View on Map
            </button>
        `;
        
        resultsDiv.appendChild(card);
    });
}

function zoomToLocation(lat, lon, name) {
    console.log('Zooming to:', name, lat, lon);
    // Update iframe to focus on specific location
    const offset = 0.002;
    const bbox = `${lon - offset},${lat - offset},${lon + offset},${lat + offset}`;
    mapIframe.src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`;
    
    // Scroll to top to see map
    window.scrollTo({ top: 0, behavior: 'smooth' });
    closeResults();
}

function closeResults() {
    const resultsDiv = document.getElementById('results');
    if (resultsDiv) {
        resultsDiv.remove();
    }
}