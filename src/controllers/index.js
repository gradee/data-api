// Main controller that handles all routes.
const router = require('express').Router()

router.use('/schedule', require('./schedule'))
router.use('/schools', require('./schools'))
router.use('/users', require('./users'))

router.get('/', (req, res) => {
  res.json({
    availableRoutes: [
      '/schools',
      '/schools/:schoolSlug',
      '/schools/:schoolSlug/:typeSlug',
      '/schools/:schoolSlug/:typeSlug/:scheduleId',
      '/schedule/:scheduleId',
      '/schedule/:scheduleId/pdf'
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
