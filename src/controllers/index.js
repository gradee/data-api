// Main controller that handles all routes.
const router = require('express').Router()

router.use('/schedule', require('./schedule'))
router.use('/schools', require('./schools'))

router.get('/', (req, res) => {
  res.json({
    availableRoutes: [
      '/schedule/:scheduleId',
      '/schools',
      '/schools/:schoolSlug',
      '/schools/:schoolSlug/:typeSlug',
      '/schools/:schoolSlug/:typeSlug/:scheduleId'
    ]
  })
})

module.exports = router