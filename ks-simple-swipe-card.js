/*
  KS Simple Swipe Card
  Lightweight generic Home Assistant Lovelace swipe/slider card.
  Self-contained HACS-friendly visual editor for slide management.
*/

const KS_SWIPE_CARD_VERSION = '0.4.0';

const KS_CARD_TYPES = [
  ['vertical-stack', 'Vertical stack'],
  ['grid', 'Grid'],
  ['entities', 'Entities'],
  ['markdown', 'Markdown'],
  ['heading', 'Heading'],
];

const KS_SIMPLE_CARD_TYPES = [
  ['tile', 'Tile'],
  ['button', 'Button'],
  ['entity', 'Entity'],
  ['entities', 'Entities'],
  ['markdown', 'Markdown'],
  ['heading', 'Heading'],
];

const ksClone = (value) => JSON.parse(JSON.stringify(value));

const ksEscape = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

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
    this.render();
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
      case 'button':
        return { type: 'button', name: 'New button', entity: '' };
      case 'tile':
        return { type: 'tile', name: 'New tile', entity: '' };
      case 'entity':
        return { type: 'entity', name: 'New entity', entity: '' };
      case 'entities':
        return { type: 'entities', title: 'New entities slide', entities: [] };
      case 'grid':
        return { type: 'grid', columns: 2, square: false, cards: [] };
      case 'markdown':
        return { type: 'markdown', content: '## New slide\nAdd your content here.' };
      case 'heading':
        return { type: 'heading', heading: 'New Slide', heading_style: 'subtitle' };
      case 'vertical-stack':
      default:
        return {
          type: 'vertical-stack',
          cards: [{ type: 'heading', heading: 'New Slide', heading_style: 'subtitle' }],
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
    cards.splice(index + 1, 0, ksClone(cards[index]));
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

  _updateSlide(index, patch) {
    const cards = [...(this._config.cards || [])];
    cards[index] = { ...cards[index], ...patch };
    this._fireConfigChanged({ ...this._config, cards });
  }

  _replaceSlide(index, card) {
    const cards = [...(this._config.cards || [])];
    cards[index] = card;
    this._fireConfigChanged({ ...this._config, cards });
  }

  _changeSlideType(index, type) {
    this._replaceSlide(index, this._template(type));
  }

  _updateNested(parentIndex, childIndex, patch) {
    const cards = [...(this._config.cards || [])];
    const parent = { ...cards[parentIndex], cards: [...(cards[parentIndex].cards || [])] };
    parent.cards[childIndex] = { ...parent.cards[childIndex], ...patch };
    cards[parentIndex] = parent;
    this._fireConfigChanged({ ...this._config, cards });
  }

  _replaceNested(parentIndex, childIndex, child) {
    const cards = [...(this._config.cards || [])];
    const parent = { ...cards[parentIndex], cards: [...(cards[parentIndex].cards || [])] };
    parent.cards[childIndex] = child;
    cards[parentIndex] = parent;
    this._fireConfigChanged({ ...this._config, cards });
  }

  _addNested(parentIndex, type) {
    const cards = [...(this._config.cards || [])];
    const parent = { ...cards[parentIndex], cards: [...(cards[parentIndex].cards || [])] };
    parent.cards.push(this._template(type));
    cards[parentIndex] = parent;
    this._fireConfigChanged({ ...this._config, cards });
  }

  _deleteNested(parentIndex, childIndex) {
    const cards = [...(this._config.cards || [])];
    const parent = { ...cards[parentIndex], cards: [...(cards[parentIndex].cards || [])] };
    parent.cards.splice(childIndex, 1);
    cards[parentIndex] = parent;
    this._fireConfigChanged({ ...this._config, cards });
  }

  _moveNested(parentIndex, childIndex, direction) {
    const cards = [...(this._config.cards || [])];
    const parent = { ...cards[parentIndex], cards: [...(cards[parentIndex].cards || [])] };
    const newIndex = childIndex + direction;
    if (newIndex < 0 || newIndex >= parent.cards.length) return;
    const [item] = parent.cards.splice(childIndex, 1);
    parent.cards.splice(newIndex, 0, item);
    cards[parentIndex] = parent;
    this._fireConfigChanged({ ...this._config, cards });
  }

  _entities(card) {
    return Array.isArray(card.entities) ? card.entities : [];
  }

  _entityValue(entity) {
    if (typeof entity === 'string') return entity;
    return entity?.entity || '';
  }

  _updateEntityList(path, entityIndex, value) {
    const next = this._entityListOwner(path);
    const entities = this._entities(next.card);
    entities[entityIndex] = value;
    next.update({ ...next.card, entities });
  }

  _addEntity(path) {
    const next = this._entityListOwner(path);
    const entities = [...this._entities(next.card), ''];
    next.update({ ...next.card, entities });
  }

  _deleteEntity(path, entityIndex) {
    const next = this._entityListOwner(path);
    const entities = [...this._entities(next.card)];
    entities.splice(entityIndex, 1);
    next.update({ ...next.card, entities });
  }

  _entityListOwner(path) {
    if (path.childIndex === undefined) {
      const card = this._config.cards[path.index];
      return { card, update: (updated) => this._replaceSlide(path.index, updated) };
    }

    const card = this._config.cards[path.index].cards[path.childIndex];
    return { card, update: (updated) => this._replaceNested(path.index, path.childIndex, updated) };
  }

  _renderOptions(options, current) {
    return options
      .map(([value, label]) => `<option value="${value}" ${value === current ? 'selected' : ''}>${label}</option>`)
      .join('');
  }

  _field(label, value, onChange, placeholder = '') {
    const field = document.createElement('label');
    field.innerHTML = `
      <span>${label}</span>
      <input class="ks-input" value="${ksEscape(value)}" placeholder="${ksEscape(placeholder)}" />
    `;
    field.querySelector('input').addEventListener('change', (ev) => onChange(ev.target.value));
    return field;
  }

  _select(label, options, value, onChange) {
    const field = document.createElement('label');
    field.innerHTML = `
      <span>${label}</span>
      <select class="ks-input">${this._renderOptions(options, value)}</select>
    `;
    field.querySelector('select').addEventListener('change', (ev) => onChange(ev.target.value));
    return field;
  }

  _checkbox(label, checked, onChange) {
    const field = document.createElement('label');
    field.className = 'ks-check-row';
    field.innerHTML = `
      <span>${label}</span>
      <input type="checkbox" ${checked ? 'checked' : ''} />
    `;
    field.querySelector('input').addEventListener('change', (ev) => onChange(ev.target.checked));
    return field;
  }

  _textarea(label, value, onChange, placeholder = '') {
    const field = document.createElement('label');
    field.className = 'ks-wide';
    field.innerHTML = `
      <span>${label}</span>
      <textarea class="ks-textarea" placeholder="${ksEscape(placeholder)}">${ksEscape(value)}</textarea>
    `;
    field.querySelector('textarea').addEventListener('change', (ev) => onChange(ev.target.value));
    return field;
  }

  _renderEntityPicker(value, onChange) {
    if (customElements.get('ha-entity-picker')) {
      const picker = document.createElement('ha-entity-picker');
      picker.hass = this._hass;
      picker.value = value || '';
      picker.allowCustomEntity = true;
      picker.addEventListener('value-changed', (ev) => onChange(ev.detail.value || ''));
      return picker;
    }

    const input = document.createElement('input');
    input.className = 'ks-input';
    input.value = value || '';
    input.placeholder = 'light.kitchen';
    input.addEventListener('change', (ev) => onChange(ev.target.value));
    return input;
  }

  _renderEntityField(label, value, onChange) {
    const field = document.createElement('label');
    field.innerHTML = `<span>${label}</span>`;
    field.appendChild(this._renderEntityPicker(value, onChange));
    return field;
  }

  _renderSettings() {
    const section = document.createElement('div');
    section.className = 'ks-editor-section';

    section.innerHTML = `
      <div class="ks-section-title">Swipe Settings</div>

      <div class="ks-settings-grid">
        <label>
          <span>Gap between slides</span>
          <input class="ks-input" data-field="gap" value="${ksEscape(this._config.gap || '10px')}" placeholder="10px" />
        </label>

        <label>
          <span>Height</span>
          <input class="ks-input" data-field="height" value="${ksEscape(this._config.height || 'auto')}" placeholder="auto / 400px / 60vh" />
        </label>

        <label>
          <span>Slide width</span>
          <input class="ks-input" data-field="slide_width" value="${ksEscape(this._config.slide_width || '100%')}" placeholder="100% / 80% / 320px" />
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
          ${this._renderOptions(KS_CARD_TYPES, 'vertical-stack')}
        </select>
        <button class="ks-button primary" type="button" data-add>Add slide</button>
      </div>
    `;

    section.querySelector('[data-add]').addEventListener('click', () => {
      const type = section.querySelector('[data-template]').value;
      this._addSlide(type);
    });

    return section;
  }

  _renderCommonEditor(card, update, path) {
    const fields = document.createElement('div');
    fields.className = 'ks-card-fields';

    if (['button', 'tile', 'entity'].includes(card.type)) {
      fields.appendChild(this._renderEntityField('Entity', card.entity, (entity) => update({ entity })));
      fields.appendChild(this._field('Name', card.name || '', (name) => update({ name }), 'Optional label'));
      fields.appendChild(this._field('Icon', card.icon || '', (icon) => update({ icon }), 'mdi:lightbulb'));
      return fields;
    }

    if (card.type === 'heading') {
      fields.appendChild(this._field('Heading', card.heading || '', (heading) => update({ heading }), 'Heading text'));
      fields.appendChild(
        this._select(
          'Style',
          [
            ['title', 'Title'],
            ['subtitle', 'Subtitle'],
          ],
          card.heading_style || 'subtitle',
          (heading_style) => update({ heading_style })
        )
      );
      return fields;
    }

    if (card.type === 'markdown') {
      fields.appendChild(this._textarea('Content', card.content || '', (content) => update({ content }), 'Markdown content'));
      return fields;
    }

    if (card.type === 'entities') {
      fields.appendChild(this._field('Title', card.title || '', (title) => update({ title }), 'Optional title'));
      fields.appendChild(this._renderEntitiesEditor(path));
      return fields;
    }

    if (card.type === 'grid' && path.childIndex === undefined) {
      fields.appendChild(this._field('Columns', card.columns ?? 2, (columns) => update({ columns: Number(columns) || 1 }), '2'));
      fields.appendChild(this._checkbox('Square cards', card.square === true, (square) => update({ square })));
      fields.appendChild(this._renderNestedCards(path.index, card, 'Grid cards'));
      return fields;
    }

    if (card.type === 'vertical-stack' && path.childIndex === undefined) {
      fields.appendChild(this._renderNestedCards(path.index, card, 'Stack cards'));
      return fields;
    }

    const unsupported = document.createElement('div');
    unsupported.className = 'ks-unsupported';
    unsupported.textContent = 'This card type is preserved, but the visual editor only supports common fields. Change the type above to edit it here.';
    fields.appendChild(unsupported);
    return fields;
  }

  _renderEntitiesEditor(path) {
    const wrap = document.createElement('div');
    wrap.className = 'ks-wide ks-entities';
    wrap.innerHTML = `<div class="ks-subtitle">Entities</div>`;

    const owner = this._entityListOwner(path);
    this._entities(owner.card).forEach((entity, entityIndex) => {
      const row = document.createElement('div');
      row.className = 'ks-entity-row';
      row.appendChild(
        this._renderEntityPicker(this._entityValue(entity), (value) => {
          this._updateEntityList(path, entityIndex, value);
        })
      );

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'danger';
      remove.textContent = 'Remove';
      remove.addEventListener('click', () => this._deleteEntity(path, entityIndex));
      row.appendChild(remove);
      wrap.appendChild(row);
    });

    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'ks-button';
    add.textContent = 'Add entity';
    add.addEventListener('click', () => this._addEntity(path));
    wrap.appendChild(add);

    return wrap;
  }

  _renderNestedCards(parentIndex, card, title) {
    const wrap = document.createElement('div');
    wrap.className = 'ks-wide ks-nested';
    wrap.innerHTML = `<div class="ks-subtitle">${title}</div>`;

    (card.cards || []).forEach((child, childIndex) => {
      wrap.appendChild(this._renderNestedCard(parentIndex, child, childIndex));
    });

    const addRow = document.createElement('div');
    addRow.className = 'ks-add-row';
    addRow.innerHTML = `
      <select class="ks-input" data-template>
        ${this._renderOptions(KS_SIMPLE_CARD_TYPES, 'tile')}
      </select>
      <button class="ks-button" type="button" data-add>Add card</button>
    `;
    addRow.querySelector('[data-add]').addEventListener('click', () => {
      this._addNested(parentIndex, addRow.querySelector('[data-template]').value);
    });

    wrap.appendChild(addRow);
    return wrap;
  }

  _renderNestedCard(parentIndex, child, childIndex) {
    const item = document.createElement('details');
    item.className = 'ks-nested-card';
    item.innerHTML = `
      <summary>
        <span>${childIndex + 1}. ${ksEscape(child.name || child.title || child.heading || child.type || 'Card')}</span>
        <span class="ks-actions">
          <button type="button" data-action="up">Up</button>
          <button type="button" data-action="down">Down</button>
          <button type="button" class="danger" data-action="delete">Delete</button>
        </span>
      </summary>
    `;

    item.querySelector('[data-action="up"]').addEventListener('click', (ev) => {
      ev.preventDefault();
      this._moveNested(parentIndex, childIndex, -1);
    });
    item.querySelector('[data-action="down"]').addEventListener('click', (ev) => {
      ev.preventDefault();
      this._moveNested(parentIndex, childIndex, 1);
    });
    item.querySelector('[data-action="delete"]').addEventListener('click', (ev) => {
      ev.preventDefault();
      this._deleteNested(parentIndex, childIndex);
    });

    const body = document.createElement('div');
    body.className = 'ks-nested-body';
    body.appendChild(
      this._select('Card type', KS_SIMPLE_CARD_TYPES, child.type, (type) => {
        this._replaceNested(parentIndex, childIndex, this._template(type));
      })
    );
    body.appendChild(
      this._renderCommonEditor(
        child,
        (patch) => this._updateNested(parentIndex, childIndex, patch),
        { index: parentIndex, childIndex }
      )
    );

    item.appendChild(body);
    return item;
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
          <strong>${index + 1}. ${ksEscape(title)}</strong>
          <small>${ksEscape(card.type || 'unknown card')}</small>
        </div>
        <div class="ks-actions">
          <button type="button" data-action="up" title="Move up">Up</button>
          <button type="button" data-action="down" title="Move down">Down</button>
          <button type="button" data-action="duplicate">Duplicate</button>
          <button type="button" class="danger" data-action="delete">Delete</button>
        </div>
      </div>
    `;

    const body = document.createElement('div');
    body.className = 'ks-slide-body';

    body.appendChild(
      this._select('Slide card type', KS_CARD_TYPES, card.type, (type) => {
        this._changeSlideType(index, type);
      })
    );

    body.appendChild(
      this._renderCommonEditor(
        card,
        (patch) => this._updateSlide(index, patch),
        { index }
      )
    );

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
        border-radius: 8px;
        padding: 14px;
        background: var(--card-background-color);
        border: 1px solid var(--divider-color);
        box-shadow: 0 2px 10px rgba(0,0,0,0.04);
      }

      .ks-section-title,
      .ks-subtitle {
        font-size: 16px;
        font-weight: 700;
        margin-bottom: 12px;
      }

      .ks-subtitle {
        font-size: 14px;
        margin-top: 4px;
      }

      .ks-settings-grid,
      .ks-card-fields {
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
      .ks-textarea,
      select {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid var(--divider-color);
        border-radius: 8px;
        padding: 10px;
        background: var(--secondary-background-color);
        color: var(--primary-text-color);
      }

      ha-entity-picker {
        width: 100%;
      }

      .ks-textarea {
        min-height: 160px;
        resize: vertical;
        font: inherit;
      }

      .ks-toggle-row,
      .ks-check-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .ks-toggle-row small {
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

      .ks-slide-summary,
      .ks-nested-card summary {
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
        border-radius: 8px;
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

      .ks-slide-body,
      .ks-nested-body {
        display: grid;
        gap: 12px;
        margin-top: 12px;
      }

      .ks-wide,
      .ks-entities,
      .ks-nested {
        grid-column: 1 / -1;
      }

      .ks-entity-row {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 8px;
        align-items: center;
        margin-bottom: 8px;
      }

      .ks-nested-card {
        border: 1px solid var(--divider-color);
        border-radius: 8px;
        padding: 10px;
        margin-bottom: 10px;
        background: var(--secondary-background-color);
      }

      .ks-unsupported {
        grid-column: 1 / -1;
        color: var(--secondary-text-color);
        font-size: 13px;
        line-height: 1.4;
      }

      @media (max-width: 760px) {
        .ks-settings-grid,
        .ks-card-fields,
        .ks-add-row,
        .ks-entity-row {
          grid-template-columns: 1fr;
        }

        .ks-slide-summary,
        .ks-nested-card summary {
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
  description: 'Lightweight generic swipe/slider card with a self-contained visual editor.',
  preview: true,
});

console.info(`%c KS Simple Swipe Card %c ${KS_SWIPE_CARD_VERSION} `, 'color: white; background: #03a9f4; font-weight: 700;', 'color: white; background: #555;');
