// scripts/convert-fonts.js
const fs = require('fs');
const path = require('path');

// Paths to the fonts you need
const regularPath = path.join(__dirname, '../public/fonts/Poppins-Regular.ttf');
const boldPath = path.join(__dirname, '../public/fonts/Poppins-Bold.ttf');

try {
  const regularBuffer = fs.readFileSync(regularPath);
  const boldBuffer = fs.readFileSync(boldPath);

  const base64Regular = regularBuffer.toString('base64');
  const base64Bold = boldBuffer.toString('base64');

  console.log('// lib/fonts.ts');
  console.log('// Copy everything below into your lib/fonts.ts file\n');
  console.log(`export const poppinsNormal = "${base64Regular}";\n`);
  console.log(`export const poppinsBold = "${base64Bold}";`);
  
  console.log('\n✅ Conversion complete! Copy the output above to lib/fonts.ts');
} catch (error) {
  console.error('❌ Error:', error.message);
}