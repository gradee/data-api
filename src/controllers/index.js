// Main controller that handles all routes.
const router = require('express').Router()
const Op = require('sequelize').Op
const async = require('async')

// Models
const models = require(appRoot + '/models')

// Helpers
const validator = require('../helpers/validator')
const nova = require('../helpers/nova')

function schoolPropsAreUnique(data) {
  return new Promise((resolve, reject) => {
    models.School.findOne({
      where: {
        [Op.or]: [
          { slug: data.slug },
          { novaId: data.novaId },
          { novaCode: data.novaCode }
        ]
      }
    }).then(school => {
      let result = { propsAreUnique: true }
      if (school) {
        result.propsAreUnique = false
        if (school.slug === data.slug) {
          result.reason = 'The slug you provided is already taken.'
        } else if (school.novaId === data.novaId) {
          result.reason = 'The Nova ID you provided is already being used.'
        } else if (school.novaCode === data.novaCode) {
          result.reason = 'The Nova code you provided is already being used.'
        }
      }

      resolve(result)
    })
  })
}

function saveSchoolNovaData(school, types) {
  return new Promise((resolve, reject) => {
    // Go through all types
    async.each(types, (type, callback) => {
      // Go through all schedules
      async.each(type.schedules, (schedule, cb) => {
        models.Schedule.create({
          schoolId: school.id,
          typeKey: type.key,
          scheduleId: schedule.id,
          name: schedule.name
        })
        .then(schedule => cb())
        .catch(error => cb(error))
      }, (error) => {
        if (error) return callback(error)

        callback()
      })
    }, (error) => {
      if (error) return reject(error)

      resolve()
    })
  })
}

function downloadSchoolNovaData(school) {
  nova.downloadSchoolNovaData(school).then(data => {
    saveSchoolNovaData(school, data).then(_ => {
      console.log('School nova data downloaded. :)')
    })
  })
}

router.get('/:schoolSlug', (req, res) => {
  models.School.findOne({
    where: {
      slug: req.params.schoolSlug
    }
  }).then(school => {
    if (!school) return res.status(404).send('Not found.')

    school.getSchedules().then(schedules => {
      const data = {
        schedules: 0,
        types: []
      }

      const types = {}
      schedules.forEach(schedule => {
        data.schedules += 1
        const type = nova.scheduleTypes[schedule.typeKey]
        if (!types.hasOwnProperty(type.slug)) {
          types[type.slug] = {
            name: type.name,
            slug: type.slug,
            schedules: 0
          }
        }
        
        types[type.slug].schedules += 1
      })

      for (let key in types) {
        data.types.push(types[key])
      }

      res.json(data)
    })
  })
})

router.get('/:schoolSlug/:typeSlug', (req, res) => {
  let typeKey
  let validTypeSlug = false
  nova.scheduleTypes.forEach((type, i) => {
    if (type.slug === req.params.typeSlug) {
      validTypeSlug = true
      typeKey = i
    }
  })
  
  if (!validTypeSlug) return res.status(400).send('Not found.')

  models.School.findOne({
    where: {
      slug: req.params.schoolSlug
    }
  }).then(school => {
    if (!school) return res.status(404).send('Not found.')

    models.Schedule.findAll({
      where: {
        schoolId: school.id,
        typeKey: typeKey
      },
      attributes: [['schedule_id', 'id'], 'name'],
      raw: true
    }).then(schedules => {
      res.json(schedules)
    })
  })
})

router.get('/', (req, res) => {
  models.School.findAll({
    attributes: [ 'name', 'slug', 'novaId', 'novaCode' ],
    raw: true
  }).then(schools => {
    res.json(schools)
  })
})

router.post('/', (req, res) => {
  if (req.headers.authorization !== 'Bearer ' + process.env.AUTH_TOKEN) return res.status(401).send('Unauthorized.')
  if (!req.body.name || !validator.validateName(req.body.name)) return res.status(400).send('Missing or invalid school name.')
  if (!req.body.slug || !validator.validateSlug(req.body.slug)) return res.status(400).send('Missing or invalid school slug.')
  if (!req.body.novaId || !validator.validateNovaValue(req.body.novaId)) return res.status(400).send('Missing or invalid Nova ID.')
  if (!req.body.novaCode || !validator.validateNovaValue(req.body.novaCode)) return res.status(400).send('Missing or invalid Nova code.')

  schoolPropsAreUnique(req.body).then(result => {
    if (!result.propsAreUnique) return res.status(400).send(result.reason)
    
    models.School.create({
      name: req.body.name,
      slug: req.body.slug,
      novaId: req.body.novaId,
      novaCode: req.body.novaCode
    }).then(school => {
      downloadSchoolNovaData(school)
      
      res.json({ success: true })
    })
  })
})

module.exports = router