// Main controller that handles all routes.
const router = require('express').Router()

router.use('/schedule', require('./schedule'))
router.use('/schools', require('./schools'))

module.exports = router