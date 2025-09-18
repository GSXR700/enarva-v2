// scripts/generate-icons.js
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Configuration
const inputFile = './public/images/enarva-logo.png'; // Votre logo HD
const outputDir = './public';

// Tailles nécessaires pour le PWA
const sizes = [
  { size: 72, name: 'icon-72x72.png' },
  { size: 96, name: 'icon-96x96.png' },
  { size: 128, name: 'icon-128x128.png' },
  { size: 144, name: 'icon-144x144.png' },
  { size: 152, name: 'icon-152x152.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 384, name: 'icon-384x384.png' },
  { size: 512, name: 'icon-512x512.png' },
];

// Tailles pour Apple
const appleSizes = [
  { size: 180, name: 'apple-icon.png' },
  { size: 180, name: 'apple-icon-180x180.png' },
];

// Favicon
const faviconSizes = [
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 64, name: 'favicon.ico' },
];

async function generateIcons() {
  console.log('🎨 Génération des icônes PWA...\n');

  // Vérifier que le fichier source existe
  if (!fs.existsSync(inputFile)) {
    console.error(`❌ Le fichier source n'existe pas: ${inputFile}`);
    process.exit(1);
  }

  // Créer le dossier de sortie s'il n'existe pas
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    // Générer les icônes PWA standard
    console.log('📱 Génération des icônes PWA:');
    for (const { size, name } of sizes) {
      const outputPath = path.join(outputDir, name);
      
      await sharp(inputFile)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png({ quality: 100, compressionLevel: 9 })
        .toFile(outputPath);
      
      console.log(`   ✓ ${name} (${size}x${size}px)`);
    }

    // Générer les icônes Apple
    console.log('\n🍎 Génération des icônes Apple:');
    for (const { size, name } of appleSizes) {
      const outputPath = path.join(outputDir, name);
      
      await sharp(inputFile)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png({ quality: 100, compressionLevel: 9 })
        .toFile(outputPath);
      
      console.log(`   ✓ ${name} (${size}x${size}px)`);
    }

    // Générer les favicons
    console.log('\n🌐 Génération des favicons:');
    for (const { size, name } of faviconSizes) {
      const outputPath = path.join(outputDir, name);
      
      if (name.endsWith('.ico')) {
        // Pour le fichier .ico, on génère d'abord un PNG puis on peut le convertir
        await sharp(inputFile)
          .resize(size, size, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 0 }
          })
          .png()
          .toFile(outputPath.replace('.ico', '-temp.png'));
        
        // Renommer le fichier temporaire en .ico (ou utiliser un convertisseur spécifique)
        fs.renameSync(
          outputPath.replace('.ico', '-temp.png'),
          outputPath
        );
        console.log(`   ✓ ${name} (${size}x${size}px)`);
      } else {
        await sharp(inputFile)
          .resize(size, size, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 0 }
          })
          .png({ quality: 100, compressionLevel: 9 })
          .toFile(outputPath);
        
        console.log(`   ✓ ${name} (${size}x${size}px)`);
      }
    }

    // Générer des screenshots de démonstration (optionnel)
    console.log('\n📸 Génération des screenshots de démonstration:');
    
    // Screenshot 1 - Format paysage
    await sharp(inputFile)
      .resize(1280, 720, {
        fit: 'contain',
        background: { r: 245, g: 247, b: 250, alpha: 1 }
      })
      .png({ quality: 90 })
      .toFile(path.join(outputDir, 'screenshot-1.png'));
    console.log('   ✓ screenshot-1.png (1280x720px)');

    // Screenshot 2 - Format paysage
    await sharp(inputFile)
      .resize(1280, 720, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png({ quality: 90 })
      .toFile(path.join(outputDir, 'screenshot-2.png'));
    console.log('   ✓ screenshot-2.png (1280x720px)');

    console.log('\n✅ Toutes les icônes ont été générées avec succès!');
    console.log(`📂 Dossier de sortie: ${path.resolve(outputDir)}`);

    // Instructions finales
    console.log('\n📝 Prochaines étapes:');
    console.log('   1. Placez le fichier manifest.json dans le dossier public/');
    console.log('   2. Vérifiez que toutes les icônes sont bien générées');
    console.log('   3. Testez votre PWA en utilisant Chrome DevTools > Application');
    console.log('   4. Installez l\'app depuis Chrome sur mobile pour tester');

  } catch (error) {
    console.error('❌ Erreur lors de la génération des icônes:', error);
    process.exit(1);
  }
}

// Exécuter le script
generateIcons().catch(console.error);