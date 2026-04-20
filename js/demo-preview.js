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
      desserts: false,
      // Easter-egg "shitty" mode. Only ever turned on by an explicit
      // request ("make it shitty", "uglify", etc.) — never touched by
      // surprise-me or any other intent. Cleared by `reset` via the
      // defaults spread below.
      shitty: false
    };

    /** Working state — mutated by apply(). */
    this.state = { ...this.defaults };

    /** Allowed knob ranges so the preview never collapses or explodes. */
    this.limits = {
      titleScale: { min: 0.7, max: 1.6 },
      bodyScale: { min: 0.8, max: 1.3 },
      spaceScale: { min: 0.7, max: 1.4 }
    };

    /**
     * Undo history — snapshots of `state` taken BEFORE each mutating
     * intent applies. An `undo` intent pops this stack; `reset` clears
     * it. Capped so the stack can't grow unbounded over a long session.
     */
    this.history = [];
    this.historyLimit = 20;

    /**
     * Redo stack — populated when the user undoes a change (the
     * undone state lands here so `redo` can bring it back). Cleared
     * on any fresh mutation because redoing after a new branch of
     * changes would produce inconsistent state.
     */
    this.redoStack = [];

    /**
     * Simulated viewport for the desktop/mobile toggle. Kept separate
     * from `state` because it's a UI preference, not part of the
     * design composition — `randomize` never touches it, `reset`
     * leaves it alone.
     */
    this.viewport = 'desktop';

    /**
     * Cached reference to the scroll container (the preview frame)
     * and its visual parent, used by the scroll-affordance gradient.
     * Resolved once in the constructor so every update is a cheap
     * property access. The observer re-runs the check whenever the
     * frame resizes, so the gradient toggles on as soon as a layout
     * change (stack the menu, full menu, etc.) makes the content
     * overflow the frame.
     */
    this.frameEl = this.previewEl ? this.previewEl.parentElement : null;
    this.previewContainerEl = this.frameEl ? this.frameEl.parentElement : null;
    if (this.frameEl && typeof ResizeObserver === 'function') {
      const observer = new ResizeObserver(() => this.updateScrollAffordance());
      observer.observe(this.frameEl);
      // The mini-site grows inside the frame — watching it directly
      // catches content changes that don't resize the frame itself.
      if (this.previewEl) observer.observe(this.previewEl);
    }
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
  apply(intent, options = {}) {
    if (!intent) return { changed: false, state: this.getState() };

    // When `deferRender` is true, the state mutation and history
    // bookkeeping happen immediately (so the caller can inspect
    // `result.changed` and build an honest reply) but the visible
    // DOM update is skipped — the caller is expected to call
    // `renderWithTransition()` later. Used by the chat controller to
    // land the preview change a beat after Orlando's reply bubble.
    const renderImmediately = options.deferRender !== true;

    // `undo` is its own thing: pop the history stack and replace state
    // with the popped snapshot. Short-circuit before the history-push
    // below so undoing doesn't itself go on the undo stack. The state
    // we're leaving goes onto the redo stack so a subsequent `redo`
    // can bring it back.
    if (intent.type === 'undo') {
      if (this.history.length === 0) {
        return { changed: false, state: this.getState() };
      }
      this.redoStack.push({ ...this.state });
      this.state = this.history.pop();
      if (renderImmediately) this.renderWithTransition();
      return { changed: true, state: this.getState() };
    }

    // `redo` mirrors undo: pop from the redo stack and push the
    // current state back onto history so a subsequent undo still
    // works. Only populated by prior undos, cleared by any fresh
    // mutation — there is no "redo" after a new edit.
    if (intent.type === 'redo') {
      if (this.redoStack.length === 0) {
        return { changed: false, state: this.getState() };
      }
      this.history.push({ ...this.state });
      if (this.history.length > this.historyLimit) {
        this.history.shift();
      }
      this.state = this.redoStack.pop();
      if (renderImmediately) this.renderWithTransition();
      return { changed: true, state: this.getState() };
    }

    // Shallow snapshot before mutation so we can detect no-ops after the
    // switch runs. JSON.stringify is sufficient because state only holds
    // primitives (strings and numbers).
    const before = JSON.stringify(this.state);
    const beforeSnapshot = { ...this.state };

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

      case 'shitty':
        // Easter-egg toggle. Flipping this on layers a deliberately
        // ugly CSS override on top of whatever axes the user has
        // already set — palette, font, layout, and spacing tweaks
        // continue to apply on top, so "make it shitty" + "stack the
        // menu" compounds rather than overrides.
        this.state.shitty = true;
        break;

      case 'reset':
        this.state = { ...this.defaults };
        // A full reset wipes both stacks — "reset" as an escape hatch
        // should put the preview back to square one, including the
        // undo/redo history, so the next "undo" or "redo" doesn't
        // bring the chaos back.
        this.history = [];
        this.redoStack = [];
        break;

      default:
        // help, unknown, noop — nothing to change on the preview
        return { changed: false, state: this.getState() };
    }

    const changed = JSON.stringify(this.state) !== before;
    if (changed) {
      // Push the pre-mutation snapshot onto the undo stack AFTER we
      // confirm the intent actually moved state. No-op mutations
      // (asking for the palette already on screen) don't pollute
      // the history. Cap the stack so long sessions don't leak
      // memory. `reset` is deliberately skipped — it's the user's
      // escape hatch; making it undoable would risk "undo" pulling
      // shitty mode back into view.
      if (intent.type !== 'reset') {
        this.history.push(beforeSnapshot);
        if (this.history.length > this.historyLimit) {
          this.history.shift();
        }
      }
      // Any fresh mutation (not undo/redo) invalidates the redo
      // stack — redoing after a new branch of changes would
      // resurrect inconsistent state. Cleared here since the undo/
      // redo branches above already short-circuited and returned.
      this.redoStack = [];
      if (renderImmediately) this.renderWithTransition();
    }
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

    // Easter-egg shitty mode — set as a data attribute so the CSS
    // override ([data-shitty="true"]) kicks in, and remove it entirely
    // on reset so no stale attribute sticks around in the DOM.
    if (this.state.shitty) {
      this.previewEl.dataset.shitty = 'true';
    } else {
      delete this.previewEl.dataset.shitty;
    }

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

    // Re-check overflow after DOM mutations complete so the scroll
    // affordance gradient appears/disappears with content changes.
    // ResizeObserver catches most cases, but calling it directly
    // here guarantees correctness on the first paint after a render.
    this.updateScrollAffordance();
  }

  /**
   * Toggle the scroll-affordance class on the preview container based
   * on whether the frame's content overflows vertically. The gradient
   * itself lives in CSS — this method is just the show/hide signal.
   */
  updateScrollAffordance() {
    if (!this.frameEl || !this.previewContainerEl) return;
    const overflows = this.frameEl.scrollHeight > this.frameEl.clientHeight + 1;
    this.previewContainerEl.dataset.scrollable = overflows ? 'true' : 'false';
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

  /**
   * Render, but route through the View Transitions API when available
   * so structural mutations (menu grid, hero alignment, dish layout,
   * course toggles, rename) cross-fade instead of snapping. CSS
   * transitions on animatable properties (colour, font-size, padding)
   * still work, but they can't smooth discrete layout changes —
   * that's what VT solves.
   *
   * Fallback chain:
   *   1. View Transitions API (Chrome / Edge / Safari 18+) — snapshot
   *      cross-fade, cleanest structural transition.
   *   2. Opacity fade (Firefox, older Safari) — fades the preview
   *      down, mutates the DOM while invisible, fades back up. Not
   *      as crisp as VT but prevents layout snaps.
   *   3. Plain render (reduced-motion or headless) — instant.
   */
  renderWithTransition() {
    if (typeof document !== 'undefined' &&
        typeof document.startViewTransition === 'function' &&
        !this.prefersReducedMotion()) {
      document.startViewTransition(() => this.render());
      return;
    }
    if (this.previewEl && !this.prefersReducedMotion()) {
      this.renderWithOpacityFade();
      return;
    }
    this.render();
  }

  /**
   * Opacity-based fallback for browsers without the View Transitions
   * API. Fades the whole preview to 0, mutates the DOM at that
   * invisible moment so the structural change is hidden, then fades
   * back up. Timings are chosen to sit close to VT's ~280ms default
   * so the two paths feel consistent.
   *
   * Uses inline `transition` overrides rather than relying on the
   * broad `.mini-site *` rule so the opacity-fade duration is
   * predictable across themes — the broad transition uses
   * --transition-normal which is a shared token, and a 250ms fade
   * would overlap the setTimeout that schedules the DOM mutation.
   */
  renderWithOpacityFade() {
    const el = this.previewEl;
    if (!el) {
      this.render();
      return;
    }
    // Fade out over 140ms, mutate at opacity 0 (structural change
    // invisible), then fade back in over 140ms. Total ~280ms.
    el.style.transition = 'opacity 140ms ease-out';
    el.style.opacity = '0';
    window.setTimeout(() => {
      this.render();
      // Let the opacity-0 frame paint before starting the fade-in;
      // otherwise the two style assignments batch into a single
      // frame and the fade-out is skipped.
      window.requestAnimationFrame(() => {
        el.style.opacity = '1';
        window.setTimeout(() => {
          // Clear inline overrides so the broad CSS transition rule
          // takes over for subsequent changes.
          el.style.transition = '';
          el.style.opacity = '';
        }, 160);
      });
    }, 140);
  }

  /**
   * Check whether the OS has asked for reduced motion. Used to skip
   * the View Transitions cross-fade — users who've opted out of
   * motion shouldn't get a snapshot fade even when the browser
   * supports it.
   * @returns {boolean}
   */
  prefersReducedMotion() {
    return typeof window !== 'undefined' &&
           typeof window.matchMedia === 'function' &&
           window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Toggle the simulated viewport between desktop and mobile. Writes
   * a data attribute to the mini-site so the CSS layer can restyle
   * widths/grids; the design-composition state is untouched, so
   * flipping viewports never disturbs palette/font/layout choices.
   * @param {'desktop'|'mobile'} mode
   */
  setViewport(mode) {
    if (!this.previewEl) return;
    this.viewport = mode === 'mobile' ? 'mobile' : 'desktop';
    if (this.viewport === 'mobile') {
      this.previewEl.dataset.viewport = 'mobile';
    } else {
      delete this.previewEl.dataset.viewport;
    }
  }

}
