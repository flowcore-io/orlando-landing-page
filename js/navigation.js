/**
 * Orlando Studio - Navigation Functionality
 * Handles mobile hamburger menu toggle and smooth scrolling
 * Following Orlando's vanilla JavaScript standards
 */

class Navigation {
  /**
   * Create a new Navigation instance
   * Initializes DOM element references and sets up event listeners
   */
  constructor() {
    // DOM elements
    this.toggle = document.querySelector('.navbar__toggle');
    this.navMenu = document.querySelector('.navbar__menu');
    this.backdrop = document.querySelector('.navbar__backdrop');
    this.navLinks = document.querySelectorAll('.navbar__link, .navbar__menu .btn');
    this.body = document.body;
    
    this.init();
  }
  
  /**
   * Initialize navigation
   * Sets up event listeners for menu toggle, backdrop clicks, nav links, and keyboard controls
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
   * Toggle menu between open and closed states
   * Checks current state and calls appropriate method
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
   * Open mobile navigation menu
   * Updates aria-expanded attribute, adds active classes, and prevents body scrolling
   */
  openMenu() {
    this.toggle.setAttribute('aria-expanded', 'true');
    this.navMenu.classList.add('active');
    this.backdrop.classList.add('active');
    this.body.style.overflow = 'hidden'; // Prevent scrolling
  }
  
  /**
   * Close mobile navigation menu
   * Updates aria-expanded attribute, removes active classes, and restores body scrolling
   */
  closeMenu() {
    this.toggle.setAttribute('aria-expanded', 'false');
    this.navMenu.classList.remove('active');
    this.backdrop.classList.remove('active');
    this.body.style.overflow = ''; // Restore scrolling
  }
  
  /**
   * Check if mobile menu is currently open
   * @returns {boolean} True if menu is open, false if closed
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
