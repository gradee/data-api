// Load config file.
require('dotenv').config()

// Dependencies
const mysql = require('mysql2')

const con = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS
})

function databaseExists(callback) {
  con.query("SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = '" + process.env.DB_NAME + "'", (err, result) => {
    if (err) throw err

    callback(result.length > 0)
  })
}

function dropDatabase(callback) {
  con.query("DROP DATABASE " + process.env.DB_NAME, (err, result) => {
    if (err) throw err

    callback(result)
  })
}

function createDatabase(callback) {
  con.query("CREATE DATABASE " + process.env.DB_NAME + " DEFAULT CHARACTER SET utf8 DEFAULT COLLATE utf8_general_ci", (err, result) => {
    if (err) throw err

    callback(result)
  })
}

con.connect((err) => {
  if (err) throw err

  // Check for force flag (-f), if it exists, delete the database before creation.
  if (process.argv.indexOf('-f') !== -1) {
    dropDatabase((result) => {
      createDatabase((result) => {
        console.log('The database ' + process.env.DB_NAME + ' was successfully created! 🔥')
        process.exit(0)
      })
    })
  } else {
    databaseExists((exists) => {
      if (exists) {
        console.log('The database already exists. 👍')
        process.exit(0)
      }

      createDatabase((result) => {
        console.log('The database ' + process.env.DB_NAME + ' was successfully created! 🔥')
        process.exit(0)
      })
    })
  }
})
