// Dependencies
const express = require('express')
const bodyparser = require('body-parser')
const helmet = require('helmet')

// Set up API web server.
const app = express()
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  next()
})
app.use(helmet)
app.use(bodyparser.json())
app.use('/', require('./controllers'))
app.listen(3000, () => {
  console.log('API up and running! 🤘')
})
