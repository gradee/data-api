// Dependencies
const request = require('request')
const async = require('async')
const { DateTime } = require('luxon')

// Helpers
const Latinize = require('./latinize')

// Models
const models = require('../models')

function Skola24() {

  const scheduleTypes = [
    { name: 'Lärare', slug: 'teachers', selectKey: 'selectedTeacher' },
    { name: 'Klass', slug: 'classes', selectKey: 'selectedClass' },
    { name: 'Grupp', slug: 'groups', selectKey: 'selectedGroup' },
    { name: 'Elev', slug: 'students', selectKey: 'selectedStudent' },
    { name: 'Sal', slug: 'rooms', selectKey: 'selectedRoom' },
    { name: 'Ämne', slug: 'subjects', selectKey: 'selectedSubject' },
    { name: 'Kurskod', slug: 'courses', selectKey: 'selectedCourse' },
    { name: 'Samling', slug: 'aulas', selectKey: 'selectedAula' }
  ]

  function importSchoolsFromUrl(url) {
    return new Promise((resolve, reject) => {
      // Remove trailing slash
      if (url.substr(url.length - 1, url.length) === '/') url = url.substr(0, url.length - 1)
      // Remove prefix to get credentials (host + school name)
      url = url.replace('https://web.skola24.se/timetable/timetable-viewer/', '')
      const creds = url.split('/')
      // Reconstruct URL with properly encoded school name.
      url = 'https://web.skola24.se/timetable/timetable-viewer/' + creds[0] + '/' + encodeURIComponent(decodeURIComponent(creds[1]))

      request(url, (error, response, body) => {
        if (error) return reject(error)

        body = body.substr(body.indexOf("'].data = {") + 10, body.length)
        body = body.substr(0, body.lastIndexOf('</script>'))
        body = body.substr(0, body.lastIndexOf(';'))
        
        const data = JSON.parse(body)
        const schools = data.schools
        schools.forEach(school => {
          school.slug = Latinize(school.name.toLowerCase()).replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-').replace(/^-+/, '').replace(/-+$/, '')
          school.skola24 = {
            uuid: school.guid,
            host: data.selectedModel.domain
          }
          delete school.settings
          delete school.guid
        })

        resolve(schools)
      })
    })
  }

  function getSchoolData(school) {
    return new Promise((resolve, reject) => {
      request('https://web.skola24.se/timetable/timetable-viewer/data/selection?hostName=' + school.skola24Properties.host + '&schoolGuid=' + school.skola24Properties.uuid, (error, response, body) => {
        if (error) return reject(error)

        const jsonData = JSON.parse(body).data

        const types = {}
        const parsedSchedules = []
        scheduleTypes.forEach((typeObj, key) => {
          if (Array.isArray(jsonData[typeObj.slug])) {
            jsonData[typeObj.slug].forEach(obj => {
              const data = {
                schoolId: school.id,
                name: '',
                uuid: obj.guid,
                typeKey: key
              }
              if (typeObj.slug === 'students') {
                data.name = (obj.class ? obj.class + ' ' : '') + obj.firstName + ' ' + obj.lastName
                data.firstName = obj.firstName
                data.lastName = obj.lastName
                data.className = obj.class
              } else if (typeObj.slug === 'teachers') {
                data.name = obj.firstName + ' ' + obj.lastName
                data.firstName = obj.firstName
                data.lastName = obj.lastName
                data.initials = obj.signature
              } else if (typeObj.slug === 'groups') {
                data.name = obj.id
                // Force storage as "class" because they are apparently also "groups" in Skola24.
                if (obj.isClass) obj.typeKey = 1
              } else {
                if (obj.hasOwnProperty('name') && obj.name) {
                  data.name = obj.name
                } else {
                  data.name = obj.id
                }
              }
              parsedSchedules.push(data)
            })
          }
        })
        
        resolve(parsedSchedules)
      })
    })
  }

  function updateSchoolData(school, data) {
    return new Promise((resolve, reject) => {
      async.each(data, (scheduleData, callback) => {
        models.Skola24Schedule.findOne({
          where: { schoolId: school.id, uuid: scheduleData.uuid }
        }).then(schedule => {
          if (schedule) {
            models.Skola24Schedule.update(scheduleData, {
              where: { schoolId: school.id, uuid: scheduleData.uuid }
            }).then(_ => callback())
            .catch(error => reject(error))
          } else {
            models.Skola24Schedule.create(scheduleData)
              .then(_ => callback())
            .catch(error => reject(error))
          }
        }).catch(error => reject(error))
      }, () => {
        resolve()
      })
    })
  }

  function extendLessonData(texts, schedules) {
    return new Promise((resolve, reject) => {
      const textData = {}
      const splice = []

      texts.forEach((textObj, i) => {
        let found = false

        schedules.forEach(schedule => {
          const slug = scheduleTypes[schedule.typeKey].slug
          const scheduleCopy = JSON.parse(JSON.stringify(schedule))

          if (slug === 'teachers') {
            if (textObj.text === schedule.initials) {
              found = true
              if (!textData.teachers) textData.teachers = []
              delete scheduleCopy.typeKey
              delete scheduleCopy.initials
              textData.teachers.push(scheduleCopy)
            }
          } else {
            if (textObj.text === schedule.name) {
              if (slug !== 'subjects') found = true
              if (!textData[slug]) textData[slug] = []
              delete scheduleCopy.typeKey
              delete scheduleCopy.initials
              textData[slug].push(scheduleCopy)
            }
          }
        })
        if (found) splice.push(i)
      })
      splice.forEach(index => {
        texts.splice(index, 1)
        splice.forEach((index, i) => {
          splice[i] = index - 1
        })
      })
  
      textData.title = ''
      texts.forEach((textObj, i) => {
        if (i) {
          if (textObj.text.substr(0, 1) !== ' ') {
            textObj.text = ' ' + textObj.text
          }
        }
        textData.title += textObj.text
      })
  
      resolve(textData)
    })
  }

  function parseScheduleData(body, schedules, week) {
    return new Promise((resolve, reject) => {
      let boxes = body.data.boxList
      // Sort to order by top left corner. (x & y)
      boxes.sort((a, b) => {
        return a.x - b.x || a.y - b.y
      })
      // Pull out the lesson only boxes.
      boxes = boxes.filter(box => (box.x >= 69 && box.x < 1182 && box.y >= 23 && box.bcolor !== '#CCCCCC' && box.bcolor !== '#D3D3D3'))

      let texts = body.data.textList
      // Sort to order by top left corner. (x & y)
      texts.sort((a, b) => {
        return a.x - b.x || a.y - b.y
      })
      // Pull out the lesson only texts.
      const lessonTexts = texts.filter(text => (text.x >= 69 && text.x < 1182 && text.y >= 23 && text.text !== ''))

      const leftTimeTexts = texts.filter(text => (text.text !== '' && text.x < 69 && text.text.indexOf(':00') > -1))
      leftTimeTexts.sort((a, b) => {
        return a.y - b.y
      })
      const hourTexts = leftTimeTexts.splice(leftTimeTexts.length - 2, 2)
      const fiveMinuteDistance = (hourTexts[1].y - hourTexts[0].y) / 12
      const firstHourPos = leftTimeTexts[0].y + 13
      const date = DateTime.local().setZone('Europe/Stockholm').set({ weekNumber: week }).startOf('week').set({ hour: parseInt(leftTimeTexts[0].text.replace(':00', '')), minute: 0, second: 0, millisecond: 0 })

      const lessons = []
      async.each(boxes, (box, callback) => {
        let day = 0
        if (box.x >= 292 && box.x < 514) {
          day = 1
        } else if (box.x >= 514 && box.x < 737) {
          day = 2
        } else if (box.x >= 737 && box.x < 959) {
          day = 3
        } else if (box.x >= 959) {
          day = 4
        }

        const boxTexts = []
        lessonTexts.forEach(text => {
          if (text.x >= box.x && text.x < (box.x + box.width) && text.y >= box.y && text.y < (box.y + box.height - 14)) {
            boxTexts.push(text)
          }
        })
        const minuteLength = Math.round(box.height / fiveMinuteDistance) * 5
        const minutesFromFirstHour = Math.round((box.y - firstHourPos) / fiveMinuteDistance) * 5

        const startDate = date.plus({ minutes: minutesFromFirstHour, days: day })
        const endDate = startDate.plus({ minutes: minuteLength })

        let lesson = {
          title: '',
          startTime: startDate.toISO(),
          endTime: endDate.toISO(),
          backgroundColor: box.bcolor
        }

        extendLessonData(boxTexts, schedules).then(properties => {
          lessons.push(Object.assign(lesson, properties))
          callback()
        })
      }, (error) => {
        lessons.sort((a, b) => {
          if (a.startTime > b.startTime) return 1
          if (a.startTime < b.startTime) return -1
          return 0
        })

        resolve(lessons)
      })
    })
  }

  function getScheduleData(school, schedule, week) {
    return new Promise((resolve, reject) => {
      const config = {
        divHeight: 1901,
        divWidth: 1252,
        domain: school.skola24Properties.host,
        selectedSchool: {
          guid: school.skola24Properties.uuid
        },
        selectedWeek: week
      }
      config[scheduleTypes[schedule.typeKey].selectKey] = { guid: schedule.uuid }

      // Load the data from the "open" API.
      request.post('https://web.skola24.se/timetable/timetable-viewer/data/render', { json: config }, (error, response, body) => {
        if (error) return reject(error)

        models.Skola24Schedule.findAll({
          where: { schoolId: school.id },
          attributes: [ 'name', ['uuid', 'id'], 'initials', 'typeKey' ],
          raw: true
        }).then(schedules => {
          schedules.forEach((schedule, i) => {
            Object.keys(schedule).forEach(key => {
              if (schedule[key] === null) delete schedules[i][key]
            })
          })

          parseScheduleData(body, schedules, week)
            .then(results => resolve(results))
          .catch(error => reject(error))
        }).catch(error => reject(error))
      })
    })
  }

  return {
    scheduleTypes,
    importSchoolsFromUrl,
    getSchoolData,
    updateSchoolData,
    getScheduleData
  }
}

module.exports = Skola24()