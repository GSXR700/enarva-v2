// scripts/convert-images-to-base64.js
const fs = require('fs');
const path = require('path');

const imagePaths = [
  'public/images/QR-Code.png',
  'public/images/logo-transparent.png'
];

imagePaths.forEach(imagePath => {
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  const mimeType = 'image/png';
  const dataUri = `data:${mimeType};base64,${base64Image}`;
  
  const outputFileName = path.basename(imagePath, '.png') + '-base64.txt';
  fs.writeFileSync(outputFileName, dataUri);
  
  console.log(`✅ Converted ${imagePath} to ${outputFileName}`);
});

console.log('\n📝 Base64 strings saved to text files');