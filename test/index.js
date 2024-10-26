import Postercitos from 'postercitos'
import { writeFile } from 'node:fs/promises'

const jacquardaBastarda = await fetch('https://cdn.jsdelivr.net/fontsource/fonts/jacquarda-bastarda-9@latest/latin-400-normal.ttf')
  .then(data => data.arrayBuffer())
const justMeAgain = await fetch('https://cdn.jsdelivr.net/fontsource/fonts/just-me-again-down-here@latest/latin-400-normal.ttf')
  .then(data => data.arrayBuffer())

console.time('test-time')
const postercitos= new Postercitos({
  vars: {
  },
  fonts: [
    {
      name: 'Jacquarda Bastarda 9',
      data: jacquardaBastarda,
      weight: 400,
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
const [design] = await postercitos.svgsFrom('./designs/01_japan_flag')

await writeFile('output/textix.svg', design, {encoding: 'utf-8'})

console.timeEnd('test-time')