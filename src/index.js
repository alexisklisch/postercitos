import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { XMLParser, XMLBuilder } from 'fast-xml-parser'
import { parse } from 'opentype.js'

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
    const text = 'La verdad es que todo se convierte'
    const words = text.split(' ')

    // Fuente
    const fontResponse = await fetch('https://cdn.jsdelivr.net/fontsource/fonts/montserrat@latest/latin-500-normal.ttf');
    const buffer = await fontResponse.arrayBuffer();
    const font = parse(buffer)
    const scale = fontSize / font.unitsPerEm

    // Líneas de texto
    const textLines = []
    const spaceGlyph = getTextWidth(' ', fontSize, font)
    let tempLine = ''
    for (let i = 0; i < words.length; i++) {
      const word = words[i]
      const wordSize = getTextWidth(word, fontSize, font)
      const lineWidthSize = getTextWidth(tempLine, fontSize, font)
      const sumSizes = lineWidthSize + spaceGlyph + wordSize
      const isBiggerThanBox = sumSizes > boxWidth
      
      console.log(isBiggerThanBox)
      if (isBiggerThanBox) {
        textLines.push(tempLine)
        tempLine = word + ' '
      } else {
        tempLine += word + ' '
      }
      
      if (i + 1 === words.length) textLines.push(tempLine)
    }
    
    const textLinesTrimmed = textLines.map(str => str.trim())
    
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