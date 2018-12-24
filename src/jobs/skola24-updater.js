// Dependencies
const async = require('async')
const luxon = require('luxon')
const schedule = require('node-schedule')

// Models
const models = require('../models')

// Helpers
const School = require('../helpers/school')

function updateAllSchoolData() {
  models.School.findAll({
    include: [
      {
        model: models.Skola24School,
        as: 'skola24Properties',
        attributes: [ 'id', 'uuid', 'host' ],
        required: true
      }
    ]
  }).then(schools => {
    console.log('')
    console.log('-----------------------------------------------------------------')
    console.log('  Update process started at ' + luxon.DateTime.local().setZone('Europe/Stockholm').toISO())
    console.log('-----------------------------------------------------------------')
    console.log('')
    async.eachSeries(schools, (school, callback) => {
      console.log('-----')
      console.log('  ' + school.name)
      console.log('-----')
      console.log('Started at: ' + luxon.DateTime.local().setZone('Europe/Stockholm').toISO())
      School.updateSkola24ScheduleData(school)
        .then(didUpdate => {
          console.log('Finished at: ' + luxon.DateTime.local().setZone('Europe/Stockholm').toISO())
          console.log('Did update: ' + didUpdate)
          console.log('')
          callback()
        })
      .catch(error => callback(error))
    }, (error) => {
      if (error) return console.log(error)
  
      console.log('-----------------------------------------------------------------')
      console.log('  Update process finished at: ' + luxon.DateTime.local().setZone('Europe/Stockholm').toISO())
      console.log('-----------------------------------------------------------------')

      if (args.indexOf('--no-job') > -1) {
        process.exit(0)
      }
    })
  })
}

const args = process.argv.slice(2, process.argv.length)

updateAllSchoolData(args.indexOf('-f') > -1)
if (args.indexOf('--no-job') === -1) {
  const updateJob = schedule.scheduleJob('0 */3 * * *', updateAllSchoolData)
}