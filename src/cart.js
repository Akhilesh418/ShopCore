/**
 * cart.js
 * Handles the rendering and financial logic for the shopping cart.
 * Employs pure functions to separate math calculations from DOM manipulations.
 */

/**
 * Master initialization function called by main.js
 */
export function renderCartItems() {
    // 1. Data Retrieval (Robust & Safe)
    const cart = getCartData();
    
    // 2. State Calculation (Pure Math)
    // We calculate the totals exactly ONCE, completely separate from the UI rendering.
    const cartTotals = calculateCartTotals(cart);

    // 3. Independent UI Rendering
    // We render the two variations independently so they don't interfere with each other's logic.
    renderOffcanvasCart(cart, cartTotals.subtotal);
    renderFullCartPage(cart, cartTotals);
}

// ==========================================================================
// DATA & MATH LOGIC
// ==========================================================================

/**
 * Safely retrieves and parses cart data from localStorage.
 * @returns {Array} An array of cart items, or an empty array if invalid/missing.
 */
function getCartData() {
    try {
        const user = JSON.parse(localStorage.getItem('store_user'));
        const cartKey = user ? `store_cart_${user.email}` : 'store_cart_guest';
        const rawData = localStorage.getItem(cartKey);
        
        return rawData ? JSON.parse(rawData) : [];
    } catch (error) {
        console.error('[Cart Service] LocalStorage data corrupted. Resetting cart.');
        return [];
    }
}

/**
 * Calculates all financial and physical totals for the cart.
 * @param {Array} cart - The cart array
 * @returns {Object} Object containing subtotal and total item count
 */
function calculateCartTotals(cart) {
    return cart.reduce((totals, item) => {
        totals.subtotal += (Number(item.price) * item.quantity);
        totals.itemCount += item.quantity;
        return totals;
    }, { subtotal: 0, itemCount: 0 }); // Initial state
}

// ==========================================================================
// DOM RENDERING - OFFCANVAS MINI-CART
// ==========================================================================

function renderOffcanvasCart(cart, subtotal) {
    const container = document.getElementById('cartItemsContainer');
    const template = document.getElementById('cartItemTemplate'); // The small template in navbar.html
    const subtotalEl = document.getElementById('cartSubtotal');
    
    // Guard clause: If these elements don't exist on the page, abort this function silently
    if (!container || !template) return;

    container.innerHTML = ''; 

    if (cart.length === 0) {
        container.innerHTML = `
            <div class="text-center mt-5">
                <i class="bi bi-cart-x text-muted" style="font-size: 2rem;"></i>
                <p class="mt-2 text-muted">Your cart is empty.</p>
            </div>`;
    } else {
        // DocumentFragment prevents DOM thrashing by holding the nodes in memory
        const fragment = document.createDocumentFragment();
        
        cart.forEach(item => {
            const clone = template.content.cloneNode(true);
            const totalItemPrice = Number(item.price) * item.quantity;
            
            // UI Binding
            clone.querySelector('.cart-item-img').src = item.image;
            clone.querySelector('.cart-item-img').alt = item.title;
            clone.querySelector('.cart-item-title').textContent = item.title;
            clone.querySelector('.cart-item-price').textContent = `₹${totalItemPrice.toFixed(2)}`;
            clone.querySelector('.cart-item-qty').textContent = item.quantity;
            
            // Interaction Binding
            const btnPlus = clone.querySelector('.btn-plus');
            if(item.quantity >= 5) btnPlus.classList.add('disabled', 'opacity-50');
            
            btnPlus.addEventListener('click', () => window.updateQuantity(item.id, 1));
            clone.querySelector('.btn-minus').addEventListener('click', () => window.updateQuantity(item.id, -1));
            clone.querySelector('.btn-remove').addEventListener('click', () => window.removeItem(item.id));
            
            fragment.appendChild(clone);
        });
        
        container.appendChild(fragment);
    }
    
    // Safely update the subtotal text
    if (subtotalEl) subtotalEl.textContent = `₹${subtotal.toFixed(2)}`;
}

// ==========================================================================
// DOM RENDERING - FULL CART PAGE
// ==========================================================================

function renderFullCartPage(cart, totals) {
    const container = document.getElementById('fullCartContainer');
    const template = document.getElementById('fullCartItemTemplate'); // The large template in cart.html
    
    // Guard clause: Only run this if we are actually on cart.html
    if (!container || !template) return;

    const emptyState = document.getElementById('emptyCartState');
    const populatedState = document.getElementById('populatedCartState');
    const cartItemCount = document.getElementById('cartItemCount');
    
    // Update Header Count
    if (cartItemCount) {
        cartItemCount.textContent = `You have ${totals.itemCount} item${totals.itemCount !== 1 ? 's' : ''} in your curation.`;
    }

    // View State Transition
    if (cart.length === 0) {
        if (emptyState) emptyState.classList.remove('d-none');
        if (populatedState) populatedState.classList.add('d-none');
        return; 
    }
    
    if (emptyState) emptyState.classList.add('d-none');
    if (populatedState) populatedState.classList.remove('d-none');

    // Render Items
    container.innerHTML = '';
    const fragment = document.createDocumentFragment();
    
    cart.forEach(item => {
        const clone = template.content.cloneNode(true);
        const totalItemPrice = Number(item.price) * item.quantity;
        
        clone.querySelector('.cart-item-img').src = item.image;
        clone.querySelector('.cart-item-title').textContent = item.title;
        clone.querySelector('.cart-item-price').textContent = `₹${totalItemPrice.toFixed(2)}`;
        clone.querySelector('.cart-item-qty').textContent = item.quantity;
        
        const btnPlus = clone.querySelector('.btn-plus');
        if(item.quantity >= 5) btnPlus.classList.add('disabled', 'opacity-50');
        
        btnPlus.addEventListener('click', () => window.updateQuantity(item.id, 1));
        clone.querySelector('.btn-minus').addEventListener('click', () => window.updateQuantity(item.id, -1));
        clone.querySelector('.btn-remove').addEventListener('click', () => window.removeItem(item.id));
        
        fragment.appendChild(clone);
    });
    
    container.appendChild(fragment);

    // Bind Financial Summaries
    const summarySubtotal = document.getElementById('summarySubtotal');
    const fullCartTotal = document.getElementById('fullCartTotal');
    
    if (summarySubtotal) summarySubtotal.textContent = `₹${totals.subtotal.toFixed(2)}`;
    if (fullCartTotal) fullCartTotal.textContent = `₹${totals.subtotal.toFixed(2)}`;
    
    // Bind Checkout Button
    const btnCheckout = document.getElementById('btnCheckoutFull');
    if (btnCheckout) {
        btnCheckout.addEventListener('click', () => {
            if (typeof window.goToCheckout === 'function') {
                window.goToCheckout();
            }
        });
    }
}