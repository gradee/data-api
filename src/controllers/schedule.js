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
  models.Schedule.findOne({
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
    let week = luxon.DateTime.local().get('weekNumber')
    if (req.query.w) {
      if (!isNaN(+req.query.w) && isFinite(req.query.w)) {
        if (parseInt(req.query.w) > 0 && parseInt(req.query.w) <= 53) {
          week = parseInt(req.query.w)
        }
      }
    }

    Nova.getSchedule(schedule.school, schedule, week)
      .then(data => {
        res.json(data)
      })
    .catch(error => {
      console.log(error)
      res.status(500).send('Something went wrong.')
    })
  })
})



module.exports = router