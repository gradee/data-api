// Dependencies
const router = require('express').Router()
const crypto = require('crypto')

// Helpers
const Validator = require('../helpers/validator')
const Users = require('../helpers/users')

// Models
const models = require('../models')

router.get('/', (req, res) => {
  if (req.headers.authorization !== 'Bearer ' + process.env.AUTH_TOKEN) return res.status(404).send('Not found.')

  models.User.findAll({
    attributes: ['first_name', 'last_name', 'email', ['created_at', 'joined']]
  }).then(users => {
    res.json(users)
  }).catch(error => {
    console.log(error)
    res.status(500).send('Something went wrong.')
  })
})

router.post('/', (req, res) => {
  if (req.headers.authorization !== 'Bearer ' + process.env.AUTH_TOKEN) return res.status(404).send('Not found.')

  // Make sure all fields are included in the request body.
  const requiredFields = [ 'firstName', 'lastName', 'email', 'password' ]
  requiredFields.forEach(field => {
    if (!req.body.hasOwnProperty(field)) return res.status(400).send('Missing parameter: ' + field)
  })

  // Validate all fields properly
  if (!Validator.validateName(req.body.firstName)) return res.status(400).send('Invalid parameter value for: ' + field)
  if (!Validator.validateName(req.body.lastName)) return res.status(400).send('Invalid parameter value for: ' + field)
  if (!Validator.validateEmail(req.body.email)) return res.status(400).send('Invalid parameter value for: ' + field)

  Users.emailIsUnique(req.body.email)
    .then(isUnique => {
      if (!isUnique) return res.status(400).send('The email you provided is already taken.')

      // Generate SALT and hash the password.
      const user = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        salt: crypto.randomBytes(256).toString('hex'),
        hashAlgorithm: 'sha512'
      }
      user.password = crypto.pbkdf2Sync(req.body.password, user.salt, 10000, 512, user.hashAlgorithm).toString('hex')
      
      models.User.create(user)
        .then(results => {
          res.json({
            success: true,
            message: 'User created.'
          })
        })
      .catch(error => {
        console.log(error)
        res.status(500).send('Something went wrong.')
      })
    })
  .catch(error => {
    console.log(error)
    res.status(500).send('Something went wrong.')
  })
})

module.exports = router
