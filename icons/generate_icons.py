#!/usr/bin/env python3
"""
Generate placeholder PNG icons for Chrome extension.
Requires: pip install pillow
"""

try:
    from PIL import Image, ImageDraw
except ImportError:
    print("Please install Pillow: pip install pillow")
    exit(1)

def create_icon(size, filename):
    """Create a simple camera icon placeholder"""
    img = Image.new('RGB', (size, size), color='#4CAF50')
    draw = ImageDraw.Draw(img)

    # Scale factors
    padding = size * 0.2
    rect_width = size - (2 * padding)
    rect_height = rect_width * 0.6

    # Draw camera body (rectangle)
    left = padding
    top = size * 0.35
    right = size - padding
    bottom = top + rect_height
    draw.rectangle([left, top, right, bottom], outline='white', width=max(1, size//32))

    # Draw viewfinder (small rectangle on top)
    vf_width = rect_width * 0.4
    vf_left = (size - vf_width) / 2
    vf_top = top - (size * 0.1)
    draw.rectangle([vf_left, vf_top, vf_left + vf_width, top], fill='white')

    # Draw lens (circle)
    lens_size = rect_width * 0.3
    lens_left = (size - lens_size) / 2
    lens_top = top + (rect_height - lens_size) / 2
    draw.ellipse([lens_left, lens_top, lens_left + lens_size, lens_top + lens_size],
                 outline='white', width=max(1, size//32))

    img.save(filename)
    print(f"Created {filename}")

# Generate icons
create_icon(16, 'icon16.png')
create_icon(48, 'icon48.png')
create_icon(128, 'icon128.png')

print("\nIcons generated successfully!")
