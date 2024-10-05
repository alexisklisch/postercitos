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
    const parsedSVG = await this.#parseSVG(svgPaths)

    return parsedSVG.map(parsedItem => this.builder.build(parsedItem))
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
    const alignText = textElem['--align-text']
    
    // Fuente
    const fontResponse = await fetch('https://cdn.jsdelivr.net/fontsource/fonts/montserrat@latest/latin-500-normal.ttf');
    const buffer = await fontResponse.arrayBuffer();
    const font = parse(buffer)
    // Test: Utilidad para calcular siempre con la fuente seleccionada
    const withFontWidth = text => getTextWidth(text, fontSize, font)

    // Test: Texto a escribir
    const text = 'La vida es una moneda porque aquel que la rebusca la tiene.'
    // Test: Crear un array de palabras
    const words = text.split(' ')
    // Test: Array con las líneas
    const textLines = []
    // Test: Linea temporar
    let tempLine = ''
    // Test: Analiza el width de <espacio> y <guión>
    const spaceWidthSize = withFontWidth(' ')
    const dashWidthSize = withFontWidth('-')

    while (words.length >= 1) {
      // Test: Verifica si es la última palabra
      const isLastWord = words.length - 1 === 0
      // Test: selecciona y elimina la primera word[]
      const currentWord = words.shift()
      // Test: Analizar nuevos espacios
      const fullTempLineFontWidth = withFontWidth(`${tempLine} ${currentWord}`)
      const isBiggerThanBox = fullTempLineFontWidth > boxWidth

      // Test: Evalúa si el texto es la última palabra
      if (isBiggerThanBox) {
        // Test: Separo en sílabas
        const syllabes = syllabler(currentWord)
        let newLastWordLine = currentWord
        let restOfWord = ''
        let counter = syllabes.length


        // Test: mientras que el tamaño de la tempLine + el rejunte
        // Test: de las sílabas sea mayor al width de la caja...
        while (withFontWidth(`${tempLine} ${syllabes.join('')}`) > boxWidth) {
          // Test: Quitamos la última sílaba
          const removedSyllabe = syllabes.pop()
          restOfWord += removedSyllabe
          newLastWordLine = syllabes.join('')
          counter--
          if (counter === 0) break
        }

        console.log( restOfWord)

        textLines.push(tempLine)
        tempLine = ''
      } else {
        tempLine += ` ${currentWord}`
      }

      /*
      if (isBiggerThanBox) {
        for (const syllabe of syllabler(currentWord)) {
          const syllabeSize = getTextWidth(syllabe, fontSize, font)
          const sumSizesWithSillabe = lineWidthSize + spaceGlyph + syllabeSize
          console.log(sumSizesWithSillabe)
        }

        textLines.push(tempLine)
        tempLine = currentWord + ' '
      } else {
        tempLine += currentWord + ' '
      }

      if (words.length - 1 <= 0) textLines.push(tempLine)*/
    }

    console.log(textLines)
    
    /*
    ** AHORA TENGO QUE PASAR LÍNEA POR LÍNEA
    ** PROCURANDO QUE EL TEXTO QUEDE CENTRADO
    ** LUEGO VOY A ADAPTARLO SEGUN EL ALIGN TEXT
    */

    /*

    let currentX = x
    let currentY = y
    const glyphs = font.stringToGlyphs(text)
    const pathData = []

    for (const glyph of glyphs) {
      const glyphWidth = glyph.advanceWidth * scale

      if (currentX + glyphWidth > x + boxWidth) {
        currentY += fontSize
        currentX = x
      }

      // Obtener el path, ajustando la altura
      const path = glyph.getPath(currentX, currentY + fontSize, fontSize)
      pathData.push(path.toSVG())
      currentX += glyphWidth
    }

    const path = this.parser.parse(pathData)

    return {
      g: {
        ...path
      }
    }*/
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