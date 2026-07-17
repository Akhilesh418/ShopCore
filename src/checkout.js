/**
 * checkout.js
 * Master controller for the Checkout and Order Generation flow.
 * Handles data routing, financial accumulation, and secure transaction finalization.
 */

// Centralized state object prevents global namespace pollution
const checkoutState = {
    mode: 'cart',
    items: [],
    totals: { subtotal: 0, tax: 0, grandTotal: 0 },
    userEmail: 'guest'
};

const TAX_RATE = 0.08; // 8% Business Logic constant

document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we are on the checkout page
    if (document.getElementById('checkoutForm')) {
        initCheckoutFlow();
    }
});

/**
 * Bootstraps the checkout lifecycle.
 */
function initCheckoutFlow() {
    // 1. Context Resolution & Identity
    resolveCheckoutContext();

    // 2. Guard Clause: Empty Cart Abort
    if (checkoutState.items.length === 0) {
        console.warn("[Checkout] No items found for checkout. Redirecting to home.");
        window.location.replace("index.html");
        return;
    }

    // 3. Render UI & Calculate Totals
    renderOrderSummary();

    // 4. Bind Submission Event
    const checkoutForm = document.getElementById('checkoutForm');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', handleOrderSubmission);
    }
}

// ==========================================================================
// DATA RETRIEVAL & STATE MANAGEMENT
// ==========================================================================

function resolveCheckoutContext() {
    const params = new URLSearchParams(window.location.search);
    checkoutState.mode = params.get('mode') === 'direct' ? 'direct' : 'cart';
    
    // Identify the user securely
    const sessionUser = getSafeJSON('store_user');
    checkoutState.userEmail = sessionUser ? sessionUser.email : 'guest';

    // Retrieve the correct payload based on the checkout mode
    if (checkoutState.mode === 'direct') {
        checkoutState.items = getSafeJSON('direct_buy_item') || [];
    } else {
        const cartKey = `store_cart_${checkoutState.userEmail}`;
        checkoutState.items = getSafeJSON(cartKey) || [];
    }
}

// ==========================================================================
// RENDERING & FINANCIAL MATH
// ==========================================================================

function renderOrderSummary() {
    const summaryContainer = document.getElementById('checkoutSummary');
    const template = document.getElementById('checkoutItemTemplate');
    
    if (!summaryContainer || !template) return;
    
    summaryContainer.innerHTML = '';
    const fragment = document.createDocumentFragment();
    let subtotalAccumulator = 0;

    // 1. Render Items & Accumulate Math
    checkoutState.items.forEach(item => {
        const itemTotal = Number(item.price) * item.quantity;
        subtotalAccumulator += itemTotal;
        
        const clone = template.content.cloneNode(true);
        clone.querySelector('.chk-img').src = item.image;
        clone.querySelector('.chk-img').alt = item.title;
        clone.querySelector('.chk-qty').textContent = item.quantity;
        clone.querySelector('.chk-title').textContent = item.title;
        clone.querySelector('.chk-price').textContent = `₹${itemTotal.toFixed(2)}`;
        
        fragment.appendChild(clone);
    });
    
    summaryContainer.appendChild(fragment);

    // 2. Finalize Financials
    checkoutState.totals.subtotal = subtotalAccumulator;
    checkoutState.totals.tax = subtotalAccumulator * TAX_RATE;
    checkoutState.totals.grandTotal = subtotalAccumulator + checkoutState.totals.tax;
    
    // 3. Bind to DOM
    document.getElementById('summarySubtotal').textContent = `₹${checkoutState.totals.subtotal.toFixed(2)}`;
    document.getElementById('summaryTaxes').textContent = `₹${checkoutState.totals.tax.toFixed(2)}`;
    document.getElementById('checkoutTotal').textContent = `₹${checkoutState.totals.grandTotal.toFixed(2)}`;
}

// ==========================================================================
// TRANSACTION FINALIZATION
// ==========================================================================

function handleOrderSubmission(e) {
    e.preventDefault(); 
    
    // 1. UI Lock (Double-Submit Prevention)
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Processing...';
    }

    // 2. Extract Data 
    // In a production app with 'name' attributes on inputs, we would use: Object.fromEntries(new FormData(e.target))
    const shippingDetails = {
        firstName: document.getElementById('firstName').value.trim(),
        lastName: document.getElementById('lastName').value.trim(),
        address: document.getElementById('address').value.trim(),
        city: document.getElementById('city').value.trim(),
        country: document.getElementById('country').value,
        zip: document.getElementById('zip').value.trim(),
        email: document.getElementById('email').value.trim().toLowerCase(),
        phone: document.getElementById('phone').value.trim()
    };

    // 3. Construct Order Payload
    const newOrder = {
        orderId: `ORD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`, 
        date: new Date().toLocaleDateString(), 
        items: checkoutState.items,
        grandTotal: checkoutState.totals.grandTotal,
        shipping: shippingDetails 
    };

    // 4. Database Mutation (Save Order & Clear Cart)
    try {
        const ordersKey = `store_orders_${checkoutState.userEmail}`;
        const existingOrders = getSafeJSON(ordersKey) || [];
        existingOrders.push(newOrder);
        
        localStorage.setItem(ordersKey, JSON.stringify(existingOrders));
        
        if (checkoutState.mode === 'direct') {
            sessionStorage.removeItem('direct_buy_item');
        } else {
            localStorage.removeItem(`store_cart_${checkoutState.userEmail}`);
        }
    } catch (error) {
        console.error("[Transaction Error] Failed to commit order to storage:", error);
        alert("A critical error occurred while saving your order. Please contact support.");
        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = 'Place Order (COD)'; }
        return;
    }
    
    // 5. Trigger Success Lifecycle
    triggerSuccessSequence(newOrder.orderId);
}

// ==========================================================================
// ANIMATION & ROUTING LIFECYCLE
// ==========================================================================

function triggerSuccessSequence(orderId) {
    const overlay = document.getElementById('orderAnimationOverlay');
    const movingCart = document.getElementById('movingCart');
    const animationStage = document.getElementById('animationStage');
    const successStage = document.getElementById('successMessageStage');

    if (!overlay) {
        // Fallback routing if animation DOM is missing
        window.location.replace(`receipt.html?orderId=${orderId}`);
        return;
    }

    // Phase 1: Lock screen and run cart physics
    overlay.classList.remove('d-none');
    overlay.classList.add('d-flex');
    if (movingCart) movingCart.classList.add('cart-run-sequence');

    // Phase 2: Reveal Success & Confetti
    setTimeout(() => {
        if (animationStage) animationStage.classList.add('d-none');
        if (successStage) successStage.classList.remove('d-none');
        
        if (typeof confetti === 'function') {
            confetti({ particleCount: 220, spread: 110, origin: { y: 0.5 }, scalar: 1.25, zIndex: 10000 });
            confetti({ particleCount: 60, angle: 60, spread: 60, origin: { x: 0, y: 0.6 }, zIndex: 10000 });
            confetti({ particleCount: 60, angle: 120, spread: 60, origin: { x: 1, y: 0.6 }, zIndex: 10000 });
        }
    }, 1500);

    // Phase 3: Route to digital receipt
    setTimeout(() => {
        // .replace() prevents the user from hitting "Back" and re-triggering the checkout processing
        window.location.replace(`receipt.html?orderId=${orderId}`);
    }, 4500);
}

// ==========================================================================
// UTILITIES
// ==========================================================================

function getSafeJSON(key) {
    try {
        const data = localStorage.getItem(key) || sessionStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error(`[Data Error] Failed to parse ${key}.`);
        return null;
    }
}