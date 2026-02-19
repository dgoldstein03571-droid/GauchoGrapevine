/**
 * Restaurant Review System — GauchoGrapevine
 * Features:
 *   - Left-side sliding sidebar
 *   - Average score displayed prominently at top
 *   - Scrollable reviews list
 *   - Filter reviews by star rating (1-5 or "All")
 *   - Submit new reviews with star input
 */

class ReviewSystem {
    constructor() {
        this.reviews = this.loadReviews();
        this.currentRestaurant = null;
        this.activeFilter = 'all'; // 'all' | 1 | 2 | 3 | 4 | 5
        this.init();
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.createReviewSidebar();
                this.attachEventListeners();
            });
        } else {
            this.createReviewSidebar();
            this.attachEventListeners();
        }
        console.log('Review System initialized');
    }

    // ─── Build sidebar DOM ───────────────────────────────────────────────────

    createReviewSidebar() {
        const sidebar = document.createElement('div');
        sidebar.id = 'reviewSidebar';
        sidebar.className = 'review-sidebar';
        sidebar.innerHTML = `
            <div class="review-sidebar-content">

                <!-- Header -->
                <div class="review-header">
                    <div class="review-header-title">
                        <span class="review-header-icon">🍽️</span>
                        <span>Reviews</span>
                    </div>
                    <button id="closeSidebar" class="close-btn" title="Close">&times;</button>
                </div>

                <!-- Restaurant name + average score -->
                <div id="reviewRestaurantInfo" class="restaurant-info">
                    <h3 id="reviewRestaurantName" class="restaurant-name-heading">Select a restaurant</h3>

                    <div class="average-rating-block" id="averageBlock">
                        <div class="big-score" id="averageRating">—</div>
                        <div class="average-details">
                            <div class="average-stars" id="averageStars"></div>
                            <div class="review-count" id="reviewCount">No reviews yet</div>
                        </div>
                    </div>

                    <!-- Rating breakdown bar chart -->
                    <div class="rating-breakdown" id="ratingBreakdown"></div>
                </div>

                <!-- Filter bar -->
                <div class="filter-bar" id="filterBar">
                    <span class="filter-label">Filter:</span>
                    <button class="filter-btn active" data-filter="all">All</button>
                    <button class="filter-btn" data-filter="5">★5</button>
                    <button class="filter-btn" data-filter="4">★4</button>
                    <button class="filter-btn" data-filter="3">★3</button>
                    <button class="filter-btn" data-filter="2">★2</button>
                    <button class="filter-btn" data-filter="1">★1</button>
                </div>

                <!-- Reviews list (scrollable) -->
                <div class="reviews-list-section" id="reviewsList">
                    <div id="reviewsContainer">
                        <p class="no-reviews">Select a restaurant to see reviews.</p>
                    </div>
                </div>

                <!-- Divider -->
                <div class="submit-divider">Write a Review</div>

                <!-- Submit review form -->
                <div class="submit-review-section" id="submitReviewSection">
                    <form id="reviewForm" autocomplete="off">
                        <div class="form-group">
                            <label for="reviewerName">Your Name</label>
                            <input type="text" id="reviewerName" placeholder="Enter your name" required>
                        </div>

                        <div class="form-group">
                            <label>Rating</label>
                            <div class="star-rating-input" id="starRatingInput">
                                <span class="star" data-rating="1">☆</span>
                                <span class="star" data-rating="2">☆</span>
                                <span class="star" data-rating="3">☆</span>
                                <span class="star" data-rating="4">☆</span>
                                <span class="star" data-rating="5">☆</span>
                            </div>
                            <input type="hidden" id="rating" value="0">
                            <span id="ratingError" class="error-message"></span>
                        </div>

                        <div class="form-group">
                            <label for="reviewText">Your Review</label>
                            <textarea id="reviewText" rows="3" placeholder="Share your experience..." required></textarea>
                        </div>

                        <button type="submit" class="submit-btn">Submit Review</button>
                    </form>
                </div>

            </div>
        `;

        document.body.appendChild(sidebar);

        // Semi-transparent overlay (click to close)
        const overlay = document.createElement('div');
        overlay.id = 'sidebarOverlay';
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);
    }

    // ─── Event listeners ─────────────────────────────────────────────────────

    attachEventListeners() {
        document.getElementById('closeSidebar').addEventListener('click', () => this.closeSidebar());
        document.getElementById('sidebarOverlay').addEventListener('click', () => this.closeSidebar());

        // Star rating input
        const stars = document.querySelectorAll('.star-rating-input .star');
        stars.forEach(star => {
            star.addEventListener('click', e => this.setRating(parseInt(e.target.dataset.rating)));
            star.addEventListener('mouseenter', e => this.highlightStars(parseInt(e.target.dataset.rating)));
        });
        document.getElementById('starRatingInput').addEventListener('mouseleave', () => {
            this.highlightStars(parseInt(document.getElementById('rating').value));
        });

        // Form submit
        document.getElementById('reviewForm').addEventListener('submit', e => {
            e.preventDefault();
            this.submitReview();
        });

        // Filter buttons
        document.getElementById('filterBar').addEventListener('click', e => {
            if (!e.target.classList.contains('filter-btn')) return;
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            const val = e.target.dataset.filter;
            this.activeFilter = val === 'all' ? 'all' : parseInt(val);
            this.renderReviewsList();
        });
    }

    // ─── Open / close ────────────────────────────────────────────────────────

    openSidebar(restaurantName) {
        this.currentRestaurant = restaurantName;
        this.activeFilter = 'all';
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        const allBtn = document.querySelector('.filter-btn[data-filter="all"]');
        if (allBtn) allBtn.classList.add('active');

        document.getElementById('reviewRestaurantName').textContent = restaurantName;
        document.getElementById('reviewSidebar').classList.add('active');
        document.getElementById('sidebarOverlay').classList.add('active');

        this.updateAverageDisplay();
        this.renderBreakdown();
        this.renderReviewsList();
        this.resetForm();
    }

    closeSidebar() {
        document.getElementById('reviewSidebar').classList.remove('active');
        document.getElementById('sidebarOverlay').classList.remove('active');
        this.currentRestaurant = null;
    }

    // ─── Average score display ───────────────────────────────────────────────

    updateAverageDisplay() {
        const reviews = this.getCurrentReviews();

        if (reviews.length > 0) {
            const avg = this.calculateAverage(reviews);
            document.getElementById('averageRating').textContent = avg.toFixed(1);
            this.renderStarDisplay('averageStars', avg);
            const word = reviews.length === 1 ? 'review' : 'reviews';
            document.getElementById('reviewCount').textContent = `${reviews.length} ${word}`;
        } else {
            document.getElementById('averageRating').textContent = '—';
            document.getElementById('averageStars').innerHTML = '';
            document.getElementById('reviewCount').textContent = 'No reviews yet';
        }
    }

    renderStarDisplay(elementId, rating) {
        const container = document.getElementById(elementId);
        if (!container) return;
        const full = Math.floor(rating);
        const half = rating % 1 >= 0.5;
        const empty = 5 - full - (half ? 1 : 0);
        container.innerHTML =
            '<span class="star-filled">★</span>'.repeat(full) +
            (half ? '<span class="star-half">⯨</span>' : '') +
            '<span class="star-empty">☆</span>'.repeat(empty);
    }

    // ─── Breakdown bars ──────────────────────────────────────────────────────

    renderBreakdown() {
        const container = document.getElementById('ratingBreakdown');
        const all = this.getCurrentReviews();
        if (all.length === 0) { container.innerHTML = ''; return; }

        let html = '';
        for (let s = 5; s >= 1; s--) {
            const count = all.filter(r => r.rating === s).length;
            const pct = Math.round((count / all.length) * 100);
            html += `
                <div class="breakdown-row">
                    <span class="breakdown-label">${s}★</span>
                    <div class="breakdown-bar-track">
                        <div class="breakdown-bar-fill" style="width:${pct}%"></div>
                    </div>
                    <span class="breakdown-count">${count}</span>
                </div>
            `;
        }
        container.innerHTML = html;
    }

    // ─── Reviews list ────────────────────────────────────────────────────────

    renderReviewsList() {
        const container = document.getElementById('reviewsContainer');
        const all = this.getCurrentReviews();

        let filtered = all;
        if (this.activeFilter !== 'all') {
            filtered = all.filter(r => r.rating === this.activeFilter);
        }

        if (filtered.length === 0) {
            const msg = all.length === 0
                ? 'No reviews yet. Be the first to review!'
                : `No ${this.activeFilter}★ reviews found.`;
            container.innerHTML = `<p class="no-reviews">${msg}</p>`;
            return;
        }

        // Sort newest first
        const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
        container.innerHTML = sorted.map(r => this.buildReviewCard(r)).join('');
    }

    buildReviewCard(review) {
        const date = new Date(review.date).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
        const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
        return `
            <div class="review-item">
                <div class="review-item-header">
                    <strong class="reviewer-name">${this.escapeHtml(review.reviewerName)}</strong>
                    <span class="review-date">${date}</span>
                </div>
                <div class="review-stars" data-rating="${review.rating}">${stars}</div>
                <p class="review-text">${this.escapeHtml(review.text)}</p>
            </div>
        `;
    }

    // ─── Submit review ───────────────────────────────────────────────────────

    submitReview() {
        const name = document.getElementById('reviewerName').value.trim();
        const rating = parseInt(document.getElementById('rating').value);
        const text = document.getElementById('reviewText').value.trim();

        if (!name || !text) { alert('Please fill in all fields'); return; }
        if (rating === 0) { document.getElementById('ratingError').textContent = 'Please select a rating'; return; }
        if (!this.currentRestaurant) { alert('No restaurant selected'); return; }

        const review = {
            id: Date.now(),
            restaurantName: this.currentRestaurant,
            reviewerName: name,
            rating,
            text,
            date: new Date().toISOString()
        };

        if (!this.reviews[this.currentRestaurant]) this.reviews[this.currentRestaurant] = [];
        this.reviews[this.currentRestaurant].push(review);
        this.saveReviews();

        this.updateAverageDisplay();
        this.renderBreakdown();
        this.renderReviewsList();
        this.resetForm();
        this.showSuccessMessage();
    }

    resetForm() {
        document.getElementById('reviewForm').reset();
        document.getElementById('rating').value = '0';
        document.getElementById('ratingError').textContent = '';
        this.highlightStars(0);
    }

    showSuccessMessage() {
        const msg = document.createElement('div');
        msg.className = 'success-message';
        msg.textContent = '✓ Review submitted successfully!';
        document.querySelector('.submit-review-section').appendChild(msg);
        setTimeout(() => msg.remove(), 3000);
    }

    // ─── Star input ──────────────────────────────────────────────────────────

    setRating(rating) {
        document.getElementById('rating').value = rating;
        document.getElementById('ratingError').textContent = '';
        this.highlightStars(rating);
    }

    highlightStars(rating) {
        document.querySelectorAll('.star-rating-input .star').forEach((star, i) => {
            if (i < rating) { star.textContent = '★'; star.style.color = '#f59e0b'; }
            else { star.textContent = '☆'; star.style.color = '#d1d5db'; }
        });
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    getCurrentReviews() {
        if (!this.currentRestaurant) return [];
        return this.reviews[this.currentRestaurant] || [];
    }

    calculateAverage(reviews) {
        if (!reviews.length) return 0;
        return reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
    }

    getRestaurantRating(restaurantName) {
        const reviews = this.reviews[restaurantName] || [];
        if (!reviews.length) return null;
        return { average: this.calculateAverage(reviews), count: reviews.length };
    }

    saveReviews() {
        try { localStorage.setItem('gauchoGrapevineReviews', JSON.stringify(this.reviews)); }
        catch (e) { console.error('Save error:', e); }
    }

    loadReviews() {
        try {
            const stored = localStorage.getItem('gauchoGrapevineReviews');
            return stored ? JSON.parse(stored) : {};
        } catch (e) { return {}; }
    }

    escapeHtml(text) {
        const d = document.createElement('div');
        d.textContent = text;
        return d.innerHTML;
    }

    exportReviews() {
        const blob = new Blob([JSON.stringify(this.reviews, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'gaucho-grapevine-reviews.json'; a.click();
        URL.revokeObjectURL(url);
    }

    importReviews(jsonData) {
        try {
            this.reviews = { ...this.reviews, ...JSON.parse(jsonData) };
            this.saveReviews();
            alert('Reviews imported successfully!');
        } catch (e) { alert('Error importing reviews: ' + e.message); }
    }
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────

let reviewSystem;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        reviewSystem = new ReviewSystem();
        window.reviewSystem = reviewSystem;
    });
} else {
    reviewSystem = new ReviewSystem();
    window.reviewSystem = reviewSystem;
}
