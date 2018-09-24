// Dependencies
const path = require('path')
const express = require('express')
const bodyparser = require('body-parser')

// Set reference to app root directory
global.appRoot = path.resolve(__dirname)

// Set up API web server.
const app = express()
app.use(bodyparser.json())
app.use('/', require('./controllers'))
app.listen(3000, () => {
  console.log('API up and running! 🤘')
})
