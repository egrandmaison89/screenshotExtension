// Content script for capturing full page screenshots

async function captureFullPage() {
  const originalScrollPosition = window.scrollY;

  // Get actual document dimensions - be more aggressive about finding true height
  const totalWidth = Math.max(
    document.body.scrollWidth,
    document.body.offsetWidth,
    document.documentElement.clientWidth,
    document.documentElement.scrollWidth,
    document.documentElement.offsetWidth
  );

  const totalHeight = Math.max(
    document.body.scrollHeight,
    document.body.offsetHeight,
    document.documentElement.clientHeight,
    document.documentElement.scrollHeight,
    document.documentElement.offsetHeight
  );

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const screenshots = [];

  // Create progress indicator but position it so it won't be captured
  const progressDiv = document.createElement('div');
  progressDiv.id = 'screenshot-progress-indicator';
  progressDiv.style.cssText = `
    position: fixed;
    top: -200px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 15px 30px;
    border-radius: 8px;
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
    font-size: 16px;
    font-weight: 600;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    pointer-events: none;
    transition: top 0.3s ease;
  `;
  progressDiv.textContent = 'Preparing to capture...';
  document.body.appendChild(progressDiv);

  // Collect sticky/fixed elements — but DON'T hide them yet.
  // We want them visible for the first capture (scrollY=0) where
  // the header should appear in its natural position.
  const fixedElements = [];
  const allElements = document.querySelectorAll('*');

  allElements.forEach(el => {
    const style = window.getComputedStyle(el);
    if (style.position === 'fixed' || style.position === 'sticky') {
      // Skip our progress indicator
      if (el.id !== 'screenshot-progress-indicator') {
        fixedElements.push({
          element: el,
          originalPosition: style.position,
          originalVisibility: el.style.visibility
        });
      }
    }
  });

  try {
    // Show progress indicator temporarily
    progressDiv.style.top = '20px';
    await new Promise(resolve => setTimeout(resolve, 500));

    // Hide progress indicator before capturing
    progressDiv.style.top = '-200px';

    // Scroll to absolute top and wait for everything to settle
    window.scrollTo(0, 0);
    await new Promise(resolve => setTimeout(resolve, 800));

    // Hide scrollbar visually using scrollbar-width and webkit pseudo-element.
    // We avoid overflow:hidden which can prevent scrollTo() on some pages.
    document.documentElement.style.scrollbarWidth = 'none'; // Firefox/Chrome 121+
    const scrollbarStyle = document.createElement('style');
    scrollbarStyle.id = 'screenshot-hide-scrollbar';
    scrollbarStyle.textContent = '::-webkit-scrollbar { display: none !important; }';
    document.head.appendChild(scrollbarStyle);

    // Calculate scroll positions with overlap to prevent gaps
    const overlap = 100; // Increased overlap for better blending
    const scrollStep = viewportHeight - overlap;
    let currentY = 0;
    let captureCount = 0;

    // Calculate total number of captures needed
    const totalCaptures = Math.ceil(totalHeight / scrollStep) + 1;

    // Capture screenshots while scrolling down
    while (currentY < totalHeight) {
      const progress = Math.round((captureCount / totalCaptures) * 100);
      progressDiv.textContent = `Capturing: ${progress}%`;

      // Show progress briefly
      progressDiv.style.top = '20px';
      await new Promise(resolve => setTimeout(resolve, 100));

      // Hide before capture
      progressDiv.style.top = '-200px';
      await new Promise(resolve => setTimeout(resolve, 100));

      // Scroll to exact position
      window.scrollTo({
        top: currentY,
        left: 0,
        behavior: 'instant'
      });

      // Wait longer for page to completely settle and lazy content to load
      await new Promise(resolve => setTimeout(resolve, 600));

      // Record the ACTUAL scroll position — the browser clamps scrollTo()
      // at maxScroll (totalHeight - viewportHeight), so the actual position
      // may be less than what we requested.
      const actualScrollY = window.scrollY;

      // Capture the visible tab
      const response = await chrome.runtime.sendMessage({ action: 'captureVisibleTab' });
      if (response.error) {
        throw new Error(response.error);
      }

      screenshots.push({
        dataUrl: response.dataUrl,
        scrollY: actualScrollY,
        viewportHeight: viewportHeight,
        index: captureCount
      });

      // After the first capture, hide fixed/sticky elements so they
      // don't repeat in subsequent scroll captures
      if (captureCount === 0) {
        fixedElements.forEach(({element}) => {
          element.style.visibility = 'hidden';
        });
      }

      captureCount++;
      currentY += scrollStep;
    }

    // Make sure we capture the very bottom if the last capture didn't cover it.
    // Use the actual recorded scrollY of the last screenshot (which accounts for
    // browser clamping) to determine if we reached the bottom.
    const lastScreenshot = screenshots[screenshots.length - 1];
    const lastCapturedBottom = lastScreenshot.scrollY + viewportHeight;
    if (lastCapturedBottom < totalHeight) {
      progressDiv.textContent = 'Capturing: 100%';
      progressDiv.style.top = '20px';
      await new Promise(resolve => setTimeout(resolve, 100));
      progressDiv.style.top = '-200px';
      await new Promise(resolve => setTimeout(resolve, 100));

      // Scroll to absolute bottom
      window.scrollTo({
        top: totalHeight - viewportHeight,
        left: 0,
        behavior: 'instant'
      });

      await new Promise(resolve => setTimeout(resolve, 600));

      const actualBottomScrollY = window.scrollY;
      const response = await chrome.runtime.sendMessage({ action: 'captureVisibleTab' });
      if (!response.error) {
        screenshots.push({
          dataUrl: response.dataUrl,
          scrollY: actualBottomScrollY,
          viewportHeight: viewportHeight,
          index: captureCount
        });
      }
    }

    progressDiv.textContent = 'Processing...';
    progressDiv.style.top = '20px';

    // Restore fixed elements
    fixedElements.forEach(({element, originalVisibility}) => {
      element.style.visibility = originalVisibility;
    });

    // Restore scrollbar
    document.documentElement.style.scrollbarWidth = '';
    const hideStyle = document.getElementById('screenshot-hide-scrollbar');
    if (hideStyle) hideStyle.remove();

    // Restore original scroll position
    window.scrollTo(0, originalScrollPosition);

    // Remove progress indicator
    await new Promise(resolve => setTimeout(resolve, 300));
    if (document.body.contains(progressDiv)) {
      document.body.removeChild(progressDiv);
    }

    return {
      screenshots,
      totalHeight,
      totalWidth,
      viewportWidth,
      viewportHeight,
      overlap,
      devicePixelRatio: window.devicePixelRatio || 1
    };
  } catch (error) {
    // Restore fixed elements on error
    fixedElements.forEach(({element, originalVisibility}) => {
      element.style.visibility = originalVisibility;
    });

    // Restore scrollbar
    document.documentElement.style.scrollbarWidth = '';
    const hideStyle = document.getElementById('screenshot-hide-scrollbar');
    if (hideStyle) hideStyle.remove();

    if (document.body.contains(progressDiv)) {
      document.body.removeChild(progressDiv);
    }

    window.scrollTo(0, originalScrollPosition);
    throw error;
  }
}

// Listen for screenshot requests
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startCapture') {
    captureFullPage()
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Async response
  }
});
