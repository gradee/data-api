// Router for /schedule
const router = require('express').Router()
const luxon = require('luxon')

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

  const force = req.body.hasOwnProperty('force') ? req.body.force : falce
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

      School.getTypedScheduleById(school, req.params.typeSlug, req.params.uuid)
        .then(schedule => {
          if (!schedule) return res.status(400).send('Not found.')
          // Remove NULL valued properties.
          for (let key in schedule) {
            if (!schedule[key]) delete schedule[key]
          }
          
          res.json(schedule)
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

  // let typeKey
  // let validTypeSlug = false
  // Nova.scheduleTypes.forEach((type, i) => {
  //   if (type.slug === req.params.typeSlug) {
  //     validTypeSlug = true
  //     typeKey = i
  //   }
  // })
  
  // if (!validTypeSlug) return res.status(400).send('Not found.')

  // models.NovaSchedule.findOne({
  //   where: {
  //     uuid: req.params.uuid,
  //     typeKey: typeKey
  //   },
  //   include: [
  //     {
  //       model: models.School,
  //       required: true,
  //       include: [
  //         {
  //           model: models.NovaSchool,
  //           as: 'novaProperties',
  //           attributes: [ 'id', 'novaId', 'novaCode', 'novaWeekSupport', 'novaDataUpdatedAt' ]
  //         }
  //       ]
  //     }
  //   ]
  // }).then(schedule => {
  //   if (!schedule) return res.status(404).send('Not found.')

  //   for (let key in schedule) {
  //     if (schedule[key] === null) delete schedule[key]
  //   }

  //   Nova.getScheduleData(schedule.school, schedule, luxon.DateTime.local().setZone('Europe/Stockholm').get('weekNumber'))
  //     .then(data => {
  //       const result = {
  //         id: schedule.uuid,
  //         name: schedule.name
  //       }
  //       if (schedule.firstName) result.firstName = schedule.firstName
  //       if (schedule.lastName) result.lastName = schedule.lastName
  //       if (schedule.initials) result.initials = schedule.initials
  //       if (schedule.className) result.className = schedule.className
  //       result.currentLessons = []
        
  //       const now = moment()
  //       data.forEach(lesson => {
  //         const start = moment(lesson.startTime)
  //         const end = moment(lesson.endTime)
  //         if (now.isSameOrAfter(start) && now.isBefore(end)) {
  //           result.currentLessons.push(lesson)
  //         }
  //       })

  //       res.json(result)
  //     })
  //   .catch(error => {
  //     console.log(error)
  //     res.status(500).send('Something went wrong.')
  //   })
  // })
})

router.get('/:schoolSlug/:typeSlug/:uuid/schedule', (req, res) => {
  // Grab current week
  let week = luxon.DateTime.local().setZone('Europe/Stockholm').get('weekNumber')
  if (req.query.w) {
    if (!isNaN(+req.query.w) && isFinite(req.query.w)) {
      if (parseInt(req.query.w) > 0 && parseInt(req.query.w) <= 53) {
        week = parseInt(req.query.w)
      }
    }
  }

  School.getBySlug(req.params.schoolSlug)
    .then(school => {
      if (!school) return res.status(400).send('Not found.')

      School.getTypedScheduleById( school, req.params.typeSlug, req.params.uuid, [ 'uuid', 'typeKey' ])
        .then(schedule => {
          if (!schedule) return res.status(400).send('Not found.')
          
          if (school.novaProperties) {
            Nova.getScheduleData(school, schedule, week)
              .then(data => res.json(data))
            .catch(error => {
              if (error === 'not-found') return res.status(404).send('Not found.')

              console.log(error)
              res.status(500).send('Something went wrong.')
            })
          } else {
            Skola24.getScheduleData(school, schedule, week)
              .then(data => res.json(data))
            .catch(error => {
              if (error === 'not-found') return res.status(404).send('Not found.')

              console.log(error)
              res.status(500).send('Something went wrong.')
            })
          }
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

module.exports = router