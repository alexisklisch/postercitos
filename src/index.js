import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { XMLParser, XMLBuilder } from 'fast-xml-parser'
import { parse } from 'opentype.js'
import { syllabler } from './utils/syllabler.js'

class Postercitos {
  constructor ({vars}) {
    this.vars = vars
    // Configurar parser
    const commonConfig = {preserveOrder: true, ignoreAttributes: false, attributeNamePrefix: ''}
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

    // Leo y parseo los .svg para tenerlo de forma conveniente
    const SVGsTemplatePromises = svgPaths.map(async (path) => this.#prepareTemplateFile(path))
    const SVGsTemplatesResult = await Promise.allSettled(SVGsTemplatePromises).then(svg => svg)
    const svgsTemplates = SVGsTemplatesResult.map(promise => promise.value)
    // Convierto los templates en svgs funcionales
    const svgsPromises = svgsTemplates.map(template => this.#drawSVG(template))
    const svgsResult = await Promise.allSettled(svgsPromises).then(svg => svg)
    const svgs = svgsResult.map(promise => [promise.value])

    return svgs.map(svg => this.builder.build(svg))
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
    const parsedXML = this.parser.parse(svgRaw)

    return {
      content: parsedXML,
      variables
    }
  }

  async #drawSVG (svgTemplate) {
    const { content, variables } = svgTemplate
    const [ body ] = content
    
    // Recorro cada elemento del svg
    for (let i = 0; i < body.svg.length; i++) {
      const item = body.svg[i]
      // Guardo las keys de cada elemento
      const keys = Object.keys(item)
      const [ type ] = keys
      // Si el elemento es de tipo texto...
      if (type === 'text') {
        // Guarda en una variable el texto
        let text = item.text[0]['#text']
        variables.forEach(svgVariable => {
          // Expresión regular para reemplazar c/ variable
          const regex = new RegExp(svgVariable.rawVariable, 'g')
          const existVar = text.includes(svgVariable.rawVariable)
          if (existVar) text = text.replace(regex, this.vars[svgVariable.value])
        })
        console.log('antes -> ' + JSON.stringify(body.svg[i]))
        body.svg[i].text[0]['#text'] = text
        console.log('despu -> ' + JSON.stringify(body.svg[i]))

        // Hago una adaptación del texto
        const shapes = await this.#adaptText(item)
        // y reemplazo el texto por los shapes
        body.svg[i] = shapes
      }
    }
    return body

  }

  async #adaptText(textObject) {
    // Establezco los atributos
    const attributes = textObject[':@']
    const [ x, y, boxWidth, boxHeight ] = attributes['--box-view'].split(',').map(Number)
    const fontSize = +attributes['font-size']
    const fill = attributes['fill'] || undefined
    const alignText = attributes['--align-text']
    const lineHeight = +attributes['--line-height'] || 0
    const letterSpacing = +attributes['letter-spacing']

    // Usar fuente
    const fontResponse = await fetch('https://cdn.jsdelivr.net/fontsource/fonts/open-sans@latest/latin-300-normal.ttf');
    const buffer = await fontResponse.arrayBuffer();
    const font = parse(buffer)
    // Utilidad para calcular siempre con la fuente seleccionada
    const withFontWidth = text => getTextWidth(text, fontSize, font)

    // Texto a escribir
    const text = textObject.text[0]['#text']
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

      if (i > 0) currentY += fontSize + lineHeight

      const glyphs = font.stringToGlyphs(line)
      for (const glyph of glyphs) {
        const glyphWidth = glyph.advanceWidth * scale
  
        // Obtener el path, ajustando la altura
        const path = glyph.getPath(currentX, currentY + fontSize, fontSize)
        pathData.push(path.toSVG())
        currentX += glyphWidth + letterSpacing
      }

    })

    const path = this.parser.parse(pathData)

    return {
      g: path,
      ":@": {}
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