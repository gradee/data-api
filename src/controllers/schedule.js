// Router for /schedule
const router = require('express').Router()
const luxon = require('luxon')

// Models
const models = require('../models')

// Helpers
const Nova = require('../helpers/nova')

router.get('/', (req, res) => {
  res.status(400).send('No resource specified.')
})

router.get('/:uuid', (req, res) => {
  models.NovaSchedule.findOne({
    where: {
      uuid: req.params.uuid
    },
    include: [{
      model: models.School,
      required: true
    }]
  }).then(schedule => {
    if (!schedule) return res.status(404).send('Not found.')

    // Grab current week
    let week = luxon.DateTime.local().setZone('Europe/Stockholm').get('weekNumber')
    if (req.query.w) {
      if (!isNaN(+req.query.w) && isFinite(req.query.w)) {
        if (parseInt(req.query.w) > 0 && parseInt(req.query.w) <= 53) {
          week = parseInt(req.query.w)
        }
      }
    }

    Nova.getScheduleData(schedule.school, schedule, week)
      .then(data => {
        res.json(data)
      })
    .catch(error => {
      console.log(error)
      res.status(500).send('Something went wrong.')
    })
  })
})

router.get('/:uuid/pdf', (req, res) => {
  models.NovaSchedule.findOne({
    where: {
      uuid: req.params.uuid
    },
    include: [{
      model: models.School,
      required: true
    }]
  }).then(schedule => {
    if (!schedule) return res.status(404).send('Not found.')

    // Grab current week
    let week = luxon.DateTime.local().setZone('Europe/Stockholm').get('weekNumber')
    if (req.query.w) {
      if (!isNaN(+req.query.w) && isFinite(req.query.w)) {
        if (parseInt(req.query.w) > 0 && parseInt(req.query.w) <= 53) {
          week = parseInt(req.query.w)
        }
      }
    }

    Nova.getSchedulePdf(schedule.school, schedule, week)
      .then(file => {
        res.contentType('application/pdf')
        res.send(file)
      })
    .catch(error => {
      console.log(error)
      res.status(500).send('Something went wrong.')
    })
  })
})

module.exports = router