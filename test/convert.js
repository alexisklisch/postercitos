import sharp from 'sharp'

console.time('sharp')
sharp('./output/casita2.svg')
  .toFile('./output/casitaSharp.png')
console.timeEnd('sharp')