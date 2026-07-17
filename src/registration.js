/**
 * registration.js
 * Handles user account creation, data validation, and mock-database interactions.
 * Built with enterprise-grade UX (non-blocking notifications) and simulated security.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize UI requirements
    setupThemeToggle();
    
    // 2. Bind the form submission
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegistration);
    }
});

/**
 * Core registration handler
 * @param {Event} e - The form submission event
 */
async function handleRegistration(e) {
    // Prevent the browser from refreshing the page
    e.preventDefault();
    
    // 1. Extract and Sanitize Data
    // .trim() removes accidental whitespace (e.g., if the user hits spacebar after their email)
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim().toLowerCase();
    const phone = document.getElementById('regPhone').value.trim();
    const rawPassword = document.getElementById('regPassword').value;

    // 2. Fetch the mock database
    let users = JSON.parse(localStorage.getItem('store_users_db')) || [];
    
    // 3. Business Rule: Unique Email Validation
    const emailExists = users.some(u => u.email === email);
    if (emailExists) {
        // Show an inline error without freezing the browser
        showNotification('An account with this email already exists. Please log in.', 'danger');
        return; 
    }

    // 4. Simulated Security: Mock Hashing
    // ENTERPRISE RULE: Never store raw passwords. 
    // In production, this happens on the backend using bcrypt/Argon2.
    const hashedPassword = btoa(rawPassword).split('').reverse().join(''); 

    // 5. Construct the final User Object
    const newUser = {
        id: generateUUID(), // Give every user a unique database ID
        name,
        email,
        phone,
        password: hashedPassword,
        createdAt: new Date().toISOString()
    };

    // 6. Database Mutation
    users.push(newUser);
    localStorage.setItem('store_users_db', JSON.stringify(users));
    
    // 7. UX Enhancement: Auto-Login
    // We strip the password out before saving to the active session for security.
    //const sessionUser = { id: newUser.id, name: newUser.name, email: newUser.email };
    //localStorage.setItem('store_user', JSON.stringify(sessionUser));
    
    // 8. Success State & Routing
    showNotification('Registration successful! Redirecting...', 'success');
    
    // Disable the button to prevent double-clicking while redirecting
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Creating...';
    }

    // FIXED BUG: Redirect to the homepage/dashboard, not the login screen!
    setTimeout(() => {
        window.location.replace('login.html');
    }, 1500); // 1.5s delay so the user can read the success message
}

// ==========================================================================
// UTILITY FUNCTIONS (Ideally, these should be imported from utils.js)
// ==========================================================================

/**
 * Generates a fake unique identifier (UUID) for database records.
 */
function generateUUID() {
    return 'user_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

/**
 * Non-blocking UI Notification (Replaces ugly alert() boxes)
 * @param {string} message - The text to display
 * @param {string} type - 'success', 'danger', 'warning', etc. (Bootstrap color semantic)
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
    // Dynamically apply the color class based on the 'type' parameter
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
// DARK MODE LOGIC (Technical Debt: Move to shared file later)
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