// Dependencies
const express = require('express')
const bodyparser = require('body-parser')
const helmet = require('helmet')
const fs = require('fs')
const path = require('path')

// Set up API web server.
const app = express()
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  next()
})
app.use(helmet())
app.use(bodyparser.json())
app.use('/', require('./controllers'))

// Ensure that vital directories exist before spinning up the server.
const vitalDirectories = [
  path.resolve(__dirname + '/../local'), // Main storage folder for local files.
  path.resolve(__dirname + '/../local/schedules') // For storing schedule PDF files.
]
vitalDirectories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }
})

app.listen(3000, () => {
  console.log('API up and running! 🤘')
})
