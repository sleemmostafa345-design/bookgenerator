import React, { useEffect } from 'react';

declare global {
    interface Window {
        MathJax: {
            typesetPromise: () => Promise<void>;
        };
    }
}

/**
 * A debounced function to trigger MathJax typesetting.
 * This prevents multiple rapid-fire calls from overwhelming the browser.
 * The function is called after a short delay to allow the React DOM to update.
 */
let mathJaxDebounceTimeout: number;
export const triggerMathJaxTypeset = () => {
    if (mathJaxDebounceTimeout) {
        clearTimeout(mathJaxDebounceTimeout);
    }
    mathJaxDebounceTimeout = window.setTimeout(() => {
        if (typeof window.MathJax?.typesetPromise === 'function') {
            window.MathJax.typesetPromise();
        }
    }, 100); // A 100ms delay is usually sufficient for the DOM to settle.
};


export const useMathJax = (dependencies: React.DependencyList) => {
    useEffect(() => {
        // Trigger on initial render and when dependencies change.
        triggerMathJaxTypeset();
    }, dependencies);
};
