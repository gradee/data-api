// Dependencies
const luxon = require('luxon')

function Parser() {

  const pdfColorIndex = [
    '#000000',    // 0
    '#ffffff',    // 1
    '#4c4c4c',    // 2
    '#808080',    // 3
    '#999999',    // 4
    '#c0c0c0',    // 5
    '#cccccc',    // 6
    '#e5e5e5',    // 7
    '#f2f2f2',    // 8
    '#008000',    // 9
    '#00ff00',    // 10
    '#bfffa0',    // 11
    '#ffd629',    // 12
    '#ff99cc',    // 13
    '#004080',    // 14
    '#9fc0e1',    // 15
    '#5580ff',    // 16
    '#a9c9fa',    // 17
    '#ff0080',    // 18
    '#800080',    // 19
    '#ffbfff',    // 20
    '#e45b21',    // 21
    '#ffbfaa',    // 22
    '#008080',    // 23
    '#ff0000',    // 24
    '#fdc59f',    // 25
    '#808000',    // 26
    '#bfbf00',    // 27
    '#824100',    // 28
    '#007256',    // 29
    '#008000',    // 30
    '#000080',    // Last + 1
    '#008080',    // Last + 2
    '#800080',    // Last + 3
    '#ff0000',    // Last + 4
    '#0000ff',    // Last + 5
    '#008000',    // Last + 6
    '#000000'     // Last + 7
  ]
  const scheduleTypes = [
    { name: 'Lärare', slug: 'teachers' },
    { name: 'Klass', slug: 'classes' },
    { name: 'Grupp', slug: 'groups' },
    { name: 'Elev', slug: 'students' },
    { name: 'Sal', slug: 'rooms' },
    { name: 'Ämne', slug: 'subjects' },
    { name: 'Kurskod', slug: 'courses' },
    { name: 'Samling', slug: 'aulas' }
  ]

  function sortArrayByKey(arr, key) {
    arr.sort((a, b) => {
      if (a[key] > b[key]) return 1
      if (a[key] < b[key]) return -1
      return 0
    })
  }

  function stringIsTime(str) {
    return /^([0-1]?[0-9]|2[0-4]):([0-5][0-9])(:[0-5][0-9])?$/.test(str)
  }

  function precisionRound(number, precision) {
    var factor = Math.pow(10, precision)
    return Math.round(number * factor) / factor
  }

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
          name: scheduleTypes[typeKey].name,
          schedules: []
        }

        // Grab all type entities
        selectHtml = selectHtml.substring(selectHtml.indexOf('</option>') + 9, selectHtml.length)
        while (selectHtml.indexOf('<option') > -1) {
          const entity = parseNovaOptionData(selectHtml.substring(selectHtml.indexOf('<option'), selectHtml.indexOf('</option>') + 9), type)
          if (entity) type.schedules.push(entity)
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

  function parsePdfSchedule(raw, week) {
    /**
     * Pixel ratio
     * 1 = 16
     *
     * Ex:
     * 0.438 = 7 px
     * 1.25 = 20 px
     * 0.5 = 8 px
     * 1.063 = 17 px
     * 0.375 = 6
     * 0,875 = 14
     *
     * The PDF Parser always rounds upwards (for example: 17 / 16 is actually 1.0625)
     *
     * For PDF Parser docs, visit: https://github.com/modesty/pdf2json
     */

    const weekdays = []
    const lessons = []
    const borders = {}
    const hours = 9
    const minutes = 60 * hours

    const page = raw.formImage.Pages[0]
    let fills = page.Fills
    let texts = page.Texts

    // Pull out all time Strings into a separate Array.
    // Frame times is between x = 1.875 -> 2.563
    const timeFrameObjects = []
    const timeStrings = []
    texts.sort((a, b) => a.y - b.y || a.x - b.x)
    texts = texts.filter(text => {
      // Grab the frame texts so that you can calculate the distance between hour indicators.
      if (text.x === 1.875 || text.x === 2.563) {
        if (text.R[0].T.indexOf('%3A') > -1) text.R[0].T = text.R[0].T.replace('%3A', ':')
        if (stringIsTime(text.R[0].T)) {
          timeFrameObjects.push(text)
        }
      }
      if (text.R[0].T.indexOf('%3A') > -1) text.R[0].T = text.R[0].T.replace('%3A', ':')
      if (stringIsTime(text.R[0].T)) {
        timeStrings.push(text)
        return false
      } else {
        return text
      }
    })

    let timeDistance = 0
    let additions = 0
    for (let i = 0; i < (timeFrameObjects.length - 1); i++) {
      timeDistance += timeFrameObjects[i + 1].y - timeFrameObjects[i].y
      additions++
    }
    timeDistance = Math.round((timeDistance / additions) / 0.05) * 0.05 // Round to event 0.05 (3.49 > 3.5 / 3.54 > 3.55)
    timeDistance = Math.round(timeDistance * 100) / 100 // Round to 2 decimals.

    const firstHourObj = timeFrameObjects[0]
    const firstHourInt = parseInt(timeFrameObjects[0].R[0].T.split(':')[0])
    const hourHeight = timeDistance * 16
    const minuteHeight = hourHeight / 60

    // 34.063 - 33.563 = 0,5 
    // 9.875 - 9.375 = 0,5
    // So the position Y difference between the hour and the lesson on that hour, is always 0,5. YAY!!! :D

    /**
     * Go through fills
     */

    // Sort by height, and remove the grey background boxes.
    sortArrayByKey(fills, 'h')
    // Filter out the two main "frame" fills on the side of the schedule
    fills = fills.filter(fill => (fill.h <= 31.125))
    const weekBacks = fills.splice(fills.length - 5, 5)
    const topStart = weekBacks[0].y * 16

    const distanceToFirstHour = ((firstHourObj.y + 0.5) - weekBacks[0].y) * 16
    const minutesToFirstHour = Math.round((distanceToFirstHour / minuteHeight) / 5) * 5

    // Grab any background box and define the bottom border of the schedule using the box's Y position and it's height.
    borders.bottom = weekBacks[0].y + weekBacks[0].h
    sortArrayByKey(weekBacks, 'x')

    // Sort by Y position
    sortArrayByKey(fills, 'y')
    // If the first item basically doesn't exist (no position, no proportiones), delete it.
    if (!fills[0].x && !fills[0].y && !fills[0].w && !fills[0].h) fills.shift()

    // Retrieve the fills marking the days of the week and remove them from the fill list.
    const weekdayFills = fills.splice(0, 5)
    // Order the weekday fills by X position in order to map out the schedule borders.
    sortArrayByKey(weekdayFills, 'x')
    // Finally map out the last border positions of the schedule
    borders.top = weekdayFills[0].y
    borders.left = weekdayFills[0].x
    borders.right = weekdayFills[weekdayFills.length -1].x + weekdayFills[weekdayFills.length -1].w
    weekdayFills.forEach(fill => {
      weekdays.push({
        borders: {
          top: fill.y,
          bottom: precisionRound(fill.y + fill.h, 2),
          left: fill.x,
          right: precisionRound(fill.x + fill.w, 2)
        },
        fill: fill
      })
    })

    // Order fills by height in order to find the time fills.
    sortArrayByKey(fills, 'h')

    // Sort out the time fills based on ther w-h ratio and color.
    const timeFills = []
    fills = fills.filter(fill => {
      if (
        (
          (fill.h === 0.438 && fill.w === 1.25) ||
          (fill.h === 0.5 && fill.w === 1.063) ||
          (fill.h === 0.375 && fill.w === 0.875)
        ) && fill.clr === 1
      ) {
        timeFills.push(fill)
      } else {
        return true
      }
    })

    // The fills that are now left should only be lessons.
    let dt = luxon.DateTime.local().setZone('Europe/Stockholm')
    dt = dt.set({ weekNumber: week, })

    fills.forEach(fill => {
      let day
      weekdayFills.forEach((dayFill, i) => {
        if (fill.x >= dayFill.x && fill.x < (dayFill.x + dayFill.w)) day = i
      })
      let fdt = dt.set({ weekday: (day + 1), hour: firstHourInt, minute: 0, second: 0, millisecond: 0 })
      fdt = fdt.minus({ minutes: minutesToFirstHour })

      const startsAfter = Math.round((((fill.y * 16) - topStart) / minuteHeight) / 5) * 5
      const lastsFor = Math.round(((fill.h * 16) / minuteHeight) / 5) * 5

      const starts = fdt.plus({ minutes: startsAfter })
      const ends = starts.plus({ minutes: lastsFor })

      lessons.push({
        day: day,
        width: fill.w,
        height: fill.h,
        position: {
          x: fill.x,
          y: fill.y
        },
        borders: {
          top: fill.y,
          bottom: fill.y + fill.h,
          left: fill.x,
          right: fill.x + fill.w
        },
        texts: [],
        meta: {
          text: '',
          startTime: starts,
          endTime: ends,
          color: (fill.clr > -1) ? pdfColorIndex[fill.clr]:fill.oc
        }
      })
    })


    /**
     * Go through texts.
     */

    // Sort by Y Position
    sortArrayByKey(texts, 'y')

    // Go through all texts and add 0.25 to the
    // x and y position since the difference between
    // the rendered PDF and data is generally 0.25
    //
    // Same princimple for 0.98 added to the text width.
    //
    // Also calculate the x2 value by adding the
    // width, divided by 16, to the x value.
    texts.forEach((text, i)=> {
      texts[i].x += 0.25
      texts[i].y += 0.25
      texts[i].w -= 0.98
      texts[i].x2 = texts[i].x + (texts[i].w / 16)
    })

    // Retrieve the first 5 texts that all will be the weekday texts and store them.
    const weekdayTexts = texts.splice(0, 5)
    sortArrayByKey(weekdayTexts, 'x')
    weekdayTexts.forEach((text, i) => {
      weekdays[i].text = text
    })

    /**
     * To get the % of how much an element is overlapping another,
     * you need to compare the overlapping elements x1 and x2 values
     * with the background elements x2 value most importantly
     *
     * Ex:
     *       bx1                bx2
     * Back: [-----------------]
     * Front:              [-------------]
     *                     fx1           fx2
     *
     * So how do we calculate the overlapping?
     *
     * fx1 = 10
     * fx2 = 20
     *
     * bx2 = 13
     *
     * 1 - (fx1 / bx2) = 0.2307692308 ≈ 23% <- This is how much it overlaps.
     */

    texts.sort((a, b) => a.y - b.y || a.x - b.x)

    texts.forEach(text => {
      lessons.forEach(lesson => {
        if (
          text.x >= lesson.borders.left &&
          text.x < lesson.borders.right &&
          text.y >= lesson.borders.top &&
          text.y < lesson.borders.bottom
        ) {
          // Okay so this text is generally in view.
          // But we have to check "how much" in view it is.

          // First, let's se if it overlaps the edge of the fill.
          if (text.x2 > lesson.borders.right) {
            // It does. Well, let's find out if more than
            // half of the text is outside the fill. If it is,
            // we can consider it not part of that fill.
            if ((text.x / lesson.borders.right) < 0.5) {
              // Less than half of the text is outside
              // the fill, so we're all good.
              lesson.texts.push( decodeURIComponent(text.R[0].T) )
              lesson.meta.text = cleanSpacesFromString(lesson.texts.join(' '))
            }
          } else {
            // You're all good, the text is inside the fill.
            lesson.texts.push( decodeURIComponent(text.R[0].T) )
            lesson.meta.text = cleanSpacesFromString(lesson.texts.join(' '))
          }
        }
      })
    })

    lessons.sort((a, b) => a.position.x - b.position.x || a.position.y - b.position.y)
    return lessons
  }

  function parseLessonTitle(title, typeKey, schedules, courseList) {
    const originalTitle = title

    // Remove time of year indicator (Läsår, Vt, Ht)
    title = title.replace('Läsår', '')
    title = title.replace('Vt', '')
    title = title.replace('Ht', '')

    // Remove any comma's before parsing.
    while (title.indexOf(',') > -1) {
      title = title.replace(',', ' ')
    }

    const courses = []
    for (let code in courseList) {
      if (title.toLowerCase().indexOf(courseList[code].toLowerCase()) > -1 || title.indexOf(code) > -1) {
        courses.push(code)
      }
    }

    const lessonStrings = []
    if (courses.length > 1) {
      courses.forEach((code, i) => {
        const startIndex = originalTitle.indexOf(courseList[code])
        const endIndex = (i < (courses.length - 1)) ? originalTitle.indexOf(courseList[courses[i + 1]]) - 1 : originalTitle.length
        lessonStrings.push(originalTitle.substring(startIndex, endIndex))
      })
    } else {
      lessonStrings.push(title)
    }

    const lessons = []
    lessonStrings.forEach(titleString => {
      if (!titleString) return
      
      const results = {
        title: ''
      }

      let langCourse
      let langCourseTitle
      if (titleString.indexOf('Moderna språk') > -1) {
        const pattern = /\bModerna\b \bSpråk\b [A-z\ åäöÅÄÖ]+ [1-7]/gmi
        const match = titleString.match(pattern)
        if (match) {
          let string = match[0]
          titleString = titleString.replace(match[0], '')
          string = string.replace(/\bModerna\b \bSpråk\b /gmi, '')
          const number = parseInt(string.match(/[1-7]/)[0])
          string = string.replace(/ [1-7]/, '')

          langCourse = 'Moderna språk ' + number
          langCourseTitle = langCourse + ' (' + string + ')'
        }
      }

      let guarenteedTitle = ''
      let titleCourseCode = ''
      for (let code in courseList) {
        const course = courseList[code]
        if (titleString.toLowerCase().indexOf(course.toLowerCase()) > -1) {
          titleCourseCode = code
          guarenteedTitle = course
          const cIndex = titleString.toLowerCase().indexOf(course.toLowerCase()) + course.toLowerCase().length
          titleString = titleString.substr(cIndex, titleString.length)
        } else if (langCourse && langCourse === course) {
          titleCourseCode = code
          guarenteedTitle = langCourseTitle
        }
      }

      const titleParts = titleString.split(' ')
      for (let code in courseList) {
        const texts = []
        titleParts.forEach(part => {
          if (part.indexOf(code) > -1) {
            texts.push(part)
            titleString = titleString.replace(part, '')
          }
        })
        if (texts.length) {
          if (code === titleCourseCode) titleCourseCode = ''
          if (!results.hasOwnProperty('courses')) results.courses = []
          results.courses.push({
            name: courseList[code],
            code: code,
            groups: texts
          })
        }
      }

      if (titleCourseCode) {
        if (!results.hasOwnProperty('courses')) results.courses = []
        results.courses.push({
          name: courseList[titleCourseCode],
          code: titleCourseCode
        })
        titleCourseCode = ''
      }

      schedules.forEach(schedule => {
        if ((typeKey === 1 && schedule.typeKey !== 1) || typeKey !== 1) {
          const searchKey = schedule.typeKey === 0 ? schedule.initials : schedule.name
          const keyIndex = titleString.indexOf(searchKey)
          if (keyIndex > -1) {
            const charBefore = titleString.substr(keyIndex - 1, 1).match(/[a-z]/i)
            const charAfter = titleString.substr(keyIndex + searchKey.length, 1).match(/[a-z]/i)
            if (!charBefore && !charAfter) {
              titleString = titleString.replace(searchKey, '')
              if (!results.hasOwnProperty([scheduleTypes[schedule.typeKey].slug])) {
                results[scheduleTypes[schedule.typeKey].slug] = []
              }
              results[scheduleTypes[schedule.typeKey].slug].push({
                name: schedule.name,
                id: schedule.id
              })
            }
          }
        }
      })

      // Remove any remaining colon's
      while (titleString.indexOf(':') > -1) {
        titleString = titleString.replace(':', '')
      }
      // Clean the title, and if it is tied to a course, set the title to the course's title
      results.title = guarenteedTitle ? guarenteedTitle : cleanSpacesFromString(titleString)

      lessons.push(results)
    })

    return lessons
  }

  return {
    parseNovaBaseData,
    parseNovaTypeData,
    parsePdfSchedule,
    parseLessonTitle
  }
}

module.exports = Parser()