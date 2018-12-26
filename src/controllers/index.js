// Main controller that handles all routes.
const router = require('express').Router()

router.use('/schools', require('./schools'))

router.get('/', (req, res) => {
  res.json({
    availableRoutes: [
      '/schools',
      '/schools/:schoolSlug',
      '/schools/:schoolSlug/:typeSlug',
      '/schools/:schoolSlug/:typeSlug/:scheduleId',
      '/schools/:schoolSlug/:typeSlug/:scheduleId/schedule',
      '/schools/:schoolSlug/:typeSlug/:scheduleId/schedule/ical'
    ]
  })
})

router.get('*', (req, res) => {
  res.status(404).send('Not found.')
})

router.post('*', (req, res) => {
  res.status(404).send('Not found.')
})

router.delete('*', (req, res) => {
  res.status(404).send('Not found.')
})

router.put('*', (req, res) => {
  res.status(404).send('Not found.')
})

router.patch('*', (req, res) => {
  res.status(404).send('Not found.')
})

module.exports = router
