import Postercitos from 'postercitos'
import { writeFile } from 'node:fs/promises'

const courierPrime = await fetch('https://cdn.jsdelivr.net/fontsource/fonts/courier-prime@latest/latin-400-normal.ttf')
.then(data => data.arrayBuffer())
const courierPrimeBold = await fetch('https://cdn.jsdelivr.net/fontsource/fonts/courier-prime@latest/latin-700-normal.ttf')
.then(data => data.arrayBuffer())

console.time('test-time')
const postercitos= new Postercitos({
  vars: {
    titulo: 'Excelente título',
    cuerpo: 'A veces algunos pensamos que la vida es una moneda porque la tomamos o la dejamos. ¿O esa es la lenteja?'
  },
  fonts: [
    {
      name: 'Courier Prime',
      data: courierPrime,
      weight: 400,
      style: 'normal'
    },
    {
      name: 'Courier Prime',
      data: courierPrimeBold,
      weight: 700,
      style: 'normal'
    },
  ]
})
const [design] = await postercitos.oneDesign('./designs/01_japan_flag')
await writeFile('output/textix2.svg', design, {encoding: 'utf-8'})

console.timeEnd('test-time')