export const replaceWithVariables = (svg, userVars) => {
  const regex = /\{\{([^}]+)\}\}/g

  const templateVars = [...svg.matchAll(regex)].reduce((acc, currMatch) => {
    const variableStatements = currMatch[1].split(',').map(statement => statement.trim())

    const variableObject = variableStatements.reduce((obj, statement) => {
      let [param, value] = statement.split(':').map(item => item.trim())
      if (param === 'default') value = value.slice(1, -1)
      obj[param] = value // Construir el objeto con cada parámetro
      return obj
    }, {})

    acc.push(variableObject)
    return acc
  }, [])


  const userVarsEntries = Object.entries(userVars)
  templateVars.forEach(tmpltVar => {
    const [varName, varValue] = userVarsEntries.find(([key, value]) => key === tmpltVar.variable)
    const wordToRegex = `:${varName}`
    const regexWithVar = new RegExp(`\\{\\{[^{}]*${wordToRegex}[^{}]*\\}\\}`, 'g')
    
    const textToReplace = [...svg.matchAll(regexWithVar)].map(match => match[0])

    svg = svg.replaceAll(textToReplace, varValue)
  })


  return svg

}