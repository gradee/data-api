// Router for /schedule
const router = require('express').Router()

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

    nova.downloadSchedule({
      novaId: schedule.school.novaId,
      novaCode: schedule.school.novaCode,
      typeKey: schedule.typeKey,
      id: schedule.uuid,
      week: 41
    }).then(results => {
      console.log(results)
    }).catch(error => {
      console.log(error)
    })

    res.json(schedule)
  })
})

module.exports = router