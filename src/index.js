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
    const [parsedSVG] = await this.#parseSVG(svgPaths)

    return this.builder.build(parsedSVG)
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
        if (textElem['@box-view']) {
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
    const [ x, y, boxWidth, boxHeight ] = textElem['@box-view'].split(',')
    const { ['font-size']: fontSize } = textElem
    const { width: svgWidth, height: svgHeight } = svg

    // Cargar la fuente Montserrat
    const fontResponse = await fetch('https://cdn.jsdelivr.net/fontsource/fonts/montserrat@latest/latin-400-normal.ttf');
    const buffer = await fontResponse.arrayBuffer();
    const font = parse(buffer)

    const text = 'La vida es una moneda, porque que se yo'
    const size = getTextWidth(text, fontSize, font)

    return {
      g: {
        text: [{
          ...textElem,
          '#text': text,
          x,
          y
        }]
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