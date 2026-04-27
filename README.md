Yes — replace your `README.md` with this:

````md
# KS Simple Swipe Card

A lightweight swipe / slider card for Home Assistant Lovelace, built with native scroll-snap and a simple visual editor.

## Features

- Lightweight swipe layout
- Works with any Lovelace card inside each slide
- Pagination dots
- Configurable slide gap
- Configurable height
- Basic visual editor
- HACS compatible

## Installation

### HACS

1. Open HACS
2. Go to **Custom repositories**
3. Add this repository
4. Category: **Dashboard**
5. Install **KS Simple Swipe Card**
6. Refresh Home Assistant

Resource path:

```text
/hacsfiles/ks-simple-swipe-card/dist/ks-simple-swipe-card.js
````

## Example

```yaml
type: custom:ks-simple-swipe-card
show_dots: true
gap: 10px
height: auto
cards:
  - type: entities
    title: Living Room
    entities:
      - sensor.living_ikea_aqs_temperature

  - type: entities
    title: Shed
    entities:
      - sensor.shed_ikea_aqs_temperature
```

## Options

| Option      | Type    | Default  | Description                                     |
| ----------- | ------- | -------- | ----------------------------------------------- |
| `cards`     | list    | required | List of Lovelace cards shown as swipe slides    |
| `show_dots` | boolean | `true`   | Show pagination dots                            |
| `gap`       | string  | `12px`   | Space between slides                            |
| `height`    | string  | `auto`   | Card height, such as `auto`, `400px`, or `60vh` |

## Notes

This card is designed to be simple, clean, and fast.
It uses native browser scrolling instead of a heavy carousel library.

## Credits

Created for Home Assistant dashboards that need clean swipe sections without unnecessary complexity.

```
```
