const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateIcons() {
  const iconsDir = path.join(__dirname, '../public/icons');
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  const logoPath = path.join(__dirname, '../public/logo.png');

  // 192x192
  await sharp({
    create: {
      width: 192,
      height: 192,
      channels: 4,
      background: { r: 15, g: 23, b: 42, alpha: 1 }, // #0f172a
    },
  })
    .composite([
      {
        input: await sharp(logoPath).resize(160, 100, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer(),
        gravity: 'center',
      },
    ])
    .png()
    .toFile(path.join(iconsDir, 'icon-192x192.png'));

  console.log('icon-192x192.png generado');

  // 512x512
  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 15, g: 23, b: 42, alpha: 1 }, // #0f172a
    },
  })
    .composite([
      {
        input: await sharp(logoPath).resize(420, 260, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer(),
        gravity: 'center',
      },
    ])
    .png()
    .toFile(path.join(iconsDir, 'icon-512x512.png'));

  console.log('icon-512x512.png generado');

  // 512x512 maskable (more safe padding: 320x200 inside 512x512)
  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 15, g: 23, b: 42, alpha: 1 }, // #0f172a
    },
  })
    .composite([
      {
        input: await sharp(logoPath).resize(340, 210, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer(),
        gravity: 'center',
      },
    ])
    .png()
    .toFile(path.join(iconsDir, 'icon-maskable-512x512.png'));

  console.log('icon-maskable-512x512.png generado');

  // apple-touch-icon 180x180
  await sharp({
    create: {
      width: 180,
      height: 180,
      channels: 4,
      background: { r: 15, g: 23, b: 42, alpha: 1 }, // #0f172a
    },
  })
    .composite([
      {
        input: await sharp(logoPath).resize(150, 95, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer(),
        gravity: 'center',
      },
    ])
    .png()
    .toFile(path.join(iconsDir, 'apple-touch-icon.png'));

  console.log('apple-touch-icon.png generado');
}

generateIcons().catch((err) => {
  console.error(err);
  process.exit(1);
});
