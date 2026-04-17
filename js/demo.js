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

    // Hand the parser the current preview state so state-aware intents
    // (surprise-me) can avoid no-ops on their first roll.
    const intent = this.parser.parse(text, this.preview.getState());
    const result = this.preview.apply(intent);

    // If the intent was meant to mutate the design but the preview didn't
    // actually move — the user asked for the palette/font already in
    // view, hit a scale clamp, or renamed to the same title — speak
    // honestly instead of claiming a change.
    const reply = (this.isMutatingIntent(intent) && !result.changed)
      ? this.buildNoChangeReply(intent, result.state)
      : intent.reply;

    // The suggestion chips are onboarding hints — collapse them once
    // the user starts chatting, and restore them on an explicit reset.
    if (intent.type === 'reset') {
      this.showSuggestions();
    } else {
      this.hideSuggestions();
    }

    // Small async delay so Orlando's reply feels conversational
    // rather than instantaneous.
    window.setTimeout(() => {
      this.addMessage('orlando', reply);
    }, 280);
  }

  /**
   * Whether this intent type is one that is supposed to mutate the preview.
   * Non-mutating types (help, unknown, noop) always keep their original
   * reply.
   * @param {{type: string}} intent
   */
  isMutatingIntent(intent) {
    return ['palette', 'font', 'scale', 'space', 'rename', 'menu', 'hero', 'dish', 'course', 'randomize', 'reset'].includes(intent.type);
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
 * Initialize the demo controller when the DOM is ready.
 */
document.addEventListener('DOMContentLoaded', () => {
  new DemoController();
});
