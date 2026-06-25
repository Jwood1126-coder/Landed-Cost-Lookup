// Generate custom icons for Lookup app
// Run: node generate-icons.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create SVG icon content
const createSVG = (size) => {
  const strokeWidth = size / 16;
  const circleR = size * 0.25;
  const circleCX = size * 0.42;
  const circleCY = size * 0.42;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#2dd4bf;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#14b8a6;stop-opacity:1" />
    </linearGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="${size/32}" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background circle -->
  <circle cx="${size/2}" cy="${size/2}" r="${size * 0.45}" fill="#0f1115"/>
  <circle cx="${size/2}" cy="${size/2}" r="${size * 0.42}" fill="#161922" stroke="#232736" stroke-width="${strokeWidth/2}"/>

  <!-- Magnifying glass -->
  <g filter="url(#glow)">
    <!-- Glass circle -->
    <circle cx="${circleCX}" cy="${circleCY}" r="${circleR}"
            fill="none" stroke="url(#grad)" stroke-width="${strokeWidth}"/>

    <!-- Handle -->
    <line x1="${circleCX + circleR * 0.7}" y1="${circleCY + circleR * 0.7}"
          x2="${size * 0.78}" y2="${size * 0.78}"
          stroke="url(#grad)" stroke-width="${strokeWidth * 1.3}" stroke-linecap="round"/>

    <!-- Data lines inside glass -->
    <line x1="${circleCX - circleR * 0.5}" y1="${circleCY - circleR * 0.3}"
          x2="${circleCX + circleR * 0.5}" y2="${circleCY - circleR * 0.3}"
          stroke="#2dd4bf" stroke-width="${strokeWidth * 0.6}" stroke-linecap="round" opacity="0.8"/>
    <line x1="${circleCX - circleR * 0.5}" y1="${circleCY + circleR * 0.05}"
          x2="${circleCX + circleR * 0.2}" y2="${circleCY + circleR * 0.05}"
          stroke="#2dd4bf" stroke-width="${strokeWidth * 0.6}" stroke-linecap="round" opacity="0.7"/>
    <line x1="${circleCX - circleR * 0.5}" y1="${circleCY + circleR * 0.4}"
          x2="${circleCX + circleR * 0.35}" y2="${circleCY + circleR * 0.4}"
          stroke="#2dd4bf" stroke-width="${strokeWidth * 0.6}" stroke-linecap="round" opacity="0.5"/>
  </g>
</svg>`;
};

// Output directory
const iconsDir = path.join(__dirname, 'src-tauri', 'icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate SVG files for different sizes
const sizes = [32, 128, 256];
sizes.forEach(size => {
  const svg = createSVG(size);
  const filename = size === 256 ? 'icon.svg' : `${size}x${size}.svg`;
  fs.writeFileSync(path.join(iconsDir, filename), svg);
  console.log(`Created ${filename}`);
});

// Also create the source icon for Tauri icon generator
fs.writeFileSync(path.join(iconsDir, 'app-icon.svg'), createSVG(512));
console.log('Created app-icon.svg (512x512 source)');

console.log('\nSVG icons created! To convert to PNG/ICO, use:');
console.log('npx tauri icon src-tauri/icons/app-icon.svg');
