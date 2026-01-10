# Tailwind CSS Setup

This frontend now uses Tailwind CSS for styling. Follow these steps to build the CSS:

## Installation

```bash
npm install
```

## Building Tailwind CSS

The Tailwind CSS is built using Gulp. Run:

```bash
npx gulp build-tailwind
```

Or build everything:

```bash
npx gulp build
```

## Watch Mode

To automatically rebuild CSS when templates change:

```bash
npx gulp watch
```

## Output

The compiled CSS is output to `static/css/output.css` and is automatically included in `base.html`.

## Configuration

- Tailwind config: `tailwind.config.js`
- Input CSS: `static/css/input.css`
- PostCSS config: `postcss.config.js`
