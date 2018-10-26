// Router for /schedule
const router = require('express').Router()
const luxon = require('luxon')
const Op = require('sequelize').Op

// Helpers
const Nova = require('../helpers/nova')
const Validator = require('../helpers/validator')
const School = require('../helpers/school')

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
    res.json(schools)
  })
})

router.post('/', (req, res) => {
  if (req.headers.authorization !== 'Bearer ' + process.env.AUTH_TOKEN) return res.status(401).send('Unauthorized.')
  if (!req.body.name || !Validator.validateName(req.body.name)) return res.status(400).send('Missing or invalid school name.')
  if (!req.body.slug || !Validator.validateSlug(req.body.slug)) return res.status(400).send('Missing or invalid school slug.')
  if (req.body.novaId && !Validator.validateNovaValue(req.body.novaId)) return res.status(400).send('Invalid Nova ID.')
  if (req.body.novaCode && !Validator.validateNovaValue(req.body.novaCode)) return res.status(400).send('Invalid Nova code.')

  School.slugIsUnique(req.body.slug).then(result => {
    if (!result.slugIsUnique) return res.status(400).send('The slug you provided is already taken.')

    models.School.create({
      name: req.body.name,
      slug: req.body.slug,
      novaId: req.body.novaId || '',
      novaCode: req.body.novaCode || ''
    }).then(school => {

      if (school.novaId && school.novaCode) {
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
        slug: school.slug,
        novaId: school.novaId,
        novaCode: school.novaCode,
        schedules: 0,
        types: []
      }

      const types = {}
      schedules.forEach(schedule => {
        data.schedules += 1
        const type = Nova.scheduleTypes[schedule.typeKey]
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
    if (req.body.hasOwnProperty('name') && !Validator.validateName(req.body.name)) return res.status(400).send('Invalid school name.')
    if (req.body.hasOwnProperty('slug') && !Validator.validateSlug(req.body.slug)) return res.status(400).send('Invalid school slug.')
    if (req.body.novaId && !Validator.validateNovaValue(req.body.novaId)) return res.status(400).send('Invalid Nova ID.')
    if (req.body.novaCode && !Validator.validateNovaValue(req.body.novaCode)) return res.status(400).send('Invalid Nova code.')

    // Make sure the school slug isn't taken.
    School.slugIsUnique(req.body.slug, school).then(result => {
      if (!result.slugIsUnique && !result.isCurrentSlug) return res.status(400).send('The slug you provided is already taken.')

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

router.delete('/:schoolSlug', (req, res) => {
  if (req.headers.authorization !== 'Bearer ' + process.env.AUTH_TOKEN) return res.status(401).send('Unauthorized.')

  models.School.findOne({
    where: {
      slug: req.params.schoolSlug
    }
  }).then(school => {
    if (!school) return res.status(404).send('Not found.')

    models.School.destroy({
      where: {
        id: school.id
      }
    }).then(_ => {
      res.send({
        success: true
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
    School.updateNovaData(school, force)
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
  }).catch(error => {
    console.log(error)
    res.status(500).send('Something went wrong.')
  })
})

router.get('/:schoolSlug/:typeSlug', (req, res) => {
  let typeKey
  let validTypeSlug = false
  Nova.scheduleTypes.forEach((type, i) => {
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

router.get('/:schoolSlug/:typeSlug/:uuid', (req, res) => {
  let typeKey
  let validTypeSlug = false
  Nova.scheduleTypes.forEach((type, i) => {
    if (type.slug === req.params.typeSlug) {
      validTypeSlug = true
      typeKey = i
    }
  })
  
  if (!validTypeSlug) return res.status(400).send('Not found.')

  models.Schedule.findOne({
    where: {
      uuid: req.params.uuid,
      typeKey: typeKey
    },
    raw: true,
    attributes: [['uuid', 'id'], 'name', 'firstName', 'lastName', 'initials', 'className']
  }).then(schedule => {
    if (!schedule) return res.status(404).send('Not found.')

    for (let key in schedule) {
      if (schedule[key] === null) delete schedule[key]
    }

    res.json(schedule)
  })
})

module.exports = router