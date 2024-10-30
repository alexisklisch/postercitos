import sharp from 'sharp'

sharp('./output/01_wisconsin_home.svg')
  .toFile('./output/cositax.png')