# Full Page Screenshot Extension

**Version:** 1.0.2
**Last Updated:** February 9, 2026

A Chrome extension that captures complete webpage screenshots by automatically scrolling and stitching. Save as PNG or PDF to your Screenshots folder.

---

## 🚀 Quick Start

### Installation (3 steps)

1. **Generate icons:**
   ```bash
   cd screenshotExtension/icons
   python3 generate_icons.py  # Requires: pip install pillow
   ```

2. **Load extension:**
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `screenshotExtension` folder

3. **Use it:**
   - **IMPORTANT:** Maximize your browser window (F11 for fullscreen)
   - Navigate to any webpage
   - Click the extension icon
   - Choose "Capture as PNG" or "Capture as PDF"
   - Find screenshot in `~/Downloads/Screenshots/`

---

## ⚠️ IMPORTANT: Window Size Matters!

**The extension captures based on your current browser window size.**

- Narrow window (1369px) → narrow output
- Full screen (1920px) → wide output

**For best results:**
1. Press F11 (fullscreen) OR maximize window completely
2. Set zoom to 100% (Cmd+0 or Ctrl+0)
3. THEN capture

This is why your test output looked "squished" - the browser window was narrow.

---

## ✨ Features

✅ **Full-page capture** - Automatically scrolls and captures entire page
✅ **Multiple formats** - Save as PNG or PDF
✅ **Auto-organization** - Screenshots saved to `Downloads/Screenshots/`
✅ **Smart handling** - Hides sticky headers/fixed elements during capture
✅ **Progress feedback** - Visual indicator (hidden in final output)
✅ **Clean output** - No seams, no duplicates, smooth stitching with 100px overlap
✅ **Complete capture** - Includes footer and all content to bottom

---

## 🐛 Troubleshooting

### Common Issues

**Q: Output looks narrow/"squished"**
A: Maximize browser window (F11) before capturing

**Q: Progress indicator visible in screenshot**
A: Update to v1.0.2+ (indicator now hidden during capture)

**Q: Header appears multiple times**
A: Update to v1.0.2+ (sticky elements now hidden)

**Q: Footer is cut off**
A: Update to v1.0.2+ (now captures to absolute bottom)

**Q: Visible seams between sections**
A: Update to v1.0.2+ (100px overlap prevents seams)

**Q: PDF generation error**
A: Complete reinstall required (see below)

### Complete Reinstall

If you have any errors:

```bash
# 1. Remove extension at chrome://extensions/

# 2. Clear cache (IMPORTANT!)
# Press Cmd+Shift+Delete
# Select "Cached images and files"
# Time: "All time"
# Click "Clear data"
# Quit Chrome completely (Cmd+Q)
# Reopen Chrome

# 3. Verify jsPDF file exists
cd screenshotExtension
ls -lh jspdf.umd.min.js  # Should show 356K

# 4. Reload extension
# chrome://extensions/ → Load unpacked → Select screenshotExtension folder
# Verify version shows 1.0.2
```

---

## 📖 How It Works

1. **Detects** and temporarily hides all sticky/fixed elements
2. **Scrolls** from top to bottom capturing viewport at each position
3. **Waits** 600ms between captures for content to settle and lazy-load
4. **Stitches** screenshots with 100px overlap for seamless transitions
5. **Captures** complete page including footer (extra capture at absolute bottom)
6. **Restores** page to original state

---

## 💡 Best Practices

### Before Capturing

1. ✅ **Maximize browser window** (F11 or click maximize button)
2. ✅ Set zoom to 100% (Cmd+0)
3. ✅ Wait for page to fully load
4. ✅ Scroll to bottom once (triggers lazy loading)
5. ✅ Scroll back to top
6. ✅ Close popups/modals if any
7. ✅ Click extension → Capture

### For Long Pages

- Typical capture time: 25-35 seconds
- Don't interrupt the process
- Progress indicator shows % complete
- Wait times ensure quality output

---

## 📦 Output Formats

### PNG
- **Quality:** Lossless, perfect
- **Size:** 2-20MB typical
- **Best for:** Archiving, editing, design review

### PDF
- **Quality:** JPEG 92% (imperceptible loss)
- **Size:** 50-70% smaller than PNG
- **Best for:** Sharing, documentation, printing

---

## 🚢 Publishing to Chrome Web Store

### Quick Steps

1. **Pay** $5 developer fee at https://chrome.google.com/webstore/devconsole
2. **Create** promotional images:
   - Small tile: 440x280px
   - Marquee: 1400x560px (optional)
   - Screenshots: 1280x800px (1-5 images showing the extension in use)

3. **Package** extension:
   ```bash
   cd /Users/ericgrandmaison/Desktop/claudeCode
   zip -r screenshotExtension.zip screenshotExtension/ \
     -x "*.git*" -x "*.DS_Store" -x "*.md" -x "*test*" \
     -x "*generate_icons.py" -x "*icon.svg"
   ```

4. **Upload** at https://chrome.google.com/webstore/devconsole
5. **Fill** store listing (see template below)
6. **Submit** for review (1-3 business days)

### Store Listing Template

**Name:** Full Page Screenshot

**Summary:** Capture full-page screenshots with auto-scroll. Save as PNG or PDF to your Screenshots folder.

**Description:**
```
Capture complete webpage screenshots with automatic scrolling. Perfect for archiving, documentation, and sharing.

KEY FEATURES:
• Full Page Capture - Automatically scrolls and captures entire pages
• Multiple Formats - Save as PNG or PDF
• Auto-Organization - Screenshots saved to Downloads/Screenshots folder
• Smart Handling - Hides sticky headers for clean output
• Progress Feedback - Visual indicator during capture

HOW TO USE:
1. Maximize your browser window for best width
2. Click the extension icon on any webpage
3. Choose PNG or PDF format
4. Find screenshot in Downloads/Screenshots/

PRIVACY:
- No data collection
- No external servers
- Everything stays on your computer
- Only accesses pages when you click capture

Works on all websites (except Chrome internal pages).
```

**Category:** Productivity

**Permissions Justification:**
- `activeTab` - Capture screenshots of current tab when user clicks icon
- `downloads` - Save screenshots to Downloads/Screenshots folder
- `scripting` - Inject content script for page scrolling coordination

---

## 🔧 Technical Details

### Architecture
```
manifest.json       → Extension config (v1.0.2)
background.js       → Service worker for Chrome tab capture API
content.js          → Page scrolling, fixed element hiding, capture logic
popup.html          → User interface
popup.js            → Screenshot stitching and download
jspdf.umd.min.js   → PDF library (356KB, bundled locally)
```

### Capture Algorithm

1. Find all `position: fixed` and `position: sticky` elements → hide them
2. Scroll to top, wait 800ms for settle
3. Calculate captures: `Math.ceil(totalHeight / (viewportHeight - 100))`
4. For each position:
   - Move progress indicator off-screen
   - Scroll with `behavior: 'instant'`
   - Wait 600ms for lazy content
   - Capture visible tab
5. Extra capture at absolute bottom if needed
6. Stitch with 100px overlap
7. Restore everything

### Performance

| Metric | Value |
|--------|-------|
| Wait per capture | 600ms |
| Overlap | 100px |
| Typical time | 25-35s |
| Memory | 50-100MB temp |

### Requirements

- Chrome 88+
- ~400KB disk space
- Python 3 + Pillow (for icon generation only)

---

## 📝 Version History

### v1.0.2 (Current - Feb 9, 2026)
- ✅ Fixed: Progress indicator no longer visible in screenshots
- ✅ Fixed: Sticky headers no longer repeat in output
- ✅ Fixed: Footer now included (captures to absolute bottom)
- ✅ Improved: Page stability with 600ms waits
- ✅ Improved: Increased overlap to 100px for smoother stitching

### v1.0.1
- ✅ Fixed: jsPDF loading (bundled locally, no more CDN)
- ✅ Fixed: CSP violations
- ✅ Improved: Full-width capture logic

### v1.0.0
- Initial release

---

## ⚠️ Known Limitations

**Cannot capture wider than browser viewport**
- Chrome API limitation
- Solution: Maximize window

**Some sites may have issues:**
- Infinite scroll → Captures only loaded content
- Canvas/WebGL → May appear blank
- Heavy animations → May need to pause
- Auto-playing videos → May cause shifts

---

## 🔒 Privacy

- ✅ Only accesses active tab when you click capture
- ✅ No data collection or transmission
- ✅ All files saved locally
- ✅ No external accounts needed
- ✅ No analytics or tracking
- ✅ All code visible (open source)

---

## 📁 File Structure

```
screenshotExtension/
├── manifest.json          # Extension config (version here!)
├── background.js          # Service worker
├── content.js            # Capture logic
├── popup.html            # UI
├── popup.js              # Processing
├── jspdf.umd.min.js     # PDF library (356KB)
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   ├── icon128.png
│   └── generate_icons.py
└── README.md            # ← You are here
```

---

## 💬 Support

**Having issues?**
1. Check troubleshooting section above
2. Try complete reinstall
3. Test on simple site (example.com) first
4. Verify Chrome version is 88+ at `chrome://version/`

**Feature ideas for future:**
- Keyboard shortcut
- Custom dimensions
- Capture selected area
- Annotation tools

---

## 📄 License

Free to use and modify for personal or commercial projects.

---

**Made with Chrome Extension Manifest V3 + jsPDF (MIT)**

For the latest updates, check version number at top of this file and in `manifest.json`

**Enjoy your full-page screenshots! 📸**
