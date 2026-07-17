/**
 * utils.js
 * A library of globally accessible utility functions.
 */

/**
 * Debounce Function: Limits the rate at which a function can fire.
 * Ensures that a time-consuming or state-altering function does not execute 
 * continuously if invoked rapidly (e.g., button spamming).
 * * @param {Function} func - The original function to execute.
 * @param {number} delay - The quiet period (in ms) required before execution.
 * @returns {Function} A new wrapped function that enforces the delay.
 */
export function debounce(func, delay) {
    // Variable stored in closure memory to track the active timer
    let timeoutId;
    
    // Return a wrapped version of the original function
    return function (...args) {
        // If the function is called again before the timer ends, cancel the old timer
        clearTimeout(timeoutId); 
        
        // Start a brand new timer. Only when this finishes will the original function run.
        timeoutId = setTimeout(() => {
            func.apply(this, args); 
        }, delay);
    };
}