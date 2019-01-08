// Router for /schedule
const router = require('express').Router()
const { DateTime } = require('luxon')
const ical = require('ical-generator')

// Helpers
const Nova = require('../helpers/nova')
const Validator = require('../helpers/validator')
const School = require('../helpers/school')
const Skola24 = require('../helpers/skola24')

// Models
const models = require('../models')

router.get('/', (req, res) => {
  models.School.findAll({
    attributes: [
      'name',
      'slug'
    ],
    raw: true
  }).then(schools => {
    schools = schools.sort((a, b) => {
      if (a.name > b.name) return 1
      if (a.name < b.name) return -1
      return 0
    })

    res.json(schools)
  })
  .catch(error => {
    console.log(error)
    res.status(500).send('Something went wrong.')
  })
})

router.post('/', (req, res) => {
  if (req.headers.authorization !== 'Bearer ' + process.env.AUTH_TOKEN) return res.status(401).send('Unauthorized.')
  if (!req.body.name || !Validator.validateName(req.body.name)) return res.status(400).send('Missing or invalid parameter: name.')
  if (!req.body.slug || !Validator.validateSlug(req.body.slug)) return res.status(400).send('Missing or invalid parameter: slug.')
  if (req.body.novaId && !Validator.validateNovaValue(req.body.novaId)) return res.status(400).send('Invalid Nova ID.')
  if (req.body.novaCode && !Validator.validateNovaValue(req.body.novaCode)) return res.status(400).send('Invalid Nova code.')

  School.slugIsUnique(req.body.slug).then(result => {
    if (!result.slugIsUnique) return res.status(400).send('The slug you provided is already taken.')

    models.School.create({
      name: req.body.name,
      slug: req.body.slug
    }).then(school => {
      
      if (school.novaId) {
        School.updateNovaData(school, true)
          .then(didUpdate => {
            res.json({
              success: true,
              didUpdate: didUpdate
            })
          })
        .catch(error => {
          console.log(error)
          res.status(500).send('Something went wrong.')
        })
      } else {
        res.json({ success: true })
      }
    }).catch(error => {
      console.log(error)
      res.status(500).send('Something went wrong.')
    })
  }).catch(error => {
    console.log(error)
    res.status(500).send('Something went wrong.')
  })
})

router.post('/import', (req, res) => {
  if (req.headers.authorization !== 'Bearer ' + process.env.AUTH_TOKEN) return res.status(401).send('Unauthorized.')
  if (!req.body.source || req.body.source !== 'skola24') return res.status(400).send('Missing or invalid parameter: source.')
  if (!req.body.url) return res.status(400).send('Missing parameter: url.')

  Skola24.importSchoolsFromUrl(req.body.url)
    .then(schools => {
      School.createMultipleWithSkola24(schools)
        .then(_ => res.json({ success: true }))
      .catch(error => {
        console.log(error)
        res.status(500).send('Something went wrong.')
      })
    })
  .catch(error => {
    console.log(error)
    res.status(500).send('Something went wrong.')
  })
})

router.get('/:schoolSlug', (req, res) => {
  School.getBySlug(req.params.schoolSlug, true)
    .then(data => res.json(data))
  .catch(error => {
    if (error === 'not-found') return res.status(404).send('Not found.')
    
    res.status(500).send('Something went wrong.')
    console.log(error)
  })
})

router.post('/:schoolSlug', (req, res) => {
  if (req.headers.authorization !== 'Bearer ' + process.env.AUTH_TOKEN) return res.status(401).send('Unauthorized.')
  
  School.updateBySlug(req.params.schoolSlug, req.body)
    .then(_ => res.json({ success: true }))
  .catch((error, custom = false) => {
    if (custom) {
      if (error === 'Not found.') return res.status(404).send('Not found.')
      return res.status(400).send(error)
    }
    console.log(error)
    res.status(500).send('Something went wrong.')
  })
})

router.delete('/:schoolSlug', (req, res) => {
  if (req.headers.authorization !== 'Bearer ' + process.env.AUTH_TOKEN) return res.status(401).send('Unauthorized.')

  School.deleteBySlug(req.params.schoolSlug)
    .then(_ => {
      res.send({ success: true })
    })
  .catch(error => {
    if (error === 'not-found') return res.status(404).send('Not found.')
      
    console.log(error)
    res.status(500).send('Something went wrong.')
  })
})

router.post('/:schoolSlug/update', (req, res) => {
  if (req.headers.authorization !== 'Bearer ' + process.env.AUTH_TOKEN) return res.status(401).send('Unauthorized.')

  const force = req.body.hasOwnProperty('force') ? req.body.force : false
  School.updateScheduleDataBySlug(req.params.schoolSlug, force)
    .then(didUpdate => {
      res.json({ success: true, didUpdate: didUpdate })
    })
  .catch(error => {
    if (error === 'not-found') return res.status(404).send('Not found.')

    console.log(error)
    res.status(500).send('Something went wrong.')
  })
})

router.get('/:schoolSlug/:typeSlug', (req, res) => {

  School.getBySlug(req.params.schoolSlug)
    .then(school => {
      if (!school) return res.status(404).send('Not found.')

      School.getSchedulesBySlug(school, req.params.typeSlug)
        .then(schedules => {
          res.json(schedules)
        })
      .catch(error => {
        if (error === 'not-found') return res.status(404).send('Not found.')

        console.log(error)
        res.status(500).send('Something went wrong.')
      })
    })
  .catch(error => {
    console.log(error)
    res.status(500).send('Something went wrong.')
  })
})

router.get('/:schoolSlug/:typeSlug/:uuid', (req, res) => {

  School.getBySlug(req.params.schoolSlug)
    .then(school => {
      if (!school) return res.status(400).send('Not found.')

      School.getTypedScheduleById(school, req.params.typeSlug, req.params.uuid, [ 'uuid', 'typeKey', 'name', 'firstName', 'lastName', 'initials', 'className' ])
        .then(schedule => {
          if (!schedule) return res.status(400).send('Not found.')

          School.getCurrentScheduleEvent(school, schedule)
            .then(lessons => {
              // Remove NULL valued properties.
              for (let key in schedule) {
                if (!schedule[key]) delete schedule[key]
              }
              schedule.currentLessons = lessons

              res.json(schedule)
            })
          .catch(error => {
            if (error === 'not-found') return res.status(404).send('Not found.')

            console.log(error)
            res.status(500).send('Something went wrong.')
          })
        })
      .catch(error => {
        if (error === 'not-found') return res.status(404).send('Not found.')

        console.log(error)
        res.status(500).send('Something went wrong.')
      })
    })
  .catch(error => {
    console.log(error)
    res.status(500).send('Something went wrong.')
  })
})

router.get('/:schoolSlug/:typeSlug/:uuid/schedule', (req, res) => {
  // Grab current week
  let week = DateTime.local().setZone('Europe/Stockholm').get('weekNumber')
  if (req.query.w) {
    if (!isNaN(+req.query.w) && isFinite(req.query.w)) {
      if (parseInt(req.query.w) > 0 && parseInt(req.query.w) <= 53) {
        week = parseInt(req.query.w)
      }
    }
  }

  School.getBySlug(req.params.schoolSlug)
    .then(school => School.getTypedScheduleData(school, req.params.typeSlug, req.params.uuid, week))
    .then(results => {
      res.json(results.data)
    })
  .catch(error => {
    console.log(error)
    res.status(500).send('Something went wrong.')
  })
})

router.get('/:schoolSlug/:typeSlug/:uuid/schedule/ical', (req, res) => {
  // Grab current week
  let week = DateTime.local().setZone('Europe/Stockholm').get('weekNumber')
  if (req.query.w) {
    if (!isNaN(+req.query.w) && isFinite(req.query.w)) {
      if (parseInt(req.query.w) > 0 && parseInt(req.query.w) <= 53) {
        week = parseInt(req.query.w)
      }
    }
  }

  School.getBySlug(req.params.schoolSlug)
    .then(school => School.getTypedScheduleData(school, req.params.typeSlug, req.params.uuid, week))
    .then(result => {
      // Set up ical
      const cal = ical({
        domain: 'gradee.io',
        prodId: { company: 'Gradee', product: 'Schedule Data API' },
        name: result.schedule.name,
        timezone: 'Europe/Stockholm'
      })
      const now = new Date()

      result.data.forEach(lesson => {
        const start = new Date( Date.parse(DateTime.fromISO(lesson.startTime).setZone('Europe/Stockholm').plus({ minutes: now.getTimezoneOffset() }).toHTTP()) )
        const end = new Date( Date.parse(DateTime.fromISO(lesson.endTime).setZone('Europe/Stockholm').plus({ minutes: now.getTimezoneOffset() }).toHTTP()) )
        
        const evt = cal.createEvent({
          start: start,
          end: end,
          summary: lesson.title,
        })
        if (lesson.hasOwnProperty('rooms')) {
          let location = ''
          lesson.rooms.forEach(room => {
            if (location) location += ', '
            location += room.name
          })
          evt.location = location
        }
      })

      res.set({
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename=schema.ics'
      })
      res.send(cal.toString())
    })
  .catch(error => {
    console.log(error)
    res.status(500).send('Something went wrong.')
  })
})

module.exports = router