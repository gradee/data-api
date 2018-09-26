/**
 * Simple script to make sure your database has all tables and relationships set up correctly.
 */

// Models
const models = require('../models')

models.connection.sync({ force: (process.argv.indexOf('-f') !== -1) }).then(_ => {
  console.log('Your database has been syncronized. 🤘')

  process.exit(0)
}).catch(err => {
  console.log(err)
  process.exit(1)
})