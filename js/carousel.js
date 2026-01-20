/**
 * Orlando Studio - Infinite Scroll Carousel
 * Pure CSS animation with pause on hover
 * Dynamic animation calculation for seamless loop
 */

class Carousel {
  constructor(element) {
    this.carousel = element;
    this.viewport = this.carousel.querySelector('.showcase__viewport');
    this.track = this.carousel.querySelector('.showcase__track');
    
    this.init();
  }
  
  init() {
    // Duplicate slides for seamless loop
    this.duplicateSlides();
    
    // Wait for images to load, then calculate animation
    if (document.readyState === 'complete') {
      this.setupAnimation();
    } else {
      window.addEventListener('load', () => this.setupAnimation());
    }
    
    // Recalculate on window resize for responsive support
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        // Remove old animation
        const oldStyle = document.querySelector('style[data-carousel-animation]');
        if (oldStyle) oldStyle.remove();
        this.setupAnimation();
      }, 250);
    });
    
    // Pause on hover
    this.viewport.addEventListener('mouseenter', () => {
      this.track.classList.add('showcase__track--paused');
    });
    
    this.viewport.addEventListener('mouseleave', () => {
      this.track.classList.remove('showcase__track--paused');
    });
  }
  
  duplicateSlides() {
    const originalHTML = this.track.innerHTML;
    this.track.innerHTML = originalHTML + originalHTML;
  }
  
  setupAnimation() {
    // Small delay to ensure layout is complete
    setTimeout(() => {
      // Calculate exact width of one set of slides
      const slides = this.track.children;
      const halfSlides = slides.length / 2;
      
      let totalWidth = 0;
      for (let i = 0; i < halfSlides; i++) {
        totalWidth += slides[i].offsetWidth;
      }
      
      // Add gaps - there are halfSlides gaps (including the one after the last slide)
      const gapSize = 32; // var(--space-xl)
      totalWidth += gapSize * halfSlides;
      
      console.log('Calculated width for seamless loop:', totalWidth + 'px');
      
      // Create dynamic keyframe animation (slower speed)
      const styleSheet = document.createElement('style');
      styleSheet.setAttribute('data-carousel-animation', 'true');
      styleSheet.textContent = `
        @keyframes slideLeftDynamic {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-${totalWidth}px);
          }
        }
        
        .showcase__track {
          animation: slideLeftDynamic 45s linear infinite !important;
        }
      `;
      document.head.appendChild(styleSheet);
    }, 100);
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  const carousel = document.querySelector('.showcase__carousel');
  if (carousel) {
    new Carousel(carousel);
  }
});
