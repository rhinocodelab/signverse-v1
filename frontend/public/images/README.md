# SignVerse Frontend Images

This directory contains all the icons, logos, and images used in the SignVerse frontend application.

## Directory Structure

```
images/
├── icons/           # UI icons and interface elements
├── logos/           # Brand logos and company assets
├── ui/              # UI-specific graphics and elements
├── assets/          # General assets and media files
└── README.md        # This documentation file
```

## Icons (`/icons/`)

Contains SVG icons used throughout the application:

- `camera.svg` - Camera icon for video translation feature
- `mic.svg` - Microphone icon for audio translation feature
- `file-text.svg` - Document icon for text translation feature
- `users.svg` - Users icon for community features
- `user.svg` - User profile icon
- `log-out.svg` - Logout icon
- `loading.svg` - Loading spinner icon
- `eye.svg` - Show password icon
- `eye-off.svg` - Hide password icon

## Logos (`/logos/`)

Contains brand and company logos:

- `signverse-logo.svg` - Main SignVerse application logo
- `next.svg` - Next.js framework logo
- `vercel.svg` - Vercel deployment platform logo

## UI Elements (`/ui/`)

Contains UI-specific graphics and interface elements:

- `file.svg` - Generic file icon
- `window.svg` - Window/frame icon
- `globe.svg` - Globe/world icon

## Assets (`/assets/`)

General assets and media files for future use.

## Usage

To use these images in your React components:

```jsx
// Using SVG icons
<img src="/images/icons/camera.svg" alt="Camera" className="w-6 h-6" />

// Using logos
<img src="/images/logos/signverse-logo.svg" alt="SignVerse" className="h-8" />
```

## Adding New Images

1. Place new icons in the appropriate subdirectory
2. Use SVG format for scalability
3. Follow the naming convention: `kebab-case.svg`
4. Update this README if adding new categories

## Notes

- All icons are optimized SVG files
- Icons use `currentColor` for stroke/fill to inherit text color
- Logos include proper branding colors and gradients
- All images are optimized for web use
