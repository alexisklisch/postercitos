console.time('test-time')
import Postercitos from 'postercitos'
import { writeFile } from 'node:fs/promises'

const postercitos= new Postercitos()
const cosa = await postercitos.oneDesign('./designs/01_japan_flag')
//await writeFile('output/textix.svg', design, {encoding: 'utf-8'})

console.timeEnd('test-time')