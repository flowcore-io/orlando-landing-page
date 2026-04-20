/**
 * Orlando Studio - Demo Intent Parser
 * Scripted natural-language matcher for the interactive demo chat.
 * Pure logic: takes user text, returns a structured intent describing
 * how the preview should mutate and what Orlando should reply.
 *
 * Following Orlando's vanilla JavaScript standards.
 */

class DemoIntentParser {
  /**
   * Create a new parser instance.
   * Intents are checked top-to-bottom; the first match wins, so more
   * specific patterns must come before more general ones.
   */
  constructor() {
    /**
     * Ordered list of intent definitions.
     * Each entry exposes: name, match (RegExp), build (fn -> intent object).
     * An intent object has the shape:
     *   { type, payload, reply }
     * where `type` is consumed by DemoPreview.apply().
     */
    /**
     * Ordered list of palette names — also used by the surprise-me intent
     * and by the help/color-request fallbacks to stay in sync with CSS.
     */
    this.paletteNames = ['tomato', 'olive', 'lemon', 'seaside', 'rosa', 'notte', 'espresso', 'vino', 'inchiostro', 'pistacchio'];

    /**
     * Value pools for the other named axes. Kept beside paletteNames so
     * surprise-me and related intents don't have to go hunting.
     */
    this.fontNames = ['serif', 'sans', 'modern'];
    this.menuNames = ['grid', 'list', 'gallery'];
    this.heroNames = ['center', 'left'];
    this.dishNames = ['stacked', 'inline'];

    /**
     * Curated scale presets for surprise-me. Each set stays inside the
     * preview's clamp ranges (see DemoPreview.limits) and sticks to
     * visually pleasant values rather than pulling a continuous random —
     * a random 1.43 tends to look accidental, whereas picking from a
     * small set keeps compositions designer-clean.
     */
    this.titleScalePresets = [0.85, 1.0, 1.15, 1.3, 1.5];
    this.bodyScalePresets = [0.85, 1.0, 1.1, 1.2];
    this.spaceScalePresets = [0.75, 1.0, 1.2, 1.35];

    /**
     * Common typos → canonical spellings. Used by parse() as a fallback
     * pass only — the original text gets tried against every intent
     * first, so a legitimate word like "desert" (in "desert island vibe")
     * keeps its meaning. Corrections only apply when the original text
     * produced no match and the corrected form might.
     *
     * Deliberately narrow: only typos that appear in intent keywords
     * (palette, spacing, typography, dish/course names) are worth
     * correcting. General English typos (recieve, seperate) aren't —
     * Orlando's vocabulary doesn't depend on them.
     */
    this.spellingCorrections = {
      // Dessert ↔ desert — the classic English typo
      'desert': 'dessert',
      'deserts': 'desserts',
      // Italian dish names (common for English speakers to mistype)
      'tiramasu': 'tiramisu',
      'tirimasu': 'tiramisu',
      'tirimisu': 'tiramisu',
      'proscuitto': 'prosciutto',
      'canoli': 'cannoli',
      'canolis': 'cannoli',
      'cannolis': 'cannoli',
      'burata': 'burrata',
      'papardelle': 'pappardelle',
      'papparadelle': 'pappardelle',
      'brucetta': 'bruschetta',
      'brushetta': 'bruschetta',
      'brushcetta': 'bruschetta',
      'gramolata': 'gremolata',
      'marscapone': 'mascarpone',
      // Orlando command keywords
      'palet': 'palette',
      'pallet': 'palette',
      'palete': 'palette',
      'pallete': 'palette',
      'spaceing': 'spacing',
      'typogrophy': 'typography',
      'typograpy': 'typography',
      'headling': 'headline',
      'headine': 'headline',
      'tile': 'title',
      'tiles': 'titles',
      // Superlatives → comparatives. The intent regexes accept the
      // comparative form (bigger/smaller/tighter/etc.), so folding
      // "biggest" onto "bigger" here lets "biggest title" match
      // type-bigger-title without every regex growing an -est branch.
      'biggest': 'bigger',
      'largest': 'larger',
      'hugest': 'huge',
      'smallest': 'smaller',
      'tiniest': 'tinier',
      'boldest': 'bolder',
      'grandest': 'grand',
      'loudest': 'louder',
      'strongest': 'stronger',
      'punchiest': 'punchier',
      'quietest': 'quieter',
      'softest': 'softer',
      'subtlest': 'subtler',
      'tightest': 'tighter',
      'closest': 'closer',
      'densest': 'denser',
      'coziest': 'cozier',
      'cosiest': 'cozier',
      'roomiest': 'roomier',
      'airiest': 'airier',
      'breeziest': 'breezier'
    };

    /**
     * Friendly labels used in random/fallback replies and for the
     * introspection queries ("what palette?", "what layout?", etc.).
     * Keeps every value in one place so new palettes/fonts/layouts only
     * need to be declared once here and once in CSS.
     */
    this.paletteLabels = {
      tomato: 'tomato warmth',
      olive: 'Tuscan olive',
      lemon: 'Amalfi lemon',
      seaside: 'seaside blues',
      rosa: 'bougainvillea rosa',
      notte: 'candlelit notte',
      espresso: 'espresso browns',
      vino: 'barolo wine',
      inchiostro: 'ink-black navy',
      pistacchio: 'pistachio gelato'
    };
    this.fontLabels = {
      serif: 'classic serif (Georgia)',
      sans: 'clean Helvetica sans-serif',
      modern: 'modern Inter'
    };
    this.menuLabels = {
      grid: 'a three-column grid',
      list: 'a single-column list',
      gallery: 'two wider columns'
    };
    this.heroLabels = {
      center: 'centre-aligned',
      left: 'left-aligned'
    };
    this.dishLabels = {
      stacked: 'stacked (photo above text)',
      inline: 'inline (photo beside text)'
    };

    this.intents = [
      // --- Rename (must come before palette so "call it Rosso" isn't a palette swap) ---
      // Apostrophes are allowed inside the captured name so "Mario's",
      // "O'Brien", or "Lil'illy" survive. Only straight double quotes
      // are treated as wrapping quotes and stripped. If a user actually
      // wraps a name in straight single quotes (rare), the quotes will
      // stay in the captured title — an acceptable trade-off.
      {
        name: 'rename',
        match: /(?:rename(?:\s+it)?(?:\s+to)?|call it|change (?:the )?(?:title|name) to|title should be|name it)\s+"?([^"?.!]+?)"?\s*[.!?]?\s*$/i,
        build: (m) => ({
          type: 'rename',
          payload: { title: m[1].trim() },
          reply: `Orlando renames the trattoria to "${m[1].trim()}". A fresh signboard for the street.`
        })
      },

      // --- Shitty mode (easter egg) ---
      // A deliberately ugly composition: clashing colours, Comic Sans,
      // tilted elements, mismatched sizes. Has to be asked for by name —
      // it is NOT in the surprise-me pool. Exit with "reset" or
      // "make it nice". Must come before palette-unknown so "make it
      // ugly" doesn't fall to the generic colour fallback.
      {
        name: 'shitty',
        match: /\b(?:(?:make|turn)\s+(?:it|this)\s+(?:shitty|shit|ugly|awful|horrible|gross|terrible|hideous|bad|tacky)|uglify|shit\s+mode|ugly\s+mode|ruin\s+it|trash\s+it|wreck\s+it|destroy\s+it|mess\s+it\s+up)\b/i,
        build: () => ({
          type: 'shitty',
          payload: {},
          reply:
            'Mamma mia — fine. Orlando will commit a crime against design. ' +
            'Don\'t say Orlando didn\'t warn you. ' +
            'Type "reset" or "make it nice" when you\'ve seen enough.'
        })
      },

      // --- Surprise me (before palettes so random phrasings don't get captured by a colour keyword) ---
      {
        name: 'surprise-me',
        match: /\b(surprise\s+me|random(?:ize|ise)?|mix\s+it\s+up|shuffle|you\s+(?:decide|pick|choose)|dealer'?s\s+choice|whatever\s+you\s+(?:like|want))\b/i,
        build: (m, state) => {
          // For every axis, pick a random value that differs from the
          // one currently on screen. This guarantees a visibly fresh
          // composition on every roll — palette, typography, layout,
          // AND proportions all shift together.
          const current = state || {};
          const pickDifferent = (pool, currentValue) => {
            const others = currentValue
              ? pool.filter((v) => v !== currentValue)
              : pool;
            return others[Math.floor(Math.random() * others.length)];
          };
          // Scales use a small epsilon because floating-point arithmetic
          // from repeated delta applications can leave currentValue as
          // e.g. 1.3000000000000003 rather than exactly 1.3.
          const pickDifferentScale = (presets, currentValue) => {
            const others = (typeof currentValue === 'number')
              ? presets.filter((v) => Math.abs(v - currentValue) > 0.01)
              : presets;
            const pool = others.length > 0 ? others : presets;
            return pool[Math.floor(Math.random() * pool.length)];
          };

          const palette = pickDifferent(this.paletteNames, current.palette);
          const font = pickDifferent(this.fontNames, current.font);
          const menu = pickDifferent(this.menuNames, current.menu);
          const hero = pickDifferent(this.heroNames, current.hero);
          const dish = pickDifferent(this.dishNames, current.dish);
          const titleScale = pickDifferentScale(this.titleScalePresets, current.titleScale);
          const bodyScale = pickDifferentScale(this.bodyScalePresets, current.bodyScale);
          const spaceScale = pickDifferentScale(this.spaceScalePresets, current.spaceScale);
          // Independent coin flips for the three course sections so the
          // trattoria sometimes serves mains-only, sometimes a full three
          // courses, sometimes only dolci, and so on. If all three would
          // end up hidden the menu collapses to nothing — fall back to
          // the mains so the preview always has at least one course.
          const starters = Math.random() > 0.5;
          let mains = Math.random() > 0.5;
          const desserts = Math.random() > 0.5;
          if (!starters && !mains && !desserts) mains = true;

          return {
            type: 'randomize',
            payload: { palette, font, menu, hero, dish, titleScale, bodyScale, spaceScale, starters, mains, desserts },
            reply:
              `Orlando rolls the dice — ${this.paletteLabels[palette]}, ` +
              `${font} type, fresh proportions, a new layout, and a different spread on the menu. Everything shifted.`
          };
        }
      },

      // --- Palette swaps ---
      // Parser is ordered top-to-bottom; first match wins. Specific
      // multi-word English phrases ("dark blue", "light green", "wine
      // red") MUST sit above the six generic-word palettes, or else
      // seaside's bare `blue`, olive's `green`, and tomato's `red`
      // shadow the compound intents. Each of the four specific palettes
      // here is a targeted disambiguator — plain "blue" still lands on
      // seaside below; only "dark/deep/midnight blue" gets routed to
      // inchiostro.

      {
        name: 'palette-inchiostro',
        match: /\b(inchiostro|ink(?:y)?|indigo|cobalt|sapphire|(?:dark|deep|midnight)\s+blue|blueberry|blackberry|onyx|noir|manuscript)\b/i,
        build: () => ({
          type: 'palette',
          payload: { palette: 'inchiostro' },
          reply: 'Orlando switches to ink — near-black navy with a warm rust accent, like an editorial printed at midnight.'
        })
      },
      {
        name: 'palette-pistacchio',
        match: /\b(pistacchio|pistachio|mint(?:y)?|lime|chartreuse|celery|(?:spring|fresh|light)\s+green|gelato|gelateria|ice\s*cream)\b/i,
        build: () => ({
          type: 'palette',
          payload: { palette: 'pistacchio' },
          reply: 'Orlando serves the pistacchio — pale gelato green with a coral scoop on top.'
        })
      },
      {
        name: 'palette-vino',
        match: /\b(vino|wine|burgundy|barolo|chianti|merlot|maroon|oxblood|cherry|ruby|bordeaux|claret|cellar|sommelier)\b/i,
        build: () => ({
          type: 'palette',
          payload: { palette: 'vino' },
          reply: 'Orlando reaches for the Barolo — deep burgundy walls, soft gold on the glass rims.'
        })
      },
      {
        name: 'palette-espresso',
        match: /\b(espresso|brown(?:er)?|coffee|mocha|chocolate|cocoa|umber|sepia|chestnut|hazelnut|caramel|caff[eè]|barista|roast(?:ed)?|latte)\b/i,
        build: () => ({
          type: 'palette',
          payload: { palette: 'espresso' },
          reply: 'Orlando pulls the blinds and pours an espresso — rich coffee browns with a copper glow.'
        })
      },

      // Generic-word palettes — each catches the bare colour word
      // ("blue", "green", "red") for users who don't reach for a
      // modifier. The disambiguators above intercept the compound
      // phrases first.
      {
        name: 'palette-tomato',
        match: /\b(tomato|terracotta|rosso|red(?:der)?|crimson|scarlet|brick|warm(?:er)?|cozy|cozier|bold(?:er)?|sunset|autumnal|spicy|passionate)\b/i,
        build: () => ({
          type: 'palette',
          payload: { palette: 'tomato' },
          reply: 'Orlando leans into tomato — warm terracotta and deep reds now carry the composition.'
        })
      },
      {
        name: 'palette-olive',
        match: /\b(olive|oliva|sage|earth(?:y)?|muted|rustic|tuscan|green(?:er)?|forest|moss|verde|herb(?:al)?|rosemary|natural|organic)\b/i,
        build: () => ({
          type: 'palette',
          payload: { palette: 'olive' },
          reply: 'Orlando shifts to olive — grounded, earthy tones that feel like a Tuscan afternoon.'
        })
      },
      {
        name: 'palette-lemon',
        match: /\b(lemon|limone|yellow|bright(?:er)?|sunny|cheerful|amalfi|gold(?:en)?|canary|honey|mustard|summer|sunshine|citrus|breakfast)\b/i,
        build: () => ({
          type: 'palette',
          payload: { palette: 'lemon' },
          reply: 'Orlando brightens the palette — lemon and cream, like breakfast on the Amalfi coast.'
        })
      },
      {
        name: 'palette-seaside',
        match: /\b(seaside|sea|ocean|blue|teal|cool(?:er)?|fresh|riviera|mediterranean|aqua|navy|azure|marine|coastal|sky|water)\b/i,
        build: () => ({
          type: 'palette',
          payload: { palette: 'seaside' },
          reply: 'Orlando cools things down — seaside blues with a tomato accent, like a table on the Riviera.'
        })
      },
      {
        name: 'palette-rosa',
        match: /\b(rosa|rose|rosato|pink|blush|peach|coral|magenta|fuchsia|bougainvillea|romantic)\b/i,
        build: () => ({
          type: 'palette',
          payload: { palette: 'rosa' },
          reply: 'Orlando drifts into rosa — bougainvillea pinks softened with a warm brass accent.'
        })
      },
      {
        name: 'palette-notte',
        match: /\b(notte|night|dark(?:er)?|midnight|black|moody|evening|candle(?:light|lit)?|intimate|dinner)\b/i,
        build: () => ({
          type: 'palette',
          payload: { palette: 'notte' },
          reply: 'Orlando dims the room — candlelit notte, gold on deep umber, a late-night trattoria.'
        })
      },

      // --- Font family (expanded) ---
      {
        name: 'font-serif',
        match: /\b(serif|classical|classic|elegant|traditional|editorial|refined|timeless|old[- ]?world|bookish)\b/i,
        build: () => ({
          type: 'font',
          payload: { font: 'serif' },
          reply: 'Orlando switches to a classic serif — editorial, confident, a little old-world.'
        })
      },
      {
        name: 'font-sans',
        match: /\b(sans(?:-?serif)?|helvetica|clean|neutral|plain|straightforward|unadorned)\b/i,
        build: () => ({
          type: 'font',
          payload: { font: 'sans' },
          reply: 'Orlando swaps in Helvetica — clean, neutral, every letter doing its job.'
        })
      },
      {
        name: 'font-modern',
        match: /\b(modern|inter|geometric|contemporary|techy|tech|minimal(?:ist)?|crisp|sleek)\b/i,
        build: () => ({
          type: 'font',
          payload: { font: 'modern' },
          reply: 'Orlando goes modern — Inter, tight tracking, a contemporary feel.'
        })
      },

      // --- Typography scale: superlatives jump straight to the limit.
      // Must come before the comparative intents so "biggest title"
      // resolves to the absolute max rather than a single +0.15 step. ---
      {
        name: 'type-biggest-title',
        match: /\b(biggest|largest|hugest|most\s+dramatic|boldest|grandest|loudest|strongest|punchiest)\s+(?:head(?:line|er|ing)s?|titles?|type)\b/i,
        build: () => ({
          type: 'scale',
          payload: { titleSet: 1.6 },
          reply: 'Orlando cranks the headline to its loudest — full stage presence.'
        })
      },
      {
        name: 'type-smallest-title',
        match: /\b(smallest|tiniest|quietest|softest|subtlest|most\s+understated)\s+(?:head(?:line|er|ing)s?|titles?|type)\b/i,
        build: () => ({
          type: 'scale',
          payload: { titleSet: 0.7 },
          reply: 'Orlando drops the headline to its quietest — barely a whisper.'
        })
      },
      {
        name: 'type-biggest-body',
        match: /\b(biggest|largest|most\s+readable)\s+(?:body|text|copy|paragraph(?:s)?)\b/i,
        build: () => ({
          type: 'scale',
          payload: { bodySet: 1.3 },
          reply: 'Orlando opens the body text to its most readable setting — wide open.'
        })
      },
      {
        name: 'type-smallest-body',
        match: /\b(smallest|tiniest|tightest)\s+(?:body|text|copy|paragraph(?:s)?)\b/i,
        build: () => ({
          type: 'scale',
          payload: { bodySet: 0.8 },
          reply: 'Orlando tightens the body text to its tightest — most composed.'
        })
      },

      // --- Typography scale (expanded with more natural phrasings) ---
      {
        name: 'type-bigger-title',
        match: /\b(bigger|larger|huge|dramatic|bold(?:er)?|grand|louder|stronger|punchier)\s+(?:head(?:line|er|ing)s?|titles?|type)\b/i,
        build: () => ({
          type: 'scale',
          payload: { titleDelta: 0.15 },
          reply: 'Orlando pushes the headline up a notch — more stage presence.'
        })
      },
      {
        name: 'type-smaller-title',
        match: /\b(smaller|tinier|subtler|quieter|softer|understated)\s+(?:head(?:line|er|ing)s?|titles?|type)\b/i,
        build: () => ({
          type: 'scale',
          payload: { titleDelta: -0.15 },
          reply: 'Orlando tones the headline down — quieter, more restrained.'
        })
      },
      {
        name: 'type-bigger-body',
        match: /\b(bigger|larger|more\s+readable)\s+(?:body|text|copy|paragraph(?:s)?)\b/i,
        build: () => ({
          type: 'scale',
          payload: { bodyDelta: 0.1 },
          reply: 'Orlando opens up the body text — easier on the eyes.'
        })
      },
      {
        name: 'type-smaller-body',
        match: /\b(smaller|tinier|tighter)\s+(?:body|text|copy|paragraph(?:s)?)\b/i,
        build: () => ({
          type: 'scale',
          payload: { bodyDelta: -0.1 },
          reply: 'Orlando tightens the body text — more composed.'
        })
      },

      // --- Spacing superlatives: jump straight to the clamp limit. ---
      {
        name: 'space-tightest',
        match: /\b(tightest|closest|densest|most\s+(?:compact|dense|packed|close))(?:\s+(?:spacing|layout|everything))?\b/i,
        build: () => ({
          type: 'space',
          payload: { set: 0.7 },
          reply: 'Orlando pulls everything as close as it can go — the tightest rhythm.'
        })
      },
      {
        name: 'space-roomiest',
        match: /\b(roomiest|airiest|breeziest|most\s+(?:spacious|open|relaxed|breathing|air))(?:\s+(?:spacing|layout))?\b/i,
        build: () => ({
          type: 'space',
          payload: { set: 1.4 },
          reply: 'Orlando gives the layout all the breathing room it has — the airiest rhythm.'
        })
      },

      // --- Spacing (expanded) ---
      {
        name: 'space-tighter',
        match: /\b(tight(?:er)?|compact|dense|packed|close(?:r)?|condensed)(?:\s+(?:spacing|layout|everything))?\b/i,
        build: () => ({
          type: 'space',
          payload: { delta: -0.15 },
          reply: 'Orlando pulls everything closer — a cozier rhythm.'
        })
      },
      {
        name: 'space-breezier',
        match: /\b(breez(?:ier|y)|airier|roomier|spacious|open(?:er)?|relaxed|more\s+(?:space|breathing|room|air))\b/i,
        build: () => ({
          type: 'space',
          payload: { delta: 0.15 },
          reply: 'Orlando adds breathing room — the layout can exhale now.'
        })
      },

      // --- Menu layout ---
      {
        name: 'menu-list',
        match: /\b((?:single|one|1)[- ]?column(?:\s+menu)?|stack(?:ed)?\s+(?:the\s+)?menu|list(?:\s+the)?\s+menu|menu\s+(?:as\s+)?(?:a\s+)?list|vertical\s+menu)\b/i,
        build: () => ({
          type: 'menu',
          payload: { menu: 'list' },
          reply: 'Orlando stacks the menu into a single column — each dish gets its own line.'
        })
      },
      {
        name: 'menu-gallery',
        match: /\b((?:two|2)[- ]?column(?:\s+menu)?|gallery(?:\s+menu)?|bigger\s+(?:dish\s+)?cards|wider\s+dishes)\b/i,
        build: () => ({
          type: 'menu',
          payload: { menu: 'gallery' },
          reply: 'Orlando opens the menu into two wider columns — more presence per dish.'
        })
      },
      {
        name: 'menu-grid',
        match: /\b((?:three|3)[- ]?column(?:\s+menu)?|grid\s+menu|menu\s+grid|compact\s+menu|default\s+menu)\b/i,
        build: () => ({
          type: 'menu',
          payload: { menu: 'grid' },
          reply: 'Orlando returns the menu to the three-column grid — compact and balanced.'
        })
      },

      // --- Hero alignment ---
      {
        name: 'hero-left',
        match: /\b(left[- ]align(?:ed)?(?:\s+hero)?|align\s+(?:the\s+)?hero\s+left|flush\s+left|ranged?\s+left|left[- ]hand\s+hero)\b/i,
        build: () => ({
          type: 'hero',
          payload: { hero: 'left' },
          reply: 'Orlando left-aligns the hero — more editorial, less postcard.'
        })
      },
      {
        name: 'hero-center',
        match: /\b(cent(?:er|re)[- ]align(?:ed)?(?:\s+hero)?|align\s+(?:the\s+)?hero\s+cent(?:er|re)|cent(?:er|re)ed\s+hero|cent(?:er|re)\s+the\s+hero)\b/i,
        build: () => ({
          type: 'hero',
          payload: { hero: 'center' },
          reply: 'Orlando re-centres the hero — balanced, symmetrical, postcard-proper.'
        })
      },

      // --- Dish card layout ---
      {
        name: 'dish-inline',
        match: /\b(inline\s+(?:dish(?:es)?|menu|items?|cards?)|side[- ]by[- ]side(?:\s+(?:dish(?:es)?|menu|items?|cards?))?|horizontal\s+(?:dish(?:es)?|menu|items?|cards?)|(?:dish(?:es)?|menu\s+items?|items?|cards?)\s+(?:(?:on|to)\s+)?(?:the\s+)?(?:side|left)|photo(?:s)?\s+(?:on\s+)?(?:the\s+)?(?:left|side)|image(?:s)?\s+(?:on\s+)?(?:the\s+)?(?:left|side))\b/i,
        build: () => ({
          type: 'dish',
          payload: { dish: 'inline' },
          reply: 'Orlando lays each dish on its side — photo left, name and note right, like a café menu card.'
        })
      },
      {
        name: 'dish-stacked',
        match: /\b(stack(?:ed)?\s+(?:dish(?:es)?|menu|items?|cards?)|vertical\s+(?:dish(?:es)?|menu|items?|cards?)|photo(?:s)?\s+(?:on\s+)?top|image(?:s)?\s+(?:on\s+)?top)\b/i,
        build: () => ({
          type: 'dish',
          payload: { dish: 'stacked' },
          reply: 'Orlando stacks the dishes again — photo on top, name and note below.'
        })
      },

      // --- Courses (antipasti / mains / dolci)
      // Composite phrases (full menu, "only X") MUST come before the
      // single-course toggles so "only starters" doesn't get consumed
      // by "add starters" style matching. Each composite sets all three
      // flags explicitly so chained requests behave predictably regardless
      // of what the user had on screen before. ---
      {
        name: 'course-full-menu',
        match: /\b(full\s+menu|complete\s+menu|three\s+courses|(?:add|show)\s+(?:the\s+)?(?:full|entire|whole)\s+menu|antipasti\s+and\s+dolci|starters\s+and\s+desserts|appetizers\s+and\s+desserts)\b/i,
        build: () => ({
          type: 'course',
          payload: { starters: true, mains: true, desserts: true },
          reply: 'Orlando unfolds the full menu — antipasti to open, mains in the middle, dolci to close.'
        })
      },
      {
        name: 'course-mains-only',
        match: /\b(mains?\s+only|just\s+(?:the\s+)?mains?|only\s+(?:the\s+)?mains?|remove\s+(?:the\s+)?(?:starters?\s+and\s+desserts?|antipasti\s+and\s+dolci|everything)|hide\s+(?:the\s+)?(?:starters?\s+and\s+desserts?|antipasti\s+and\s+dolci))\b/i,
        build: () => ({
          type: 'course',
          payload: { starters: false, mains: true, desserts: false },
          reply: 'Orlando trims the menu down to the mains — three signature dishes, nothing more.'
        })
      },
      {
        name: 'course-only-starters',
        match: /\b(?:only|just)\s+(?:the\s+)?(?:starters?|antipasti|appetizers?)\b|\b(?:starters?|antipasti|appetizers?)\s+only\b/i,
        build: () => ({
          type: 'course',
          payload: { starters: true, mains: false, desserts: false },
          reply: 'Orlando clears the table down to antipasti — just the opening plates.'
        })
      },
      {
        name: 'course-only-desserts',
        match: /\b(?:only|just)\s+(?:the\s+)?(?:desserts?|dolci|sweets?)\b|\b(?:desserts?|dolci|sweets?)\s+only\b/i,
        build: () => ({
          type: 'course',
          payload: { starters: false, mains: false, desserts: true },
          reply: 'Orlando skips straight to the sweet end — only the dolci remain.'
        })
      },
      {
        name: 'mains-remove',
        match: /\b(?:remove|hide|skip|drop|lose|no)\s+(?:the\s+)?(?:mains?|main\s+courses?|secondi)\b/i,
        build: () => ({
          type: 'course',
          payload: { mains: false },
          reply: 'Orlando tucks the mains away — the kitchen is focused on the surrounding courses.'
        })
      },
      {
        name: 'mains-add',
        match: /\b(?:add|show|include|bring\s+back|restore|return)\s+(?:the\s+)?(?:mains?|main\s+courses?|secondi)\b/i,
        build: () => ({
          type: 'course',
          payload: { mains: true },
          reply: 'Orlando brings the mains back to the centre of the table.'
        })
      },
      {
        name: 'starters-remove',
        match: /\b(remove|hide|skip|drop|lose|no)\s+(?:the\s+)?(?:starters?|antipasti|appetizers?)\b/i,
        build: () => ({
          type: 'course',
          payload: { starters: false },
          reply: 'Orlando folds the antipasti away.'
        })
      },
      {
        name: 'starters-add',
        match: /\b(?:add|show|include|bring\s+out|open\s+with)\s+(?:some\s+|the\s+)?(?:starters?|antipasti|appetizers?|bruschetta)\b/i,
        build: () => ({
          type: 'course',
          payload: { starters: true },
          reply: 'Orlando sets the antipasti — three little plates to open the meal.'
        })
      },
      {
        name: 'desserts-remove',
        match: /\b(remove|hide|skip|drop|lose|no)\s+(?:the\s+)?(?:desserts?|dolci|sweets?)\b/i,
        build: () => ({
          type: 'course',
          payload: { desserts: false },
          reply: 'Orlando clears the dolci.'
        })
      },
      {
        name: 'desserts-add',
        match: /\b(?:add|show|include|bring\s+out|end\s+with)\s+(?:some\s+|the\s+)?(?:desserts?|dolci|sweets?|tiramisu|tiramis[uù])\b/i,
        build: () => ({
          type: 'course',
          payload: { desserts: true },
          reply: 'Orlando brings out the dolci — tiramisù, panna cotta, cannoli. Dinner finished properly.'
        })
      },

      // --- Undo ---
      // Single-step history pop. Deliberately above `reset` so "undo"
      // (bare or "undo that") lands here instead of getting eaten by
      // reset's "undo everything" branch. The negative lookahead on
      // "undo" prevents that exact collision: "undo everything" falls
      // through to reset, "undo" / "undo that" fires the undo intent.
      {
        name: 'undo',
        match: /\bundo(?!\s+everything)(?:\s+(?:that|last|it))?\b|\b(?:take\s+that\s+back|rewind|go\s+back|step\s+back)\b/i,
        build: () => ({
          type: 'undo',
          payload: {},
          reply: 'Orlando takes that back — preview restored to before the last change.'
        })
      },

      // --- Redo ---
      // Pairs with undo: re-apply the most recently undone change.
      // "put that back" mirrors the undo phrasing "take that back"
      // so the pair reads as one gesture. The redo stack in
      // DemoPreview is cleared on any non-undo/redo mutation, so the
      // user can't ping-pong through stale states.
      {
        name: 'redo',
        match: /\b(?:redo(?:\s+(?:that|it|last))?|put\s+(?:that|it)\s+back|bring\s+(?:that|it)\s+back|do\s+(?:that|it)\s+again)\b/i,
        build: () => ({
          type: 'redo',
          payload: {},
          reply: 'Orlando puts that back — the last undone change is re-applied.'
        })
      },

      // --- Reset ---
      // "make it nice / pretty / good / clean / better", "fix it",
      // "clean it up", and "unshitty" are all aliases — mostly useful
      // for exiting shitty mode, but they also work as a general reset.
      // "undo everything" belongs here (a full reset), not on the
      // single-step undo above.
      {
        name: 'reset',
        match: /\b(reset|start\s+over|undo\s+everything|original|default|restore|make\s+it\s+(?:nice|pretty|good|clean|better|presentable)|fix\s+it|clean\s+it\s+up|un-?shitty(?:\s+it)?)\b/i,
        build: () => ({
          type: 'reset',
          payload: {},
          reply: 'Orlando returns the trattoria to its original Sunday best.'
        })
      },

      // --- Help ---
      {
        name: 'help',
        match: /\b(help|what\s+can\s+(?:i|you|orlando)\s+(?:do|ask|say|try)|examples?|ideas|suggest|commands?|options?|capabilit(?:y|ies))\b/i,
        build: () => ({
          type: 'help',
          payload: {},
          reply:
            'Orlando plays with palettes, typography, spacing, layout, and courses. Try ' +
            'palettes — ten of them, by colour ("make it blue", "wine red", "dark blue", "brown", "mint") ' +
            'or by name ("go rosa", "candlelit notte", "espresso"); ' +
            'typography ("serif headline", "modern font", "bigger titles"), ' +
            'spacing ("roomier", "tighter"), ' +
            'layout ("stack the menu", "left-align the hero", "inline dishes"), ' +
            'courses ("add starters", "full menu", "only desserts", "remove mains"), ' +
            'a rename ("rename it to Osteria del Sole"), or "surprise me".'
        })
      },

      // --- Introspection queries ---
      // Must sit before the -unknown catch-alls so "what is the layout"
      // doesn't fall to menu-unknown. State is passed in from the
      // controller so the reply reflects the live preview.
      {
        name: 'query-state',
        match: /\b(?:(?:what(?:'s|\s+is)?|show\s+me|describe|tell\s+me)\s+(?:the\s+)?(?:current\s+)?(?:state|status|settings?|composition|setup|everything|overview)|status)\b/i,
        build: (m, state) => ({
          type: 'help',
          payload: {},
          reply: this.describeState(state)
        })
      },
      {
        name: 'query-layout',
        match: /(?:what(?:'s|\s+is)?|current|describe|tell\s+me\s+(?:about|the)|show\s+me|which\s+is\s+(?:the\s+)?(?:current\s+)?)\b[^?]*\b(?:layout|arrangement|design|setup)\b/i,
        build: (m, state) => ({
          type: 'help',
          payload: {},
          reply: this.describeLayout(state)
        })
      },
      {
        name: 'query-palette',
        match: /(?:what(?:'s|\s+is)?|current|describe|tell\s+me\s+(?:about|the)|show\s+me|which\s+is\s+(?:the\s+)?(?:current\s+)?)\b[^?]*\b(?:palette|colo(?:u)?r|scheme|theme)\b/i,
        build: (m, state) => ({
          type: 'help',
          payload: {},
          reply: this.describePalette(state)
        })
      },
      {
        name: 'query-font',
        match: /(?:what(?:'s|\s+is)?|current|describe|tell\s+me\s+(?:about|the)|show\s+me|which\s+is\s+(?:the\s+)?(?:current\s+)?)\b[^?]*\b(?:font|typeface|typography)\b/i,
        build: (m, state) => ({
          type: 'help',
          payload: {},
          reply: this.describeFont(state)
        })
      },
      {
        name: 'query-menu',
        match: /(?:what(?:'s|\s+is)?|current|describe|tell\s+me\s+(?:about|the)|show\s+me|which\s+is\s+(?:the\s+)?(?:current\s+)?)\b[^?]*\b(?:courses?\s+are\s+out|courses?\s+are\s+on|on\s+the\s+menu)\b/i,
        build: (m, state) => ({
          type: 'help',
          payload: {},
          reply: this.describeCourses(state)
        })
      },

      // --- Listing queries: "what X are there" / "list X" / "show me X"
      // These come AFTER the singular query intents above so "what
      // palette is this" (singular) still wins over "what palettes are
      // there" (plural). The word boundary around singular-vs-plural is
      // what separates the two sets of matches. ---
      {
        name: 'list-palettes',
        // Accepts the explicit "palettes" keyword AND plain English
        // "colours/colors" so users asking "what colours can I use"
        // land on the list instead of falling through to the unknown
        // fallback. Plural-form matching is deliberate — singular
        // "what colour is this" still goes to query-palette (current
        // state), plural signals "show me the options".
        match: /\b(?:what|which|list|show(?:\s+me)?|all|every|how\s+many)\s+[\w\s]*?\b(?:palettes|colo(?:u)?rs?)\b|\b(?:palettes|colo(?:u)?rs)\s+(?:are\s+there|are\s+available|available|can\s+(?:i|we|you)\s+use|options?)\b/i,
        build: () => ({
          type: 'help',
          payload: {},
          reply: this.listPalettes()
        })
      },
      {
        name: 'list-fonts',
        match: /\b(?:what|list|show(?:\s+me)?|all|every|how\s+many)\s+[\w\s]*?\b(?:fonts|typefaces)\b|\b(?:fonts|typefaces)\s+(?:are\s+there|are\s+available|available|options?)\b/i,
        build: () => ({
          type: 'help',
          payload: {},
          reply: this.listFonts()
        })
      },
      {
        name: 'list-layouts',
        match: /\b(?:what|list|show(?:\s+me)?|all|every|how\s+many)\s+[\w\s]*?\b(?:layouts|(?:menu\s+)?arrangements|menu\s+(?:styles|types|configurations))\b|\blayouts\s+(?:are\s+there|are\s+available|available|options?)\b/i,
        build: () => ({
          type: 'help',
          payload: {},
          reply: this.listLayouts()
        })
      },
      {
        name: 'list-courses',
        match: /\b(?:what|list|show(?:\s+me)?|all|every|how\s+many)\s+[\w\s]*?\bcourses\b|\bcourses\s+(?:are\s+there|are\s+available|available|options?)\b/i,
        build: () => ({
          type: 'help',
          payload: {},
          reply: this.listCourses()
        })
      },

      // --- Category fallbacks ---
      // Each catch-all sits after every specific intent in its category
      // so it only fires when a user mentioned the category without a
      // match-able target (e.g. "I want bigger" with no noun). The order
      // between catch-alls goes from most specific vocabulary to least.
      {
        name: 'font-unknown',
        match: /\b(font|typeface|typography|type\s*family|lettering)\b/i,
        build: () => ({
          type: 'help',
          payload: {},
          reply:
            'Orlando has three typography families. Try "use a serif headline", ' +
            '"switch to modern", or "clean sans-serif".'
        })
      },
      {
        name: 'space-unknown',
        match: /\b(spacing|gap|margin|padding|rhythm|breathing\s+room|density)\b/i,
        build: () => ({
          type: 'help',
          payload: {},
          reply:
            'Orlando tunes the layout rhythm either way. Try "roomier spacing" or "tighter spacing".'
        })
      },
      {
        name: 'menu-unknown',
        match: /\b(menu\s+layout|layout|arrangement|alignment|structure)\b/i,
        build: () => ({
          type: 'help',
          payload: {},
          reply:
            'Orlando can rearrange the preview. Try "stack the menu", "gallery menu", ' +
            '"left-align the hero", or "inline dishes".'
        })
      },
      {
        name: 'course-unknown',
        match: /\b(course|courses|meal|starter|starters|appetizer|appetizers|antipasto|antipasti|main|mains|secondi|dessert|desserts|dolci|sweets?)\b/i,
        build: () => ({
          type: 'help',
          payload: {},
          reply:
            'Orlando serves three courses. Try "add starters", "full menu", "only desserts", ' +
            'or "remove mains".'
        })
      },
      // --- Colour / palette fallback ---
      // Catches shades Orlando doesn't have (purple, orange…) and generic colour words.
      {
        name: 'palette-unknown',
        match: /\b(colour|color|palette|tint|hue|paint|recolo(?:u)?r|theme|shade|mood|vibe|tone|purple|violet|orange|beige|grey|gray|silver|white)\b/i,
        build: () => ({
          type: 'help',
          payload: {},
          reply:
            'Orlando has ten palettes: tomato (red), rosa (pink), lemon (yellow), espresso (brown), ' +
            'seaside (blue), olive (green), pistacchio (mint), notte (dark), vino (wine), inchiostro (ink navy). ' +
            'Which feels closest? Or say "surprise me" and Orlando will pick.'
        })
      },
      // --- Context-aware bare size comparatives ---
      // If the user just asked for "bigger titles" and now says "even
      // bigger" or just "bigger", there's no axis in the text — but
      // the last intent's axis is known to the controller and passed
      // through as `lastAxis`. When that's title-scale or body-scale,
      // this intent claims the comparative and applies another step.
      // When no usable context exists, build returns null so the
      // parser falls through to the generic size-unknown help intent
      // below.
      {
        name: 'size-bare-contextual',
        match: /\b(bigger|larger|smaller|tinier|huge|tiny|grand|louder|punchier|quieter|softer|subtler|even\s+(?:bigger|larger|smaller|tinier|louder|quieter))\b/i,
        build: (m, _state, context) => {
          const axis = context && context.lastAxis;
          const isGrowing = /\b(bigger|larger|huge|grand|louder|punchier|even\s+(?:bigger|larger|louder))\b/i.test(m[0]);
          if (axis === 'title-scale') {
            return {
              type: 'scale',
              payload: { titleDelta: isGrowing ? 0.15 : -0.15 },
              reply: isGrowing
                ? 'Orlando pushes the headline another notch up.'
                : 'Orlando dials the headline another notch down.'
            };
          }
          if (axis === 'body-scale') {
            return {
              type: 'scale',
              payload: { bodyDelta: isGrowing ? 0.1 : -0.1 },
              reply: isGrowing
                ? 'Orlando opens the body text a little wider.'
                : 'Orlando tightens the body text a little more.'
            };
          }
          // No usable context — bail so the next intent (size-unknown
          // help reply) can claim the input.
          return null;
        }
      },

      // --- Generic size fallback (broadest — must come last) ---
      // Fires on bare "bigger"/"smaller" etc. when no typography or
      // spacing target accompanies the request AND no last-axis
      // context is available.
      {
        name: 'size-unknown',
        match: /\b(bigger|larger|huge|smaller|tinier|tiny|big|small|size|scale|grow|shrink|gigantic|dramatic|grand|louder|stronger|punchier|quieter|softer|subtle|understated)\b/i,
        build: () => ({
          type: 'help',
          payload: {},
          reply:
            'Orlando can scale a few things. Try "bigger titles", "smaller body text", ' +
            '"roomier spacing", or "tighter spacing".'
        })
      }
    ];

    /**
     * Replies for unknown input.
     * Rotates to avoid sounding robotic and nudges the user toward Orlando's
     * actual capabilities rather than just saying "didn't understand".
     */
    this.unknownReplies = [
      'Orlando isn\'t quite sure. Try "make it blue", "use a serif headline", "roomier spacing", or "surprise me".',
      'Orlando missed that one. Orlando works with palettes ("go rosa"), typography ("modern font"), and spacing ("tighter") — or type "help" for the full list.',
      'Orlando couldn\'t place that. Orlando\'s comfort zone is colour, type, and layout. Try "candlelit notte", "bigger titles", or "rename it to Bella".'
    ];
    this.unknownIndex = 0;

    /**
     * Count of consecutive unknown replies. Used to upgrade the reply
     * after the second miss from a gentle "didn't catch that" to an
     * explicit pointer at `help` + the chip row. Resets the moment
     * any intent actually matches.
     */
    this.unknownStreak = 0;
  }

  /**
   * Parse a user message into an intent.
   * @param {string} text - Raw user input.
   * @param {object} [state] - Optional snapshot of the current preview
   *   state, used by state-aware intents (e.g. surprise-me) to avoid
   *   producing no-ops.
   * @returns {{type: string, payload: object, reply: string}} Intent descriptor.
   */
  parse(text, state = null, lastAxis = null) {
    const normalized = (text || '').trim();

    if (!normalized) {
      return {
        type: 'noop',
        payload: {},
        reply: 'Orlando is listening — what should Orlando try?'
      };
    }

    // Layered matching: try the original text first so deliberate
    // phrasings (renames, exact palette words, etc.) always win. If
    // nothing matches, fall back to progressively more forgiving
    // rewrites — spell-corrected, then conversational-normalised, then
    // both. First intent to match on any candidate wins.
    const spellCorrected = this.correctSpelling(normalized);
    const desireNormalized = this.normalizeDesire(normalized);
    const bothNormalized = this.normalizeDesire(spellCorrected);

    const candidates = [normalized];
    for (const candidate of [spellCorrected, desireNormalized, bothNormalized]) {
      if (candidate && !candidates.includes(candidate)) {
        candidates.push(candidate);
      }
    }

    // Bundle state + lastAxis into a single context object for build
    // functions. Contextual intents (bare comparatives that need the
    // last-edited axis to resolve) read `lastAxis` to decide whether
    // to claim the match or bail.
    const context = { state, lastAxis };

    for (const candidate of candidates) {
      for (const intent of this.intents) {
        const match = candidate.match(intent.match);
        if (match) {
          // build() can return null to signal "this intent doesn't
          // apply in the current context — try the next one". Used
          // by the contextual bare-size intent: it only claims the
          // match when lastAxis is title-scale or body-scale.
          const built = intent.build(match, state, context);
          if (built) {
            this.unknownStreak = 0;
            return built;
          }
        }
      }
    }

    // Nothing matched — emit an unknown reply. The second consecutive
    // miss gets upgraded to an explicit "type help" nudge so users
    // bouncing off the parser's vocabulary get a clear next step.
    this.unknownStreak += 1;
    const reply = this.unknownStreak >= 2
      ? 'Orlando is stuck on that one — try typing "help" to see everything Orlando can do, or click one of the suggestions below.'
      : this.nextUnknownReply();
    return {
      type: 'unknown',
      payload: {},
      reply
    };
  }

  /**
   * Rebuild a string with well-known misspellings swapped for their
   * canonical form. Word boundaries are preserved so "pappardelle"
   * inside "add some pappardelle please" still survives when nothing
   * in the map matches.
   * @param {string} text
   * @returns {string}
   */
  correctSpelling(text) {
    return text.split(/(\W+)/).map((token) => {
      const correction = this.spellingCorrections[token.toLowerCase()];
      return correction || token;
    }).join('');
  }

  /**
   * Describe the current palette. Used by the query-palette intent.
   * @param {object|null} state - Preview state snapshot.
   * @returns {string}
   */
  describePalette(state) {
    if (!state || !state.palette) return 'Orlando has no palette read yet — ask again once the preview is ready.';
    const label = this.paletteLabels[state.palette] || state.palette;
    return `The palette is ${label} (${state.palette}).`;
  }

  /**
   * Describe the current typography family.
   */
  describeFont(state) {
    if (!state || !state.font) return 'Orlando has no typography read yet.';
    const label = this.fontLabels[state.font] || state.font;
    return `The typography is ${label}.`;
  }

  /**
   * Describe the current layout — menu grid, hero alignment, and dish
   * card orientation in one sentence.
   */
  describeLayout(state) {
    if (!state) return 'Orlando has no layout read yet.';
    const menu = this.menuLabels[state.menu] || state.menu;
    const dish = this.dishLabels[state.dish] || state.dish;
    const hero = this.heroLabels[state.hero] || state.hero;
    return `Menu is in ${menu}, dishes are ${dish}, and the hero is ${hero}.`;
  }

  /**
   * Describe which courses are on offer right now.
   */
  describeCourses(state) {
    if (!state) return 'Orlando has no course read yet.';
    const on = [];
    if (state.starters) on.push('antipasti');
    if (state.mains) on.push('mains');
    if (state.desserts) on.push('dolci');
    if (on.length === 0) return 'The menu is empty at the moment — try "full menu" or "only starters".';
    if (on.length === 3) return 'The full menu is out: antipasti, mains, and dolci.';
    if (on.length === 1) return `Only the ${on[0]} are on the table.`;
    return `On the table right now: ${on.slice(0, -1).join(', ')} and ${on[on.length - 1]}.`;
  }

  /**
   * Enumerate available palettes. Used by the list-palettes intent for
   * "what palettes are there" style queries.
   */
  listPalettes() {
    return (
      'Orlando has ten palettes. ' +
      'Light & warm: tomato (red), rosa (pink), lemon (yellow), espresso (brown). ' +
      'Cool & fresh: seaside (blue), olive (green), pistacchio (mint). ' +
      'Dark & deep: notte (candlelit dark), vino (wine burgundy), inchiostro (ink navy). ' +
      'Try "make it red", "go dark blue", "pistachio", or "surprise me".'
    );
  }

  /**
   * Enumerate the available typography families.
   */
  listFonts() {
    return (
      'Three typography families: serif (classic Georgia, editorial), ' +
      'sans (clean Helvetica, neutral), or modern (Inter, contemporary). ' +
      'Try "use a serif headline", "switch to modern", or "clean sans-serif".'
    );
  }

  /**
   * Enumerate the available layout knobs — menu grid, dish orientation,
   * and hero alignment all in one answer.
   */
  listLayouts() {
    return (
      'Three menu layouts: the default three-column grid, ' +
      'a single-column list ("stack the menu"), or two wider columns ("gallery menu"). ' +
      'Also "inline dishes" for photo-left cards and "left-align the hero" for a more editorial title.'
    );
  }

  /**
   * Enumerate the three courses and how to toggle them.
   */
  listCourses() {
    return (
      'Three courses: antipasti (starters), secondi (mains, on by default), and dolci (desserts). ' +
      'Try "add starters", "only desserts", "remove mains", or "full menu".'
    );
  }

  /**
   * Describe the full composition — palette, typography, and layout —
   * in a single overview. Used by the query-state intent for "what's
   * the current state?" / "tell me everything".
   */
  describeState(state) {
    if (!state) return 'Orlando has no state read yet.';
    const palette = this.paletteLabels[state.palette] || state.palette;
    const font = this.fontLabels[state.font] || state.font;
    const menu = this.menuLabels[state.menu] || state.menu;
    const dish = this.dishLabels[state.dish] || state.dish;
    const hero = this.heroLabels[state.hero] || state.hero;
    const courses = [];
    if (state.starters) courses.push('antipasti');
    if (state.mains) courses.push('mains');
    if (state.desserts) courses.push('dolci');
    const coursesText = courses.length === 0
      ? 'no courses on the table'
      : courses.length === 3
        ? 'full three-course menu'
        : courses.join(' + ');
    return (
      `Right now — ${palette} palette, ${font}, ` +
      `menu in ${menu}, dishes ${dish}, hero ${hero}, ${coursesText}.`
    );
  }

  /**
   * Rewrite conversational request phrasings into the imperative form
   * Orlando's intent regexes expect.
   *
   * Examples:
   *   "I want desserts"           → "add desserts"
   *   "I'd like some antipasti"   → "add some antipasti"
   *   "Can I have the full menu"  → "add the full menu"
   *   "Let's try a serif"         → "add a serif"
   *   "How about rosa"            → "add rosa"
   *   "I don't want mains"        → "remove mains"
   *   "Hey Orlando, make it blue" → "make it blue"
   *   "I want to reset"           → "reset"
   *
   * Runs after spell correction fails, so "I want deserts" still lands
   * on the desserts-add intent.
   * @param {string} text
   * @returns {string}
   */
  normalizeDesire(text) {
    let result = text;

    // Strip casual address and politeness prefixes first so later
    // rewrites see a clean leading verb.
    result = result.replace(/^(?:hey\s+|hi\s+|hello\s+)?orlando[,.]?\s+/i, '');
    result = result.replace(/^(?:please|pls)[,.]?\s+/i, '');

    // "I want/need/would like to [verb] X" — strip the desire preface,
    // leaving the real action verb to match an existing intent.
    result = result.replace(
      /^(?:i\s+(?:would\s+like|'?d\s+like|want|need|wish)|could\s+(?:i|we|you)|can\s+(?:i|we|you))\s+to\s+/i,
      ''
    );

    // Bare request forms become "add X". Courses, palettes, and layout
    // intents with noun-only keywords now parse cleanly.
    result = result.replace(
      /^(?:i\s+(?:would\s+like|'?d\s+like|want|need|wish|'?ll\s+(?:take|have))|(?:can|could|may)\s+(?:i|we|you)\s+(?:please\s+)?(?:have|get|try)|give\s+me|let\s+me\s+(?:have|try)|let'?s\s+(?:have|try|go\s+with)|(?:how|what)\s+about)\s+/i,
      'add '
    );

    // Negated desires become "remove X" so course/mains toggles work.
    result = result.replace(/^i\s+don'?t\s+(?:want|need|like|have)\s+/i, 'remove ');

    return result.trim();
  }

  /**
   * Rotate through the unknown-input replies so repeated mismatches
   * don't feel mechanical.
   * @returns {string} The next unknown reply.
   */
  nextUnknownReply() {
    const reply = this.unknownReplies[this.unknownIndex];
    this.unknownIndex = (this.unknownIndex + 1) % this.unknownReplies.length;
    return reply;
  }
}
