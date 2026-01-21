# Open Graph Image Required

## Status
The `og:image` meta tag has been configured in `index.html`, but the actual image file needs to be created.

## Requirements

**File Path:** `public/images/og-image.png`

**Specifications:**
- **Dimensions:** 1200 x 630 pixels (required for Facebook/LinkedIn/Twitter)
- **Format:** PNG or JPEG
- **File Size:** < 300 KB (recommended for fast loading)
- **Content:** Should represent Orlando Studio brand
  - Include Orlando Studio logo/branding
  - Clear, readable text even at small sizes
  - Engaging visual that represents the product

## Design Guidelines

1. **Safe Zone:** Keep important content within center 1200x600px area
2. **Text:** Use large, bold fonts (minimum 60px for readability)
3. **Contrast:** High contrast for visibility in social feeds
4. **Brand Colors:** Use Orlando Studio color palette (gold #d4af37, tomato #e76f51, teal #2a9d8f)

## Testing

Once created, test the image at:
- https://www.opengraph.xyz/
- https://cards-dev.twitter.com/validator
- Facebook Sharing Debugger

## Temporary Solution

Until the branded OG image is created, you can:
1. Use one of the showcase images temporarily
2. Create a simple branded image with text overlay
3. Leave as is (social platforms will use a default preview)

---

**Note:** This file can be deleted once `og-image.png` is created and tested.
