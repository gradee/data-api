// Router for /schedule
const router = require('express').Router()
const moment = require('moment')

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
    
    const weekNum = moment().isoWeek()

    nova.downloadSchedule(schedule, schedule.school, weekNum)
      .then(results => {
        results.data.forEach(lesson => {
          const data = {
            hexColor: lesson.color,
          }

          /**
           * TODO:
           * Figure out a nice solution for processing "block" lessons that don't have any siblings.
           * That is that the event is one with 2 or more text rows (ex. title, room, course, teacher).
           */

          // console.log(lesson.texts)
          // console.log(lesson.start)
          // console.log(lesson.end)
          // console.log(lesson.parsed)
          // console.log('----------')
        })
      })
    .catch(error => {
      console.log(error)
    })

    res.json(schedule)
  })
})

module.exports = router