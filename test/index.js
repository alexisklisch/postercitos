console.time('test-time')
import Postercitos from 'postercitos'

const postercitos= new Postercitos()
const designs = await postercitos.oneDesign('./designs/01_japan_flag')
console.log(designs)
console.timeEnd('test-time')