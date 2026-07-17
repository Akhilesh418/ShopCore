/**
 * api.js
 * Centralized network request logic for ShopCore.
 * Isolating API calls here ensures that if the backend URL or data structure changes,
 * we only have to update this single file, not our entire UI logic.
 */

// Central source of truth for the API endpoint.
// In a real enterprise app, this would often be loaded from a .env file (e.g., process.env.VITE_API_URL).
export const API_URL = 'https://fakestoreapi.com/products';

/**
 * Utility function to create an artificial delay.
 * Separating this from the fetch logic keeps our code strictly adherent to the 
 * Single Responsibility Principle (SRP).
 * * @param {number} ms - Milliseconds to delay
 * @returns {Promise} A promise that resolves after the specified time
 */
const simulateNetworkLatency = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetches the entire product catalog from the external API.
 * * @param {Object} options - Optional configuration for the fetch request.
 * @param {AbortSignal} [options.signal] - Allows cancelling the request to prevent memory leaks/race conditions.
 * @returns {Promise<Array|null>} Resolves to an array of products, or null if aborted.
 */
export async function fetchProducts({ signal } = {}) {
    try {
        // 1. Simulate network latency for testing loading states (skeletons).
        // Await pauses execution here without blocking the main browser thread.
        await simulateNetworkLatency(1500);

        // 2. Execute the network request.
        // We pass the 'signal' so the browser knows how to cancel this request if asked to.
        const response = await fetch(API_URL, {
            method: 'GET',
            headers: {
                // Explicitly tell the server we expect JSON back
                'Accept': 'application/json', 
            },
            signal: signal 
        });
        
        // 3. HTTP Error Handling. 
        // `fetch` only throws an error on network failure (like being offline). 
        // It does NOT throw on 404 (Not Found) or 500 (Server Error). We must check `response.ok`.
        if (!response.ok) {
            // Throwing a detailed error helps with debugging in production
            throw new Error(`HTTP Error! Status: ${response.status} - ${response.statusText}`);
        }
        
        // 4. Parse and return the JSON data
        const data = await response.json();
        return data;

    } catch (error) {
        // 5. Intelligent Error Routing
        
        // If the error is an AbortError, it means WE intentionally cancelled it.
        // This is not a failure, so we shouldn't log it as a terrifying red error.
        if (error.name === 'AbortError') {
            console.info('Fetch intentionally aborted by the application.');
            return null; // Return null so the UI knows to safely ignore this response
        }
        
        // If it's a real error, log it with a distinct tag for monitoring tools
        console.error('[API Service Error] fetchProducts failed:', error.message);
        
        // Re-throw the error so the UI (main.js) can catch it and show an error message to the user
        throw error;
    }
}