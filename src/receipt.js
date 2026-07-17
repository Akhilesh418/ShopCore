/**
 * receipt.js
 * Handles the generation of a static, standalone digital invoice.
 * Built with strict XSS prevention and modular rendering functions.
 */

// Global constant for Business Logic
const TAX_RATE = 0.08; 

document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we are on the receipt page
    if (document.getElementById('receiptContainer')) {
        initReceiptView();
    }
});

/**
 * Bootstraps the receipt lifecycle.
 */
function initReceiptView() {
    // 1. Route Parameter Extraction
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('orderId');
    const container = document.getElementById('receiptContainer');
    
    // Unhide the main container for processing
    if (container) container.classList.remove('d-none');

    // Guard Clause: Abort if no Order ID is present in the URL
    if (!orderId) { 
        window.location.replace("index.html"); 
        return; 
    }

    // 2. Historical Data Retrieval
    const sessionUser = getSafeJSON('store_user');
    const ordersKey = sessionUser ? `store_orders_${sessionUser.email}` : 'store_orders_guest';
    const orders = getSafeJSON(ordersKey) || [];
    
    // 3. Find the specific order
    const order = orders.find(o => o.orderId === orderId);

    // 4. State Management Transition
    if (!order) {
        showErrorState();
        return;
    }

    // 5. Render the Invoice
    renderHeaderInfo(order);
    renderAddresses(order);
    renderOrderItems(order);
}

// ==========================================================================
// RENDERING LOGIC
// ==========================================================================

function renderHeaderInfo(order) {
    // Safely extract customer name, providing fallbacks for legacy/corrupted data
    const shipping = order.shipping || {};
    const firstName = shipping.firstName || "Valued";
    const lastName = shipping.lastName || "Customer";

    safeSetText('rOrderId', order.orderId);
    safeSetText('rCustName', `${firstName} ${lastName}`);
    safeSetText('rDate', order.date);
}

function renderAddresses(order) {
    const shipping = order.shipping || {
        firstName: "Guest", lastName: "Customer",
        address: "Address Not Provided", city: "N/A", 
        country: "", zip: "", phone: "N/A"
    };

    // Array of address lines
    const addressLines = [
        `${shipping.firstName} ${shipping.lastName}`,
        shipping.address,
        `${shipping.city}, ${shipping.country} ${shipping.zip}`,
        `Contact: ${shipping.phone}`
    ];

    // XSS-SAFE INJECTION: Instead of using dangerous .innerHTML, we build the DOM nodes manually.
    buildSafeAddressNode('rShipping', addressLines);
    buildSafeAddressNode('rBilling', addressLines); // Assuming billing is same as shipping for now
}

function renderOrderItems(order) {
    const tbody = document.getElementById('rTableBody');
    const template = document.getElementById('receiptRowTemplate');
    
    if (!tbody || !template) return;
    
    let subtotalAccumulator = 0;
    const fragment = document.createDocumentFragment();

    order.items.forEach(item => {
        const itemTotal = Number(item.price) * item.quantity;
        subtotalAccumulator += itemTotal;
        
        const clone = template.content.cloneNode(true);
        
        // Image Binding
        const imgEl = clone.querySelector('.rcpt-img');
        if (imgEl) {
            imgEl.src = item.image;
            imgEl.alt = item.title;
        }

        // Text Binding
        const titleEl = clone.querySelector('.rcpt-title');
        if (titleEl) titleEl.textContent = item.title;
        
        const qtyEl = clone.querySelector('.rcpt-qty');
        if (qtyEl) qtyEl.textContent = item.quantity;
        
        const priceEl = clone.querySelector('.rcpt-price');
        if (priceEl) priceEl.textContent = `₹${itemTotal.toFixed(2)}`;
        
        fragment.appendChild(clone);
    });

    tbody.appendChild(fragment);

    // Render Financial Summaries
    const calculatedTaxes = subtotalAccumulator * TAX_RATE;

    safeSetText('rSubtotal', `₹${subtotalAccumulator.toFixed(2)}`);
    safeSetText('rTax', `₹${calculatedTaxes.toFixed(2)}`);
    
    // We strictly rely on the saved grandTotal to ensure historical accuracy, 
    // even if tax rates change in the future.
    safeSetText('rTotal', `₹${Number(order.grandTotal).toFixed(2)}`);
}

// ==========================================================================
// UTILITIES & STATE MANAGEMENT
// ==========================================================================

function showErrorState() {
    const content = document.getElementById('receiptContent');
    const error = document.getElementById('receiptError');
    const printBtns = document.querySelector('.d-print-none'); // Hide print buttons if error

    if (content) content.classList.add('d-none');
    if (error) error.classList.remove('d-none');
    if (printBtns) printBtns.classList.add('d-none');
}

/**
 * Safely sets text content if the element exists, preventing fatal null errors.
 */
function safeSetText(elementId, text) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = text;
}

/**
 * Safely builds multi-line HTML text without risking Cross-Site Scripting (XSS).
 * @param {string} containerId - The ID of the container element
 * @param {Array<string>} lines - Array of text lines to inject
 */
function buildSafeAddressNode(containerId, lines) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = ''; // Safely clear container
    
    lines.forEach((lineText, index) => {
        // We create a text node which is fundamentally immune to HTML/JS execution
        const textNode = document.createTextNode(lineText);
        container.appendChild(textNode);
        
        // Add a line break after every line except the very last one
        if (index < lines.length - 1) {
            container.appendChild(document.createElement('br'));
        }
    });
}

/**
 * Safely parses JSON from localStorage to prevent fatal application crashes.
 */
function getSafeJSON(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error(`[Data Error] Failed to parse ${key} from storage.`);
        return null;
    }
}