/**
 * login.js
 * Handles user authentication, credential verification, and session initiation.
 * Built with enterprise-grade UX and simulated cryptographic security.
 */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize UI requirements
    setupThemeToggle();
    
    // 2. Bind the form submission
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
});

/**
 * Core authentication handler
 * @param {Event} e - The form submission event
 */
async function handleLogin(e) {
    // Prevent the browser from refreshing the page
    e.preventDefault();
    
    // 1. Extract and Sanitize Data
    // We strictly trim spaces and force lowercase so it exactly matches how we saved it during registration
    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const rawPassword = document.getElementById('loginPassword').value;

    // 2. Fetch the mock database
    let users = JSON.parse(localStorage.getItem('store_users_db')) || [];
    
    // 3. Simulated Security: Mock Hashing
    // We MUST apply the exact same transformation here as we did in registration.js
    // so we can compare apples to apples without ever exposing the raw password.
    const hashedAttempt = btoa(rawPassword).split('').reverse().join('');
    
    // 4. Verification Logic
    // Scan the database for a user matching both the normalized email and the hashed password
    const validUser = users.find(u => u.email === email && u.password === hashedAttempt);
    
    if (!validUser) {
        // 5. Error Handling (Failure State)
        // Security best practice: Never tell the user WHICH part was wrong (email vs password)
        // to prevent bad actors from "guessing" valid email addresses.
        showNotification("Invalid email or password. Please try again.", "danger");
        return; // Halt execution
    }

    // 6. Session Initiation (Success State)
    // CRITICAL SECURITY FIX: Strip the password out before creating the active session payload!
    const sessionUser = { 
        id: validUser.id, 
        name: validUser.name, 
        email: validUser.email 
    };
    
    localStorage.setItem('store_user', JSON.stringify(sessionUser));
    
    // 7. UX Enhancement: Button State Management
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Authenticating...';
    }

    // 8. Routing
    // Slight delay to allow the loading spinner to register visually before navigating away
    setTimeout(() => {
        window.location.replace('./index.html');
    }, 800);
}

// ==========================================================================
// UTILITY FUNCTIONS (Technical Debt: Should be imported from utils.js)
// ==========================================================================

/**
 * Non-blocking UI Notification
 * @param {string} message - The text to display
 * @param {string} type - 'success', 'danger', 'warning', etc.
 */
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
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    `;
    
    toastContainer.appendChild(toastEl);
    const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
    toast.show();
    
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}

// ==========================================================================
// DARK MODE LOGIC
// ==========================================================================
function setupThemeToggle() {
    const htmlElement = document.documentElement;
    const savedTheme = localStorage.getItem('shopcore_theme') || 'light';
    htmlElement.setAttribute('data-bs-theme', savedTheme);

    setTimeout(() => {
        const themeIcon = document.getElementById('themeIcon');
        if (themeIcon) updateThemeIcon(savedTheme, themeIcon);
    }, 50);

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
        iconElement.className = 'bi bi-sun-fill fs-4 text-warning'; 
    } else {
        iconElement.className = 'bi bi-moon-stars-fill fs-4 text-body'; 
    }
}