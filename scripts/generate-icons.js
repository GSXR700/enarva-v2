// scripts/generate-icons.js
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Configuration - SVG sources for light and dark modes
const lightLogoSVG = './public/images/gradient-light.svg';
const darkLogoSVG = './public/images/logo-dark.svg';
const outputDir = './public';

// Icon sizes for PWA
const pwaIconSizes = [
  { size: 72, name: 'icon-72x72.png' },
  { size: 96, name: 'icon-96x96.png' },
  { size: 128, name: 'icon-128x128.png' },
  { size: 144, name: 'icon-144x144.png' },
  { size: 152, name: 'icon-152x152.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 384, name: 'icon-384x384.png' },
  { size: 512, name: 'icon-512x512.png' },
];

// Apple Touch Icon sizes
const appleIconSizes = [
  { size: 180, name: 'apple-icon.png' },
  { size: 180, name: 'apple-icon-180x180.png' },
];

// Favicon sizes
const faviconSizes = [
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 48, name: 'favicon-48x48.png' },
];

/**
 * Generate PNG icons from SVG source with colored background
 */
async function generateIconsFromSVG(svgPath, sizes, suffix = '') {
  for (const { size, name } of sizes) {
    const outputName = suffix ? name.replace('.png', `-${suffix}.png`) : name;
    const outputPath = path.join(outputDir, outputName);
    
    // CRITICAL FIX: Use blue gradient background instead of transparent
    await sharp(svgPath)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 38, g: 125, b: 244, alpha: 1 } // Blue background #267DF4
      })
      .png({ quality: 100, compressionLevel: 9 })
      .toFile(outputPath);
    
    console.log(`   ✓ ${outputName} (${size}x${size}px)`);
  }
}

/**
 * Generate maskable icons with padding for Android
 */
async function generateMaskableIcons(svgPath, sizes) {
  for (const { size, name } of sizes) {
    const outputName = name.replace('.png', '-maskable.png');
    const outputPath = path.join(outputDir, outputName);
    
    // Maskable icons need padding (safe zone)
    const logoSize = Math.floor(size * 0.6); // 60% of icon size for safe zone
    const padding = Math.floor((size - logoSize) / 2);
    
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 38, g: 125, b: 244, alpha: 1 }
      }
    })
    .composite([{
      input: await sharp(svgPath)
        .resize(logoSize, logoSize, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .toBuffer(),
      top: padding,
      left: padding
    }])
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(outputPath);
    
    console.log(`   ✓ ${outputName} (${size}x${size}px - maskable)`);
  }
}

/**
 * Generate favicon.ico (multi-size ICO file)
 */
async function generateFavicon(svgPath) {
  // Generate 32x32 as main favicon with transparent background
  const faviconPath = path.join(outputDir, 'favicon.ico');
  
  await sharp(svgPath)
    .resize(32, 32, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 }
    })
    .png()
    .toFile(faviconPath);
  
  console.log(`   ✓ favicon.ico (32x32px)`);
}

/**
 * Copy SVG favicon for modern browsers
 */
function copySVGFavicon(svgPath) {
  const outputPath = path.join(outputDir, 'favicon.svg');
  fs.copyFileSync(svgPath, outputPath);
  console.log(`   ✓ favicon.svg (vector)`);
}

/**
 * Main generation function
 */
async function generateAllIcons() {
  console.log('🎨 Génération des icônes PWA HD depuis SVG...\n');

  // Verify source files exist
  if (!fs.existsSync(lightLogoSVG)) {
    console.error(`❌ Fichier source manquant: ${lightLogoSVG}`);
    process.exit(1);
  }
  if (!fs.existsSync(darkLogoSVG)) {
    console.error(`❌ Fichier source manquant: ${darkLogoSVG}`);
    process.exit(1);
  }

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    // Generate PWA icons from light mode SVG (with blue background)
    console.log('📱 Génération des icônes PWA (fond bleu):');
    await generateIconsFromSVG(lightLogoSVG, pwaIconSizes);

    // Generate maskable icons for Android (with padding + blue background)
    console.log('\n📱 Génération des icônes maskables (Android):');
    await generateMaskableIcons(lightLogoSVG, [
      { size: 192, name: 'icon-192x192.png' },
      { size: 512, name: 'icon-512x512.png' }
    ]);

    // Generate Apple Touch Icons (using light mode with white background)
    console.log('\n🍎 Génération des icônes Apple:');
    for (const { size, name } of appleIconSizes) {
      const outputPath = path.join(outputDir, name);
      
      await sharp(lightLogoSVG)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 } // White for Apple
        })
        .png({ quality: 100, compressionLevel: 9 })
        .toFile(outputPath);
      
      console.log(`   ✓ ${name} (${size}x${size}px)`);
    }

    // Generate Favicons (using light mode SVG - transparent)
    console.log('\n🌐 Génération des favicons:');
    await generateIconsFromSVG(lightLogoSVG, faviconSizes);
    await generateFavicon(lightLogoSVG);
    copySVGFavicon(lightLogoSVG);

    // Generate screenshots for PWA manifest
    console.log('\n📸 Génération des screenshots PWA:');
    
    // Screenshot 1 - Desktop
    await sharp(lightLogoSVG)
      .resize(1280, 720, {
        fit: 'contain',
        background: { r: 38, g: 125, b: 244, alpha: 1 }
      })
      .png({ quality: 90 })
      .toFile(path.join(outputDir, 'screenshot-wide.png'));
    console.log('   ✓ screenshot-wide.png (1280x720px)');

    // Screenshot 2 - Mobile portrait
    await sharp(lightLogoSVG)
      .resize(750, 1334, {
        fit: 'contain',
        background: { r: 38, g: 125, b: 244, alpha: 1 }
      })
      .png({ quality: 90 })
      .toFile(path.join(outputDir, 'screenshot-narrow.png'));
    console.log('   ✓ screenshot-narrow.png (750x1334px)');

    console.log('\n✅ Toutes les icônes HD ont été générées avec succès!');
    console.log(`📂 Dossier de sortie: ${path.resolve(outputDir)}`);
    
    console.log('\n📝 Prochaines étapes:');
    console.log('   1. Les icônes ont maintenant un fond bleu #267DF4');
    console.log('   2. Les icônes maskables ont été générées pour Android');
    console.log('   3. Rebuild l\'app: npm run build');
    console.log('   4. Testez l\'installation PWA sur mobile');

  } catch (error) {
    console.error('❌ Erreur lors de la génération des icônes:', error);
    process.exit(1);
  }
}

// Execute the script
generateAllIcons().catch(console.error);