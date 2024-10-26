import { evaluateCondition } from "./evaluateCondition.js"

export const replaceWithVariables = (svg, userVars) => {
  const regex = /\{\{([^}]+)\}\}/g

  // Extraer variables del template
  const templateVars = [...svg.matchAll(regex)].map(currMatch => {
    const variableStatements = currMatch[1].trim()
    
    const variableObject = {}
    
    // Detectar `expr(...)` y extraer su contenido sin dividir por comas dentro
    const exprMatch = variableStatements.match(/expr\(((?:[^)(]+|\((?:[^)(]+|\([^)(]*\))*\))*)\)/)
    if (exprMatch) {
      variableObject.expr = exprMatch[1] // Extraer solo el contenido dentro de expr(...)
    }

    // Detectar `required()` como una bandera sin valor
    if (variableStatements.includes('required()')) {
      variableObject.required = true
    }
    
    return { ...variableObject, rawText: currMatch[0] }
  })

  // Recorrer las variables del template
  templateVars.forEach(tmpltVar => {
    let varValue = undefined

    // Si expr existe, evaluamos la expresión
    if (tmpltVar.expr) {
      varValue = evaluateCondition(tmpltVar.expr, userVars)
      console.log(varValue)
    }

    // Si la variable es requerida y no tiene valor, lanzar error o usar default
    if (tmpltVar.required && !varValue) {
      varValue = '%undefined%' // o cualquier valor por defecto o de error
    }

    // Reemplazar en el SVG con el valor obtenido o un placeholder
    svg = svg.replaceAll(tmpltVar.rawText, varValue || '')
  })

  return svg
}

const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escapa todos los caracteres especiales
}
