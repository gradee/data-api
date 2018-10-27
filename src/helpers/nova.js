// Dependencies
const luxon = require('luxon')
const request = require('request')
const pdfp = require('pdf2json')
const async = require('async')
const moment = require('moment')
const http = require('http')
const fs = require('fs')
const path = require('path')

// Helpers
const Factory = require('./factory')
const Parser = require('./parser')
const Skolverket = require('./skolverket')

// Models
const models = require('../models')

function Nova() {

  const storagePath = path.resolve(__dirname + '/../../local/schedules')
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


  /**
   * PDF methods
   */

  function downloadSchedule(novaId, schedule, week) {
    return new Promise((resolve, reject) => {
      const pdfUrl = Factory.generateNovaPdfUrl(novaId, schedule.typeKey, schedule.uuid, week)

      http.get(pdfUrl, (res) => {
        if (res.statusCode === 200) {
          const write = fs.createWriteStream(storagePath + '/' + schedule.uuid + '_' + week + '.pdf')
          res.pipe(write)
          write.on('finish', _ => resolve())
        } else {
          reject() // PDF not found.
        }
      })
    })
  }

  function parseSchedule(schedule, week) {
    return new Promise((resolve, reject) => {
      const file = storagePath + '/' + schedule.uuid + '_' + week + '.pdf'
      const Parser = new pdfp()
      Parser.on('pdfParser_dataError', error => reject(error))
      Parser.on('pdfParser_dataReady', rawData => resolve(rawData))
      Parser.loadPDF(file)
    })
  }

  function upsertScheduleWeek(schedule, week) {
    return new Promise((resolve, reject) => {
      models.ScheduleWeek.findOne({
        where: {
          scheduleId: schedule.id,
          weekNumber: week
        }
      }).then(result => {
        if (result) {
          models.ScheduleWeek.update({
            fileUpdatedAt: luxon.DateTime.local().toSQL()
          }, {
            where: {
              scheduleId: schedule.id,
              weekNumber: week
            }
          }).then(_ => resolve())
          .catch(error => reject(error))
        } else {
          models.ScheduleWeek.create({
            scheduleId: schedule.id,
            weekNumber: week,
            fileUpdatedAt: luxon.DateTime.local().toSQL()
          }).then(_ => resolve())
          .catch(error => reject(error))
        }
      }).catch(error => reject(error))
    })
  }

  function checkScheduleWeekUpdate(school, schedule, week) {
    return new Promise((resolve, reject) => {
      models.School.findOne({
        where: {
          id: school.id
        }
      }).then(schoolObj => {
        models.ScheduleWeek.findOne({
          where: {
            scheduleId: schedule.id,
            weekNumber: week
          }
        }).then(scheduleWeek => {
          if (!scheduleWeek) return resolve(true)
          
          const schoolDate = moment(schoolObj.novaDataUpdatedAt)          
          const scheduleDate = moment(scheduleWeek.fileUpdatedAt)

          resolve(scheduleDate.isBefore(schoolDate))
        }).catch(error => reject(error))
      }).catch(error => reject(error))
    })
  }

  function ensureLocalSchedule(school, schedule, week) {
    return new Promise((resolve, reject) => {
      const file = storagePath + '/' + schedule.uuid + '_' + week + '.pdf'
      fs.access(file, fs.constants.F_OK, (err) => {
        if (!err) {
          checkScheduleWeekUpdate(school, schedule, week)
            .then(needsUpdate => {
              if (!needsUpdate) return resolve()

              downloadSchedule(school.novaId, schedule, week)
                .then(_ => upsertScheduleWeek(schedule, week))
                .then(_ => resolve())
              .catch(error => reject(error))
            })
          .catch(error => reject(error))
        } else {
          downloadSchedule(school.novaId, schedule, week)
            .then(_ => upsertScheduleWeek(schedule, week))
            .then(_ => resolve())
          .catch(error => reject(error))
        }
      })
    })
  }

  function getSchedule(school, schedule, week) {
    return new Promise((resolve, reject) => {
      models.Schedule.findAll({
        where: {
          schoolId: school.id
        },
        attributes: [ ['uuid', 'id'], 'name', 'initials', 'typeKey' ],
        raw: true
      }).then(schedules => {
        ensureLocalSchedule(school, schedule, week)
          .then(_ => parseSchedule(schedule, week))
          .then(data => {
            // Load course list from Skolverket API
            Skolverket.getCourses(courses => {
              const lessonList = Parser.parsePdfSchedule(data, week)
              const lessons = []
              lessonList.forEach(lesson => {
                if (schedules) {
                  const lessonData = Parser.parseLessonTitle(lesson.meta.text, schedule.typeKey, schedules, courses)
                  lessonData.startTime = lesson.meta.startTime.toISO()
                  lessonData.endTime = lesson.meta.endTime.toISO()
                  lessons.push(lessonData)
                } else {
                  lessons.push({
                    title: lesson.meta.text,
                    startTime: lesson.meta.startTime.toISO(),
                    endTime: lesson.meta.endTime.toISO()
                  })
                }
              })
      
              lessons.sort((a, b) => {
                if (a.startTime > b.startTime) return 1
                if (a.startTime < b.startTime) return -1
                return 0
              })
      
              return resolve(lessons)
            })
          })
        .catch(error => {
          console.log(error)
          resolve([])
        })
      }).catch(error => reject(error))
    })
  }

  function downloadPdfSchedule(url) {
    return new Promise((resolve, reject) => {
      const Parser = new pdfp()
      Parser.on('pdfParser_dataError', error => reject(error))
      Parser.on('pdfParser_dataReady', rawData => resolve(rawData))
      // Perform request and pipe PDF Parser.
      const req = request({ url: url, encoding: null }).on('response', (res) => {
        if (res.statusCode === 200) {
          req.pipe(Parser)
        } else {
          reject('PDF does not exist.')
        }
      })
    })
  }

  function downloadNovaScheduleLists(school, types) {
    return new Promise((resolve, reject) => {
      async.eachOf(types, (type, i, callback) => {
        types[i].name = scheduleTypes[type.key].name

        request(Factory.generateNovaBaseUrl(school.novaId, school.novaCode, type.key), (error, response, body) => {
          if (error) return callback(error)

          types[i] = Parser.parseNovaTypeData(body, type)
          callback()
        })
      }, (error) => {
        if (error) return reject(error)

        resolve(types)
      })
    })
  }

  function downloadSchoolData(school) {
    return new Promise((resolve, reject) => {
      request(Factory.generateNovaBaseUrl(school.novaId, school.novaCode), (error, response, body) => {
        if (error) return reject(error)

        const data = Parser.parseNovaBaseData(body)
        if (data.complete) return resolve(data)

        downloadNovaScheduleLists(school, data.types).then(data => resolve(data))
      })
    })
  }

  function getSchoolMetaData(school) {
    return new Promise((resolve, reject) => {
      request(Factory.generateNovaBaseUrl(school.novaId, school.novaCode), (error, response, body) => {
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

  function checkSchoolDataUpdate(school, force = false) {
    return new Promise((resolve, reject) => {
      if (force) return resolve(true)

      const lastUpdate = moment(school.novaDataUpdatedAt)
      getSchoolMetaData(school).then(metaData => {
        const updatedOn = moment(metaData.updated)
        resolve(updatedOn.isAfter(lastUpdate))
      }).catch(error => reject(error))
    })
  }

  function prepareSchoolData(data, schoolId) {
    const schedules = []
    data.forEach((typeObj) => {
      typeObj.schedules.forEach((schedule) => {
        schedule.uuid = schedule.id.substr(1, schedule.id.length - 2)
        schedule.schoolId = schoolId
        schedule.typeKey = typeObj.key
        delete schedule.id
        
        schedules.push(schedule)
      })
    })
    return schedules
  }

  return {
    scheduleTypes,
    downloadSchedule,
    downloadPdfSchedule,
    parseSchedule,
    getSchedule,
    downloadSchoolData,
    checkSchoolDataUpdate,
    prepareSchoolData
  }
}

module.exports = Nova()
