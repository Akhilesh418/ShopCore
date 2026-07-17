/**
 * account.js
 * Master controller for the User Dashboard.
 * Handles authentication gating, profile management, and order history rendering.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we are actually on the account page
    if (document.getElementById('accountContainer')) {
        initAccountDashboard();
    }
});

/**
 * Initializes the dashboard lifecycle.
 */
function initAccountDashboard() {
    // 1. Authentication Gatekeeper
    const sessionUser = getSafeJSON('store_user');
    
    if (!sessionUser) {
        // Use .replace() so the unauthenticated page isn't saved in the browser's back history
        window.location.replace('login.html');
        return; 
    }

    // 2. Unhide UI for authenticated users
    document.getElementById('accountContainer').classList.remove('d-none');
    
    // 3. Render Views
    renderProfileView(sessionUser);
    renderOrderHistoryView(sessionUser.email);
    
    // 4. Bind Interactions
    bindAccountActions(sessionUser);
}

// ==========================================================================
// RENDERING LOGIC
// ==========================================================================

function renderProfileView(user) {
    // Logical OR (||) provides safe fallbacks if data is somehow missing
    const nameEl = document.getElementById('profileName');
    if (nameEl) nameEl.textContent = user.name || 'Valued Customer';
    
    const emailEl = document.getElementById('profileEmail');
    if (emailEl) emailEl.textContent = user.email || 'No email provided';
    
    const phoneEl = document.getElementById('profilePhone');
    if (phoneEl) phoneEl.textContent = user.phone || 'N/A';
}

function renderOrderHistoryView(userEmail) {
    const orders = getSafeJSON(`store_orders_${userEmail}`) || [];
    
    const orderList = document.getElementById('orderList');
    const emptyState = document.getElementById('emptyHistoryState');
    const orderTemplate = document.getElementById('orderCardTemplate');
    const itemTemplate = document.getElementById('orderItemTemplate');

    if (!orderList || !emptyState || !orderTemplate || !itemTemplate) return;

    // View State Transition
    if (orders.length === 0) {
        emptyState.classList.remove('d-none');
        return;
    }

    orderList.innerHTML = '';
    const fragment = document.createDocumentFragment();

    // Reverse array to show newest orders first
    orders.reverse().forEach(order => {
        const orderClone = orderTemplate.content.cloneNode(true);
        
        // Bind Order Header Data
        orderClone.querySelector('.order-id-text').textContent = `Order: ${order.orderId}`;
        orderClone.querySelector('.order-date-text').textContent = `Placed on: ${order.date}`;
        orderClone.querySelector('.order-total-text').textContent = `₹${order.grandTotal.toFixed(2)}`;
        orderClone.querySelector('.order-receipt-btn').href = `receipt.html?orderId=${order.orderId}`;
        
        const itemsList = orderClone.querySelector('.order-items-list');
        
        // Nested Templating for Order Items
        if (order.items && order.items.length > 0) {
            order.items.forEach(item => {
                const itemClone = itemTemplate.content.cloneNode(true);
                itemClone.querySelector('.item-img').src = item.image;
                itemClone.querySelector('.item-qty').textContent = `${item.quantity}x`;
                itemClone.querySelector('.item-title').textContent = item.title;
                itemsList.appendChild(itemClone);
            });
        }
        
        fragment.appendChild(orderClone);
    });

    orderList.appendChild(fragment);
}

// ==========================================================================
// INTERACTION & BUSINESS LOGIC
// ==========================================================================

function bindAccountActions(currentUser) {
    // Logout Handler
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            localStorage.removeItem('store_user');
            window.location.replace('login.html');
        });
    }

    // Clear History Handler
    const btnClear = document.getElementById('btnClearHistory');
    if (btnClear) {
        btnClear.addEventListener('click', () => {
            // In a production app, we would use a custom modal for this. 
            // Using confirm() as a temporary fallback, but logging the technical debt.
            if (confirm("Are you sure you want to permanently delete your order history?")) {
                localStorage.removeItem(`store_orders_${currentUser.email}`); 
                showNotification("Order history cleared.", "success");
                
                // Re-render the view dynamically instead of forcing a hard page reload
                document.getElementById('orderList').innerHTML = '';
                document.getElementById('emptyHistoryState').classList.remove('d-none');
            }
        });
    }

    // Profile Editing Form
    const editModal = document.getElementById('editProfileModal');
    const editForm = document.getElementById('editProfileForm');

    if (editModal && editForm) {
        // Auto-fill modal when it opens
        editModal.addEventListener('show.bs.modal', () => {
            document.getElementById('editName').value = currentUser.name || '';
            document.getElementById('editEmail').value = currentUser.email || '';
            document.getElementById('editPhone').value = currentUser.phone || '';
        });

        editForm.addEventListener('submit', (e) => handleProfileUpdate(e, currentUser, editModal));
    }
}

function handleProfileUpdate(e, currentUser, modalElement) {
    e.preventDefault(); 
    
    const oldEmail = currentUser.email;
    const newName = document.getElementById('editName').value.trim();
    const newEmail = document.getElementById('editEmail').value.trim().toLowerCase();
    const newPhone = document.getElementById('editPhone').value.trim();

    let users = getSafeJSON('store_users_db') || [];

    // Business Rule: Prevent email collisions
    if (newEmail !== oldEmail && users.some(u => u.email === newEmail)) {
        showNotification("This email is already registered to another account.", "danger");
        return;
    }

    const userIndex = users.findIndex(u => u.email === oldEmail);
    if (userIndex === -1) {
        showNotification("Critical Error: User record not found.", "danger");
        return;
    }

    // 1. Update Master Database
    users[userIndex].name = newName;
    users[userIndex].email = newEmail;
    users[userIndex].phone = newPhone;
    localStorage.setItem('store_users_db', JSON.stringify(users));

    // 2. Update Active Session
    currentUser.name = newName;
    currentUser.email = newEmail;
    currentUser.phone = newPhone;
    localStorage.setItem('store_user', JSON.stringify(currentUser));

    // 3. Database Migration (If email changed)
    if (newEmail !== oldEmail) {
        migrateUserRecords(oldEmail, newEmail);
    }

    // 4. Update UI & Close Modal
    renderProfileView(currentUser);
    
    // Safely close the Bootstrap modal
    if (typeof bootstrap !== 'undefined') {
        const modalInstance = bootstrap.Modal.getInstance(modalElement);
        if (modalInstance) modalInstance.hide();
    }
    
    showNotification("Profile updated successfully!", "success");
}

/**
 * Migrates associated relational data if the primary key (email) changes.
 */
function migrateUserRecords(oldEmail, newEmail) {
    const recordsToMigrate = ['store_cart_', 'store_orders_'];
    
    recordsToMigrate.forEach(prefix => {
        const oldData = localStorage.getItem(`${prefix}${oldEmail}`);
        if (oldData) {
            localStorage.setItem(`${prefix}${newEmail}`, oldData);
            localStorage.removeItem(`${prefix}${oldEmail}`);
        }
    });
}

// ==========================================================================
// UTILITIES
// ==========================================================================

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

function showNotification(message, type = 'success') {
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        toastContainer.style.zIndex = '1055';
        document.body.appendChild(toastContainer);
    }

    const toastEl = document.createElement('div');
    toastEl.className = `toast align-items-center text-bg-${type} border-0 shadow-lg`;
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'assertive');
    toastEl.setAttribute('aria-atomic', 'true');
    
    const icon = type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill';
    
    toastEl.innerHTML = `
      <div class="d-flex">
        <div class="toast-body fw-bold" style="font-size: 0.95rem;">
          <i class="bi ${icon} me-2"></i> ${message}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    `;
    
    toastContainer.appendChild(toastEl);
    const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
    toast.show();
    
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}