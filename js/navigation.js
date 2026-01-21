/**
 * Orlando Studio - Navigation Functionality
 * Handles mobile hamburger menu toggle and smooth scrolling
 * Following Orlando's vanilla JavaScript standards
 */

class Navigation {
  constructor() {
    // DOM elements
    this.toggle = document.querySelector('.navbar__toggle');
    this.navMenu = document.querySelector('.navbar__nav');
    this.backdrop = document.querySelector('.navbar__backdrop');
    this.navLinks = document.querySelectorAll('.navbar__link');
    this.body = document.body;
    
    this.init();
  }
  
  /**
   * Initialize navigation
   * Sets up event listeners for menu toggle and links
   */
  init() {
    // Only initialize if elements exist
    if (!this.toggle || !this.navMenu || !this.backdrop) {
      return;
    }
    
    // Toggle button functionality
    this.toggle.addEventListener('click', () => this.toggleMenu());
    
    // Close menu when clicking backdrop
    this.backdrop.addEventListener('click', () => this.closeMenu());
    
    // Close menu when clicking navigation links
    this.navLinks.forEach(link => {
      link.addEventListener('click', () => this.closeMenu());
    });
    
    // Close menu on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isMenuOpen()) {
        this.closeMenu();
      }
    });
  }
  
  /**
   * Toggle menu open/closed
   */
  toggleMenu() {
    const isOpen = this.isMenuOpen();
    
    if (isOpen) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  }
  
  /**
   * Open mobile menu
   */
  openMenu() {
    this.toggle.setAttribute('aria-expanded', 'true');
    this.navMenu.classList.add('active');
    this.backdrop.classList.add('active');
    this.body.style.overflow = 'hidden'; // Prevent scrolling
  }
  
  /**
   * Close mobile menu
   */
  closeMenu() {
    this.toggle.setAttribute('aria-expanded', 'false');
    this.navMenu.classList.remove('active');
    this.backdrop.classList.remove('active');
    this.body.style.overflow = ''; // Restore scrolling
  }
  
  /**
   * Check if menu is currently open
   * @returns {boolean}
   */
  isMenuOpen() {
    return this.toggle.getAttribute('aria-expanded') === 'true';
  }
}

/**
 * Initialize navigation when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
  new Navigation();
});
