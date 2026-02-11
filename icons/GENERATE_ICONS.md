# Icon Generation Instructions

The extension requires three icon sizes: 16x16, 48x48, and 128x128 pixels.

## Option 1: Use an online converter
1. Go to https://cloudconvert.com/svg-to-png
2. Upload `icon.svg`
3. Convert to PNG at sizes: 16x16, 48x48, and 128x128
4. Save as `icon16.png`, `icon48.png`, and `icon128.png` in this directory

## Option 2: Use ImageMagick (if installed)
```bash
magick icon.svg -resize 16x16 icon16.png
magick icon.svg -resize 48x48 icon48.png
magick icon.svg -resize 128x128 icon128.png
```

## Option 3: Temporary workaround
For testing purposes, you can create simple placeholder PNGs with any image editor or use the extension without icons initially (Chrome will show a default icon).
