import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { XMLParser, XMLBuilder } from 'fast-xml-parser'
import { parse } from 'opentype.js'
import { syllabler } from './utils/syllabler.js'

class Postercitos {
  constructor () {
    // Configurar parser
    const commonConfig = { attributeNamePrefix: '', ignoreAttributes: false }
    this.parser = new XMLParser(commonConfig)
    this.builder = new XMLBuilder(commonConfig)
  }

  async oneDesign (designDirPath) {
    // Establecer directorios
    const designDir = join(process.cwd(), designDirPath)
    const manifestPath = join(designDir, 'manifest.json') //📄 manifest.json
    const templatesDir = join(designDir, 'templates') //📂 /templates

    // Parsear el manifest
    const manifestRaw = await readFile(manifestPath, { encoding: 'utf-8' })
    const manifest = JSON.parse(manifestRaw)
    const { assets, metadata, vars } = manifest

    // Array con rutas de cada diseño
    const svgFileNames = await readdir(templatesDir)
    const svgPaths = svgFileNames.map(file => join(templatesDir, file))
    
    //const parsedSVG = await this.#parseSVG(svgPaths)
    //return parsedSVG.map(parsedItem => this.builder.build(parsedItem))

    /*
    ** PROBANDO EL PARSER QUE RESPETA
    ** LAS POSICIONES DEL SVG
    */
    // Test: Leo y parseo los .svg para tenerlo de forma conveniente
    const svgsReadPromise = svgPaths.map(async (path) => this.#prepareTemplateFile(path))
    const allSVGPromises = await Promise.allSettled(svgsReadPromise).then(svg => svg)
    const svgsTemplates = allSVGPromises.map(promise => promise.value)
    // Test: Convierto los templates en svgs funcionales
    const svgs = svgsTemplates.map(template => this.#drawSVG(template))
    /*
    ** VOLVEMOS A LO HABITUAL
    */

    return []
  }

  async #prepareTemplateFile (svgPath) {
    // Leo el archivo SVG
    const svgRaw = await readFile(svgPath, { encoding: 'utf-8' })
    // Uso REGEX para extraer todas las variables del .svg
    const variablesRegex = /%\{\{(.*?)\}\}%/g
    const regexResult = svgRaw.match(variablesRegex)
    const variablesRawArray = regexResult.map(match => match.slice(3, -3))
    // Devuelve un objeto con fallback si lo tiene
    const variables = variablesRawArray.map(svgVar => {
      const haveFallback = svgVar[0] === '['
      let rawVariable = ''

      if (haveFallback) {
        const [value, fallback] = JSON.parse(svgVar)
        rawVariable = `%{{${value}}}%`
        return {value, rawVariable, fallback}
      }

      rawVariable = `%{{${svgVar}}}%`
      return {value: svgVar, rawVariable}

    })

    // Parsea el SVG
    const parser = new XMLParser({preserveOrder: true, ignoreAttributes: false, attributeNamePrefix: ''})
    const parsedXML = parser.parse(svgRaw)

    return {
      content: parsedXML,
      variables
    }
  }

  #drawSVG (svgTemplate) {
    const { content, varibles } = svgTemplate
    const [ body ] = content

    body.svg.forEach(item => {
      console.log(JSON.stringify(item))

    })
  }



  async #parseSVG (svgPaths) {
    // Paso por cada SVG
    const svgs = []
    for (const svgPath of svgPaths) {
      const svgRaw = await readFile(svgPath, { encoding: 'utf-8' })
      let { svg } = this.parser.parse(svgRaw) // Hago un parse
      let { text } = svg

      // Si text es un objeto, lo convierto en array
      if (text && !Array.isArray(text)) {
        text = [ text ]
        svg.text = text
      }

      for (const textElem of text) {
        if (textElem['--box-view']) {
          const textGroup = await this.#adaptText(textElem, svg)
          delete svg.text
          svg = {...svg, ...textGroup}
        }
      }
      
      svgs.push({svg})
    }

    return svgs
  }

  async #adaptText (textElem, svg) {
    // Extraer variables del SVG
    const [ x, y, boxWidth, boxHeight ] = textElem['--box-view'].split(',').map(Number)
    const fontSize = +textElem['font-size']
    const fill = textElem['fill'] || undefined
    const alignText = textElem['--align-text']
    
    // Fuente
    const fontResponse = await fetch('https://cdn.jsdelivr.net/fontsource/fonts/open-sans@latest/latin-300-normal.ttf');
    const buffer = await fontResponse.arrayBuffer();
    const font = parse(buffer)
    // Utilidad para calcular siempre con la fuente seleccionada
    const withFontWidth = text => getTextWidth(text, fontSize, font)

    // Texto a escribir
    const text = 'La vida es una moneda porque aquel que la rebusca la tiene. Claramente esto es siempre que hablemos de monedas y no de gruesos billetes.'
    // Crear un array de palabras
    const words = text.split(' ')
    // Array con las líneas
    const textLines = []
    // Linea temporar
    let tempLine = ''

    while (words.length >= 1) {
      // selecciona y elimina la primera word[]
      const currentWord = words.shift()
      // Analizar nuevos espacios
      const fullTempLineFontWidth = withFontWidth(`${tempLine} ${currentWord}`)
      const isBiggerThanBox = fullTempLineFontWidth > boxWidth
      
      
      // Si el texto es mas grande que la caja de texto...
      if (isBiggerThanBox) {
        // Separo en sílabas la palabra
        const syllabes = syllabler(currentWord)
        // Utilidad para saber siempre el temaño con las sílabas actuales
        const currentSyllabesFontWidth = () => withFontWidth(`${tempLine} ${syllabes.join('')}-`.trim())
        // Variable donde se guarda la/s sílaba a enviar debajo
        let nextLineSyllabes = ''
        
        // Mientras que la actual palabra con guión sea más grande...
        while (currentSyllabesFontWidth() > boxWidth) {
          const currentSyllabe = syllabes.pop()
          // Si la cantidad de sílabas es igual a 0
          if (syllabes.length === 0) {
            // La sílaba de la siguiente línea es la palabra entera
            nextLineSyllabes = currentWord
            // Y detengo el ciclo while
            break
          }
          // Si no ocurre nada de ésto, la sílaba de la próxima línea se le suma ésta sílaba
          nextLineSyllabes = currentSyllabe + nextLineSyllabes
        }

        words.unshift(nextLineSyllabes)
        tempLine = `${tempLine} ${syllabes.join('') ? `${syllabes.join('')}-` : ''}`.trim()
        textLines.push(tempLine)
        tempLine = ''
        nextLineSyllabes = ''

      } else {
        tempLine += ` ${currentWord}`
        // Si es la última línea, y entra en la caja, hacer push
        if (words.length === 0) textLines.push(tempLine.trim())
      }
    }

    let currentX = x
    let currentY = y
    const pathData = []
    const scale = fontSize / font.unitsPerEm
    
    textLines.forEach((line, i) => {
      if (alignText === 'left') currentX = x
      if (alignText === 'center') currentX = x + (boxWidth - withFontWidth(line)) / 2
      if (alignText === 'right') currentX = x + boxWidth - withFontWidth(line)

      if (i > 0) currentY += fontSize

      const glyphs = font.stringToGlyphs(line)
      for (const glyph of glyphs) {
        const glyphWidth = glyph.advanceWidth * scale
  
        // Obtener el path, ajustando la altura
        const path = glyph.getPath(currentX, currentY + fontSize, fontSize)
        pathData.push(path.toSVG())
        currentX += glyphWidth
      }

    })


    const path = this.parser.parse(pathData)

    return {
      g: {
        fill,
        ...path
      }
    }
  }

}

function getTextWidth(text, fontSize, font) {
  const scale = fontSize / font.unitsPerEm;
  return text.split('').reduce((acc, char) => {
    const glyph = font.charToGlyph(char);
    return acc + glyph.advanceWidth * scale;
  }, 0)
}

export default Postercitos