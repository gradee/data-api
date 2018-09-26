// Dependencies
const fs = require('fs')
const luxon = require('luxon')
const request = require('request')
const pdfp = require('pdf2json')
const async = require('async')
const moment = require('moment')
const crypto = require('crypto')

// Helpers
const factory = require('./factory')
const parser = require('./parser')

function Nova() {

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

  const colorIndex = [
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

  /**
   * Validation methods
   */

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

  /**
   * Parse methods
   */

  function cleanBlockTitleString(string) {
    return string.replace('<td>', '').replace('</td>', '').replace('Block: ', '')
  }

  function splitTimeDurationString(string) {
    const times = string.replace('<td>', '').replace('</td>', '').split(' - ')

    return {
      startTime: times[0],
      endTime: times[1]
    }
  }

  function tableRowsAreMultiple(rows) {
    let count = 0
    rows.forEach(row => {
      if (row.match(/([01]?[0-9]|2[0-3]):[0-5][0-9] ?- ?([01]?[0-9]|2[0-3]):[0-5][0-9]/)) count++
    })
    return (count > 1)
  }

  function parseTableTimeRow(string) {
    const firstString = string.substring(string.indexOf('<td>') + 4, string.indexOf('</td>'))
    const times = firstString.substring(0, firstString.indexOf(' ')).split('-')
    const title = firstString.substring(firstString.indexOf(' ') + 1, firstString.length)

    return {
      startTime: times[0],
      endTime: times[1],
      title: title
    }
  }

  function parsePdfSchedule(raw) {
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
     * The PDF parser always rounds upwards (for example: 17 / 16 is actually 1.0625)
     *
     * For PDF parser docs, visit: https://github.com/modesty/pdf2json
     */

    const weekdays = []
    const lessons = []
    const borders = {}

    const page = raw.formImage.Pages[0]
    let fills = page.Fills
    let texts = page.Texts

    /**
     * Go through fills
     */

    // Sort by height, and remove the grey background boxes.
    sortArrayByKey(fills, 'h')
    const weekBacks = fills.splice(fills.length - 5, 5)
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

    fills.forEach(fill => {
      let day
      weekdayFills.forEach((dayFill, i) => {
        if (fill.x >= dayFill.x && fill.x < (dayFill.x + dayFill.w)) day = i
      })

      lessons.push({
        day: day,
        color: (fill.clr > -1) ? colorIndex[fill.clr]:fill.oc,
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
        texts: []
      })
    })


    /**
     * Go through texts.
     */

    // Sort by Y Position
    sortArrayByKey(texts, 'y')

    // Go through all texts and add 0.25 to the
    // x position since the difference between
    // the rendered PDF and data is generally 0.25
    //
    // Same princimple for 0.98 added to the text width.
    //
    // Also calculate the x2 value by adding the
    // width, divided by 16, to the x value.
    texts.forEach((text, i)=> {
      texts[i].x += 0.25
      texts[i].w -= 0.98
      texts[i].x2 = texts[i].x + (texts[i].w / 16)
    })

    // Retrieve the first 5 texts that all will be the weekday texts and store them.
    const weekdayTexts = texts.splice(0, 5)
    sortArrayByKey(weekdayTexts, 'x')
    weekdayTexts.forEach((text, i) => {
      weekdays[i].text = text
    })

    // Remove all time strings, don't need them really since we use the "click hack".
    texts = texts.filter(text => {
      if (text.R[0].T.indexOf('%3A') > -1) text.R[0].T = text.R[0].T.replace('%3A', ':')
      return (!stringIsTime(text.R[0].T))
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

    texts.forEach(text => {
      let didFindLesson = false
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
              didFindLesson = true
              lesson.texts.push( decodeURIComponent(text.R[0].T) )
            }
          } else {
            // You're all good, the text is inside the fill.
            didFindLesson = true
            lesson.texts.push( decodeURIComponent(text.R[0].T) )
          }
        }
      })
    })

    lessons.sort((a, b) => a.position.x - b.position.x || a.position.y - b.position.y)
    return lessons
  }

  function parseLessonTable(lesson, lastLesson) {
    // Copy the HTML table to use it without manipulating the original.
    let table = lesson.table

    // Extract all rows
    const rows = []
    while (table.indexOf('<tr>') > -1) {
      const rowStart = table.indexOf('<tr>')
      const rowEnd = table.indexOf('</tr>')
      const row = table.substring(rowStart + 4, rowEnd)
      if (row) rows.push(row)

      table = table.substring(rowEnd + 5, table.length)
    }

    let parsed = {}
    if (tableRowsAreMultiple(rows)) {
      // This is a "multi" type, meaning there are multiple
      // lessons in one table of data.

      // Check if the first row is the "Block:" declartion.
      // If so, just delete it since it's pointless.
      if (rows[0].indexOf('Block:') > -1) rows.splice(0, 1)

      // Extract the lesson info based on the previously
      // parsed lesson, that is if there is none, and if so
      // if it was also a multi type lesson.
      let row = 0
      if (lastLesson.type) {
        row = (lastLesson.type === 'multi' && lastLesson.table === lesson.table) ? 1:0
      }
      parsed = parseTableTimeRow(rows[row])
      parsed.type = 'multi'
    } else if (rows[0].indexOf('Block:') > -1) {
      // This is a "block" type, meaning it's one of
      // multiple (usually 2), lessons that happen simultaneously,
      // but they have separate tables of data.

      // Remove the top row as it just contains the block head.
      rows.splice(0, 1)

      // Now the top row is the time for the events, so grab that one.
      parsed = splitTimeDurationString(rows[0])
      parsed.type = 'block'

      // Remove the time row and you are left with the options of lesson info.
      rows.splice(0, 1)

      if (rows.length === 1) {
        // There is but one option, so go with that one.
        parsed.texts = rows[0].substring(4, rows[0].length - 5).split('</td><td>')
        parsed.title = parsed.texts.splice(0, 1)[0]
      } else {
        // Well ok, now we have to work some magic to determine which row
        // is most likely this particular lesson's data row.

        const lessonTexts = lesson.texts.join('').split(' ').join('')
        let match = 0
        let matchedRow
        rows.forEach(row => {
          const rowTexts = row.substring(4, row.length - 5).split('</td><td>').join('').split(' ').join('')
          const rowMatch = parser.calcStringSimilarity(lessonTexts, rowTexts)
          if (rowMatch > match) {
            matchedRow = row
          }
        })

        parsed.texts = matchedRow.substring(4, matchedRow.length - 5).split('</td><td>')
        parsed.title = parsed.texts.splice(0, 1)[0]
      }
    } else {
      // This is a simple lesson, nothing special
      // and can be handled easily like so.

      // Now the top row is the time for the events, so grab that one.
      parsed = splitTimeDurationString(rows[0])
      parsed.type = 'simple'

      // Remove the time row and you are left with the options of lesson info.
      rows.splice(0, 1)

      if (rows.length === 1) {
        // There is but one option, so go with that one.
        parsed.texts = rows[0].substring(4, rows[0].length - 5).split('</td><td>')
        parsed.title = parsed.texts.splice(0, 1)[0]
      } else {
        // Well ok, now we have to work some magic to determine which row
        // is most likely this particular lesson's data row.

        // Go through all lesson tects to find any double spaces.
        lesson.texts = lesson.texts.map(text => {
          if (text.indexOf('  ') > -1) text = text.split('  ').join(' ')
          return text
        })

        // First simply join the PDF texts with a space between each.
        const joinedTexts = lesson.texts.join(' ')
        // Then flatten the string to contain no spaces.
        const flatTexts = joinedTexts.split(' ').join('')

        const filteredRows = []
        rows.forEach(row => {
          // Pull out all the strings in the row.
          let rowTexts = row.substring(4, row.length - 5).split('</td><td>')
          // Filter through the texts to find the one's that exist in the PDF text,
          // then push the returned Array of matching texts to another Array for
          // further comparison
          rowTexts = rowTexts.filter(text => joinedTexts.indexOf(text) > -1)
          filteredRows.push({
            original: row,
            filtered: rowTexts
          })
        })

        // Now go through the filtered rows of texts, to find out if
        // they differ in length. Because if they do, it means one of
        // them matches the PDF text better than the other(s).
        let highest = 0
        let length = -1
        let sameLength = true
        filteredRows.forEach(row => {
          if (length === -1) length = row.filtered.length
          if (length !== row.filtered.length) sameLength = false
          if (highest < row.filtered.length) highest = row.filtered.length
        })

        let finalRows
        let matchedRow
        if (!sameLength) {
          // Great, at least one of them is longer than the others,
          // use the stored length value in "highest" to find the one(s)
          // that are the longest (hopefully only one).
          finalRows = filteredRows.filter(row => row.filtered.length === highest)
          if (finalRows.length === 1) {
            // Turns out it was just one!
            matchedRow = finalRows[0].original
          }
        }

        if (!matchedRow) {
          // Well all right then, they are all now the same length,
          // so let's match them against the PDF texts to see
          // which one matches most.

          match = 0
          if (!finalRows) finalRows = filteredRows
          finalRows.forEach(row => {
            row = row.original
            const rowTexts = row.substring(4, row.length - 5).split('</td><td>').join('').split(' ').join('')
            const rowMatch = parser.calcStringSimilarity(flatTexts, rowTexts)
            if (rowMatch > match) {
              matchedRow = row
            }
          })
        }

        parsed.texts = matchedRow.substring(4, matchedRow.length - 5).split('</td><td>')
        parsed.title = parsed.texts.splice(0, 1)[0]
      }
    }

    parsed.table = lesson.table

    return parsed
  }

  function parseLessonData(lessons, params) {
    let dt = luxon.DateTime.local()
    dt = dt.set({ weekNumber: params.week, seconds: 0 })

    // Great, now all lessons have table data.
    // Now we have to batch them into the days they occur.
    // This is to avoid any errors in the lesson parsing,
    // since some blocks might be of the same length.
    const days = [[], [], [], [], []]
    lessons.forEach(lesson => {
      days[lesson.day].push(lesson)
    })

    days.forEach((lessons, i) => {
      // Set day of week to the DateTime object.
      dt = dt.set({ weekday: i + 1 })

      // Now we need to sort them based on the table data.
      // This is because we need to know which one's belong to,
      // what's called "blocks", that share table data.
      lessons.sort((a, b) => {
        if (a.table.length - b.table.length) return 1
        if (a.table.length > b.table.length) return -1
        return 0
      })

      let lastParsed
      lessons = lessons.map(lesson => {
        lesson.parsed = parseLessonTable(lesson, lastParsed)
        lastParsed = lesson.parsed

        const start = lesson.parsed.startTime.split(':')
        dt = dt.set({ hour: parseInt(start[0]), minute: parseInt(start[1]) })

        lesson.start = {
          iso: dt.toISO(),
          timestamp: new Date(dt.toISO()).getTime()
        }

        const end = lesson.parsed.endTime.split(':')
        dt = dt.set({ hour: parseInt(end[0]), minute: parseInt(end[1]) })
        lesson.end = {
          iso: dt.toISO(),
          timestamp: new Date(dt.toISO()).getTime()
        }

        return lesson
      })

      lessons.sort((a, b) => {
        if (a.start.timestamp > b.start.timestamp) {
          return 1
        }
        if (a.start.timestamp < b.start.timestamp) {
          return -1
        }
        return 0
      })
    })

    return lessons
  }

  /**
   * PDF methods
   */

  function downloadPdfSchedule(url) {
    return new Promise((resolve, reject) => {
      const parser = new pdfp()
      parser.on('pdfParser_dataError', error => reject(error))
      parser.on('pdfParser_dataReady', rawData => resolve(rawData))
      // Perform request and pipe PDF parser.
      request({ url: url, encodiong: null }).pipe(parser)
    })
  }

  function loadLocalPdfSchedule(path) {
    return new Promise((resolve, reject) => {
      const parser = new pdfp()
      parser.on('pdfParser_dataError', error => reject(error))
      parser.on('pdfParser_dataReady', rawData => resolve(rawData))
      parser.loadPDF(path)
    })
  }

  /**
   * Download methods
   */

  function downloadLessonData(lesson, url, params) {
    return new Promise((resolve, reject) => {
      // Calculate the X and Y of the click position,
      // by multiplying the lessons positions by 16 (PDF rendering is 1/16)
      // and subtracting 28px for the padding of the PDF document.
      const x = Math.round(lesson.position.x * 16) - 28
      const y = Math.round(lesson.position.y * 16) - 28

      // Define the width and height of the rendered schedule
      const width = 536
      const height = 784

      // Construct request arguments for the first request that will return a "resource moved".
      const args = {
        method: 'POST',
        url: url,
        form: {
          '__EVENTTARGET': 'NovaschemWebViewer2',
          '__EVENTARGUMENT': 'MapClick|' + x + '|' + y + '|' + width + '|' + height,
          'ScheduleIDDropDownList': '{' + params.id + '}',
          'WeekDropDownList': params.week
        }
      }

      // Make a first attempt to scrape the lesson data.
      // This should, if the lesson exists, return a redirect url.
      request(args, (error, response, body) => {
        if (error) return reject(error)

        // If this returns true, it means it's a "free day", with no lessons.
        // So then avoid trying to download lesson data.
        if (body.substring(0, 6) !== '<html>') return resolve()

        // Extract the redirect url.
        const url = decodeURIComponent( 'http://www.novasoftware.se' + (body.substring(body.indexOf('<a href="') + 9, body.indexOf('">here</a>.</h2>'))) )

        // Finally get the schedule info in "beautiful" table form.
        request(url, (error, response, body) => {
          if (error) return reject(error)

          // Extract the table of data.
          let table = body.substring(body.indexOf('<table>'), body.indexOf('</table>') + 8)

          // Check if the system hasn't closed the row tag yet, if so, close it. -_-'
          let unClosedRowIndex = table.indexOf('<tr></table>')
          if (unClosedRowIndex > -1) {
            // Add 1 to jump right of the opening '<' tag.
            unClosedRowIndex += 1
            // Add a '/' in the <tr> to close it.
            table = [table.slice(0, unClosedRowIndex), '/', table.slice(unClosedRowIndex) ].join('')
          }

          // Finally return (resolve) the raw table data.
          resolve(table)
        })
      })
    })
  }

  function getLessonData(params, lessons) {
    return new Promise((resolve, reject) => {
      // Click schedule width height ration: 536 x 784

      // First build the custom "fake" connection to the site.
      factory.generateLessonDataUrl({
        novaId: params.novaId,
        novaCode: params.novaCode,
        id: '{' + params.id + '}',
        typeKey: params.typeKey,
        week: params.week
      }).then(url => {
        let downloaded = 0

        // Now that we have a fake connection to novascheme, let's download all lessons by faking a click event.
        async.eachSeries(lessons, (lesson, callback) => {
          // Get the table data of the lesson.
          downloadLessonData(lesson, url, params).then(table => {
            downloaded++;
            if (table) lesson.table = table
            callback()
          }).catch(error => reject(error))
        }, (error) => {
          if (error) return reject(error)

          lessons = parseLessonData(lessons, params)
          resolve(lessons)
        })
      }).catch(error => reject(error))
    })
  }

  function downloadSchedule(params) {
    return new Promise((resolve, reject) => {
      /**
       *
       * Novascheme download process
       *
       * 1. Build PDF url.
       * 2. Download PDF raw data.
       * 3. Parse the raw PDF data.
       * 4. Loop through all lessons and download their data.
       * 5. Parse the lesson data (from HTML tables)
       *
       */

      // Generate the schedule's PDF url
      const pdfUrl = factory.generateNovaPdfUrl({
        novaId: params.novaId,
        typeKey: params.typeKey,
        id: '{' + params.id + '}',
        week: params.week,
        disrupt: true
      })

      // Download the raw PDF data for the schedule.
      downloadPdfSchedule(pdfUrl).then(rawData => {
        // Create a checksum to store and compare a potential update to, to see if anything has changed.
        const checksum = crypto.createHash('sha256').update(JSON.stringify(rawData.formImage.Pages)).digest('hex')

        // Parse the raw PDF data to get the lesson frames.
        const bareLessons = parsePdfSchedule(rawData)
        getLessonData(params, bareLessons).then(results => {
          // Download and parse all lesson data based on the PDF data.
          resolve({
            checksum: checksum,
            data: results
          })
        }).catch(error => reject(error))
      }).catch(error => reject(error))

    })
  }

  function downloadNovaScheduleLists(school, types) {
    return new Promise((resolve, reject) => {
      async.eachOf(types, (type, i, callback) => {
        types[i].name = scheduleTypes[type.key].name
        
        request(factory.generateNovaBaseUrl(school.novaId, school.novaCode, type.key), (error, response, body) => {
          if (error) return callback(error)

          types[i] = parser.parseNovaTypeData(body, type)
          callback()
        })
      }, (error) => {
        if (error) return reject(error)

        resolve(types)
      })
    })
  }

  function downloadSchoolNovaData(school) {
    return new Promise((resolve, reject) => {
      request(factory.generateNovaBaseUrl(school.novaId, school.novaCode), (error, response, body) => {
        if (error) return reject(error)

        const data = parser.parseNovaBaseData(body)
        if (data.complete) return resolve(data)

        downloadNovaScheduleLists(school, data.types).then(data => resolve(data))
      })
    })
  }

  function getSchoolNovaMetaData(school) {
    return new Promise((resolve, reject) => {
      request(factory.generateNovaBaseUrl(school.novaId, school.novaCode), (error, response, body) => {
        if (error) return reject(error)
        
        const strStart = '<span id="CounterLabel">'
        body = body.substring(body.indexOf(strStart) + strStart.length, body.length)
        body = body.substring(0, body.indexOf('</span>'))

        const dates = {}
        body.split('<br>').forEach((str, i) => {
          dates[i ? 'published' : 'updated'] = str.substring(str.length - 19, str.length)
        })
        
        resolve(dates)
      })
    })
  }

  function checkSchoolNovaDataUpdate(school, force = false) {
    return new Promise((resolve, reject) => {
      if (force) return resolve(true)
      
      const lastUpdate = moment(school.novaDataUpdatedAt)
      getSchoolNovaMetaData(school).then(metaData => {
        const updatedOn = moment(metaData.updated)
        resolve(updatedOn.isAfter(lastUpdate))
      }).catch(error => reject(error))
    })
  }

  return {
    scheduleTypes,
    parseLessonData,
    downloadSchedule,
    downloadSchoolNovaData,
    checkSchoolNovaDataUpdate
  }
}

module.exports = Nova()
