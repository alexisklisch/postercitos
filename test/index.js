import Postercitos, { imageB64 } from 'postercitos'
import { readFile, writeFile } from 'node:fs/promises'

const montserrat400 = await fetch('https://cdn.jsdelivr.net/fontsource/fonts/montserrat@latest/latin-400-normal.ttf')
  .then(data => data.arrayBuffer())
const montserrat500 = await fetch('https://cdn.jsdelivr.net/fontsource/fonts/montserrat@latest/latin-500-normal.ttf')
  .then(data => data.arrayBuffer())
const montserrat600 = await fetch('https://cdn.jsdelivr.net/fontsource/fonts/montserrat@latest/latin-600-normal.ttf')
  .then(data => data.arrayBuffer())
const montserrat700 = await fetch('https://cdn.jsdelivr.net/fontsource/fonts/montserrat@latest/latin-700-normal.ttf')
  .then(data => data.arrayBuffer())

const homeImage = await imageB64('https://images.unsplash.com/photo-1721332149069-a470150ef51c')

console.time('test-time')
const postercitos= new Postercitos({
  vars: {
    imagenCasa: homeImage
  },
  fonts: [
    {
      name: 'Montserrat',
      data: montserrat400,
      weight: 400,
      style: 'normal'
    },
    {
      name: 'Montserrat',
      data: montserrat500,
      weight: 500,
      style: 'normal'
    },
    {
      name: 'Montserrat',
      data: montserrat600,
      weight: 600,
      style: 'normal'
    },
    {
      name: 'Montserrat',
      data: montserrat700,
      weight: 700,
      style: 'normal'
    },
  ]
})
const [design] = await postercitos.svgsFrom('./designs/01_wisconsin_home')
await writeFile('output/01_wisconsin_home.svg', design, {encoding: 'utf-8'})

console.timeEnd('test-time')