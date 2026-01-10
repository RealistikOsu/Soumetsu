# RealistikOsu Frontend Redesign

## Overview

The frontend has been completely redesigned using **Tailwind CSS** to match the new Figma designs. The design features:

- **Dark theme** with city skyline backgrounds
- **Modern card-based layouts**
- **Clean typography** using Poppins and Comfortaa fonts
- **Modal-based forms** for login/register
- **Responsive design** that works on all devices

## What Changed

### Framework Migration
- **Removed**: Semantic UI
- **Added**: Tailwind CSS 3.4
- All templates rewritten with Tailwind utility classes

### Templates Updated
1. ✅ `base.html` - New base template with Tailwind
2. ✅ `navbar.html` - Modern navigation bar
3. ✅ `homepage.html` - Hero section, statistics cards, top plays
4. ✅ `login.html` - Modal-based login form
5. ✅ `register/register.html` - Modal-based registration form
6. ✅ `register/verify.html` - Verification success modal
7. ✅ `register/welcome.html` - Waiting for verification modal
8. ✅ `leaderboard.html` - Card-based leaderboard with top 3 players

### Configuration Files
- `tailwind.config.js` - Tailwind configuration
- `postcss.config.js` - PostCSS configuration
- `static/css/input.css` - Tailwind input file with custom components
- `gulpfile.js` - Updated with Tailwind build task
- `package.json` - Updated dependencies

## Setup Instructions

### 1. Install Dependencies
```bash
cd repos/frontend
npm install
```

### 2. Build Tailwind CSS
```bash
# Build only Tailwind
npx gulp build-tailwind

# Or build everything
npx gulp build

# Or use the build script
./build.sh
```

### 3. Watch Mode (Development)
```bash
npx gulp watch
```

This will automatically rebuild Tailwind CSS when templates or the input CSS file changes.

## Design System

### Colors
- **Primary**: `#3B82F6` (Blue) - Used for buttons and accents
- **Dark Background**: `#0F172A` - Main background
- **Dark Card**: `#1E293B` - Card backgrounds
- **Dark Border**: `#334155` - Borders

### Typography
- **Body**: Poppins (sans-serif)
- **Display**: Comfortaa (cursive) - For headings

### Components
Custom Tailwind components are defined in `static/css/input.css`:
- `.btn-primary` - Primary button
- `.btn-secondary` - Secondary button
- `.card` - Card container
- `.input-field` - Form input
- `.modal-overlay` - Modal backdrop
- `.modal-content` - Modal container

## Notes

- The design maintains all existing functionality
- All Go template functions still work
- API calls and data fetching unchanged
- Dark mode support via client flags
- Responsive design for mobile/tablet/desktop

## Next Steps

1. Run `npm install` to install Tailwind and dependencies
2. Build the CSS with `npx gulp build-tailwind`
3. Test the new design
4. Update remaining templates (profile, settings) as needed
5. Add anime illustrations to placeholder areas

## Remaining Templates to Update

- `profile.html` - User profile page
- `settings/*.html` - Settings pages
- Other templates as needed
