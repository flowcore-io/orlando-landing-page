/**
 * Orlando Studio - Infinite Scroll Carousel
 * Pure CSS animation with pause on hover
 * Dynamic animation calculation for seamless loop
 * Drag and touch support for manual navigation
 */

class Carousel {
  /**
   * Create a new Carousel instance
   * @param {HTMLElement} element - The carousel container element
   */
  constructor(element) {
    this.carousel = element;
    this.viewport = this.carousel.querySelector('.showcase__viewport');
    this.track = this.carousel.querySelector('.showcase__track');
    
    // Drag state
    this.isDragging = false;
    this.startX = 0;
    this.currentX = 0;
    this.dragOffset = 0;
    this.animationId = null;
    
    // Track loop boundaries for infinite scroll
    this.loopWidth = 0;
    
    // Manual animation state
    this.isManualAnimating = false;
    this.animationSpeed = 0; // pixels per frame
    
    this.init();
  }
  
  /**
   * Initialize carousel
   * Sets up animation, duplicates slides for seamless loop, and configures event listeners
   */
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
      if (this.isManualAnimating) {
        this.stopManualAnimation();
      } else {
        this.track.classList.add('showcase__track--paused');
      }
    });
    
    this.viewport.addEventListener('mouseleave', () => {
      if (!this.isDragging) {
        if (this.dragOffset !== 0) {
          // Resume manual animation if we have a manual offset
          this.startManualAnimation();
        } else {
          // Resume CSS animation
          this.track.classList.remove('showcase__track--paused');
        }
      }
    });
    
    // Setup drag functionality
    this.setupDragListeners();
  }
  
  /**
   * Duplicate slides for seamless infinite loop
   * Creates a copy of all slides and appends them to the track
   */
  duplicateSlides() {
    const originalHTML = this.track.innerHTML;
    this.track.innerHTML = originalHTML + originalHTML;
  }
  
  /**
   * Setup dynamic animation based on actual slide widths
   * Calculates total width of slides and creates CSS keyframe animation
   * Ensures seamless loop by using exact measurements
   */
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
      
      // Store loop width for infinite scroll detection
      this.loopWidth = totalWidth;
      
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
  
  /**
   * Setup drag event listeners for mouse and touch interactions
   * Enables manual navigation by dragging the carousel left or right
   */
  setupDragListeners() {
    // Mouse events
    this.viewport.addEventListener('mousedown', (e) => this.handleDragStart(e));
    document.addEventListener('mousemove', (e) => this.handleDragMove(e));
    document.addEventListener('mouseup', (e) => this.handleDragEnd(e));
    
    // Touch events
    this.viewport.addEventListener('touchstart', (e) => this.handleDragStart(e), { passive: true });
    document.addEventListener('touchmove', (e) => this.handleDragMove(e), { passive: true });
    document.addEventListener('touchend', (e) => this.handleDragEnd(e));
    
    // Prevent text selection while dragging
    this.viewport.addEventListener('dragstart', (e) => e.preventDefault());
  }
  
  /**
   * Handle drag start event (mouse down or touch start)
   * Records starting position and pauses carousel animation
   * @param {MouseEvent|TouchEvent} e - The pointer event
   */
  handleDragStart(e) {
    this.isDragging = true;
    this.startX = this.getPositionX(e);
    this.currentX = this.startX;
    
    // Stop manual animation if running
    this.stopManualAnimation();
    
    // Get current transform position from computed style or manual offset
    if (this.dragOffset !== 0) {
      // Already have manual offset from previous drag
      // Keep it as is
    } else {
      // Get from CSS animation
      const style = window.getComputedStyle(this.track);
      const matrix = new DOMMatrix(style.transform);
      this.dragOffset = matrix.m41; // Current X translation
    }
    
    // Pause the animation and add dragging state
    this.track.classList.add('showcase__track--paused', 'showcase__track--dragging');
    this.viewport.style.cursor = 'grabbing';
  }
  
  /**
   * Handle drag move event (mouse move or touch move)
   * Updates carousel position based on drag distance and handles infinite loop wrapping
   * @param {MouseEvent|TouchEvent} e - The pointer event
   */
  handleDragMove(e) {
    if (!this.isDragging) return;
    
    this.currentX = this.getPositionX(e);
    const deltaX = this.currentX - this.startX;
    
    // Update track position
    this.dragOffset += deltaX;
    
    // Handle infinite loop wrapping
    if (this.loopWidth > 0) {
      // If dragged too far left (past the duplicate set)
      if (this.dragOffset < -this.loopWidth) {
        this.dragOffset += this.loopWidth;
      }
      // If dragged too far right (showing empty space)
      else if (this.dragOffset > 0) {
        this.dragOffset -= this.loopWidth;
      }
    }
    
    this.track.style.transform = `translateX(${this.dragOffset}px)`;
    
    // Update start position for next move
    this.startX = this.currentX;
  }
  
  /**
   * Handle drag end event (mouse up or touch end)
   * Maintains carousel position and starts manual JavaScript animation
   * @param {MouseEvent|TouchEvent} e - The pointer event
   */
  handleDragEnd(e) {
    if (!this.isDragging) return;
    
    this.isDragging = false;
    this.viewport.style.cursor = 'grab';
    
    // Keep track paused and in dragging state (no CSS animation)
    // We'll use JavaScript animation instead
    this.startManualAnimation();
  }
  
  /**
   * Start manual JavaScript animation to continue scrolling
   * Seamlessly continues from the current drag position
   */
  startManualAnimation() {
    if (this.isManualAnimating || this.loopWidth === 0) return;
    
    this.isManualAnimating = true;
    
    // Calculate scroll speed to match CSS animation (loopWidth over 45s)
    // 45s = 45000ms, at ~60fps = ~2700 frames
    this.animationSpeed = -this.loopWidth / 2700;
    
    const animate = () => {
      if (!this.isManualAnimating) return;
      
      // Update position
      this.dragOffset += this.animationSpeed;
      
      // Handle loop wrapping
      if (this.dragOffset < -this.loopWidth) {
        this.dragOffset += this.loopWidth;
      } else if (this.dragOffset > 0) {
        this.dragOffset -= this.loopWidth;
      }
      
      // Apply transform
      this.track.style.transform = `translateX(${this.dragOffset}px)`;
      
      // Continue animation
      this.animationId = requestAnimationFrame(animate);
    };
    
    animate();
  }
  
  /**
   * Stop manual JavaScript animation
   */
  stopManualAnimation() {
    this.isManualAnimating = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
  
  /**
   * Get X position from mouse or touch event
   * Normalizes position retrieval across different event types
   * @param {MouseEvent|TouchEvent} e - The pointer event
   * @returns {number} The X coordinate of the pointer
   */
  getPositionX(e) {
    return e.type.includes('mouse') ? e.pageX : e.touches[0].pageX;
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  const carousel = document.querySelector('.showcase__carousel');
  if (carousel) {
    new Carousel(carousel);
  }
});
