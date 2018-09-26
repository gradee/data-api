const router = require('express').Router()

router.get('/', (req, res) => {
  res.status(400).send('No resource specified.')
})

module.exports = router