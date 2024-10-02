import sharp from 'sharp'

sharp('./output/textix.svg')
  .toFile('./output/cositax.png')