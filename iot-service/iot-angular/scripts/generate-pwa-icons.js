#!/usr/bin/env node
/**
 * PWA Icon Generator
 * Generates PNG icons from SVG source for PWA manifest
 * 
 * Usage: node scripts/generate-pwa-icons.js
 * Requires: npm install sharp
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const srcPath = path.join(__dirname, '../src/assets/icons/icon.svg');
const outDir = path.join(__dirname, '../src/assets/icons');

async function generateIcons() {
  // Read SVG file
  const svgBuffer = fs.readFileSync(srcPath);
  
  console.log('🎨 Generating PWA icons from SVG...\n');
  
  for (const size of sizes) {
    const outputPath = path.join(outDir, `icon-${size}x${size}.png`);
    
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    
    console.log(`✅ Generated: icon-${size}x${size}.png`);
  }
  
  console.log('\n🎉 All PWA icons generated successfully!');
  console.log(`📁 Location: ${outDir}`);
}

generateIcons().catch(err => {
  console.error('❌ Error generating icons:', err);
  process.exit(1);
});
