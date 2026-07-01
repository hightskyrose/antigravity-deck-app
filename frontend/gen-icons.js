const sharp = require('sharp');
const fs = require('fs');

const svg = fs.readFileSync('./app/icon.svg');

sharp(svg)
  .resize(192, 192)
  .png()
  .toFile('./public/icon-192.png')
  .then(() => console.log('192 done'));

sharp(svg)
  .resize(512, 512)
  .png()
  .toFile('./public/icon-512.png')
  .then(() => console.log('512 done'));
