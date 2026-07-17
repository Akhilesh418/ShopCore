/**
 * product.js
 * Handles the logic for the single product detail page (product.html).
 * Responsible for URL parsing, dynamic data hydration, and event binding.
 */

import { API_URL } from './api.js';
import { debounce } from './utils.js'; 

// TECHNICAL DEBT: This exchange rate is duplicated from main.js. 
// In a future refactor, this should be moved to a shared config.js file.
const EXCHANGE_RATE = 95; 

// Initialize the application when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initProductPage();
});

/**
 * Master controller for the product page lifecycle.
 */
async function initProductPage() {
    // 1. URL Parameter Extraction
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');
    
    // 2. DOM Node Caching
    // Grouping UI elements makes state management much cleaner
    const uiState = {
        loading: document.getElementById('loadingState'),
        error: document.getElementById('errorState'),
        content: document.getElementById('productContent')
    };

    // 3. Early Exit (Guard Clause)
    if (!productId) {
        showErrorState(uiState);
        return;
    }

    try {
        // 4. Data Fetching
        const response = await fetch(`${API_URL}/${productId}`, {
            headers: { 'Accept': 'application/json' }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status} - Product not found`);
        }
        
        const product = await response.json();
        
        // 5. SEO Enhancement
        // Dynamically update the browser tab title for search engines and user context
        document.title = `${product.title} | ShopCore`;

        // 6. UI Hydration & Action Binding
        populateProductUI(product);
        bindProductActions(product);

        // 7. View Transition
        showContentState(uiState);

    } catch (error) {
        // Tagged error logging for monitoring tools (like Sentry/Datadog)
        console.error('[Product Service Error] Failed to load product:', error.message);
        showErrorState(uiState);
    }
}

/**
 * Safely injects JSON data into the DOM.
 * @param {Object} product - The product object from the API
 */
function populateProductUI(product) {
    const priceINR = product.price * EXCHANGE_RATE; 

    // Defensive Programming: We check if the element exists before modifying it.
    // This prevents fatal crashes if the HTML is ever altered.
    const imgEl = document.getElementById('prodImage');
    if (imgEl) {
        imgEl.src = product.image;
        imgEl.alt = product.title;
    }

    const categoryEl = document.getElementById('prodCategory');
    if (categoryEl) categoryEl.textContent = product.category;

    const titleEl = document.getElementById('prodTitle');
    if (titleEl) titleEl.textContent = product.title;

    const priceEl = document.getElementById('prodPrice');
    if (priceEl) priceEl.textContent = `₹${priceINR.toFixed(2)}`;

    const descEl = document.getElementById('prodDesc');
    if (descEl) descEl.textContent = product.description;
}

/**
 * Attaches debounced event listeners to the interactive elements.
 * @param {Object} product - The product object from the API
 */
function bindProductActions(product) {
    const priceINR = product.price * EXCHANGE_RATE;
    const btnAdd = document.getElementById('btnAddToCart');
    const btnBuy = document.getElementById('btnBuyNow');

    if (btnAdd) {
        btnAdd.addEventListener('click', debounce(() => {
            // Guard against main.js failing to load
            if (typeof window.addToCartObj === 'function') {
                window.addToCartObj(product.id, product.title, priceINR, product.image);
            } else {
                console.error("Cart system is currently unavailable. Check main.js import.");
                alert("Sorry, our cart system is temporarily down.");
            }
        }, 300));
    }

    if (btnBuy) {
        btnBuy.addEventListener('click', debounce(() => {
            if (typeof window.buyNowObj === 'function') {
                window.buyNowObj(product.id, product.title, priceINR, product.image);
            }
        }, 300));
    }
}

// ==========================================================================
// STATE MANAGEMENT UTILITIES
// ==========================================================================

function showErrorState(ui) {
    if (ui.loading) ui.loading.classList.add('d-none');
    if (ui.content) ui.content.classList.add('d-none');
    if (ui.error) ui.error.classList.remove('d-none');
}

function showContentState(ui) {
    if (ui.loading) ui.loading.classList.add('d-none');
    if (ui.error) ui.error.classList.add('d-none');
    if (ui.content) ui.content.classList.remove('d-none');
}