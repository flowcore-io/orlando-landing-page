/**
 * Orlando Studio - Sign-up Form Functionality
 * Handles waitlist sign-up with mock submission and localStorage persistence
 * Following Orlando's vanilla JavaScript standards
 */

class SignupForm {
  constructor() {
    // DOM elements
    this.form = document.getElementById('signupForm');
    this.emailInput = document.getElementById('emailInput');
    this.successMessage = document.getElementById('successMessage');
    
    this.init();
  }
  
  /**
   * Initialize form
   * Sets up event listeners and checks for existing signup
   */
  init() {
    // Check if user already signed up (from localStorage)
    this.checkExistingSignup();
    
    // Form submit handler
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    
    // Setup smooth scrolling for all anchor links
    this.setupSmoothScroll();
  }
  
  /**
   * Check localStorage for existing signup
   * Show success message if user already signed up
   */
  checkExistingSignup() {
    const hasSignedUp = localStorage.getItem('orlando_signup');
    
    if (hasSignedUp) {
      this.showSuccess(true);
    }
  }
  
  /**
   * Handle form submission
   * @param {Event} e - Submit event
   */
  async handleSubmit(e) {
    e.preventDefault();
    
    const email = this.emailInput.value.trim();
    
    // Validate email format
    if (!this.validateEmail(email)) {
      this.showError('Please enter a valid email address');
      return;
    }
    
    // Mock API submission (simulates backend call)
    await this.mockSubmit(email);
    
    // Show success message
    this.showSuccess();
    
    // Persist signup in localStorage
    localStorage.setItem('orlando_signup', 'true');
    localStorage.setItem('orlando_email', email);
  }
  
  /**
   * Validate email address format
   * @param {string} email - Email address to validate
   * @returns {boolean} - True if valid email format
   */
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  /**
   * Mock form submission
   * Simulates API call with delay
   * In production, this would make a real API request
   * @param {string} email - Email address to submit
   */
  async mockSubmit(email) {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('Mock signup for:', email);
        resolve();
      }, 800); // Simulate network delay
    });
  }
  
  /**
   * Show success message
   * Hides form and displays confirmation
   * @param {boolean} skipAnimation - Skip fade-in animation (for page load)
   */
  showSuccess(skipAnimation = false) {
    // Hide form
    this.form.style.display = 'none';
    
    // Show success message by adding show class
    this.successMessage.classList.add('show');
    
    // Add fade-in animation if not skipped
    if (!skipAnimation) {
      this.successMessage.style.animation = 'fadeIn 400ms ease-out';
    }
  }
  
  /**
   * Show error message
   * Simple alert for now - could be enhanced with toast notifications
   * @param {string} message - Error message to display
   */
  showError(message) {
    alert(message);
  }
  
  /**
   * Setup smooth scrolling for all anchor links
   * Provides better navigation UX
   */
  setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        
        // Skip if it's just "#" (no target)
        if (href === '#') {
          e.preventDefault();
          return;
        }
        
        const target = document.querySelector(href);
        
        if (target) {
          e.preventDefault();
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      });
    });
  }
}

/**
 * Initialize signup form when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
  new SignupForm();
});
