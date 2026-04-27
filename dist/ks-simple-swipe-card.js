/*
  KS Simple Swipe Card
  Lightweight generic Home Assistant Lovelace swipe/slider card.
  Includes a HACS-friendly visual editor for slide management.
*/

const KS_SWIPE_CARD_VERSION = '0.3.0';

class KSSimpleSwipeCard extends HTMLElement {
  static getStubConfig() {
    return {
      show_dots: true,
      show_arrows: false,
      gap: '10px',
      height: 'auto',
      slide_width: '100%',
      dot_position: 'bottom',
      cards: [
        {
          type: 'entities',
          title: 'Slide 1',
          entities: [],
        },
      ],
    };
  }

  static getConfigElement() {
    return document.createElement('ks-simple-swipe-card-editor');
  }

  setConfig(config) {
    if (!config.cards || !Array.isArray(config.cards)) {
      throw new Error('ks-simple-swipe-card requires a cards array');
    }

    this.config = {
      show_dots: config.show_dots !== false,
      show_arrows: config.show_arrows === true,
      gap: config.gap || '10px',
      height: config.height || 'auto',
      slide_width: config.slide_width || '100%',
      dot_position: config.dot_position || 'bottom',
      cards: config.cards,
    };

    this._rendered = false;
  }

  set hass(hass) {
    this._hass = hass;

    if (!this._rendered) {
      this.render();
    }

    if (this.childCards) {
      this.childCards.forEach((card) => {
        card.hass = hass;
      });
    }
  }

  _currentIndex(scroller) {
    return Math.round(scroller.scrollLeft / scroller.clientWidth);
  }

  _scrollTo(scroller, index) {
    scroller.scrollTo({
      left: index * scroller.clientWidth,
      behavior: 'smooth',
    });
  }

  async render() {
    const helpers = await window.loadCardHelpers();

    this.innerHTML = '';
    this.childCards = [];

    const style = document.createElement('style');
    style.textContent = `
      .ks-wrapper {
        position: relative;
        background: transparent;
        box-shadow: none;
        border: none;
        overflow: hidden;
      }

      .ks-main {
        position: relative;
      }

      .ks-scroller {
        display: flex;
        gap: ${this.config.gap};
        overflow-x: auto;
        overflow-y: hidden;
        scroll-snap-type: x mandatory;
        scroll-behavior: smooth;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
        height: ${this.config.height};
      }

      .ks-scroller::-webkit-scrollbar {
        display: none;
      }

      .ks-slide {
        flex: 0 0 ${this.config.slide_width};
        min-width: ${this.config.slide_width};
        scroll-snap-align: start;
        box-sizing: border-box;
      }

      .ks-dots {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 6px;
        padding: 8px 0 2px;
      }

      .ks-dot {
        width: 7px;
        height: 7px;
        border-radius: 999px;
        border: none;
        padding: 0;
        background: rgba(var(--rgb-primary-text-color), 0.25);
        cursor: pointer;
        transition: width 160ms ease, background 160ms ease;
      }

      .ks-dot.active {
        background: var(--primary-color);
        width: 18px;
      }

      .ks-arrow {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        z-index: 3;
        width: 36px;
        height: 36px;
        border-radius: 999px;
        border: none;
        background: rgba(var(--rgb-card-background-color), 0.82);
        color: var(--primary-text-color);
        box-shadow: var(--ha-card-box-shadow, 0 2px 8px rgba(0,0,0,0.18));
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
      }

      .ks-arrow.prev {
        left: 8px;
      }

      .ks-arrow.next {
        right: 8px;
      }

      .ks-arrow[disabled] {
        opacity: 0.35;
        pointer-events: none;
      }
    `;

    const wrapper = document.createElement('ha-card');
    wrapper.classList.add('ks-wrapper');

    const main = document.createElement('div');
    main.classList.add('ks-main');

    const scroller = document.createElement('div');
    scroller.classList.add('ks-scroller');

    const dots = document.createElement('div');
    dots.classList.add('ks-dots');

    const prev = document.createElement('button');
    prev.className = 'ks-arrow prev';
    prev.type = 'button';
    prev.textContent = '‹';

    const next = document.createElement('button');
    next.className = 'ks-arrow next';
    next.type = 'button';
    next.textContent = '›';

    this.config.cards.forEach((cardConfig, index) => {
      const slide = document.createElement('div');
      slide.classList.add('ks-slide');

      const card = helpers.createCardElement(cardConfig);
      card.hass = this._hass;
      this.childCards.push(card);

      slide.appendChild(card);
      scroller.appendChild(slide);

      if (this.config.show_dots) {
        const dot = document.createElement('button');
        dot.classList.add('ks-dot');
        dot.type = 'button';
        if (index === 0) dot.classList.add('active');
        dot.addEventListener('click', () => this._scrollTo(scroller, index));
        dots.appendChild(dot);
      }
    });

    const updateControls = () => {
      const index = this._currentIndex(scroller);

      if (this.config.show_dots) {
        dots.querySelectorAll('.ks-dot').forEach((dot, dotIndex) => {
          dot.classList.toggle('active', dotIndex === index);
        });
      }

      if (this.config.show_arrows) {
        prev.disabled = index <= 0;
        next.disabled = index >= this.config.cards.length - 1;
      }
    };

    scroller.addEventListener('scroll', () => window.requestAnimationFrame(updateControls));

    prev.addEventListener('click', () => {
      this._scrollTo(scroller, Math.max(0, this._currentIndex(scroller) - 1));
    });

    next.addEventListener('click', () => {
      this._scrollTo(scroller, Math.min(this.config.cards.length - 1, this._currentIndex(scroller) + 1));
    });

    main.appendChild(scroller);

    if (this.config.show_arrows && this.config.cards.length > 1) {
      main.appendChild(prev);
      main.appendChild(next);
    }

    if (this.config.show_dots && this.config.dot_position === 'top') wrapper.appendChild(dots);
    wrapper.appendChild(main);
    if (this.config.show_dots && this.config.dot_position !== 'top') wrapper.appendChild(dots);

    this.appendChild(style);
    this.appendChild(wrapper);
    this._rendered = true;
    window.requestAnimationFrame(updateControls);
  }

  getCardSize() {
    return Math.max(1, this.config?.cards?.length || 1);
  }
}

class KSSimpleSwipeCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = {
      show_dots: true,
      show_arrows: false,
      gap: '10px',
      height: 'auto',
      slide_width: '100%',
      dot_position: 'bottom',
      cards: [],
      ...config,
    };
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
  }

  _fireConfigChanged(config) {
    this._config = config;
    this.dispatchEvent(
      new CustomEvent('config-changed', {
        detail: { config },
        bubbles: true,
        composed: true,
      })
    );
    this.render();
  }

  _updateRoot(key, value) {
    this._fireConfigChanged({
      ...this._config,
      [key]: value,
    });
  }

  _getSlideTitle(card, index) {
    if (card.title) return card.title;
    if (card.heading) return card.heading;
    if (card.name) return card.name;
    if (card.type === 'vertical-stack') {
      const heading = (card.cards || []).find((c) => c.heading || c.title || c.name);
      if (heading) return heading.heading || heading.title || heading.name;
    }
    if (card.type === 'grid') return `Grid slide ${index + 1}`;
    if (card.type === 'entities') return card.title || `Entities slide ${index + 1}`;
    return `Slide ${index + 1}`;
  }

  _template(type) {
    switch (type) {
      case 'entities':
        return {
          type: 'entities',
          title: 'New entities slide',
          entities: [],
        };

      case 'grid':
        return {
          type: 'grid',
          columns: 2,
          square: false,
          cards: [],
        };

      case 'markdown':
        return {
          type: 'markdown',
          content: '## New slide\nAdd your content here.',
        };

      case 'vertical-stack':
        return {
          type: 'vertical-stack',
          cards: [
            {
              type: 'heading',
              heading: 'New Slide',
              heading_style: 'subtitle',
            },
          ],
        };

      default:
        return {
          type: 'vertical-stack',
          cards: [],
        };
    }
  }

  _addSlide(type) {
    const cards = [...(this._config.cards || [])];
    cards.push(this._template(type));
    this._fireConfigChanged({ ...this._config, cards });
  }

  _deleteSlide(index) {
    const cards = [...(this._config.cards || [])];
    cards.splice(index, 1);
    this._fireConfigChanged({ ...this._config, cards });
  }

  _duplicateSlide(index) {
    const cards = [...(this._config.cards || [])];
    cards.splice(index + 1, 0, JSON.parse(JSON.stringify(cards[index])));
    this._fireConfigChanged({ ...this._config, cards });
  }

  _moveSlide(index, direction) {
    const cards = [...(this._config.cards || [])];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= cards.length) return;
    const [item] = cards.splice(index, 1);
    cards.splice(newIndex, 0, item);
    this._fireConfigChanged({ ...this._config, cards });
  }

  _updateSlide(index, value, errorEl) {
    try {
      const parsed = JSON.parse(value);
      const cards = [...(this._config.cards || [])];
      cards[index] = parsed;
      errorEl.textContent = '';
      this._fireConfigChanged({ ...this._config, cards });
    } catch (err) {
      errorEl.textContent = `Invalid JSON: ${err.message}`;
    }
  }

  _formatSlide(index, textarea, errorEl) {
    try {
      const parsed = JSON.parse(textarea.value);
      textarea.value = JSON.stringify(parsed, null, 2);
      this._updateSlide(index, textarea.value, errorEl);
    } catch (err) {
      errorEl.textContent = `Invalid JSON: ${err.message}`;
    }
  }

  _renderSettings() {
    const section = document.createElement('div');
    section.className = 'ks-editor-section';

    section.innerHTML = `
      <div class="ks-section-title">Swipe Settings</div>

      <div class="ks-settings-grid">
        <label>
          <span>Gap between slides</span>
          <input class="ks-input" data-field="gap" value="${this._config.gap || '10px'}" placeholder="10px" />
        </label>

        <label>
          <span>Height</span>
          <input class="ks-input" data-field="height" value="${this._config.height || 'auto'}" placeholder="auto / 400px / 60vh" />
        </label>

        <label>
          <span>Slide width</span>
          <input class="ks-input" data-field="slide_width" value="${this._config.slide_width || '100%'}" placeholder="100% / 80% / 320px" />
        </label>

        <label>
          <span>Dot position</span>
          <select class="ks-input" data-field="dot_position">
            <option value="bottom" ${this._config.dot_position !== 'top' ? 'selected' : ''}>Bottom</option>
            <option value="top" ${this._config.dot_position === 'top' ? 'selected' : ''}>Top</option>
          </select>
        </label>
      </div>

      <div class="ks-toggle-grid">
        <label class="ks-toggle-row">
          <span>
            <strong>Show dots</strong>
            <small>Display pagination dots.</small>
          </span>
          <input type="checkbox" data-field="show_dots" ${this._config.show_dots !== false ? 'checked' : ''} />
        </label>

        <label class="ks-toggle-row">
          <span>
            <strong>Show arrows</strong>
            <small>Display previous and next buttons.</small>
          </span>
          <input type="checkbox" data-field="show_arrows" ${this._config.show_arrows === true ? 'checked' : ''} />
        </label>
      </div>
    `;

    section.querySelector('[data-field="gap"]').addEventListener('change', (ev) => {
      this._updateRoot('gap', ev.target.value || '10px');
    });

    section.querySelector('[data-field="height"]').addEventListener('change', (ev) => {
      this._updateRoot('height', ev.target.value || 'auto');
    });

    section.querySelector('[data-field="slide_width"]').addEventListener('change', (ev) => {
      this._updateRoot('slide_width', ev.target.value || '100%');
    });

    section.querySelector('[data-field="dot_position"]').addEventListener('change', (ev) => {
      this._updateRoot('dot_position', ev.target.value || 'bottom');
    });

    section.querySelector('[data-field="show_dots"]').addEventListener('change', (ev) => {
      this._updateRoot('show_dots', ev.target.checked);
    });

    section.querySelector('[data-field="show_arrows"]').addEventListener('change', (ev) => {
      this._updateRoot('show_arrows', ev.target.checked);
    });

    return section;
  }

  _renderAddSlide() {
    const section = document.createElement('div');
    section.className = 'ks-editor-section';

    section.innerHTML = `
      <div class="ks-section-title">Add Slide</div>
      <div class="ks-add-row">
        <select class="ks-input" data-template>
          <option value="vertical-stack">Vertical stack</option>
          <option value="grid">Grid</option>
          <option value="entities">Entities</option>
          <option value="markdown">Markdown</option>
        </select>
        <button class="ks-button primary" type="button" data-add>Add slide</button>
      </div>
      <div class="ks-helper">Templates are generic so this card can be reused across any Home Assistant dashboard.</div>
    `;

    section.querySelector('[data-add]').addEventListener('click', () => {
      const type = section.querySelector('[data-template]').value;
      this._addSlide(type);
    });

    return section;
  }

  _renderSlide(card, index) {
    const wrap = document.createElement('details');
    wrap.className = 'ks-slide-editor';
    if (index === 0) wrap.open = true;

    const title = this._getSlideTitle(card, index);

    const summary = document.createElement('summary');
    summary.innerHTML = `
      <div class="ks-slide-summary">
        <div>
          <strong>${index + 1}. ${title}</strong>
          <small>${card.type || 'unknown card'}</small>
        </div>
        <div class="ks-actions">
          <button type="button" data-action="up" title="Move up">↑</button>
          <button type="button" data-action="down" title="Move down">↓</button>
          <button type="button" data-action="duplicate">Duplicate</button>
          <button type="button" class="danger" data-action="delete">Delete</button>
        </div>
      </div>
    `;

    const body = document.createElement('div');
    body.className = 'ks-slide-body';

    const textarea = document.createElement('textarea');
    textarea.value = JSON.stringify(card, null, 2);

    const footer = document.createElement('div');
    footer.className = 'ks-slide-footer';

    const error = document.createElement('div');
    error.className = 'ks-error';

    const formatButton = document.createElement('button');
    formatButton.type = 'button';
    formatButton.textContent = 'Format JSON';
    formatButton.className = 'ks-button';

    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.textContent = 'Apply slide changes';
    saveButton.className = 'ks-button primary';

    formatButton.addEventListener('click', () => this._formatSlide(index, textarea, error));
    saveButton.addEventListener('click', () => this._updateSlide(index, textarea.value, error));

    summary.querySelector('[data-action="up"]').addEventListener('click', (ev) => {
      ev.preventDefault();
      this._moveSlide(index, -1);
    });

    summary.querySelector('[data-action="down"]').addEventListener('click', (ev) => {
      ev.preventDefault();
      this._moveSlide(index, 1);
    });

    summary.querySelector('[data-action="duplicate"]').addEventListener('click', (ev) => {
      ev.preventDefault();
      this._duplicateSlide(index);
    });

    summary.querySelector('[data-action="delete"]').addEventListener('click', (ev) => {
      ev.preventDefault();
      this._deleteSlide(index);
    });

    footer.appendChild(error);
    footer.appendChild(formatButton);
    footer.appendChild(saveButton);

    body.appendChild(textarea);
    body.appendChild(footer);

    wrap.appendChild(summary);
    wrap.appendChild(body);

    return wrap;
  }

  render() {
    if (!this._config) return;

    this.innerHTML = '';

    const style = document.createElement('style');
    style.textContent = `
      .ks-editor {
        display: grid;
        gap: 14px;
      }

      .ks-editor-section,
      .ks-slide-editor {
        border-radius: 18px;
        padding: 14px;
        background: var(--card-background-color);
        border: 1px solid var(--divider-color);
        box-shadow: 0 2px 10px rgba(0,0,0,0.04);
      }

      .ks-section-title {
        font-size: 16px;
        font-weight: 700;
        margin-bottom: 12px;
      }

      .ks-settings-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .ks-toggle-grid {
        display: grid;
        gap: 10px;
        margin-top: 14px;
      }

      label {
        display: grid;
        gap: 6px;
        color: var(--secondary-text-color);
        font-size: 13px;
      }

      .ks-input,
      textarea,
      select {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid var(--divider-color);
        border-radius: 12px;
        padding: 10px;
        background: var(--secondary-background-color);
        color: var(--primary-text-color);
      }

      .ks-toggle-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .ks-toggle-row small,
      .ks-helper {
        display: block;
        margin-top: 3px;
        color: var(--secondary-text-color);
        font-size: 12px;
        line-height: 1.35;
      }

      .ks-add-row {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 10px;
      }

      summary {
        cursor: pointer;
        list-style: none;
      }

      summary::-webkit-details-marker {
        display: none;
      }

      .ks-slide-summary {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .ks-slide-summary small {
        display: block;
        margin-top: 3px;
        color: var(--secondary-text-color);
      }

      .ks-actions {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        justify-content: flex-end;
      }

      button,
      .ks-button {
        border: none;
        border-radius: 10px;
        padding: 8px 10px;
        background: var(--secondary-background-color);
        color: var(--primary-text-color);
        cursor: pointer;
        font: inherit;
      }

      button.primary,
      .ks-button.primary {
        background: var(--primary-color);
        color: var(--text-primary-color);
      }

      button.danger {
        color: var(--error-color);
      }

      .ks-slide-body {
        margin-top: 12px;
      }

      textarea {
        min-height: 220px;
        resize: vertical;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 12px;
        line-height: 1.4;
      }

      .ks-slide-footer {
        margin-top: 10px;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
      }

      .ks-error {
        margin-right: auto;
        color: var(--error-color);
        font-size: 12px;
      }

      @media (max-width: 760px) {
        .ks-settings-grid,
        .ks-add-row {
          grid-template-columns: 1fr;
        }

        .ks-slide-summary {
          align-items: flex-start;
          flex-direction: column;
        }
      }
    `;

    const editor = document.createElement('div');
    editor.className = 'ks-editor';

    editor.appendChild(this._renderSettings());
    editor.appendChild(this._renderAddSlide());

    (this._config.cards || []).forEach((card, index) => {
      editor.appendChild(this._renderSlide(card, index));
    });

    this.appendChild(style);
    this.appendChild(editor);
  }
}

if (!customElements.get('ks-simple-swipe-card')) {
  customElements.define('ks-simple-swipe-card', KSSimpleSwipeCard);
}

if (!customElements.get('ks-simple-swipe-card-editor')) {
  customElements.define('ks-simple-swipe-card-editor', KSSimpleSwipeCardEditor);
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'ks-simple-swipe-card',
  name: 'KS Simple Swipe Card',
  description: 'Lightweight generic swipe/slider card with an enhanced editor UI.',
  preview: true,
});
