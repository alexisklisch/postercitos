import Postercitos from 'postercitos'
import { readFile, writeFile } from 'node:fs/promises'

const montserrat500 = await fetch('https://cdn.jsdelivr.net/fontsource/fonts/montserrat@latest/latin-500-normal.ttf')
  .then(data => data.arrayBuffer())
const justMeAgain = await fetch('https://cdn.jsdelivr.net/fontsource/fonts/just-me-again-down-here@latest/latin-400-normal.ttf')
  .then(data => data.arrayBuffer())

const homeImage = await readFile('designs/01_wisconsin_home/assets/images/home.jpg', {encoding: 'base64'})


console.time('test-time')
const postercitos= new Postercitos({
  vars: {
    imagenCasa: homeImage
  },
  fonts: [
    {
      name: 'Montserrat',
      data: montserrat500,
      weight: 500,
      style: 'normal'
    },
    {
      name: 'Just Me Again Down Here',
      data: justMeAgain,
      weight: 400,
      style: 'normal'
    },
  ]
})
const [design] = await postercitos.svgsFrom('./designs/01_wisconsin_home')
console.log(design)
await writeFile('output/01_wisconsin_home.svg', design, {encoding: 'utf-8'})

console.timeEnd('test-time')