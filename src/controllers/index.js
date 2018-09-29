// Main controller that handles all routes.
const router = require('express').Router()
const Op = require('sequelize').Op
const async = require('async')
const moment = require('moment')

// Models
const models = require(appRoot + '/models')

// Helpers
const validator = require('../helpers/validator')
const nova = require('../helpers/nova')

router.use('/schedule', require('./schedule'))

function schoolSlugIsUnique(slug, currentSchool = null) {
  return new Promise((resolve, reject) => {
    models.School.findOne({
      where: {
        slug: slug
      }
    }).then(school => {
      let result = { slugIsUnique: true }
      if (school) {
        result.slugIsUnique = false
        if (currentSchool && currentSchool.id === school.id) {
          result.isCurrentSlug = true
        }
      }
      resolve(result)
    }).catch(error => reject(error))
  })
}

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
        models.Schedule.upsert({
          schoolId: school.id,
          typeKey: type.key,
          uuid: schedule.id.replace('{', '').replace('}', ''),
          name: schedule.name,
          rawName: schedule.rawName,
          firstName: schedule.firstName,
          lastName: schedule.lastName,
          initials: schedule.initials,
          className: schedule.className
        })
        .then(_ => cb())
        .catch(error => cb(error))
      }, (error) => {
        if (error) return callback(error)

        callback()
      })
    }, (error) => {
      if (error) return reject(error)

      models.School.update({
        novaDataUpdatedAt: moment().format('YYYY-MM-DD HH:mm:ss')
      },{
        where: {
          id: school.id
        }
      }).then(_ => {
        resolve()
      }).catch(error => reject(error))
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
        name: school.name,
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

router.post('/:schoolSlug', (req, res) => {
  if (req.headers.authorization !== 'Bearer ' + process.env.AUTH_TOKEN) return res.status(401).send('Unauthorized.')
  if (!req.body.hasOwnProperty('name') && !req.body.hasOwnProperty('slug') && !req.body.hasOwnProperty('novaId') && !req.body.hasOwnProperty('novaCode')) return res.status(400).send('No parameters sent.')

  models.School.findOne({
    where: {
      slug: req.params.schoolSlug
    }
  }).then(school => {
    if (!school) return res.status(404).send('Not found.')

    // Go through the accepted props and validate them if they have a value.
    // Name and Slug are required to have a value if specified, novaId and novaCode does not. (allowNull: true / false)
    if (req.body.hasOwnProperty('name') && !validator.validateName(req.body.name)) return res.status(400).send('Invalid school name.')
    if (req.body.hasOwnProperty('slug') && !validator.validateSlug(req.body.slug)) return res.status(400).send('Invalid school slug.')
    if (req.body.novaId && !validator.validateNovaValue(req.body.novaId)) return res.status(400).send('Invalid Nova ID.')
    if (req.body.novaCode && !validator.validateNovaValue(req.body.novaCode)) return res.status(400).send('Invalid Nova code.')

    // Make sure the school slug isn't taken.
    schoolSlugIsUnique(req.body.slug, school).then(result => {
      if (!result.slugIsUnique && !result.isCurrentSlug) return res.status(400).send('The slug is used by a different school.')

      // Build data model based on recevied (or not received) parameters.
      const data = {}
      if (req.body.name) data.name = req.body.name
      if (req.body.slug) data.slug = req.body.slug
      if (req.body.hasOwnProperty('novaId')) data.novaId = req.body.novaId
      if (req.body.hasOwnProperty('novaCode')) data.novaCode = req.body.novaCode
      
      // Actually update the school's data.
      models.School.update(data, {
        where: {
          id: school.id
        }
      }).then(_ => {
        // Update successful.
        res.json({ success: true })
      }).catch(error => {
        console.log(error)
        res.status(500).send('Something went wrong.')
      })
    }).catch(error => {
      console.log(error)
      res.status(500).send('Something went wrong.')
    })
  })
})

router.post('/:schoolSlug/update', (req, res) => {
  if (req.headers.authorization !== 'Bearer ' + process.env.AUTH_TOKEN) return res.status(401).send('Unauthorized.')
  
  models.School.findOne({
    where: {
      slug: req.params.schoolSlug
    }
  }).then(school => {
    if (!school) return res.status(404).send('Not found.')

    const force = req.body.hasOwnProperty('force') ? req.body.force : false
    nova.checkSchoolNovaDataUpdate(school, force).then(updateAvailable => {
      if (!updateAvailable) return res.send('Nova data is up to date.')

      nova.downloadSchoolNovaData(school).then(data => {
        saveSchoolNovaData(school, data).then(_ => {
          res.send('Nova data updated.')
        })
      })
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
      attributes: [['uuid', 'id'], 'name'],
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
  if (req.body.novaId && !validator.validateNovaValue(req.body.novaId)) return res.status(400).send('Invalid Nova ID.')
  if (req.body.novaCode && !validator.validateNovaValue(req.body.novaCode)) return res.status(400).send('Invalid Nova code.')

  schoolPropsAreUnique(req.body).then(result => {
    if (!result.propsAreUnique) return res.status(400).send(result.reason)
    
    models.School.create({
      name: req.body.name,
      slug: req.body.slug,
      novaId: req.body.novaId,
      novaCode: req.body.novaCode
    }).then(school => {

      nova.downloadSchoolNovaData(school).then(data => {
        saveSchoolNovaData(school, data).then(_ => {
          res.json({ success: true })
        })
      })

    })
  })
})

module.exports = router