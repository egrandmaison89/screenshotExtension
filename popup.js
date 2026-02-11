// Popup script for handling user interactions

function showStatus(message, type = 'info') {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
}

function disableButtons(disabled) {
  document.getElementById('capturePNG').disabled = disabled;
  document.getElementById('capturePDF').disabled = disabled;
}

async function captureScreenshot(format) {
  try {
    disableButtons(true);
    showStatus('Capturing full page...', 'info');

    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Inject content script
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });

    // Request capture
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'startCapture' });

    if (!response.success) {
      throw new Error(response.error);
    }

    showStatus('Stitching screenshots together...', 'info');

    // Stitch screenshots together
    const canvas = await stitchScreenshots(response.data);

    showStatus('Preparing download...', 'info');

    if (format === 'png') {
      await downloadPNG(canvas, tab.title);
    } else if (format === 'pdf') {
      await downloadPDF(canvas, tab.title);
    }

    showStatus('Screenshot saved successfully!', 'success');
    disableButtons(false);
  } catch (error) {
    console.error('Screenshot error:', error);
    showStatus(`Error: ${error.message}`, 'error');
    disableButtons(false);
  }
}

async function stitchScreenshots(data) {
  const { screenshots, totalHeight, totalWidth, viewportWidth, viewportHeight, overlap } = data;
  const dpr = data.devicePixelRatio || 1;

  // Create canvas at DEVICE pixel dimensions (matching captureVisibleTab output)
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(totalWidth * dpr);
  canvas.height = Math.round(totalHeight * dpr);
  const ctx = canvas.getContext('2d', { alpha: false });

  // Fill with white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // All coordinates from content.js are in CSS pixels.
  // captureVisibleTab returns images at device pixel resolution.
  // So we must scale all CSS-pixel positions by dpr when placing onto canvas.

  for (let i = 0; i < screenshots.length; i++) {
    const screenshot = screenshots[i];
    const img = await loadImage(screenshot.dataUrl);

    // These are the actual device-pixel dimensions of the captured image
    const imgWidth = img.naturalWidth || img.width;
    const imgHeight = img.naturalHeight || img.height;

    // scrollY is in CSS pixels — convert to device pixels for canvas placement
    const targetYDevice = Math.round(screenshot.scrollY * dpr);

    let sourceY = 0;
    let sourceHeight = imgHeight;
    let destY = targetYDevice;

    if (i > 0) {
      // Calculate the ACTUAL overlap between this capture and the previous one.
      // The previous capture covered: prevScrollY to prevScrollY + viewportHeight
      // This capture covers: scrollY to scrollY + viewportHeight
      // Actual overlap in CSS px = prevScrollY + viewportHeight - scrollY
      const prevScreenshot = screenshots[i - 1];
      const actualOverlapCSS = prevScreenshot.scrollY + viewportHeight - screenshot.scrollY;
      const actualOverlapDevice = Math.round(Math.max(0, actualOverlapCSS) * dpr);

      // Skip the overlapping pixels from the top of this screenshot
      sourceY = Math.min(actualOverlapDevice, imgHeight);
      sourceHeight = imgHeight - sourceY;
      destY = targetYDevice + actualOverlapDevice;
    }

    // Calculate how much of the screenshot to use (in device pixels)
    const remainingHeight = canvas.height - destY;
    const heightToDraw = Math.min(sourceHeight, remainingHeight);

    if (heightToDraw > 0) {
      ctx.drawImage(
        img,
        0, sourceY,                          // Source X, Y (device px)
        imgWidth, heightToDraw,              // Source width, height (device px)
        0, destY,                            // Destination X, Y (device px)
        canvas.width, heightToDraw           // Destination width, height (device px)
      );
    }
  }

  return canvas;
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load screenshot image'));
    img.src = dataUrl;
  });
}

async function downloadPNG(canvas, pageTitle) {
  const dataUrl = canvas.toDataURL('image/png', 1.0);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `${sanitizeFilename(pageTitle)}_${timestamp}.png`;

  await chrome.downloads.download({
    url: dataUrl,
    filename: `Screenshots/${filename}`,
    saveAs: false
  });
}

async function downloadPDF(canvas, pageTitle) {
  // Check if jsPDF is loaded - try multiple access patterns
  let jsPDFConstructor = null;

  if (window.jspdf && window.jspdf.jsPDF) {
    jsPDFConstructor = window.jspdf.jsPDF;
  } else if (window.jsPDF) {
    jsPDFConstructor = window.jsPDF;
  } else if (typeof jsPDF !== 'undefined') {
    jsPDFConstructor = jsPDF;
  }

  if (!jsPDFConstructor) {
    console.error('jsPDF not found. Window.jspdf:', window.jspdf);
    throw new Error('jsPDF library not loaded. Please reload the extension and try again.');
  }

  const jsPDF = jsPDFConstructor;

  // Calculate PDF dimensions
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  // A4 dimensions in points (at 72 DPI)
  const pdfWidth = 595.28;
  const pdfHeight = 841.89;

  // Calculate scaling to fit width
  const scaleFactor = pdfWidth / imgWidth;
  const scaledHeight = imgHeight * scaleFactor;

  // Create PDF with appropriate orientation
  const orientation = scaledHeight > pdfWidth ? 'portrait' : 'landscape';
  const pdf = new jsPDF({
    orientation: orientation,
    unit: 'pt',
    format: [pdfWidth, Math.max(pdfHeight, scaledHeight)]
  });

  // Convert canvas to JPEG for smaller file size
  const imgData = canvas.toDataURL('image/jpeg', 0.92);
  pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, scaledHeight, '', 'FAST');

  // Convert to blob and download
  const pdfBlob = pdf.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `${sanitizeFilename(pageTitle)}_${timestamp}.pdf`;

  await chrome.downloads.download({
    url: pdfUrl,
    filename: `Screenshots/${filename}`,
    saveAs: false
  });

  // Clean up
  setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);
}

function sanitizeFilename(filename) {
  if (!filename || filename.trim() === '') {
    return 'screenshot';
  }
  return filename
    .replace(/[^a-z0-9\s\-_]/gi, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50) || 'screenshot';
}

// Wait for DOM and scripts to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Verify jsPDF is loaded
  setTimeout(() => {
    if (!window.jspdf && !window.jsPDF && typeof jsPDF === 'undefined') {
      showStatus('Error: PDF library failed to load. Try reloading extension.', 'error');
      document.getElementById('capturePDF').disabled = true;
    }
  }, 100);

  // Event listeners
  document.getElementById('capturePNG').addEventListener('click', () => {
    captureScreenshot('png');
  });

  document.getElementById('capturePDF').addEventListener('click', () => {
    captureScreenshot('pdf');
  });
});
