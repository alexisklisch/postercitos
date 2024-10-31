import { evaluateCondition } from '../src/utils/evaluateCondition.js'

const ctx = {camion: 'rojo', auto: 'azul'}

const result = evaluateCondition("bicicleta?.color || 'alfajor'", ctx)

console.log(result)