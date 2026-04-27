/*
  KS Simple Swipe Card
  Lightweight Home Assistant Lovelace swipe card with enhanced editor UI.
*/

class KSSimpleSwipeCard extends HTMLElement {
  static getStubConfig() {
    return {
      show_dots: true,
      gap: '10px',
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
      throw new Error('ks-simple-swipe-card requires a cards array');
    }

    this.config = {
      show_dots: config.show_dots !== false,
      gap: config.gap || '10px',
      height: config.height || 'auto',
      cards: config.cards,
    };
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

  async render() {
    const helpers = await window.loadCardHelpers();

    this.innerHTML = '';
    this.childCards = [];

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
    `;

    const wrapper = document.createElement('ha-card');
    wrapper.classList.add('ks-wrapper');

    const scroller = document.createElement('div');
    scroller.classList.add('ks-scroller');

    const dots = document.createElement('div');
    dots.classList.add('ks-dots');

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
        if (index === 0) dot.classList.add('active');
        dot.addEventListener('click', () => {
          scroller.scrollTo({
            left: index * scroller.clientWidth,
            behavior: 'smooth',
          });
        });
        dots.appendChild(dot);
      }
    });

    scroller.addEventListener('scroll', () => {
      if (!this.config.show_dots) return;
      const index = Math.round(scroller.scrollLeft / scroller.clientWidth);
      dots.querySelectorAll('.ks-dot').forEach((dot, dotIndex) => {
        dot.classList.toggle('active', dotIndex === index);
      });
    });

    wrapper.appendChild(scroller);
    if (this.config.show_dots) wrapper.appendChild(dots);

    this.appendChild(style);
    this.appendChild(wrapper);
    this._rendered = true;
  }

  getCardSize() {
    return Math.max(1, this.config?.cards?.length || 1);
  }
}

class KSSimpleSwipeCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = {
      show_dots: true,
      gap: '10px',
      height: 'auto',
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
      const heading = (card.cards || []).find((c) => c.heading || c.title);
      if (heading) return heading.heading || heading.title;
    }
    if (card.type === 'grid') return `Grid slide ${index + 1}`;
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
          cards: [
            {
              type: 'entity',
              entity: 'sensor.example',
              name: 'Example sensor',
            },
          ],
        };

      case 'room-sensors':
        return {
          type: 'vertical-stack',
          cards: [
            {
              type: 'heading',
              heading: 'Room Sensors',
              heading_style: 'subtitle',
              icon: 'mdi:home-thermometer-outline',
            },
            {
              type: 'heading',
              heading: 'Device Name',
              heading_style: 'section',
              icon: 'mdi:air-filter',
            },
            {
              type: 'grid',
              columns: 2,
              square: false,
              cards: [
                {
                  type: 'custom:mushroom-entity-card',
                  entity: 'sensor.example_temperature',
                  name: 'Temperature',
                  icon: 'mdi:thermometer',
                  primary_info: 'state',
                  secondary_info: 'name',
                },
                {
                  type: 'custom:mushroom-entity-card',
                  entity: 'sensor.example_humidity',
                  name: 'Humidity',
                  icon: 'mdi:water-percent',
                  primary_info: 'state',
                  secondary_info: 'name',
                },
              ],
            },
          ],
        };

      case 'lights':
        return {
          type: 'vertical-stack',
          cards: [
            {
              type: 'heading',
              heading: 'Lights',
              heading_style: 'subtitle',
              icon: 'mdi:lightbulb-group',
            },
            {
              type: 'grid',
              columns: 2,
              square: false,
              cards: [
                {
                  type: 'custom:mushroom-light-card',
                  entity: 'light.example',
                  name: 'Example Light',
                  show_brightness_control: true,
                  collapsible_controls: true,
                  use_light_color: true,
                },
              ],
            },
          ],
        };

      default:
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
      </div>
      <label class="ks-toggle-row">
        <span>
          <strong>Show dots</strong>
          <small>Display pagination dots under the swipe area.</small>
        </span>
        <input type="checkbox" data-field="show_dots" ${this._config.show_dots !== false ? 'checked' : ''} />
      </label>
    `;

    section.querySelector('[data-field="gap"]').addEventListener('change', (ev) => {
      this._updateRoot('gap', ev.target.value || '10px');
    });

    section.querySelector('[data-field="height"]').addEventListener('change', (ev) => {
      this._updateRoot('height', ev.target.value || 'auto');
    });

    section.querySelector('[data-field="show_dots"]').addEventListener('change', (ev) => {
      this._updateRoot('show_dots', ev.target.checked);
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
          <option value="vertical-stack">Blank vertical stack</option>
          <option value="entities">Entities card</option>
          <option value="grid">Grid card</option>
          <option value="room-sensors">Room sensors template</option>
          <option value="lights">Lights template</option>
        </select>
        <button class="ks-button primary" data-add>Add slide</button>
      </div>
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
          <button type="button" data-action="up">↑</button>
          <button type="button" data-action="down">↓</button>
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
        margin-top: 14px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .ks-toggle-row small {
        display: block;
        margin-top: 3px;
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
  description: 'Lightweight swipe/slider card with an enhanced editor UI.',
  preview: true,
});
