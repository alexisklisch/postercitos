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
    let varValue = userVars[tmpltVar.variable] || tmpltVar.default

    // Si la variable es requerida pero no tiene valor, lanzar error
    if (!!tmpltVar.required && !varValue) {
      if (tmpltVar.default) {
        varValue = tmpltVar.default
      } else {
        throw new Error(`La variable ${tmpltVar.variable} es requerida y no tiene valor`)
      }
    }


    if (!!tmpltVar.condition) {
      if (tmpltVar.condition[0] === '"') tmpltVar.condition = tmpltVar.condition.slice(1, -1)
      const cosa = evaluateCondition(tmpltVar.condition, userVars)
    }

    // Reemplazar en el SVG
    const wordToRegex = `:${tmpltVar.variable}`
    const regexWithVar = new RegExp(`\\{\\{[^{}]*${wordToRegex}[^{}]*\\}\\}`, 'g')
    
    const textToReplace = [...svg.matchAll(regexWithVar)].map(match => match[0])
    svg = svg.replaceAll(textToReplace, varValue || '') // Reemplazo seguro con fallback
  })

  return svg
}
