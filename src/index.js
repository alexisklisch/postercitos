import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { XMLParser, XMLBuilder } from 'fast-xml-parser'
import { parse } from 'opentype.js'
import { syllabler } from './utils/syllabler.js'
import { replaceWithVariables } from './utils/replaceWithVariables.js'
import { evaluateCondition } from './utils/evaluateCondition.js'

// Entre 24 y 32 ms la versión 0.2
class Postercitos {
  #processedNodes = new Set()

  constructor (config) {
    const { vars, fonts } = config
    // Asignar tipo de variable
    const userVarsEntries = Object.entries(vars)
    this.vars = userVarsEntries.reduce((prev, [key, value]) => {
      prev['user$$' + key] = value
      return prev
    }, {})

    this.fonts = fonts
    // Configurar parser
    const commonConfig = {preserveOrder: true, ignoreAttributes: false, attributeNamePrefix: ''}
    this.parser = new XMLParser(commonConfig)
    this.builder = new XMLBuilder(commonConfig)

  }

  async svgsFrom (designPath, {batch = false} = {}) {
    // Establecer directorios
    this.designDir = join(process.cwd(), designPath)
    // const with a value if is a directory or a file
    const fileName = this.designDir.split('/').pop()
    const isPosterFile = this.designDir.endsWith('.poster')
    if (!isPosterFile) throw new Error('The design path must be a .poster file')

    // Si el nombre de archivo incluye corchete, es el main, si incluye paréntesis, es una variación
    const mainOrVariation = fileName.includes('[') ? 'main' : fileName.includes('(') ? 'variation' : 'default'
    // Extraer el valor ya sea corchete o paréntesis
    const extractedVariation = currentFileName => {
      const variationName = currentFileName.match(/\[(.*?)\]/)[1]
      return [variationName, currentFileName.replace(`[${variationName}]`, '')]
    }

    const rawTemplate = await readFile(this.designDir, {encoding: 'utf-8'})
    const jsonMatch = rawTemplate.match(/<poster-manifest[^>]*>([\s\S]*?)<\/poster-manifest>/)[1]
    if (!jsonMatch) throw new Error('The design file must have a <poster-manifest> tag')

    const { metadata, variables } = JSON.parse(jsonMatch)
    const metadataEntries = Object.entries(metadata || {})
    metadataEntries.forEach(([key, value]) => this.vars['metadata$$' + key] = value)
    const variablesEntries = Object.entries(variables || {})
    variablesEntries.forEach(([key, value]) => this.vars['template$$' + key] = value)

    /*

    ANALIZAR
    const templates = []
    if (mainOrVariation === 'main') {
      const [variationName, variationFileName] = extractedVariation(file)
      templates.push({
        variation: variationName,
        template: rawTemplate
      })
      // Array con rutas de cada diseño excepto el main
      const templateName = await readdir(this.designDir.replace(fileName, ''))

        for (const file of templateName) {
          if (file === fileName || !file.includes(variationFileName)) return
          const [currentVariationName] = extractedVariation(file)
          const path = join(this.designDir.replace(fileName, ''), file)
          const currentTemplate = await readFile(path, {encoding: 'utf-8'})
          templates.push({
            variation: currentVariationName,
            template: currentTemplate
          })
      }
    }
    */



    /*

    // Array con rutas de cada diseño
    const templatesFileNames = await readdir(templatesDir)
    const templatePaths = templatesFileNames.map(file => join(templatesDir, file))


    // Aplicar variables
    for (const templatePath of templatePaths) {
      let rawTemplate = await readFile(templatePath, {encoding: 'utf-8'})
      //const templateName = templatePath.split('/').pop().split('.').slice(0, -1).join('')
      
      // Aplicar las variables del usuario al template
      const templateWithVarsApplied = replaceWithVariables(rawTemplate, this.vars)
      templates.push(templateWithVarsApplied)
    }
    
    // Parsear el SVG
    const parsedSVGs = templates.map(tmplt => this.parser.parse(tmplt))
    
    // Transformar los <poster-textbox>
    for (const parsed of parsedSVGs) {
      await this.#recursiveSVG(parsed, null, null)
    }

    // Buildear aplicando variables later()
    const builded = parsedSVGs.map(svg => {
      const build = this.builder.build(svg).replaceAll('&apos;', "'")
      return replaceWithVariables(build, this.vars, true)
    })

    return builded*/

  }

  async #recursiveSVG (node, parent, keyInParent) {
    
    if (typeof node === 'object') {
      
      for (const [key, value] of Object.entries(node)) {
        // Si no es un elemento tipo poster, continua
        if (!key.startsWith('poster-')) {
          await this.#recursiveSVG(value, node, key)
          continue
        }

        const elementAttrs = node[':@'] || {}
        const nativeAttrs = Object.fromEntries(Object.entries(elementAttrs).filter(([key]) => !key.includes('poster:')))

        const conditionAttr = elementAttrs['poster:condition']
        if (!!conditionAttr && !this.#processedNodes.has(node)) {
          this.#processedNodes.add(node) // Marcar el nodo como procesado
          const result = !!evaluateCondition(conditionAttr, this.vars)
          
          if (!result) {
            parent[keyInParent] = []
            continue
          }

          // Crear una copia de elementAttrs sin 'poster:condition'
           node[':@'] = Object.fromEntries(
            Object.entries(elementAttrs).filter(([key]) => key !== 'poster:condition')
           )
        }

        if (key === 'poster-textbox') {
          // Estableciendo variables
          const [x, y, boxWidth, boxHeight] = (elementAttrs['poster:box-size'] || '0 0 100 100').split(' ').map(Number)
          const boxStroke = elementAttrs['poster:box-stroke']
          const fontSize = Number(elementAttrs['poster:font-size']) || 16
          const textAlign = elementAttrs['poster:text-align'] || 'left'
          const verticalAlign = elementAttrs['poster:vertical-align'] || 'top'
          const textTransform = elementAttrs['poster:text-transform'] || 'none'
          const lineHeight = Number(elementAttrs['poster:line-height']) || 0
          const letterSpacing = Number(elementAttrs['letter-spacing']) || 0
          const fontFamily = elementAttrs['poster:font-family'] || 'Arial'
          const fontWeight = Number(elementAttrs['poster:font-weight']) || 400
          let text = String(value[0]['#text'])

          if (text === '%undefined%') {
            parent[keyInParent] = []
            continue
          }

          if (textTransform === 'none') {}
          else if (textTransform === 'lowercase') text = text.toLowerCase()
          else if (textTransform === 'uppercase') text = text.toUpperCase()

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
              let syllabes = syllabler(currentWord)
              syllabes = restoreCapitalization(currentWord, syllabes)
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

          // Si hay un box stroke, agregar el cuadrado
          if (boxStroke) {
            nuevo.g.unshift({
              rect: [],
              ':@': {
                stroke: boxStroke,
                fill: 'transparent',
                x: x,
                y: y,
                height:boxHeight,
                width: boxWidth
              }})
          }

          if (parent && keyInParent) parent[keyInParent] = nuevo
          continue
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
          continue
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

function restoreCapitalization(originalWord, syllabes) {
  let restored = [];
  let charIndex = 0;

  for (const syllabe of syllabes) {
    let restoredSyllabe = '';

    for (let i = 0; i < syllabe.length; i++) {
      if (charIndex < originalWord.length && originalWord[charIndex] === originalWord[charIndex].toUpperCase()) {
        restoredSyllabe += syllabe[i].toUpperCase();
      } else {
        restoredSyllabe += syllabe[i];
      }
      charIndex++;
    }

    restored.push(restoredSyllabe);
  }

  return restored;
}

export default Postercitos
export { imageB64 } from './utils/imageB64.js'