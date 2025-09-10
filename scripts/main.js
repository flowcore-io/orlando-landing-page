/**
 * Orlando Landing Page - Main JavaScript
 * Vanilla JavaScript ES6+ | No Frameworks | Accessibility First
 * 
 * Features:
 * - Theme switching (light/dark mode)
 * - Mobile navigation
 * - Smooth scrolling navigation
 * - Form validation and handling
 * - Interactive animations
 * - Keyboard navigation support
 */

(function() {
    'use strict';

    // ==========================================================================
    // Theme Management
    // ==========================================================================

    class ThemeManager {
        constructor() {
            this.themeToggle = document.getElementById('theme-toggle');
            this.footerThemeToggle = document.getElementById('footer-theme-toggle');
            this.currentTheme = this.getInitialTheme();
            
            this.init();
        }

        getInitialTheme() {
            const savedTheme = localStorage.getItem('theme');
            const systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            return savedTheme || (systemDark ? 'dark' : 'light');
        }

        init() {
            // Set initial theme
            this.setTheme(this.currentTheme);
            
            // Add event listeners
            if (this.themeToggle) {
                this.themeToggle.addEventListener('click', () => this.toggleTheme());
            }
            
            if (this.footerThemeToggle) {
                this.footerThemeToggle.addEventListener('click', () => this.toggleTheme());
            }

            // Listen for system theme changes
            if (window.matchMedia) {
                window.matchMedia('(prefers-color-scheme: dark)')
                      .addEventListener('change', (e) => {
                          if (!localStorage.getItem('theme')) {
                              this.setTheme(e.matches ? 'dark' : 'light');
                          }
                      });
            }
        }

        setTheme(theme) {
            this.currentTheme = theme;
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
            
            // Update theme toggle icons
            this.updateThemeIcons();
            
            // Announce theme change to screen readers
            this.announceThemeChange(theme);
        }

        toggleTheme() {
            const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
            this.setTheme(newTheme);
        }

        updateThemeIcons() {
            // Update aria-label for accessibility
            const toggles = document.querySelectorAll('[id*="theme-toggle"]');
            toggles.forEach(toggle => {
                toggle.setAttribute('aria-label', 
                    `Switch to ${this.currentTheme === 'light' ? 'dark' : 'light'} mode`
                );
            });
        }

        announceThemeChange(theme) {
            // Create a temporary announcement for screen readers
            const announcement = document.createElement('div');
            announcement.setAttribute('aria-live', 'polite');
            announcement.setAttribute('aria-atomic', 'true');
            announcement.className = 'sr-only';
            announcement.textContent = `Switched to ${theme} mode`;
            
            document.body.appendChild(announcement);
            
            // Remove the announcement after it's been read
            setTimeout(() => {
                document.body.removeChild(announcement);
            }, 1000);
        }
    }

    // ==========================================================================
    // Navigation Management
    // ==========================================================================

    class NavigationManager {
        constructor() {
            this.navToggle = document.getElementById('nav-toggle');
            this.navMenu = document.getElementById('nav-menu');
            this.navLinks = document.querySelectorAll('.nav__link');
            this.header = document.querySelector('.header');
            
            this.isMenuOpen = false;
            
            this.init();
        }

        init() {
            if (this.navToggle && this.navMenu) {
                this.navToggle.addEventListener('click', () => this.toggleMenu());
            }

            // Close menu when clicking nav links
            this.navLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    if (link.getAttribute('href').startsWith('#')) {
                        e.preventDefault();
                        this.handleNavigation(link);
                    }
                });
            });

            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (this.isMenuOpen && !this.navMenu.contains(e.target) && !this.navToggle.contains(e.target)) {
                    this.closeMenu();
                }
            });

            // Handle escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isMenuOpen) {
                    this.closeMenu();
                    this.navToggle.focus();
                }
            });

            // Update active nav link on scroll
            this.setupScrollSpy();
            
            // Header scroll effect
            this.setupHeaderScroll();
        }

        toggleMenu() {
            if (this.isMenuOpen) {
                this.closeMenu();
            } else {
                this.openMenu();
            }
        }

        openMenu() {
            this.isMenuOpen = true;
            this.navToggle.setAttribute('aria-expanded', 'true');
            this.navMenu.setAttribute('aria-expanded', 'true');
            
            // Focus first menu item for keyboard users
            const firstLink = this.navMenu.querySelector('.nav__link');
            if (firstLink) {
                firstLink.focus();
            }
        }

        closeMenu() {
            this.isMenuOpen = false;
            this.navToggle.setAttribute('aria-expanded', 'false');
            this.navMenu.setAttribute('aria-expanded', 'false');
        }

        handleNavigation(link) {
            const targetId = link.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                this.smoothScrollTo(targetElement);
                this.updateActiveLink(link);
                this.closeMenu();
            }
        }

        smoothScrollTo(element) {
            const headerHeight = this.header ? this.header.offsetHeight : 0;
            const targetPosition = element.getBoundingClientRect().top + window.pageYOffset - headerHeight - 20;
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }

        updateActiveLink(activeLink) {
            this.navLinks.forEach(link => {
                link.classList.remove('nav__link--active');
                link.removeAttribute('aria-current');
            });
            
            activeLink.classList.add('nav__link--active');
            activeLink.setAttribute('aria-current', 'page');
        }

        setupScrollSpy() {
            const sections = document.querySelectorAll('section[id]');
            const options = {
                threshold: 0.3,
                rootMargin: '-80px 0px -80px 0px'
            };

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const correspondingLink = document.querySelector(`.nav__link[href="#${entry.target.id}"]`);
                        if (correspondingLink) {
                            this.updateActiveLink(correspondingLink);
                        }
                    }
                });
            }, options);

            sections.forEach(section => {
                observer.observe(section);
            });
        }

        setupHeaderScroll() {
            let lastScrollY = window.scrollY;
            let ticking = false;

            const updateHeader = () => {
                const currentScrollY = window.scrollY;
                
                if (currentScrollY > 100) {
                    this.header.style.background = 'var(--color-overlay)';
                    this.header.style.boxShadow = 'var(--shadow-md)';
                } else {
                    this.header.style.background = 'var(--color-overlay)';
                    this.header.style.boxShadow = 'none';
                }
                
                lastScrollY = currentScrollY;
                ticking = false;
            };

            const requestTick = () => {
                if (!ticking) {
                    requestAnimationFrame(updateHeader);
                    ticking = true;
                }
            };

            window.addEventListener('scroll', requestTick, { passive: true });
        }
    }

    // ==========================================================================
    // Form Management
    // ==========================================================================

    class FormManager {
        constructor() {
            this.form = document.getElementById('contact-form');
            this.submitBtn = this.form ? this.form.querySelector('button[type="submit"]') : null;
            
            this.validators = {
                name: this.validateName.bind(this),
                email: this.validateEmail.bind(this),
                message: this.validateMessage.bind(this)
            };
            
            this.init();
        }

        init() {
            if (!this.form) return;

            // Add real-time validation
            const inputs = this.form.querySelectorAll('input, textarea, select');
            inputs.forEach(input => {
                input.addEventListener('blur', () => this.validateField(input));
                input.addEventListener('input', () => this.clearFieldError(input));
            });

            // Handle form submission
            this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        validateField(field) {
            const validator = this.validators[field.name];
            if (validator) {
                const result = validator(field.value);
                this.showFieldResult(field, result);
                return result.isValid;
            }
            return true;
        }

        validateName(value) {
            const trimmed = value.trim();
            
            if (!trimmed) {
                return { isValid: false, message: 'Name is required' };
            }
            
            if (trimmed.length < 2) {
                return { isValid: false, message: 'Name must be at least 2 characters' };
            }
            
            if (trimmed.length > 50) {
                return { isValid: false, message: 'Name must be less than 50 characters' };
            }
            
            return { isValid: true, message: '' };
        }

        validateEmail(value) {
            const trimmed = value.trim();
            
            if (!trimmed) {
                return { isValid: false, message: 'Email is required' };
            }
            
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(trimmed)) {
                return { isValid: false, message: 'Please enter a valid email address' };
            }
            
            return { isValid: true, message: '' };
        }

        validateMessage(value) {
            const trimmed = value.trim();
            
            if (!trimmed) {
                return { isValid: false, message: 'Message is required' };
            }
            
            if (trimmed.length < 10) {
                return { isValid: false, message: 'Message must be at least 10 characters' };
            }
            
            if (trimmed.length > 1000) {
                return { isValid: false, message: 'Message must be less than 1000 characters' };
            }
            
            return { isValid: true, message: '' };
        }

        showFieldResult(field, result) {
            const group = field.closest('.form__group');
            const errorElement = group.querySelector('.form__error');
            
            if (result.isValid) {
                group.classList.remove('form__group--error');
                field.setAttribute('aria-invalid', 'false');
                if (errorElement) {
                    errorElement.textContent = '';
                }
            } else {
                group.classList.add('form__group--error');
                field.setAttribute('aria-invalid', 'true');
                if (errorElement) {
                    errorElement.textContent = result.message;
                }
            }
        }

        clearFieldError(field) {
            const group = field.closest('.form__group');
            if (group.classList.contains('form__group--error')) {
                // Only clear error if field now has content
                if (field.value.trim()) {
                    group.classList.remove('form__group--error');
                    field.setAttribute('aria-invalid', 'false');
                    const errorElement = group.querySelector('.form__error');
                    if (errorElement) {
                        errorElement.textContent = '';
                    }
                }
            }
        }

        validateForm() {
            const requiredFields = this.form.querySelectorAll('[required]');
            let isValid = true;
            let firstInvalidField = null;

            requiredFields.forEach(field => {
                const fieldValid = this.validateField(field);
                if (!fieldValid && !firstInvalidField) {
                    firstInvalidField = field;
                }
                isValid = isValid && fieldValid;
            });

            return { isValid, firstInvalidField };
        }

        setLoading(loading) {
            if (this.submitBtn) {
                if (loading) {
                    this.submitBtn.classList.add('btn--loading');
                    this.submitBtn.disabled = true;
                } else {
                    this.submitBtn.classList.remove('btn--loading');
                    this.submitBtn.disabled = false;
                }
            }
        }

        async handleSubmit(e) {
            e.preventDefault();
            
            const validation = this.validateForm();
            
            if (!validation.isValid) {
                if (validation.firstInvalidField) {
                    validation.firstInvalidField.focus();
                }
                return;
            }

            this.setLoading(true);

            try {
                // Simulate form submission (replace with actual endpoint)
                await this.simulateFormSubmission();
                this.showSuccessMessage();
                this.form.reset();
            } catch (error) {
                this.showErrorMessage('Something went wrong. Please try again.');
                console.error('Form submission error:', error);
            } finally {
                this.setLoading(false);
            }
        }

        async simulateFormSubmission() {
            // Simulate network delay
            return new Promise((resolve) => {
                setTimeout(resolve, 2000);
            });
        }

        showSuccessMessage() {
            this.showMessage('Thank you for your message! Orlando will get back to you soon.', 'success');
        }

        showErrorMessage(message) {
            this.showMessage(message, 'error');
        }

        showMessage(text, type = 'info') {
            // Create message element
            const messageEl = document.createElement('div');
            messageEl.className = `form-message form-message--${type}`;
            messageEl.setAttribute('role', type === 'error' ? 'alert' : 'status');
            messageEl.setAttribute('aria-live', 'polite');
            messageEl.textContent = text;

            // Style the message
            Object.assign(messageEl.style, {
                padding: 'var(--spacing-md)',
                borderRadius: 'var(--border-radius-md)',
                marginBottom: 'var(--spacing-lg)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                backgroundColor: type === 'success' ? 'var(--color-success)' : 'var(--color-error)',
                color: 'white',
                border: 'none'
            });

            // Insert message at top of form
            this.form.insertBefore(messageEl, this.form.firstChild);

            // Remove message after 5 seconds
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.parentNode.removeChild(messageEl);
                }
            }, 5000);

            // Scroll message into view
            messageEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    // ==========================================================================
    // Intersection Observer Animations
    // ==========================================================================

    class AnimationManager {
        constructor() {
            this.observerOptions = {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            };
            
            this.init();
        }

        init() {
            // Check if user prefers reduced motion
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                return;
            }

            this.setupFadeInAnimations();
            this.setupCountUpAnimations();
        }

        setupFadeInAnimations() {
            const elementsToAnimate = document.querySelectorAll(`
                .skill-card,
                .philosophy-card,
                .contact-card,
                .principles-list__item
            `);

            // Add initial styles
            elementsToAnimate.forEach(el => {
                el.style.opacity = '0';
                el.style.transform = 'translateY(30px)';
                el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            });

            const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry, index) => {
                    if (entry.isIntersecting) {
                        setTimeout(() => {
                            entry.target.style.opacity = '1';
                            entry.target.style.transform = 'translateY(0)';
                        }, index * 100); // Stagger animations
                        
                        observer.unobserve(entry.target);
                    }
                });
            }, this.observerOptions);

            elementsToAnimate.forEach(el => observer.observe(el));
        }

        setupCountUpAnimations() {
            const statNumbers = document.querySelectorAll('.stat__number, .stat-item__value');
            
            const countUp = (element, target, duration = 2000) => {
                const increment = target / (duration / 16);
                let current = 0;
                
                const timer = setInterval(() => {
                    current += increment;
                    if (current >= target) {
                        current = target;
                        clearInterval(timer);
                    }
                    
                    // Handle different number formats
                    if (target === 8) {
                        element.textContent = Math.floor(current) + '+';
                    } else if (target === 100) {
                        element.textContent = Math.floor(current) + '%';
                    } else {
                        element.textContent = Math.floor(current);
                    }
                }, 16);
            };

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const text = entry.target.textContent;
                        const number = parseInt(text);
                        
                        if (!isNaN(number)) {
                            countUp(entry.target, number);
                        }
                        
                        observer.unobserve(entry.target);
                    }
                });
            }, this.observerOptions);

            statNumbers.forEach(stat => observer.observe(stat));
        }
    }

    // ==========================================================================
    // Code Block Copy Functionality
    // ==========================================================================

    class CodeBlockManager {
        constructor() {
            this.init();
        }

        init() {
            const copyButtons = document.querySelectorAll('.code-block__copy');
            copyButtons.forEach(button => {
                button.addEventListener('click', (e) => this.handleCopy(e));
            });
        }

        async handleCopy(e) {
            const button = e.target;
            const codeBlock = button.closest('.code-block');
            const codeContent = codeBlock.querySelector('.code-block__content code');
            
            if (!codeContent) return;

            const textToCopy = codeContent.textContent.trim();

            try {
                await navigator.clipboard.writeText(textToCopy);
                this.showCopySuccess(button);
            } catch (err) {
                // Fallback for older browsers
                this.fallbackCopy(textToCopy, button);
            }
        }

        showCopySuccess(button) {
            const originalText = button.textContent;
            button.textContent = '✅';
            button.style.color = 'var(--color-success)';
            
            setTimeout(() => {
                button.textContent = originalText;
                button.style.color = '';
            }, 2000);

            // Announce to screen readers
            const announcement = document.createElement('div');
            announcement.setAttribute('aria-live', 'polite');
            announcement.className = 'sr-only';
            announcement.textContent = 'Code copied to clipboard';
            document.body.appendChild(announcement);
            
            setTimeout(() => {
                document.body.removeChild(announcement);
            }, 1000);
        }

        fallbackCopy(text, button) {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                document.execCommand('copy');
                this.showCopySuccess(button);
            } catch (err) {
                console.error('Fallback copy failed:', err);
                this.showCopyError(button);
            }
            
            document.body.removeChild(textArea);
        }

        showCopyError(button) {
            const originalText = button.textContent;
            button.textContent = '❌';
            button.style.color = 'var(--color-error)';
            
            setTimeout(() => {
                button.textContent = originalText;
                button.style.color = '';
            }, 2000);
        }
    }

    // ==========================================================================
    // Accessibility Enhancements
    // ==========================================================================

    class AccessibilityManager {
        constructor() {
            this.init();
        }

        init() {
            this.setupKeyboardNavigation();
            this.setupFocusManagement();
            this.setupScreenReaderAnnouncements();
            this.addSkipLinks();
        }

        setupKeyboardNavigation() {
            // Handle Enter and Space for buttons that might not be native buttons
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    const target = e.target;
                    
                    // Handle custom interactive elements
                    if (target.classList.contains('theme-toggle') || 
                        target.classList.contains('nav__toggle')) {
                        e.preventDefault();
                        target.click();
                    }
                }
            });
        }

        setupFocusManagement() {
            // Add visible focus indicators for keyboard users
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    document.body.classList.add('keyboard-nav');
                }
            });

            document.addEventListener('mousedown', () => {
                document.body.classList.remove('keyboard-nav');
            });

            // Add CSS for keyboard navigation
            const style = document.createElement('style');
            style.textContent = `
                .keyboard-nav *:focus {
                    outline: 2px solid var(--color-primary) !important;
                    outline-offset: 2px !important;
                }
            `;
            document.head.appendChild(style);
        }

        setupScreenReaderAnnouncements() {
            // Create a live region for dynamic announcements
            const liveRegion = document.createElement('div');
            liveRegion.id = 'live-region';
            liveRegion.setAttribute('aria-live', 'polite');
            liveRegion.setAttribute('aria-atomic', 'true');
            liveRegion.style.cssText = `
                position: absolute;
                left: -10000px;
                width: 1px;
                height: 1px;
                overflow: hidden;
            `;
            document.body.appendChild(liveRegion);
        }

        addSkipLinks() {
            // Add skip to main content link
            const skipLink = document.createElement('a');
            skipLink.href = '#main';
            skipLink.textContent = 'Skip to main content';
            skipLink.className = 'skip-link';
            
            // Style skip link
            Object.assign(skipLink.style, {
                position: 'absolute',
                top: '-40px',
                left: '6px',
                background: 'var(--color-primary)',
                color: 'white',
                padding: '8px',
                textDecoration: 'none',
                borderRadius: '4px',
                zIndex: '100000',
                transition: 'top 0.3s'
            });

            skipLink.addEventListener('focus', () => {
                skipLink.style.top = '6px';
            });

            skipLink.addEventListener('blur', () => {
                skipLink.style.top = '-40px';
            });

            document.body.insertBefore(skipLink, document.body.firstChild);

            // Add main landmark if not present
            const main = document.querySelector('main');
            if (main && !main.id) {
                main.id = 'main';
                main.setAttribute('tabindex', '-1');
            }
        }

        announce(message) {
            const liveRegion = document.getElementById('live-region');
            if (liveRegion) {
                liveRegion.textContent = message;
                
                // Clear after announcement
                setTimeout(() => {
                    liveRegion.textContent = '';
                }, 1000);
            }
        }
    }

    // ==========================================================================
    // Performance Monitoring
    // ==========================================================================

    class PerformanceManager {
        constructor() {
            this.init();
        }

        init() {
            // Log page load performance
            window.addEventListener('load', () => {
                if ('performance' in window) {
                    const timing = performance.timing;
                    const loadTime = timing.loadEventEnd - timing.navigationStart;
                    
                    console.log(`Orlando Landing Page loaded in ${loadTime}ms`);
                    
                    // Log Core Web Vitals if available
                    if ('PerformanceObserver' in window) {
                        this.observeWebVitals();
                    }
                }
            });
        }

        observeWebVitals() {
            // Observe Largest Contentful Paint
            try {
                const lcpObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    console.log('LCP:', lastEntry.startTime);
                });
                lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
            } catch (e) {
                // LCP not supported
            }

            // Observe First Input Delay
            try {
                const fidObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach(entry => {
                        console.log('FID:', entry.processingStart - entry.startTime);
                    });
                });
                fidObserver.observe({ entryTypes: ['first-input'] });
            } catch (e) {
                // FID not supported
            }
        }
    }

    // ==========================================================================
    // Application Initialization
    // ==========================================================================

    class OrlandoApp {
        constructor() {
            this.themeManager = null;
            this.navigationManager = null;
            this.formManager = null;
            this.animationManager = null;
            this.codeBlockManager = null;
            this.accessibilityManager = null;
            this.performanceManager = null;
            
            this.init();
        }

        init() {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.initializeComponents());
            } else {
                this.initializeComponents();
            }
        }

        initializeComponents() {
            console.log('🎨 Orlando Landing Page Initializing...');
            
            try {
                // Initialize core components
                this.themeManager = new ThemeManager();
                this.navigationManager = new NavigationManager();
                this.formManager = new FormManager();
                this.animationManager = new AnimationManager();
                this.codeBlockManager = new CodeBlockManager();
                this.accessibilityManager = new AccessibilityManager();
                this.performanceManager = new PerformanceManager();
                
                console.log('✅ Orlando Landing Page Ready!');
                
                // Announce to screen readers
                if (this.accessibilityManager) {
                    setTimeout(() => {
                        this.accessibilityManager.announce('Orlando landing page has loaded successfully');
                    }, 1000);
                }
                
            } catch (error) {
                console.error('❌ Error initializing Orlando Landing Page:', error);
            }
        }
    }

    // ==========================================================================
    // Global Error Handling
    // ==========================================================================

    window.addEventListener('error', (e) => {
        console.error('Orlando Landing Page Error:', e.error);
    });

    window.addEventListener('unhandledrejection', (e) => {
        console.error('Orlando Landing Page Promise Rejection:', e.reason);
    });

    // ==========================================================================
    // Initialize Application
    // ==========================================================================

    // Create global app instance
    window.OrlandoApp = new OrlandoApp();

})();
