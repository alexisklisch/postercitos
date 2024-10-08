console.time('test-time')
import Postercitos from 'postercitos'
import { writeFile } from 'node:fs/promises'

const postercitos= new Postercitos({
  vars: {
    description: 'A ver si ahora funciona bien'
  }
})
const [design] = await postercitos.oneDesign('./designs/01_japan_flag')
await writeFile('output/textix2.svg', design, {encoding: 'utf-8'})

console.timeEnd('test-time')