/**
 * Simple script to make sure your database has all tables and relationships set up correctly.
 * 
 * !CAUTION: This will wipe your existing database records, use with care.
 */

// Models
const models = require('../models')

models.connection.sync({ force: true }).then(_ => {
  console.log('Your database has been syncronized. 🤘')

  process.exit(0)
}).catch(err => {
  console.log(err)
  process.exit(1)
})