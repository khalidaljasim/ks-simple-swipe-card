# KS Simple Swipe Card

`KS Simple Swipe Card` is a lightweight Home Assistant Lovelace card for creating swipeable dashboard sections. It is designed for simple, reusable slider layouts and includes a self-contained visual editor for managing slides without editing raw JSON for common card types.

## Features

- Swipeable Lovelace card carousel
- Native horizontal scrolling with scroll snap
- Optional pagination dots
- Optional previous and next arrows
- Configurable slide gap, width, height, and dot position
- Built-in visual editor for common slide/card types
- HACS-compatible dashboard resource
- No build step or external runtime dependencies

## Supported Editor Types

The built-in editor supports common Home Assistant card configurations:

- Vertical stack
- Grid
- Entities
- Markdown
- Heading
- Tile
- Button
- Entity

Existing unsupported card types are preserved in the configuration, but only the supported types above can be edited visually.

## Installation

### HACS

1. Open HACS in Home Assistant.
2. Go to **Custom repositories**.
3. Add this repository URL.
4. Select **Dashboard** as the repository category.
5. Install **KS Simple Swipe Card**.
6. Refresh your browser cache after installation.

HACS resource path:

```text
/hacsfiles/ks-simple-swipe-card/ks-simple-swipe-card.js
```

### Manual

1. Copy `ks-simple-swipe-card.js` into your Home Assistant `www` directory.
2. Add the file as a dashboard resource.

Example manual resource path:

```text
/local/ks-simple-swipe-card.js
```

Resource type:

```text
JavaScript module
```

## Basic Example

```yaml
type: custom:ks-simple-swipe-card
show_dots: true
show_arrows: false
gap: 10px
height: auto
slide_width: 100%
dot_position: bottom
cards:
  - type: entities
    title: Lights
    entities:
      - light.living_room
      - light.kitchen
  - type: markdown
    content: |
      ## Welcome
      This is a swipeable dashboard slide.
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `cards` | list | required | Lovelace cards shown as slides. |
| `show_dots` | boolean | `true` | Shows pagination dots below or above the slider. |
| `show_arrows` | boolean | `false` | Shows previous and next arrow buttons. |
| `gap` | string | `10px` | Space between slides. |
| `height` | string | `auto` | Slider height, such as `auto`, `400px`, or `60vh`. |
| `slide_width` | string | `100%` | Width of each slide, such as `100%`, `80%`, or `320px`. |
| `dot_position` | string | `bottom` | Dot position. Use `bottom` or `top`. |

## Editor

The card includes its own Lovelace visual editor. You can:

- Add new slides from templates
- Change slide type from a dropdown
- Edit common fields such as title, heading, markdown content, entity, icon, and grid columns
- Add and remove entities
- Add cards inside vertical stack and grid slides
- Move, duplicate, and delete slides

The editor is intentionally self-contained and does not rely on Home Assistant internal card editor elements.

## Updating

After installing an update through HACS:

1. Refresh Home Assistant.
2. Clear the browser cache or hard refresh the page.
3. Reload dashboard resources if Home Assistant still shows the old version.

## Repository Structure

```text
.
├── ks-simple-swipe-card.js
├── hacs.json
└── README.md
```

## License

Add your preferred license before publishing the repository publicly.
