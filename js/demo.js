/**
 * Orlando Studio - Demo Controller
 * Wires the chat UI, intent parser, and preview applier together.
 * Handles rendering messages, handling the form submission, and
 * responding to suggestion chip clicks.
 *
 * Depends on: DemoIntentParser (js/demo-parser.js),
 *             DemoPreview (js/demo-preview.js)
 *
 * Following Orlando's vanilla JavaScript standards.
 */

class DemoController {
  /**
   * Create a new demo controller.
   * Bails out silently if the demo section isn't present on the page —
   * keeps the controller safe to load on every page.
   */
  constructor() {
    this.root = document.querySelector('[data-demo]');
    if (!this.root) return;

    // DOM references
    this.messagesEl = this.root.querySelector('[data-demo-messages]');
    this.formEl = this.root.querySelector('[data-demo-form]');
    this.inputEl = this.root.querySelector('[data-demo-input]');
    this.suggestionsEl = this.root.querySelector('[data-demo-suggestions]');
    this.toggleEl = this.root.querySelector('[data-demo-toggle-suggestions]');
    this.previewEl = this.root.querySelector('[data-demo-preview]');
    this.titleEl = this.root.querySelector('[data-demo-title]');

    // Collaborators
    this.parser = new DemoIntentParser();
    this.preview = new DemoPreview(this.previewEl, this.titleEl);

    /**
     * Tracks the axis most recently mutated — lets the parser resolve
     * bare comparatives like "even bigger" against the last-edited
     * axis. Possible values: 'title-scale', 'body-scale', 'space',
     * or null (no useful context yet).
     */
    this.lastAxis = null;

    this.init();
  }

  /**
   * Initialize listeners and seed the conversation with Orlando's greeting.
   */
  init() {
    this.seedGreeting();
    this.setupFormHandler();
    this.setupSuggestionHandlers();
    this.setupToggleHandler();
    this.setupViewportToggle();
  }

  /**
   * Wire the desktop/mobile viewport toggle in the preview chrome.
   * Clicking either button swaps the preview between simulated screen
   * sizes; the controller owns the aria-pressed bookkeeping so screen
   * readers stay in sync with the visual state.
   */
  setupViewportToggle() {
    const buttons = this.root.querySelectorAll('[data-demo-viewport]');
    if (!buttons.length) return;
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-demo-viewport');
        this.preview.setViewport(mode);
        buttons.forEach((other) => {
          const isActive = other.getAttribute('data-demo-viewport') === mode;
          other.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
      });
    });
  }

  /**
   * Wire the disclosure toggle above the input.
   * Clicking it re-opens the chip row after it has been collapsed.
   */
  setupToggleHandler() {
    if (!this.toggleEl) return;
    this.toggleEl.addEventListener('click', () => this.showSuggestions());
  }

  /**
   * Add Orlando's welcome message when the demo first loads.
   * Kept distinct from the echo flow so the user message list stays empty
   * until they actually interact.
   */
  seedGreeting() {
    this.addMessage(
      'orlando',
      'Ciao! Orlando here. This is Trattoria Bella — a little Italian preview. ' +
        'Ask Orlando to change the palette, the typography, or the spacing. ' +
        'Try a chip below, or type "help" for ideas.'
    );
  }

  /**
   * Wire the chat form submission to the parse → apply → reply loop.
   */
  setupFormHandler() {
    if (!this.formEl || !this.inputEl) return;

    this.formEl.addEventListener('submit', (event) => {
      event.preventDefault();
      const text = this.inputEl.value.trim();
      if (!text) return;

      this.handleUserInput(text);
      this.inputEl.value = '';
      this.inputEl.focus();
    });
  }

  /**
   * Delegate clicks on the suggestion chip row.
   * Uses event delegation so new chips can be added later without rewiring.
   */
  setupSuggestionHandlers() {
    if (!this.suggestionsEl) return;

    this.suggestionsEl.addEventListener('click', (event) => {
      const chip = event.target.closest('[data-demo-suggestion]');
      if (!chip) return;

      const text = chip.getAttribute('data-demo-suggestion');
      if (!text) return;

      this.handleUserInput(text);
    });
  }

  /**
   * Run a user message through the full parse/apply/reply pipeline.
   * @param {string} text - The user's message.
   */
  handleUserInput(text) {
    this.addMessage('user', text);

    // Parse synchronously so we have the intent in hand immediately,
    // but defer BOTH the preview mutation AND the reply until after
    // the typing indicator finishes. Preview changes used to land
    // ~650ms before Orlando's reply, which made it feel like Orlando
    // was narrating the past. Now the preview shifts AT THE SAME
    // MOMENT the reply appears, so the chat and the visual change
    // read as one coherent act.
    const intent = this.parser.parse(text, this.preview.getState(), this.lastAxis);

    // Show the typing bubble immediately — that's the "Orlando is
    // thinking" cue the user sees while everything else waits.
    const typingEl = this.addTypingIndicator();

    window.setTimeout(() => {
      // Resolve state + reply first, but defer the VISIBLE DOM
      // render so the chat bubble lands slightly before the preview
      // starts moving — Orlando "says it, then does it," which
      // reads more naturally than both happening on the same frame.
      const result = this.preview.apply(intent, { deferRender: true });

      if (result.changed) {
        this.lastAxis = this.inferAxisFromIntent(intent);
      }

      const reply = (this.isMutatingIntent(intent) && !result.changed)
        ? this.buildNoChangeReply(intent, result.state)
        : intent.reply;

      this.removeTypingIndicator(typingEl);
      this.addMessage('orlando', reply);

      if (intent.type === 'reset') {
        this.showSuggestions();
      } else {
        this.hideSuggestions();
      }

      // Kick off the preview change a short beat after the reply —
      // long enough that the two read as cause and effect, short
      // enough not to feel laggy.
      if (result.changed) {
        window.setTimeout(() => this.preview.renderWithTransition(), 220);
      }
    }, 650);
  }

  /**
   * Append a "typing…" bubble to the chat messages container. Returns
   * the element so the caller can remove it when the real reply is
   * ready. The bubble is built from three bouncing dots rather than
   * text so it reads as an ambient indicator rather than a message.
   * @returns {HTMLElement} The typing bubble.
   */
  addTypingIndicator() {
    if (!this.messagesEl) return null;
    const bubble = document.createElement('div');
    bubble.className = 'demo__chat-message demo__chat-message--orlando demo__chat-message--typing';
    bubble.setAttribute('aria-label', 'Orlando is thinking');
    for (let i = 0; i < 3; i += 1) {
      const dot = document.createElement('span');
      dot.className = 'demo__chat-typing-dot';
      bubble.appendChild(dot);
    }
    this.messagesEl.appendChild(bubble);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    return bubble;
  }

  /**
   * Remove the typing bubble returned from addTypingIndicator. Safe to
   * call with null (no-op) so callers don't need to guard.
   * @param {HTMLElement|null} el - The bubble to remove.
   */
  removeTypingIndicator(el) {
    if (!el || !el.parentNode) return;
    el.parentNode.removeChild(el);
  }

  /**
   * Whether this intent type is one that is supposed to mutate the preview.
   * Non-mutating types (help, unknown, noop) always keep their original
   * reply.
   * @param {{type: string}} intent
   */
  isMutatingIntent(intent) {
    return ['palette', 'font', 'scale', 'space', 'rename', 'menu', 'hero', 'dish', 'course', 'randomize', 'reset', 'shitty', 'undo', 'redo'].includes(intent.type);
  }

  /**
   * Map an intent to the axis it affected, for context-aware
   * follow-ups. Palette/font/layout axes aren't tracked — their
   * comparatives (warmer, cooler, lighter, darker) already route via
   * the dedicated palette intents. Only size/spacing genuinely need
   * axis memory because "bigger" without a noun is ambiguous.
   * @param {{type: string, payload: object}} intent
   * @returns {string|null}
   */
  inferAxisFromIntent(intent) {
    if (!intent) return null;
    if (intent.type === 'scale') {
      const p = intent.payload || {};
      if (typeof p.titleSet === 'number' || typeof p.titleDelta === 'number') return 'title-scale';
      if (typeof p.bodySet === 'number' || typeof p.bodyDelta === 'number') return 'body-scale';
      return null;
    }
    if (intent.type === 'space') return 'space';
    // Every other axis already has its own comparative intents (warmer,
    // cooler, serif, modern, stack, etc.) — no need to remember.
    return null;
  }

  /**
   * Build a helpful reply for the case where a mutating intent parsed
   * cleanly but produced no visible change. The goal is to keep Orlando
   * honest and to nudge the user toward something that will actually shift.
   * @param {{type: string, payload: object}} intent
   * @param {object} state - Current preview state.
   * @returns {string}
   */
  buildNoChangeReply(intent, state) {
    switch (intent.type) {
      case 'palette': {
        const others = this.parser.paletteNames.filter((p) => p !== state.palette);
        const suggestion = others[Math.floor(Math.random() * others.length)];
        return `Orlando's already on the ${state.palette} palette. Try "go ${suggestion}" or "surprise me" for a different direction.`;
      }
      case 'font': {
        const alternates = {
          serif: 'switch to modern',
          sans: 'use a serif headline',
          modern: 'use a serif headline'
        };
        const suggestion = alternates[state.font] || 'switch to modern';
        return `Orlando's already using the ${state.font} font — try "${suggestion}" instead.`;
      }
      case 'scale': {
        // Superlative (titleSet/bodySet) vs comparative (titleDelta/bodyDelta)
        // produce different honest replies.
        if (typeof intent.payload.titleSet === 'number') {
          return intent.payload.titleSet > 1
            ? 'The headline is already at its loudest.'
            : 'The headline is already at its quietest.';
        }
        if (typeof intent.payload.bodySet === 'number') {
          return intent.payload.bodySet > 1
            ? 'The body text is already opened as wide as it goes.'
            : 'The body text is already at its tightest.';
        }
        if (typeof intent.payload.titleDelta === 'number') {
          return intent.payload.titleDelta > 0
            ? 'Orlando is at the top of the title scale — try "smaller titles" to dial it back.'
            : 'Orlando is at the bottom of the title scale — try "bigger titles" to bring it up.';
        }
        if (typeof intent.payload.bodyDelta === 'number') {
          return intent.payload.bodyDelta > 0
            ? 'Orlando has opened the body text as wide as it can go.'
            : 'Orlando has tightened the body text about as far as it goes.';
        }
        return intent.reply;
      }
      case 'space':
        if (typeof intent.payload.set === 'number') {
          return intent.payload.set > 1
            ? 'The layout is already at its airiest.'
            : 'The layout is already at its tightest.';
        }
        return intent.payload.delta > 0
          ? 'Orlando has given the layout as much breathing room as it can take — try "tighter" to dial it back.'
          : 'Orlando has pulled everything about as close as it will go — try "roomier" to ease it open.';
      case 'rename':
        return `The trattoria is already named "${state.title}". Give it a different name and Orlando will repaint the sign.`;
      case 'menu': {
        const alternates = {
          grid: 'stack the menu',
          list: 'gallery menu',
          gallery: 'three-column menu'
        };
        return `The menu is already in ${state.menu} layout — try "${alternates[state.menu] || 'stack the menu'}" for a different feel.`;
      }
      case 'hero':
        return state.hero === 'center'
          ? 'The hero is already centred. Try "left-align the hero" for a more editorial feel.'
          : 'The hero is already left-aligned. Try "centre the hero" to bring it back to the postcard look.';
      case 'dish':
        return state.dish === 'stacked'
          ? 'The dish cards are already stacked (photo on top). Try "inline dishes" for a horizontal layout.'
          : 'The dish cards are already inline (photo on the side). Try "stacked dishes" to put the photos back on top.';
      case 'course': {
        const payload = intent.payload;
        const flagKeys = ['starters', 'mains', 'desserts'];
        const explicit = flagKeys.filter((k) => typeof payload[k] === 'boolean');

        // Composite intents (full menu, mains only, only starters, only
        // desserts) always set all three flags. Describe the composition
        // that is already on screen rather than pretending a change.
        if (explicit.length === 3) {
          const { starters, mains, desserts } = payload;
          if (starters && mains && desserts) return 'The full menu is already out — antipasti, mains, and dolci.';
          if (!starters && mains && !desserts) return 'The menu is already pared back to the mains.';
          if (starters && !mains && !desserts) return 'The table is already set with only the antipasti.';
          if (!starters && !mains && desserts) return 'The table is already cleared down to just the dolci.';
          return 'The menu is already in that arrangement.';
        }

        // Single-flag toggles.
        if (explicit.includes('starters')) {
          return payload.starters
            ? 'Orlando already has the antipasti set out. Try "add desserts" or "full menu".'
            : 'There are no antipasti to remove — not on the table at the moment.';
        }
        if (explicit.includes('mains')) {
          return payload.mains
            ? 'Orlando already has the mains on the table.'
            : 'There are no mains out to tuck away — the kitchen is already focused elsewhere.';
        }
        if (explicit.includes('desserts')) {
          return payload.desserts
            ? 'Orlando already has the dolci on offer. Try "add starters" or "full menu".'
            : 'The dolci are not out yet — nothing to clear.';
        }
        return intent.reply;
      }
      case 'randomize':
        // Defensive fallback — with per-axis filtering it should be
        // practically impossible to land on the exact same composition.
        return 'Orlando rolled the dice and somehow landed on the same composition. Try "surprise me" again.';
      case 'reset':
        return 'The trattoria is already at its original Sunday best. Try "surprise me" to stir things up.';
      case 'shitty':
        return 'The trattoria is already as shitty as Orlando is willing to make it. Type "make it nice" (or "reset") when you\'re ready to repent.';
      case 'undo':
        return 'Orlando has nothing to undo — this is where you started. Try a change first, then ask Orlando to take it back.';
      case 'redo':
        return 'Orlando has nothing to redo. A redo only brings back a change that was just undone.';
      default:
        return intent.reply;
    }
  }

  /**
   * Collapse the suggestion chip row with a CSS transition and pull it
   * out of the tab/accessibility tree.
   */
  hideSuggestions() {
    if (!this.suggestionsEl) return;
    this.suggestionsEl.classList.add('demo__chat-suggestions--hidden');
    this.suggestionsEl.setAttribute('inert', '');
    if (this.toggleEl) {
      this.toggleEl.setAttribute('aria-expanded', 'false');
    }
  }

  /**
   * Expand the suggestion chip row and return it to the tab/accessibility
   * tree. Called after a reset, or when the user clicks the disclosure
   * toggle above the input.
   */
  showSuggestions() {
    if (!this.suggestionsEl) return;
    this.suggestionsEl.classList.remove('demo__chat-suggestions--hidden');
    this.suggestionsEl.removeAttribute('inert');
    if (this.toggleEl) {
      this.toggleEl.setAttribute('aria-expanded', 'true');
    }
  }

  /**
   * Append a message bubble to the chat messages container.
   * @param {'user'|'orlando'} author - Which side the bubble belongs to.
   * @param {string} text - Message text.
   */
  addMessage(author, text) {
    if (!this.messagesEl) return;

    const bubble = document.createElement('p');
    bubble.className = `demo__chat-message demo__chat-message--${author}`;
    bubble.textContent = text;
    this.messagesEl.appendChild(bubble);

    // Keep the newest message in view. Using scrollTop rather than
    // scrollIntoView avoids scrolling the whole page on mobile.
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }
}

/**
 * Typewriter-cycling placeholder for the demo's chat input.
 * Types out a suggestion one character at a time, holds, deletes it,
 * then cycles to the next — a clear "this is a live input" signal
 * that breaks the "this might be a screenshot" ambiguity.
 *
 * Behaviours:
 *   - Pauses whenever the user focuses the input (so a real typing
 *     session is never stomped on by the demo animation).
 *   - Resumes from the top of the cycle after blur.
 *   - Respects prefers-reduced-motion: falls back to a single static
 *     placeholder without animation.
 */
class DemoPlaceholderCycler {
  /**
   * @param {HTMLInputElement} inputEl - The chat input to animate.
   * @param {string[]} suggestions - Ordered list of phrases to cycle.
   * @param {object} [options]
   * @param {string} [options.prefix] - Fixed prefix on the placeholder
   *   (default "Try: ").
   * @param {number} [options.typeSpeed] - Milliseconds per typed char.
   * @param {number} [options.deleteSpeed] - Milliseconds per deleted char.
   * @param {number} [options.holdMs] - Pause on a fully-typed phrase.
   * @param {number} [options.restartMs] - Pause before the next phrase.
   */
  constructor(inputEl, suggestions, options = {}) {
    this.inputEl = inputEl;
    this.suggestions = suggestions;
    this.prefix = options.prefix || 'Try: ';
    this.typeSpeed = options.typeSpeed || 55;
    this.deleteSpeed = options.deleteSpeed || 28;
    this.holdMs = options.holdMs || 1800;
    this.restartMs = options.restartMs || 450;

    this.index = 0;
    this.charIndex = 0;
    this.mode = 'typing'; // 'typing' | 'deleting'
    this.timer = null;
    this.paused = false;

    // Honour OS-level reduced-motion. If the user has asked for calmer
    // interfaces, show a single static placeholder and never animate.
    const prefersReduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      this.inputEl.placeholder = this.prefix + this.suggestions[0];
      return;
    }

    // Pause while the input is focused so the animation never fights
    // the user's actual typing. Resume from the current position on
    // blur.
    this.inputEl.addEventListener('focus', () => {
      this.paused = true;
      if (this.timer) {
        window.clearTimeout(this.timer);
        this.timer = null;
      }
    });
    this.inputEl.addEventListener('blur', () => {
      this.paused = false;
      this.scheduleTick(this.restartMs);
    });

    this.inputEl.placeholder = this.prefix;
    this.scheduleTick(400);
  }

  /**
   * Queue the next animation frame. Centralised so focus/blur can
   * cancel cleanly without half-typed placeholders.
   * @param {number} delay - Milliseconds to wait before the next tick.
   */
  scheduleTick(delay) {
    if (this.paused) return;
    if (this.timer) window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.tick(), delay);
  }

  /**
   * One frame of the typewriter loop: advance (or reverse) by one
   * character, then either hold, switch direction, or cycle.
   */
  tick() {
    if (this.paused) return;
    const target = this.suggestions[this.index];

    if (this.mode === 'typing') {
      this.charIndex += 1;
      this.inputEl.placeholder = this.prefix + target.slice(0, this.charIndex);
      if (this.charIndex >= target.length) {
        // Finished typing — hold at the end, then switch to deleting.
        this.mode = 'deleting';
        this.scheduleTick(this.holdMs);
        return;
      }
      this.scheduleTick(this.typeSpeed);
      return;
    }

    // Deleting.
    this.charIndex -= 1;
    this.inputEl.placeholder = this.prefix + target.slice(0, Math.max(0, this.charIndex));
    if (this.charIndex <= 0) {
      // Finished deleting — advance to the next suggestion and resume
      // typing.
      this.mode = 'typing';
      this.charIndex = 0;
      this.index = (this.index + 1) % this.suggestions.length;
      this.scheduleTick(this.restartMs);
      return;
    }
    this.scheduleTick(this.deleteSpeed);
  }
}

/**
 * Initialize the demo controller and placeholder cycler when the DOM
 * is ready. The cycler is a visual-only enhancement — if the input
 * isn't present (controller bailed), the `if` guards skip it cleanly.
 */
document.addEventListener('DOMContentLoaded', () => {
  new DemoController();

  const inputEl = document.querySelector('[data-demo-input]');
  if (inputEl) {
    new DemoPlaceholderCycler(inputEl, [
      'go seaside',
      'bigger titles',
      'stack the menu',
      'modern font',
      'full menu',
      'surprise me'
    ]);
  }
});
