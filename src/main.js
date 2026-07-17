/**
 * main.js
 * The core controller for ShopCore.
 * Handles state management, UI rendering, and user interactions.
 */

import { fetchProducts } from './api.js';
import { renderCartItems } from './cart.js';
import { renderLayout } from './layout.js'; 
import { debounce } from './utils.js';

// ==========================================================================
// 1. APPLICATION STATE MANAGEMENT
// ==========================================================================
// Grouping all variables into a single 'appState' object prevents global namespace 
// pollution and creates a Single Source of Truth for the UI to read from.
const appState = {
    products: [],
    exchangeRate: 95,
    filters: {
        category: 'all',
        maxPrice: 1000000,
        query: ''
    },
    // We store the current API request controller here so we can cancel it if needed
    currentApiRequest: null 
};

// ==========================================================================
// 2. INITIALIZATION & ROUTING
// ==========================================================================

document.addEventListener('DOMContentLoaded', async () => { 
    const currentPath = window.location.pathname;
    const isIndexPage = currentPath.includes('index.html') || currentPath.endsWith('/');

    // 1. Load shared layout (Navbar/Footer) for non-index pages
    if (!isIndexPage) {
        await renderLayout(); 
    }
    
    // 2. Initialize UI Themes
    setupThemeToggle();

    // 3. Security Check: Unified to use localStorage for persistence
    const user = JSON.parse(localStorage.getItem('store_user'));
    if (!user && isIndexPage) {
        window.location.replace('registration.html');
        return; // Halt execution immediately
    }

    // 4. Hydrate the UI with user data
    updateAuthUI(user);      
    updateCartBadge();   
    renderCartItems();   
    
    // 5. Page-Specific Bootstrapping (Only run if we are on the page with a product grid)
    if (document.getElementById('productGrid')) {
        setupPriceSlider();
        setupSearch();   
        initCatalog();   
    }
});

// ==========================================================================
// 3. DATA FETCHING (The Catalog)
// ==========================================================================

async function initCatalog() {
    // If a request is already running (e.g., user is spam-clicking categories), cancel it.
    if (appState.currentApiRequest) {
        appState.currentApiRequest.abort();
    }

    // Create a fresh controller for this new request
    appState.currentApiRequest = new AbortController();
    
    renderSkeletons();
    
    try {
        // Pass the abort signal down into our API layer
        const data = await fetchProducts({ signal: appState.currentApiRequest.signal });
        
        // If the request was cancelled, the API layer returns null. We safely exit.
        if (!data) return;

        // Save data to state and render
        appState.products = data;
        renderProducts(appState.products);

    } catch (error) {
        // Only show the error UI if it was a real failure, not an intentional cancellation
        if (error.name !== 'AbortError') {
            document.getElementById('productGrid').innerHTML = `
                <div class="col-12 text-center text-danger mt-5">
                    <i class="bi bi-exclamation-triangle fs-1"></i>
                    <p class="mt-2">Failed to load the catalog. Please try again later.</p>
                </div>`;
        }
    } finally {
        // Cleanup the controller once the request is definitively finished
        appState.currentApiRequest = null;
    }
}

// ==========================================================================
// 4. RENDERING LOGIC
// ==========================================================================

function renderSkeletons() {
    const grid = document.getElementById('productGrid');
    const template = document.getElementById('skeletonCardTemplate');
    if (!grid || !template) return;

    grid.innerHTML = ''; 
    // DocumentFragment is a lightweight DOM element that holds children in memory.
    // Appending to this first, then to the DOM, is much faster than appending to the DOM 8 times.
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < 8; i++) {
        fragment.appendChild(template.content.cloneNode(true));
    }
    grid.appendChild(fragment);
}

function renderProducts(productsToRender) {
    const grid = document.getElementById('productGrid');
    const template = document.getElementById('productCardTemplate');
    if (!grid || !template) return;
    
    grid.innerHTML = ''; 
    
    if (productsToRender.length === 0) {
        grid.innerHTML = `<div class="col-12 text-center mt-5"><h4 class="text-muted">No products found.</h4></div>`;
        return; 
    }

    const fragment = document.createDocumentFragment();

    productsToRender.forEach(product => {
        const priceINR = product.price * appState.exchangeRate;
        const clone = template.content.cloneNode(true);

        // UI Population
        const imgEl = clone.querySelector('.prod-img');
        imgEl.src = product.image;
        imgEl.alt = product.title;

        clone.querySelector('.prod-title').textContent = product.title;
        clone.querySelector('.prod-price').textContent = `₹${priceINR.toFixed(2)}`;

        // Event Listeners (Debounced to prevent double-clicks/spamming)
        clone.querySelector('.product-link').addEventListener('click', debounce(() => {
            window.location.href = `product.html?id=${product.id}`;
        }, 300));

        clone.querySelector('.btn-add').addEventListener('click', debounce(() => {
            handleAddToCart(product.id, product.title, priceINR, product.image);
        }, 300));

        clone.querySelector('.btn-buy').addEventListener('click', debounce(() => {
            handleBuyNow(product.id, product.title, priceINR, product.image);
        }, 300));

        fragment.appendChild(clone);
    });

    grid.appendChild(fragment);
}

// ==========================================================================
// 5. SEARCH & FILTERING LOGIC
// ==========================================================================

function setupPriceSlider() {
    const priceRange = document.getElementById('priceRange');
    const priceDisplay = document.getElementById('priceDisplay');
    
    if (priceRange && priceDisplay) {
        priceRange.addEventListener('input', (e) => {
            appState.filters.maxPrice = Number(e.target.value);
            priceDisplay.textContent = `₹${appState.filters.maxPrice.toLocaleString()}`; 
            applyFilters(); 
        });
    }
}

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchForm = document.getElementById('searchForm');
    const searchSuggestions = document.getElementById('searchSuggestions');

    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        appState.filters.query = e.target.value.toLowerCase().trim();
        
        if (appState.filters.query.length === 0) {
            searchSuggestions.style.display = 'none';
            applyFilters();
            return; 
        }

        // Search runs against the unmodified master list (appState.products)
        const matches = appState.products.filter(p => 
            p.title.toLowerCase().includes(appState.filters.query) || 
            p.category.toLowerCase().includes(appState.filters.query)
        );

        if (matches.length > 0) {
            searchSuggestions.innerHTML = matches.slice(0, 5).map(m => `
                <button type="button" class="list-group-item list-group-item-action d-flex align-items-center bg-body-tertiary px-3 py-2 suggestion-btn" data-id="${m.id}">
                    <div class="flex-shrink-0 me-3">
                        <img src="${m.image}" alt="" style="width: 40px; height: 40px; object-fit: contain;">
                    </div>
                    <span style="font-size: 0.9rem;">${m.title}</span>
                </button>
            `).join('');
            
            // Modern Event Delegation for dynamically created elements
            const suggestionButtons = searchSuggestions.querySelectorAll('.suggestion-btn');
            suggestionButtons.forEach(btn => {
                btn.addEventListener('click', () => handleSuggestionSelection(Number(btn.dataset.id)));
            });

            searchSuggestions.style.display = 'block'; 
        } else {
            searchSuggestions.innerHTML = `<div class="list-group-item text-muted text-center">No products found</div>`;
            searchSuggestions.style.display = 'block';
        }
        
        applyFilters();
    });

    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault(); 
            searchSuggestions.style.display = 'none'; 
        });
    }

    // Dismiss dropdown on outside click
    document.addEventListener('click', (e) => {
        if (searchSuggestions && !searchInput.contains(e.target) && !searchSuggestions.contains(e.target)) {
            searchSuggestions.style.display = 'none';
        }
    });
}

function handleSuggestionSelection(id) {
    const product = appState.products.find(p => p.id === id);
    if(product) {
        document.getElementById('searchInput').value = product.title; 
        document.getElementById('searchSuggestions').style.display = 'none'; 
        appState.filters.query = product.title.toLowerCase();
        applyFilters(); 
    }
}

function applyFilters() {
    let filtered = appState.products;

    if (appState.filters.query.length > 0) {
        filtered = filtered.filter(p => 
            p.title.toLowerCase().includes(appState.filters.query) || 
            p.category.toLowerCase().includes(appState.filters.query)
        );
    }

    if (appState.filters.category !== 'all') {
        filtered = filtered.filter(p => p.category === appState.filters.category);
    }

    filtered = filtered.filter(p => (Number(p.price) * appState.exchangeRate) <= appState.filters.maxPrice);

    renderProducts(filtered);
}

// ==========================================================================
// 6. CART & USER STATE MANAGEMENT
// ==========================================================================

function getCartKey() {
    const user = JSON.parse(localStorage.getItem('store_user'));
    return user ? `store_cart_${user.email}` : 'store_cart_guest';
}

function updateAuthUI(user) {
    const authLink = document.getElementById('authLink');
    if (authLink && user) {
        authLink.innerHTML = '<i class="bi bi-person-circle fs-4 text-white" title="My Profile"></i>';
    }
}

function handleAddToCart(id, title, price, image) {
    const cartKey = getCartKey(); 
    let cart = JSON.parse(localStorage.getItem(cartKey)) || [];
    let item = cart.find(i => i.id === id);
    
    if (item) {
        if(item.quantity < 5) item.quantity++;
    } else {
        cart.push({ id, title, price, image, quantity: 1 });
    }
    
    localStorage.setItem(cartKey, JSON.stringify(cart)); 
    updateCartBadge();
    renderCartItems();
    showToast(`${title} has been added to your cart!`);
}

function handleBuyNow(id, title, price, image) {
    const directItem = [{ id, title, price, image, quantity: 1 }];
    sessionStorage.setItem('direct_buy_item', JSON.stringify(directItem));
    window.location.href = 'checkout.html?mode=direct'; 
}

function updateCartBadge() {
    const cartKey = getCartKey(); 
    const cart = JSON.parse(localStorage.getItem(cartKey)) || [];
    const total = cart.reduce((sum, i) => sum + i.quantity, 0);
    const badge = document.getElementById('cartBadge');
    if(badge) badge.innerText = total;
}

// ==========================================================================
// 7. UI UTILITIES (Dark Mode & Toasts)
// ==========================================================================

function setupThemeToggle() {
    const htmlElement = document.documentElement;
    const savedTheme = localStorage.getItem('shopcore_theme') || 'light';
    htmlElement.setAttribute('data-bs-theme', savedTheme);

    setTimeout(() => {
        const themeIcon = document.getElementById('themeIcon');
        if (themeIcon) updateThemeIcon(savedTheme, themeIcon);
    }, 150);

    document.addEventListener('click', (e) => {
        const toggleBtn = e.target.closest('#themeToggle');
        
        if (toggleBtn) {
            const currentTheme = htmlElement.getAttribute('data-bs-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            htmlElement.setAttribute('data-bs-theme', newTheme);
            localStorage.setItem('shopcore_theme', newTheme);
            
            const themeIcon = document.getElementById('themeIcon');
            updateThemeIcon(newTheme, themeIcon);
        }
    });
}

function updateThemeIcon(theme, iconElement) {
    if (!iconElement) return;
    if (theme === 'dark') {
        iconElement.className = 'bi bi-sun-fill fs-5 text-warning'; 
    } else {
        iconElement.className = 'bi bi-moon-stars-fill fs-5 text-white'; 
    }
}

function showToast(message) {
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        toastContainer.style.zIndex = '1055'; 
        document.body.appendChild(toastContainer);
    }

    const toastEl = document.createElement('div');
    toastEl.className = 'toast align-items-center text-bg-success border-0 shadow-lg';
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'assertive');
    toastEl.setAttribute('aria-atomic', 'true');
    
    toastEl.innerHTML = `
      <div class="d-flex">
        <div class="toast-body fw-bold" style="font-size: 0.95rem;">
          <i class="bi bi-check-circle-fill me-2"></i> ${message}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    `;
    
    toastContainer.appendChild(toastEl);
    const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
    toast.show();
    
    toastEl.addEventListener('hidden.bs.toast', () => {
        toastEl.remove();
    });
}

// ==========================================================================
// 8. LEGACY WINDOW BINDINGS (Technical Debt Isolation)
// ==========================================================================
// In a modern framework (React/Vue/Angular), these would not exist. 
// We are keeping them strictly to support the legacy inline HTML attributes 
// (e.g., onclick="window.filterCategory(...)") in your current index.html.

window.filterCategory = function(category, buttonElement) {
    appState.filters.category = category;
    if (buttonElement) {
        const buttons = document.querySelectorAll('.list-group-item.category-btn');
        buttons.forEach(btn => btn.classList.remove('active'));
        buttonElement.classList.add('active');
    }
    applyFilters();
};

window.goToCheckout = function() {
    const cartKey = getCartKey(); 
    const cart = JSON.parse(localStorage.getItem(cartKey)) || [];
    if(cart.length === 0) return alert("Cart is empty");
    window.location.href = 'checkout.html?mode=cart';
};

// Exposing the required cart functions to the window so cart.js and HTML templates can reach them
window.updateQuantity = function(id, change) {
    const cartKey = getCartKey(); 
    let cart = JSON.parse(localStorage.getItem(cartKey)) || [];
    let item = cart.find(i => i.id === id);
    
    if (item) {
        item.quantity += change;
        if (item.quantity > 5) item.quantity = 5; 
        
        if (item.quantity < 1) { 
            window.removeItem(id);
            return; 
        }
    }
    localStorage.setItem(cartKey, JSON.stringify(cart)); 
    updateCartBadge();
    renderCartItems();
};

window.removeItem = function(id) {
    const cartKey = getCartKey(); 
    let cart = JSON.parse(localStorage.getItem(cartKey)) || [];
    cart = cart.filter(i => i.id !== id);
    localStorage.setItem(cartKey, JSON.stringify(cart)); 
    
    updateCartBadge();
    renderCartItems();
};
window.addToCartObj = function(id, title, price, image) {
    handleAddToCart(id, title, price, image);
};

window.buyNowObj = function(id, title, price, image) {
    handleBuyNow(id, title, price, image);
};
