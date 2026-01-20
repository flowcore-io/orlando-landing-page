# Orlando Studio - Landing Page

AI-powered landing page design with professional results and personal touch. Orlando Studio brings warmth and intelligence to web design, creating landing pages that feel personal and look professional—no code required.

## 🎯 Project Overview

This is the official landing page for Orlando Studio, built using vanilla HTML, CSS, and JavaScript following professional web development standards. The site showcases Orlando's design philosophy and serves as a waitlist signup page for the upcoming launch.

## 🚀 Quick Start

### Prerequisites

- A modern web browser
- Node.js (for running the local development server)

### Running Locally

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/orlando-landing-page.git
   cd orlando-landing-page
   ```

2. **Start the development server**
   ```bash
   npx live-server --port=8000
   ```

3. **Open in browser**
   
   The site will automatically open at `http://localhost:8000`

## 📁 Project Structure

```
orlando-landing-page/
├── index.html              # Main landing page
├── CNAME                   # Custom domain configuration
├── css/
│   ├── main.css           # Global styles, variables, base styles
│   └── components/        # Component-specific styles
│       ├── shared.css     # Shared components (buttons, cards, etc.)
│       ├── navbar.css     # Navigation header
│       ├── hero.css       # Hero section
│       ├── features.css   # Features section
│       ├── showcase.css   # Showcase carousel
│       ├── demo.css       # Demo section
│       ├── cta.css        # Call-to-action section
│       └── footer.css     # Footer
├── js/
│   ├── carousel.js        # Showcase carousel functionality
│   └── signup.js          # Email signup form handling
└── README.md              # This file
```

## 🏗️ Architecture

### Technology Stack

- **HTML5** - Semantic markup with WCAG 2.1 AA+ accessibility
- **CSS3** - Custom properties (CSS variables), Grid, Flexbox, BEM methodology
- **Vanilla JavaScript** - ES6+ features, no frameworks or build tools
- **GitHub Pages** - Static site hosting

### Design Principles

This project follows **Orlando's Design Philosophy**:

- **Vanilla Web Development** - No frameworks, no build tools, just clean HTML/CSS/JS
- **BEM Methodology** - Block Element Modifier naming for CSS classes
- **Accessibility First** - WCAG 2.1 AA+ compliance
- **Performance Optimized** - Parallel CSS loading, minimal JavaScript
- **Professional Polish** - Subtle animations (200-300ms), consistent spacing, proper typography hierarchy

### CSS Architecture

- **`main.css`** - Contains ALL variables, resets, base styles, and global utilities
- **Component files** - Individual CSS files loaded via `<link>` tags for parallel downloads
- **No @import statements** - All components loaded directly in HTML for better performance

## 🎨 Color Palette

The site uses an Italian-inspired color palette:

- **Primary (Terracotta)**: `#c65d07` - Main brand color
- **Olive Green**: `#6a7c3a` - Accents
- **Tuscan Gold**: `#d4af37` - Highlights
- **Cream**: `#faf6f2` - Warm backgrounds
- **Text**: `#1a1a1a` - Primary text

## ✨ Key Features

- **Email Waitlist Signup** - Form with localStorage persistence
- **Showcase Carousel** - Auto-advancing carousel with manual controls
- **Smooth Scrolling** - Anchor link navigation with smooth scroll behavior
- **Responsive Design** - Mobile-first approach with fluid typography
- **Skip to Content Link** - WCAG 2.4.1 compliance for keyboard navigation
- **Semantic HTML** - Proper use of `<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`
- **Schema.org Markup** - Structured data for better SEO

## 🧪 Testing

### Browser Testing

Tested and verified in:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Android)

### Accessibility Testing

- Keyboard navigation fully functional
- Screen reader compatible
- 44px+ touch targets
- Proper ARIA labels and roles
- `prefers-reduced-motion` support

### Performance

- CSS loaded in parallel for optimal speed
- JavaScript modules loaded asynchronously
- No external dependencies
- Minimal JavaScript execution

## 🚢 Deployment

### GitHub Pages

This site is deployed via GitHub Pages:

1. **Commit changes**
   ```bash
   git add .
   git commit -m "Update landing page"
   ```

2. **Push to main**
   ```bash
   git push origin main
   ```

3. **GitHub Pages auto-deploys** from the `main` branch

### Custom Domain

The site uses a custom domain configured via `CNAME` file:
- Domain: `orlando.studio`
- Alternative: `orlando.usable.dev`

## 📝 Development Guidelines

### CSS Standards

- Use BEM naming convention: `.block__element--modifier`
- All colors from CSS variables
- Font weight variables: `--font-normal`, `--font-medium`, `--font-semibold`, `--font-bold`
- Spacing from spacing scale: `--space-xs` through `--space-5xl`
- Animations: 200-300ms for UI interactions

### JavaScript Standards

- ES6+ syntax (classes, arrow functions, template literals)
- Use `const` and `let` (no `var`)
- Document functions with JSDoc-style comments
- Handle edge cases and errors gracefully

### Accessibility Requirements

- All interactive elements must have visible focus states (using `box-shadow`, not `outline`)
- No hover effects on non-clickable elements
- Proper alt text for all images
- Semantic HTML elements
- ARIA labels where needed

## 🔧 Common Tasks

### Adding a New Component

1. Create CSS file in `css/components/`
2. Add `<link>` tag in `index.html` after `main.css`
3. Use BEM naming with section prefix (e.g., `hero__title`)
4. Include JavaScript file if needed

### Updating Colors

Edit CSS variables in `css/main.css`:
```css
:root {
  --color-primary: #c65d07;
  /* ... other colors ... */
}
```

### Adding New Sections

1. Add HTML in `index.html` with proper semantic elements
2. Create corresponding CSS file in `css/components/`
3. Link CSS file in HTML `<head>`
4. Add JavaScript file if interactivity needed

## 📚 Resources

- [Orlando Design Philosophy](https://usable.dev) - Design principles and standards
- [BEM Methodology](http://getbem.com/) - CSS naming convention
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/) - Accessibility standards

## 🤝 Contributing

This is a professional project following strict standards. Before contributing:

1. Read Orlando's Design Philosophy
2. Follow BEM naming conventions
3. Ensure WCAG 2.1 AA+ accessibility
4. Test in all major browsers
5. No frameworks or dependencies

## 📄 License

Copyright © 2025 Orlando Studio. All rights reserved.

## 🔗 Links

- **Live Site**: [orlando.studio](https://orlando.studio)
- **Usable Platform**: [usable.dev](https://usable.dev)
- **Contact**: [info@orlando.studio](mailto:info@orlando.studio)

---

**Built with care by Orlando** - Professional vanilla web development
