class KSSimpleSwipeCard extends HTMLElement {
  static getStubConfig() {
    return {
      show_dots: true,
      gap: '12px',
      height: 'auto',
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
      throw new Error('ks-simple-swipe-card requires a cards: array');
    }

    this.config = {
      height: config.height || 'auto',
      gap: config.gap || '12px',
      show_dots: config.show_dots !== false,
      cards: config.cards,
    };
  }

  set hass(hass) {
    this._hass = hass;

    if (!this.content) {
      this.render();
    }

    this.childCards?.forEach((card) => {
      card.hass = hass;
    });
  }

  async render() {
    const helpers = await window.loadCardHelpers();

    this.innerHTML = '';

    const style = document.createElement('style');
    style.textContent = `
      .ks-wrapper {
        background: transparent;
        box-shadow: none;
        border: none;
        overflow: hidden;
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
        flex: 0 0 100%;
        min-width: 100%;
        scroll-snap-align: start;
        box-sizing: border-box;
      }

      .ks-dots {
        display: flex;
        justify-content: center;
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
    `;

    const wrapper = document.createElement('ha-card');
    wrapper.classList.add('ks-wrapper');

    const scroller = document.createElement('div');
    scroller.classList.add('ks-scroller');

    this.childCards = [];

    this.config.cards.forEach((cardConfig, index) => {
      const slide = document.createElement('div');
      slide.classList.add('ks-slide');
      slide.dataset.index = index;

      const card = helpers.createCardElement(cardConfig);
      card.hass = this._hass;

      this.childCards.push(card);
      slide.appendChild(card);
      scroller.appendChild(slide);
    });

    const dots = document.createElement('div');
    dots.classList.add('ks-dots');

    if (this.config.show_dots) {
      this.config.cards.forEach((_, index) => {
        const dot = document.createElement('button');
        dot.classList.add('ks-dot');
        if (index === 0) dot.classList.add('active');
        dot.addEventListener('click', () => {
          scroller.scrollTo({
            left: index * scroller.clientWidth,
            behavior: 'smooth',
          });
        });
        dots.appendChild(dot);
      });
    }

    scroller.addEventListener('scroll', () => {
      const index = Math.round(scroller.scrollLeft / scroller.clientWidth);
      dots.querySelectorAll('.ks-dot').forEach((dot, dotIndex) => {
        dot.classList.toggle('active', dotIndex === index);
      });
    });

    wrapper.appendChild(scroller);
    if (this.config.show_dots) wrapper.appendChild(dots);

    this.appendChild(style);
    this.appendChild(wrapper);
    this.content = wrapper;
  }

  getCardSize() {
    return Math.max(1, this.config?.cards?.length || 1);
  }
}

class KSSimpleSwipeCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = {
      show_dots: true,
      gap: '12px',
      height: 'auto',
      cards: [],
      ...config,
    };
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    if (this._rendered) this.render();
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

  _updateValue(key, value) {
    this._fireConfigChanged({
      ...this._config,
      [key]: value,
    });
  }

  _updateCard(index, value) {
    let parsed;
    try {
      parsed = JSON.parse(value);
    } catch (err) {
      this._setError(index, 'Invalid JSON');
      return;
    }

    const cards = [...(this._config.cards || [])];
    cards[index] = parsed;
    this._fireConfigChanged({
      ...this._config,
      cards,
    });
  }

  _setError(index, message) {
    const error = this.querySelector(`[data-error-index="${index}"]`);
    if (error) error.textContent = message;
  }

  _addSlide() {
    const cards = [...(this._config.cards || [])];
    cards.push({
      type: 'entities',
      title: `Slide ${cards.length + 1}`,
      entities: [],
    });
    this._fireConfigChanged({
      ...this._config,
      cards,
    });
  }

  _removeSlide(index) {
    const cards = [...(this._config.cards || [])];
    cards.splice(index, 1);
    this._fireConfigChanged({
      ...this._config,
      cards,
    });
  }

  _moveSlide(index, direction) {
    const cards = [...(this._config.cards || [])];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= cards.length) return;
    const [card] = cards.splice(index, 1);
    cards.splice(newIndex, 0, card);
    this._fireConfigChanged({
      ...this._config,
      cards,
    });
  }

  _formatCard(card) {
    return JSON.stringify(card, null, 2);
  }

  render() {
    if (!this._config) return;

    this._rendered = true;
    this.innerHTML = '';

    const style = document.createElement('style');
    style.textContent = `
      .editor {
        display: grid;
        gap: 16px;
      }

      .section {
        border: 1px solid var(--divider-color);
        border-radius: 12px;
        padding: 12px;
        background: var(--card-background-color);
      }

      .section-title {
        font-weight: 600;
        margin-bottom: 10px;
      }

      .row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 12px;
      }

      label {
        display: grid;
        gap: 6px;
        font-size: 13px;
        color: var(--secondary-text-color);
      }

      input,
      textarea {
        width: 100%;
        box-sizing: border-box;
        border-radius: 8px;
        border: 1px solid var(--divider-color);
        padding: 9px;
        color: var(--primary-text-color);
        background: var(--secondary-background-color);
        font-family: var(--primary-font-family, sans-serif);
      }

      textarea {
        min-height: 180px;
        font-family: monospace;
        font-size: 12px;
        resize: vertical;
      }

      .toggle-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 12px;
      }

      .slide-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }

      .button-row {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      button {
        border: none;
        border-radius: 8px;
        padding: 8px 10px;
        cursor: pointer;
        color: var(--primary-text-color);
        background: var(--secondary-background-color);
      }

      button.primary {
        background: var(--primary-color);
        color: var(--text-primary-color);
      }

      button.danger {
        color: var(--error-color);
      }

      .error {
        color: var(--error-color);
        font-size: 12px;
        min-height: 16px;
        margin-top: 4px;
      }

      .hint {
        color: var(--secondary-text-color);
        font-size: 12px;
        line-height: 1.4;
      }
    `;

    const editor = document.createElement('div');
    editor.classList.add('editor');

    const settingsSection = document.createElement('div');
    settingsSection.classList.add('section');
    settingsSection.innerHTML = `
      <div class="section-title">Swipe Settings</div>
      <div class="row">
        <label>
          Gap between slides
          <input data-field="gap" value="${this._config.gap || '12px'}" placeholder="12px" />
        </label>
        <label>
          Height
          <input data-field="height" value="${this._config.height || 'auto'}" placeholder="auto / 400px / 60vh" />
        </label>
      </div>
      <div class="toggle-row">
        <div>
          <div>Show dots</div>
          <div class="hint">Adds pagination dots below the slider.</div>
        </div>
        <input data-field="show_dots" type="checkbox" ${this._config.show_dots !== false ? 'checked' : ''} />
      </div>
      <div class="hint">Cards are edited as JSON because Home Assistant does not expose a reusable built-in visual card picker for custom card editors.</div>
    `;

    settingsSection.querySelector('[data-field="gap"]').addEventListener('change', (ev) => {
      this._updateValue('gap', ev.target.value || '12px');
    });

    settingsSection.querySelector('[data-field="height"]').addEventListener('change', (ev) => {
      this._updateValue('height', ev.target.value || 'auto');
    });

    settingsSection.querySelector('[data-field="show_dots"]').addEventListener('change', (ev) => {
      this._updateValue('show_dots', ev.target.checked);
    });

    editor.appendChild(settingsSection);

    const slidesSection = document.createElement('div');
    slidesSection.classList.add('section');

    const title = document.createElement('div');
    title.classList.add('slide-header');
    title.innerHTML = `
      <div class="section-title">Slides</div>
      <button class="primary" type="button">Add slide</button>
    `;
    title.querySelector('button').addEventListener('click', () => this._addSlide());
    slidesSection.appendChild(title);

    (this._config.cards || []).forEach((card, index) => {
      const slide = document.createElement('div');
      slide.classList.add('section');
      slide.innerHTML = `
        <div class="slide-header">
          <strong>Slide ${index + 1}</strong>
          <div class="button-row">
            <button type="button" data-action="up">↑</button>
            <button type="button" data-action="down">↓</button>
            <button type="button" data-action="delete" class="danger">Delete</button>
          </div>
        </div>
        <textarea>${this._formatCard(card)}</textarea>
        <div class="error" data-error-index="${index}"></div>
      `;

      slide.querySelector('[data-action="up"]').addEventListener('click', () => this._moveSlide(index, -1));
      slide.querySelector('[data-action="down"]').addEventListener('click', () => this._moveSlide(index, 1));
      slide.querySelector('[data-action="delete"]').addEventListener('click', () => this._removeSlide(index));
      slide.querySelector('textarea').addEventListener('change', (ev) => this._updateCard(index, ev.target.value));

      slidesSection.appendChild(slide);
    });

    editor.appendChild(slidesSection);

    this.appendChild(style);
    this.appendChild(editor);
  }
}

customElements.define('ks-simple-swipe-card', KSSimpleSwipeCard);
customElements.define('ks-simple-swipe-card-editor', KSSimpleSwipeCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'ks-simple-swipe-card',
  name: 'KS Simple Swipe Card',
  description: 'Lightweight swipe/slider card with a basic visual editor.',
  preview: true,
});
