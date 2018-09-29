// Router for /schedule
const router = require('express').Router()
const luxon = require('luxon')

// Models
const models = require('../models')

// Helpers
const nova = require('../helpers/nova')

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
    const week = luxon.DateTime.local().get('weekNumber')
    
    nova.fetchNovaSchedule(schedule.school.novaId, schedule.typeKey, schedule.uuid, week)
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