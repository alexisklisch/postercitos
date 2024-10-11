console.time('test-time')
import Postercitos from 'postercitos'
import { writeFile } from 'node:fs/promises'

const postercitos= new Postercitos({
  vars: {
    description: 'La vida es una pequeña lenteja porque o la tomas o la dejas siempre que mires a tu corazón.'
  }
})
const [design] = await postercitos.oneDesign('./designs/01_japan_flag')
await writeFile('output/textix2.svg', design, {encoding: 'utf-8'})

console.timeEnd('test-time')