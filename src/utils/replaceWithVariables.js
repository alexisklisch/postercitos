import { evaluateCondition } from "./evaluateCondition.js"

export const replaceWithVariables = (svg, userVars) => {
  const regex = /\{\{([^}]+)\}\}/g

  // Extraer variables del template
  const templateVars = [...svg.matchAll(regex)].reduce((acc, currMatch) => {
    const variableStatements = currMatch[1].split(',').map(statement => statement.trim())

    const variableObject = variableStatements.reduce((obj, statement) => {
      let [param, value] = statement.split(':').map(item => item.trim())
      if (param === 'default') value = value.slice(1, -1) // Remover las comillas de los valores por defecto
      obj[param] = value // Construir el objeto con cada parámetro
      return obj
    }, {})

    acc.push(variableObject)
    return acc
  }, [])


  // Recorrer las variables del template
  templateVars.forEach(tmpltVar => {
    // Obtener valor de las variables del usuario o usar el valor por defecto
    let varValue = evaluateCondition(tmpltVar.value, userVars)
    // Si la variable es requerida pero no tiene valor, lanzar error
    if (!!tmpltVar.required && !varValue) {
      if (tmpltVar.default) {
        varValue = tmpltVar.default
      } else {
        varValue = '%undefined%'
      }
    }
    // Reemplazar en el SVG
    const wordToRegex = escapeRegExp(`:${tmpltVar.value}`)
    const regexWithVar = new RegExp(`\\{\\{[^{}]*${wordToRegex}[^{}]*\\}\\}`, 'g')
    
    const [ textToReplace ] = [...svg.matchAll(regexWithVar)].map(match => match[0])
    svg = svg.replaceAll(textToReplace, varValue || '') // Reemplazo seguro con fallback
  })

  return svg
}

const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escapa todos los caracteres especiales
}