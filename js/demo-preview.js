/**
 * Orlando Studio - Demo Preview Controller
 * Applies parsed intents to the mini-site preview DOM.
 * Owns the preview's mutable state (palette, font, scales, title) and
 * writes it to data attributes and CSS custom properties so every
 * change animates via the transitions defined in demo.css.
 *
 * Following Orlando's vanilla JavaScript standards.
 */

class DemoPreview {
  /**
   * Create a new preview controller.
   * @param {HTMLElement} previewEl - The .mini-site root element.
   * @param {HTMLElement} titleEl - The hero title element (text target for renames).
   */
  constructor(previewEl, titleEl) {
    this.previewEl = previewEl;
    this.titleEl = titleEl;

    /**
     * Defaults mirror the initial markup state.
     * Kept here so "reset" can restore the preview without touching HTML.
     */
    this.defaults = {
      palette: 'tomato',
      font: 'serif',
      titleScale: 1,
      bodyScale: 1,
      spaceScale: 1,
      title: (titleEl && titleEl.textContent) ? titleEl.textContent.trim() : 'Trattoria Bella',
      // Layout knobs: each one is a named string that drives a data
      // attribute on the mini-site root; CSS handles the rest.
      menu: 'grid',   // 'grid' | 'list' | 'gallery'
      hero: 'center', // 'center' | 'left'
      dish: 'stacked', // 'stacked' | 'inline'
      // Course visibility flags — toggled by chat to add antipasti
      // and/or dolci around the mains, or to hide the mains entirely.
      starters: false,
      mains: true,
      desserts: false
    };

    /** Working state — mutated by apply(). */
    this.state = { ...this.defaults };

    /** Allowed knob ranges so the preview never collapses or explodes. */
    this.limits = {
      titleScale: { min: 0.7, max: 1.6 },
      bodyScale: { min: 0.8, max: 1.3 },
      spaceScale: { min: 0.7, max: 1.4 }
    };
  }

  /**
   * Snapshot the current working state. Used by the controller to feed
   * the parser for state-aware intents like "surprise me" (which should
   * avoid re-rolling the palette the user is already on).
   * @returns {object} A shallow copy of the preview's working state.
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Apply an intent produced by DemoIntentParser.
   * Unknown or no-op intents are ignored silently — the chat reply
   * still renders, but the preview stays as-is.
   * @param {{type: string, payload: object}} intent - Parsed intent.
   * @returns {{changed: boolean, state: object}} Whether the state
   *   actually moved (useful for honest chat replies when the user asks
   *   for the palette/font we're already on, or nudges a clamped scale),
   *   plus a snapshot of the resulting state.
   */
  apply(intent) {
    if (!intent) return { changed: false, state: this.getState() };

    // Shallow snapshot before mutation so we can detect no-ops after the
    // switch runs. JSON.stringify is sufficient because state only holds
    // primitives (strings and numbers).
    const before = JSON.stringify(this.state);

    switch (intent.type) {
      case 'palette':
        this.state.palette = intent.payload.palette;
        break;

      case 'font':
        this.state.font = intent.payload.font;
        break;

      case 'scale':
        // Superlative intents supply an absolute value (titleSet/bodySet)
        // that jumps straight to the clamp limit. Comparative intents
        // supply a delta. Set wins over delta when both are present.
        if (typeof intent.payload.titleSet === 'number') {
          this.state.titleScale = this.clamp(intent.payload.titleSet, this.limits.titleScale);
        } else if (typeof intent.payload.titleDelta === 'number') {
          this.state.titleScale = this.clamp(
            this.state.titleScale + intent.payload.titleDelta,
            this.limits.titleScale
          );
        }
        if (typeof intent.payload.bodySet === 'number') {
          this.state.bodyScale = this.clamp(intent.payload.bodySet, this.limits.bodyScale);
        } else if (typeof intent.payload.bodyDelta === 'number') {
          this.state.bodyScale = this.clamp(
            this.state.bodyScale + intent.payload.bodyDelta,
            this.limits.bodyScale
          );
        }
        break;

      case 'space':
        if (typeof intent.payload.set === 'number') {
          this.state.spaceScale = this.clamp(intent.payload.set, this.limits.spaceScale);
        } else if (typeof intent.payload.delta === 'number') {
          this.state.spaceScale = this.clamp(
            this.state.spaceScale + intent.payload.delta,
            this.limits.spaceScale
          );
        }
        break;

      case 'rename':
        if (intent.payload.title) {
          this.state.title = intent.payload.title;
        }
        break;

      case 'menu':
        this.state.menu = intent.payload.menu;
        break;

      case 'hero':
        this.state.hero = intent.payload.hero;
        break;

      case 'dish':
        this.state.dish = intent.payload.dish;
        break;

      case 'course':
        // Only assign the flags the payload explicitly mentions — a
        // "remove starters" intent should leave mains and dessert
        // visibility alone.
        if (typeof intent.payload.starters === 'boolean') {
          this.state.starters = intent.payload.starters;
        }
        if (typeof intent.payload.mains === 'boolean') {
          this.state.mains = intent.payload.mains;
        }
        if (typeof intent.payload.desserts === 'boolean') {
          this.state.desserts = intent.payload.desserts;
        }
        break;

      case 'randomize':
        // Composite intent from "surprise me": shuffle every axis in a
        // single apply so the chat reply corresponds to one visible
        // transition rather than a flurry of partial updates. Scale
        // values are re-clamped as a safety net — the parser already
        // supplies values inside the limits, but this keeps the preview
        // robust to future preset changes.
        if (intent.payload.palette) this.state.palette = intent.payload.palette;
        if (intent.payload.font) this.state.font = intent.payload.font;
        if (intent.payload.menu) this.state.menu = intent.payload.menu;
        if (intent.payload.hero) this.state.hero = intent.payload.hero;
        if (intent.payload.dish) this.state.dish = intent.payload.dish;
        if (typeof intent.payload.titleScale === 'number') {
          this.state.titleScale = this.clamp(intent.payload.titleScale, this.limits.titleScale);
        }
        if (typeof intent.payload.bodyScale === 'number') {
          this.state.bodyScale = this.clamp(intent.payload.bodyScale, this.limits.bodyScale);
        }
        if (typeof intent.payload.spaceScale === 'number') {
          this.state.spaceScale = this.clamp(intent.payload.spaceScale, this.limits.spaceScale);
        }
        if (typeof intent.payload.starters === 'boolean') this.state.starters = intent.payload.starters;
        if (typeof intent.payload.mains === 'boolean') this.state.mains = intent.payload.mains;
        if (typeof intent.payload.desserts === 'boolean') this.state.desserts = intent.payload.desserts;
        break;

      case 'reset':
        this.state = { ...this.defaults };
        break;

      default:
        // help, unknown, noop — nothing to change on the preview
        return { changed: false, state: this.getState() };
    }

    const changed = JSON.stringify(this.state) !== before;
    if (changed) this.render();
    return { changed, state: this.getState() };
  }

  /**
   * Write the current state to the DOM.
   * Palette and font drive data attributes (CSS cascades handle the rest);
   * scales are inline custom properties for cheap animation.
   */
  render() {
    if (!this.previewEl) return;

    this.previewEl.dataset.palette = this.state.palette;
    this.previewEl.dataset.font = this.state.font;
    this.previewEl.dataset.menu = this.state.menu;
    this.previewEl.dataset.hero = this.state.hero;
    this.previewEl.dataset.dish = this.state.dish;

    this.previewEl.style.setProperty('--mini-title-scale', this.state.titleScale.toFixed(2));
    this.previewEl.style.setProperty('--mini-body-scale', this.state.bodyScale.toFixed(2));
    this.previewEl.style.setProperty('--mini-space-scale', this.state.spaceScale.toFixed(2));

    // Show/hide the three course sections. The mains default to visible
    // but can be hidden so the trattoria serves only antipasti, only
    // dolci, or any other combination.
    const startersEl = this.previewEl.querySelector('[data-course="starters"]');
    const mainsEl = this.previewEl.querySelector('[data-course="mains"]');
    const dessertsEl = this.previewEl.querySelector('[data-course="desserts"]');
    if (startersEl) startersEl.hidden = !this.state.starters;
    if (mainsEl) mainsEl.hidden = !this.state.mains;
    if (dessertsEl) dessertsEl.hidden = !this.state.desserts;

    if (this.titleEl && this.titleEl.textContent !== this.state.title) {
      this.titleEl.textContent = this.state.title;
    }
  }

  /**
   * Clamp a number to a [min, max] range.
   * @param {number} value - Value to clamp.
   * @param {{min: number, max: number}} range - Allowed range.
   * @returns {number} The clamped value.
   */
  clamp(value, range) {
    return Math.min(range.max, Math.max(range.min, value));
  }
}
