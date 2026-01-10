# Color Palette

This document contains the color palette used in this frontend project for reuse in other projects.

## Primary Colors

### Primary Blue
- **Primary**: `#3B82F6` (Blue-500)
- **Primary Dark**: `#2563EB` (Blue-600)
- Used for: Primary buttons, links, focus states, accents

## Dark Theme Colors

### Background Colors
- **Dark Background**: `#0F172A` (Slate-900)
- **Dark Card**: `#1E293B` (Slate-800)
- **Dark Border**: `#334155` (Slate-700)

### Text Colors
- **Primary Text**: `#FFFFFF` (White)
- **Placeholder Text**: `#9CA3AF` (Gray-400)

## Color Palette in Different Formats

### CSS Variables Format
```css
:root {
  --color-primary: #3B82F6;
  --color-primary-dark: #2563EB;
  --color-dark-bg: #0F172A;
  --color-dark-card: #1E293B;
  --color-dark-border: #334155;
  --color-text-primary: #FFFFFF;
  --color-text-placeholder: #9CA3AF;
}
```

### Tailwind Config Format
```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3B82F6',
          dark: '#2563EB',
        },
        dark: {
          bg: '#0F172A',
          card: '#1E293B',
          border: '#334155',
        },
      },
    },
  },
}
```

### SCSS/LESS Variables Format
```scss
$primary-color: #3B82F6;
$primary-color-dark: #2563EB;
$dark-bg: #0F172A;
$dark-card: #1E293B;
$dark-border: #334155;
$text-primary: #FFFFFF;
$text-placeholder: #9CA3AF;
```

## Typography

### Font Families
- **Sans Serif**: `'Poppins', 'sans-serif'` (Body text)
- **Display**: `'Comfortaa', 'cursive'` (Headings/Display text)

## Component Colors

### Buttons
- **Primary Button**: `#3B82F6` background, white text
- **Primary Button Hover**: `#2563EB` background
- **Secondary Button**: `#1E293B` background, `#334155` border
- **Secondary Button Hover**: `#334155` background

### Cards
- **Card Background**: `#1E293B`
- **Card Border**: `#334155`

### Input Fields
- **Input Background**: `#1E293B`
- **Input Border**: `#334155`
- **Input Focus Ring**: `#3B82F6`
- **Placeholder Text**: `#9CA3AF`

## Usage Examples

### Tailwind CSS Classes
```html
<!-- Primary button -->
<button class="bg-primary hover:bg-primary-dark text-white">Click me</button>

<!-- Dark card -->
<div class="bg-dark-card border border-dark-border rounded-lg p-6">Content</div>

<!-- Input field -->
<input class="bg-dark-card border border-dark-border text-white placeholder-gray-400 focus:ring-2 focus:ring-primary">
```

### CSS Custom Properties
```css
.button-primary {
  background-color: var(--color-primary);
  color: var(--color-text-primary);
}

.button-primary:hover {
  background-color: var(--color-primary-dark);
}

.card {
  background-color: var(--color-dark-card);
  border: 1px solid var(--color-dark-border);
}
```

## Color Reference Table

| Color Name | Hex Code | Usage |
|------------|----------|-------|
| Primary Blue | `#3B82F6` | Primary actions, links |
| Primary Blue Dark | `#2563EB` | Primary hover states |
| Dark Background | `#0F172A` | Main page background |
| Dark Card | `#1E293B` | Card/container backgrounds |
| Dark Border | `#334155` | Borders, dividers |
| White | `#FFFFFF` | Primary text |
| Gray Placeholder | `#9CA3AF` | Placeholder text |

## Notes

- This palette is optimized for dark mode interfaces
- The primary blue (`#3B82F6`) is Tailwind's Blue-500, providing good contrast and accessibility
- The dark theme uses a slate color scale for a modern, professional look
- All colors meet WCAG contrast requirements for accessibility
