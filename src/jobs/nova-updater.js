// Dependencies
const async = require('async')
const luxon = require('luxon')
const schedule = require('node-schedule')

// Models
const models = require('../models')

// Helpers
const School = require('../helpers/school')

function updateAllSchoolData() {
  models.School.findAll().then(schools => {
    console.log('')
    console.log('-----------------------------------------------------------------')
    console.log('  Update process started at ' + luxon.DateTime.local().toISO())
    console.log('-----------------------------------------------------------------')
    console.log('')
    async.eachSeries(schools, (school, callback) => {
  
      console.log('-----')
      console.log('  ' + school.name)
      console.log('-----')
      console.log('Started at: ' + luxon.DateTime.local().toISO())
      School.updateNovaData(school)
        .then(didUpdate => {
          console.log('Finished at: ' + luxon.DateTime.local().toISO())
          console.log('Did update: ' + didUpdate)
          console.log('')
          callback()
        })
      .catch(error => callback(error))
    }, (error) => {
      if (error) return console.log(error)
  
      console.log('-----------------------------------------------------------------')
      console.log('  Update process finished at: ' + luxon.DateTime.local().toISO())
      console.log('-----------------------------------------------------------------')
    })
  })
}

updateAllSchoolData()

const updateJob = schedule.scheduleJob('0 */3 * * *', updateAllSchoolData)