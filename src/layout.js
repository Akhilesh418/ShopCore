/**
 * layout.js
 * Handles the dynamic fetching and injection of global UI components (Navbar, Footer).
 * Built with true parallel fetching, idempotency guards, and strict error handling.
 */

export async function renderLayout() {
    try {
        // 1. Idempotency Guard (Prevent Duplicate Injections)
        // Check if the navbar or footer already exists in the DOM. 
        // If they do, exit the function immediately so we don't accidentally render them twice.
        if (document.querySelector('nav.navbar') || document.querySelector('footer.shopcore-footer')) {
            console.warn('Layout already rendered. Skipping injection to prevent duplicates.');
            return; 
        }

        // 2. TRUE Parallel Fetching
        // Promise.all fires both network requests at the exact same millisecond. 
        // It waits until BOTH are finished before moving to the next line. This cuts load time in half.
        const [navResponse, footerResponse] = await Promise.all([
            fetch('./navbar.html'),
            fetch('./footer.html')
        ]);

        // 3. Strict HTTP Error Handling
        // fetch() doesn't fail on 404s, so we must manually check if the responses are "ok" (Status 200-299)
        if (!navResponse.ok) throw new Error(`Navbar fetch failed: ${navResponse.statusText}`);
        if (!footerResponse.ok) throw new Error(`Footer fetch failed: ${footerResponse.statusText}`);

        // 4. Parallel Stream Parsing
        // Just like fetching, converting the raw data streams into text strings can be done at the same time.
        const [navbarHTML, footerHTML] = await Promise.all([
            navResponse.text(),
            footerResponse.text()
        ]);

        // 5. DOM Injection
        // 'afterbegin': Inserts immediately inside the <body> tag, pushing everything else down.
        document.body.insertAdjacentHTML('afterbegin', navbarHTML);
        
        // 'beforeend': Inserts just before the closing </body> tag.
        document.body.insertAdjacentHTML('beforeend', footerHTML);
        
        // 6. UI Synchronization Event
        // In a modular app, other scripts might need to know when the layout is finished loading 
        // (e.g., main.js needs to know when the theme button actually exists so it can attach a click listener).
        // We dispatch a custom event to announce to the rest of the app that the layout is ready.
        document.dispatchEvent(new Event('layoutRendered'));

    } catch (error) {
        // In a corporate app, this would be sent to a logging service like Sentry or Datadog.
        console.error("[UI Architecture Error] Failed to construct global layout:", error);
        
        // Emergency Fallback UI if the navigation fails to load entirely
        document.body.insertAdjacentHTML('afterbegin', `
            <div class="alert alert-danger text-center m-0 rounded-0" role="alert">
                Critical UI components failed to load. Please refresh the page.
            </div>
        `);
    }
}