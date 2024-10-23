import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { XMLParser, XMLBuilder } from 'fast-xml-parser'
import { parse } from 'opentype.js'
import { syllabler } from './utils/syllabler.js'
import { replaceWithVariables } from './utils/replaceWithVariables.js'

// Entre 24 y 32 ms la versión 0.2
class Postercitos {
  constructor (config) {
    const { vars, fonts } = config
    this.userVars = vars
    this.fonts = fonts
    // Configurar parser
    const commonConfig = {preserveOrder: true, ignoreAttributes: false, attributeNamePrefix: ''}
    this.parser = new XMLParser(commonConfig)
    this.builder = new XMLBuilder(commonConfig)
  }

  async svgsFrom (designPath, {batch = false} = {}) {
    // Establecer directorios
    this.designDir = join(process.cwd(), designPath)
    const manifestPath = join(this.designDir, 'manifest.json') //📄 ruta /manifest.json
    const templatesDir = join(this.designDir, 'templates') //📂 ruta templates/

    // Parsear el manifest
    const manifestRaw = await readFile(manifestPath, { encoding: 'utf-8' })
    const manifest = JSON.parse(manifestRaw)
    const { assets, metadata } = manifest

    // Agregar variables intrínsecas a las variables
    const metadataEntries = Object.entries(metadata)
    metadataEntries.forEach(([key, value]) => this.userVars['metadata%' + key] = value)

    // Array con rutas de cada diseño
    const templatesFileNames = await readdir(templatesDir)
    const templatePaths = templatesFileNames.map(file => join(templatesDir, file))

    const templates = []
    
    // Aplicar variables
    for (const templatePath of templatePaths) {
      let rawTemplate = await readFile(templatePath, {encoding: 'utf-8'})
      //const templateName = templatePath.split('/').pop().split('.').slice(0, -1).join('')
      
      // Aplicar las variables del usuario al template
      const templateWithVarsApplied = replaceWithVariables(rawTemplate, this.userVars)
      templates.push(templateWithVarsApplied)
    }
    
    // Parsear el SVG
    const parsedSVGs = templates.map(tmplt => this.parser.parse(tmplt))
    
    // Transformar los <poster-textbox>
    for (const parsed of parsedSVGs) {
      await this.#recursiveSVG(parsed, null, null)
    }
    // Buildear el SVG
    const builded = parsedSVGs.map(svg => this.builder.build(svg))
    return builded

  }

  async #recursiveSVG (node, parent, keyInParent) {

    if (typeof node === 'object') {
  
      for (const [key, value] of Object.entries(node)) {
        const elementAttrs = node[':@'] || {}
        const nativeAttrs = Object.fromEntries(Object.entries(elementAttrs).filter(([key]) => !key.includes('poster:')))
        
        if (key === 'poster-textbox') {
          // Estableciendo variables
          const [x, y, boxWidth, boxHeight] = (elementAttrs['poster:box-view'] || '0,0,100,100').split(',').map(Number)
          const fontSize = Number(elementAttrs['poster:font-size']) || 16
          const textAlign = elementAttrs['poster:text-align'] || 'left'
          const verticalAlign = elementAttrs['poster:vertical-align'] || 'top'
          const lineHeight = Number(elementAttrs['poster:line-height']) || 0
          const letterSpacing = Number(elementAttrs['letter-spacing']) || 0
          const fontFamily = elementAttrs['poster:font-family'] || 'Arial'
          const fontWeight = Number(elementAttrs['poster:font-weight']) || 400
          const text = value[0]['#text'] || 'undefined'

          // Seleccionar fuente actual
          const selectedFont = this.fonts.find(font => font.name === fontFamily && font.weight === fontWeight)
          if (!selectedFont) throw new Error('<poster-textbox/> debe tener al menos una fuente válida.')
          const buffer = selectedFont.data
          const font = parse(buffer)
          // Utilidad para calcular siempre con la fuente seleccionada
          const withFontWidth = text => getTextWidth(text, fontSize, font, letterSpacing)
          
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

          const AllLinesSize = textLines.length * fontSize + (textLines.length - 1) * lineHeight
          if (verticalAlign === 'middle') currentY = y + (boxHeight - AllLinesSize) / 2
          else if (verticalAlign === 'bottom') currentY = y + boxHeight - AllLinesSize
          
          textLines.forEach((line, i) => {
            if (textAlign === 'left') currentX = x
            else if (textAlign === 'center') currentX = x + (boxWidth - withFontWidth(line)) / 2
            else if (textAlign === 'right') currentX = x + boxWidth - withFontWidth(line)

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

          const nuevo = {
            g: path,
            ':@': {
              ...nativeAttrs
            }
          }
  
          if (parent && keyInParent) parent[keyInParent] = nuevo
        }

        if (key === 'poster-image') {
          const src = elementAttrs['poster:src']
          const [ srcType, ...assetDataArray ] = src.split('%')
          const assetData = assetDataArray.join('%')

          let base64File = ''
          if (srcType === 'assets') {
            const imgAssetPath = join(this.designDir,'assets', 'images', assetData)
            base64File = await readFile(imgAssetPath, {encoding: 'base64'})
          }

          const imgConstructor = {
            image: [],
            ':@': {
              'href':`data:image/jpeg;base64,${base64File}`,
              ...nativeAttrs
            }
          }

          if (parent && keyInParent) parent[keyInParent] = imgConstructor

        }
  
        if (key !== ':@') await this.#recursiveSVG(value, node, key)
      }
  
    }
  }
  
}

// Función externa modificada para incluir kerning
function getTextWidth(text, fontSize, font, kerning) {
  const scale = fontSize / font.unitsPerEm;
  let width = 0
  const glyphs = font.stringToGlyphs(text)
  for (let i = 0; i < glyphs.length; i++) {
    const glyph = glyphs[i]
    width += glyph.advanceWidth * scale
    
    // Si hay kerning, calcular entre pares de glifos
    if (kerning && i < glyphs.length - 1) {
      width += kerning
    }
  }

  return width
}

export default Postercitos