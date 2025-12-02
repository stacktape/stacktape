/**
 * Utility function to perform view transitions with browser support detection
 * Falls back to regular navigation if View Transition API is not supported
 */
export function startViewTransition(updateCallback: () => void | Promise<void>) {
  // Check if View Transition API is supported
  if (typeof window !== 'undefined' && 'startViewTransition' in document) {
    return (document as any).startViewTransition(updateCallback);
  } else {
    // Fallback for browsers that don't support View Transition API
    return updateCallback();
  }
}

/**
 * Check if View Transition API is supported in the current browser
 */
export function isViewTransitionSupported(): boolean {
  return typeof window !== 'undefined' && 'startViewTransition' in document;
}

/**
 * Optimized view transition with minimal loading state management
 */
export function startViewTransitionWithLoading(updateCallback: () => Promise<void>) {
  if (!isViewTransitionSupported()) {
    return updateCallback();
  }

  return (document as any).startViewTransition(async () => {
    // Add loading class just before navigation
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.classList.add('view-transition-loading');
    }

    try {
      await updateCallback();
    } finally {
      // Remove loading class immediately after navigation
      if (mainContent) {
        mainContent.classList.remove('view-transition-loading');
      }
    }
  });
}

/**
 * Optimized preload function with minimal overhead
 */
export function preloadPage(href: string, router?: any) {
  if (typeof window === 'undefined') return;

  // Use Next.js router prefetch if available (most efficient for static exports)
  if (router && typeof router.prefetch === 'function') {
    router.prefetch(href).catch(() => {}); // Silent fail
    return;
  }

  // Quick check for existing prefetch
  if (document.querySelector(`link[rel="prefetch"][href="${href}"]`)) return;

  // Native prefetch as fallback
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = href;
  document.head.appendChild(link);

  // Quick cleanup
  setTimeout(() => {
    link.remove();
  }, 2000);
}

/**
 * Hook to handle view transitions for Next.js router navigation
 */
export function useViewTransition() {
  const performTransition = (callback: () => void | Promise<void>) => {
    if (isViewTransitionSupported()) {
      return startViewTransition(callback);
    }
    return callback();
  };

  const performTransitionWithLoading = (callback: () => Promise<void>) => {
    if (isViewTransitionSupported()) {
      return startViewTransitionWithLoading(callback);
    }
    return callback();
  };

  return {
    performTransition,
    performTransitionWithLoading,
    preloadPage,
    isSupported: isViewTransitionSupported()
  };
}
