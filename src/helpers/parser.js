function Parser() {

  function cleanSpacesFromString(s) {
    // Remove leading spaces in string.
    while (s.indexOf(' ') === 0) s = s.substring(1, s.length)
    // Remove trailing spaces in string.
    while (s.lastIndexOf(' ') === (s.length - 1)) s = s.substring(0, s.lastIndexOf(' '))
    // Remove double spaces in string.
    while (s.indexOf('  ') > -1) s = s.replace('  ', ' ')
    return s
  }

  function parseNovaOptionData(html, type) {
    const id = html.substring(html.indexOf('value="') + 7, html.indexOf('">')).replace(/&#(\d+)/g, function (m, n) { return String.fromCharCode(n) })
    let name = html.substring(html.indexOf('">') + 2, html.indexOf('</')).replace(/&#(\d+)/g, function (m, n) { return String.fromCharCode(n) })
    while (name.indexOf('&amp') > -1) {
      name = name.replace('&amp', '&')
    }
    while (name.indexOf(';') > -1) {
      name = name.replace(';', '')
    }

    if (name !== '(Välj ID)') {
      const rawName = name
      let initials
      let firstName
      let lastName
      let className

      if (type.name === 'Lärare' || type.name === 'Elev') {
        if (type.name === 'Lärare' && name.indexOf('(') > -1) {
          // It's a Teacher's name with initials, grab them.
          initials = name.substring(name.indexOf('(') + 1, name.indexOf(')'))
          name = name.substring(0, name.indexOf('('))
        } else if (type.name === 'Elev') {
          if (name.indexOf('  ') > -1) {
            className = name.split('  ')[0]
            name = name.split('  ')[1]
          }
        }

        if (name.indexOf(',') > -1) {
          lastName = name.split(',')[0]
          firstName = name.split(',')[1]
        }

        name = (firstName && lastName) ? (firstName + ' ' + lastName) : ((firstName) ? firstName : lastName)
        if (type.name === 'Elev' && className) {
          name = className + ' ' + name
        } else if (type.name === 'Lärare' && !name) {
          name = initials
        }
      }

      // Clean out double space + space before or after string in first name, last name and full name.
      name = cleanSpacesFromString(name)
      if (firstName) firstName = cleanSpacesFromString(firstName)
      if (lastName) lastName = cleanSpacesFromString(lastName)
      if (initials) initials = cleanSpacesFromString(initials)
      if (className) className = cleanSpacesFromString(className)

      return {
        id: id,
        name: name,
        rawName: rawName,
        firstName: firstName,
        lastName: lastName,
        initials: initials,
        className: className
      }
    }
  }

  function parseNovaBaseData(html) {
    const typeStartString = '<select name="TypeDropDownList" id="TypeDropDownList">'
    const weekStartString = '<select name="WeekDropDownList" id="WeekDropDownList">'
    let table = html.substring( html.indexOf('<table id="table1"'), html.indexOf('</table>') + 8 )
    let complete = false

    const types = []
    if (html.indexOf(typeStartString) === -1) {
      const listContainerHtml = '<div style="FLOAT: left">'

      let listHtml = table.substring( table.indexOf(listContainerHtml) + listContainerHtml.length, table.indexOf('</div>') )
      while (listHtml.indexOf('<select') > -1) {
        let selectHtml = listHtml.substring(listHtml.indexOf('<select'), listHtml.indexOf('</select>') + 9)
        listHtml = listHtml.substring(listHtml.indexOf('</select>') + 9, listHtml.length)

        // Grab the type of schedule
        const typeOption = selectHtml.substring(selectHtml.indexOf('<option'), selectHtml.indexOf('</option>'))
        const typeKey = parseInt(typeOption.substring(typeOption.indexOf('value="') + 7, typeOption.indexOf('">')))
        const type = {
          key: typeKey,
          name: novaTypes[typeKey],
          schedules: []
        }

        // Grab all type entities
        selectHtml = selectHtml.substring(selectHtml.indexOf('</option>') + 9, selectHtml.length)
        while (selectHtml.indexOf('<option') > -1) {
          const entity = parseNovaOptionData(selectHtml.substring(selectHtml.indexOf('<option'), selectHtml.indexOf('</option>') + 9), type)
          if (entity) type.entities.push(entity)
          selectHtml = selectHtml.substring(selectHtml.indexOf('</option>') + 9, selectHtml.length)
        }

        types.push(type)
        complete = true
      }
    } else {
      // Pull out all types from one single <select> list.
      let typeHtml = table.substring( table.indexOf(typeStartString) + typeStartString.length, table.indexOf('</select>') )
      while (typeHtml.indexOf('<option') > -1) {
        const optionHtml = typeHtml.substring(typeHtml.indexOf('<option'), typeHtml.indexOf('</option>') + 9)
        typeHtml = typeHtml.substring(typeHtml.indexOf('</option>') + 9, typeHtml.length)

        const key = optionHtml.substring(optionHtml.indexOf('value="') + 7, optionHtml.indexOf('">')).replace(/&#(\d+)/g, function (m, n) { return String.fromCharCode(n) })
        const name = optionHtml.substring(optionHtml.indexOf('">') + 2, optionHtml.indexOf('</')).replace(/&#(\d+)/g, function (m, n) { return String.fromCharCode(n) })

        if (key !== '(Välj typ)') {
          types.push({
            key: parseInt(key),
            name: name,
            schedules: []
          })
        }
      }
    }

    const weeks = []
    if (html.indexOf(weekStartString) > -1) {
      let weekHtml = html.substring(html.indexOf(weekStartString), html.length)
      weekHtml = weekHtml.substring(0, weekHtml.indexOf('</select>') + 9)

      while (weekHtml.indexOf('<option') > -1) {
        let optionHtml = weekHtml.substring(weekHtml.indexOf('<option'), weekHtml.indexOf('</option>'))
        weekHtml = weekHtml.substring(weekHtml.indexOf('</option>') + 9, weekHtml.length)

        const week = optionHtml.substring(optionHtml.indexOf('value="') + 7, optionHtml.indexOf('">'))
        if (week) weeks.push(week)
      }
    }

    return {
      complete: complete,
      types: types,
      weeks: weeks
    }
  }

  function parseNovaTypeData(html, type) {
    const listStartString = '<select name="ScheduleIDDropDownList" id="ScheduleIDDropDownList">'
    let listHtml = html.substring(html.indexOf(listStartString), html.length)
    listHtml = listHtml.substring(0, listHtml.indexOf('</select>') + 9)

    while (listHtml.indexOf('<option') > -1) {
      const schedule = parseNovaOptionData(listHtml.substring(listHtml.indexOf('<option'), listHtml.indexOf('</option>') + 9), type)
      if (schedule) type.schedules.push(schedule)
      listHtml = listHtml.substring(listHtml.indexOf('</option>') + 9, listHtml.length)
    }
    return type
  }

  /**
   *
   * @param {string} s1
   * @param {string} s2
   */
  function calcStringDistance(s1, s2) {
    s1 = s1.toLowerCase()
    s2 = s2.toLowerCase()

    const costs = []
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i
      for (let j = 0; j <= s2.length; j++) {
        if (i == 0) {
          costs[j] = j
        } else {
          if (j > 0) {
            let newValue = costs[j - 1]
            if (s1.charAt(i - 1) != s2.charAt(j - 1)) {
              newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1
            }
            costs[j - 1] = lastValue
            lastValue = newValue
          }
        }
      }
      if (i > 0) costs[s2.length] = lastValue
    }
    return costs[s2.length]
  }

  /**
   * Calculate the similarity of 2 strings, represented by a % value.
   * @param {string} s1
   * @param {string} s2
   */
  function calcStringSimilarity(s1, s2) {
    let longer = (s1.length < s2.length) ? s2:s1
    let shorter = (s1.length < s2.length) ? s1:s2

    const longerLength = longer.length
    if (longerLength == 0) return 1.0

    return (longerLength - calcStringDistance(longer, shorter)) / parseFloat(longerLength)
  }

  return {
    parseNovaOptionData,
    parseNovaBaseData,
    parseNovaTypeData,
    calcStringSimilarity
  }
}

module.exports = Parser()