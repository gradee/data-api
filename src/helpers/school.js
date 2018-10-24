// Dependencies
const Op = require('sequelize').Op
const async = require('async')
const moment = require('moment')

// Helpers
const Nova = require('./nova')

// Models
const models = require('../models')

function School() {

  function removeOldSchedules(idList, schoolId) {
    return new Promise((resolve, reject) => {
      models.Schedule.destroy({
        where: {
          schoolId: schoolId,
          uuid: {
            [Op.notIn]: idList
          }
        }
      })
      .then(_ => resolve())
      .catch(error => reject(error))
    })
  }

  function upsertSchedules(schedules) {
    return new Promise((resolve, reject) => {
      async.each(schedules, (schedule, callback) => {
        models.Schedule.upsert(schedule)
          .then(_ => callback())
        .catch(error => callback(error))
      }, (error) => {
        if (error) return reject(error)

        resolve()
      })
    })
  }
  
  function setSchoolUpdateDate(schoolId) {
    return new Promise((resolve, reject) => {
      models.School.update({
        novaDataUpdatedAt: moment().format('YYYY-MM-DD HH:mm:ss')
      }, {
        where: {
          id: schoolId
        }
      }).then(_ => resolve())
      .catch(error => reject(error))
    })
  }

  function updateNovaData(school) {
    return new Promise((resolve, reject) => {
      // First of all, make sure it needs updating.
      Nova.checkSchoolDataUpdate(school).then(needsUpdate => {
        if (!needsUpdate) return resolve(false)

        // Download the school's data from Nova
        Nova.downloadSchoolData(school).then(data => {
          
          // Fix the data to better suit storing in the database.
          const schedules = Nova.prepareSchoolData(data, school.id)

          // Remove old schedules that don't exist on Nova anymore.
          const idList = schedules.map((schedule, i) => schedule.uuid)

          idList.splice(idList.indexOf('5B219A86-4AAB-4DA8-8946-EF3C156DCFA0'), 1)
          
          removeOldSchedules(idList, school.id)
            .then(upsertSchedules(schedules))
            .then(setSchoolUpdateDate(school.id))
            .then(_ => resolve(true))
          .catch(error => reject(error))
        })
      })
    })
  }

  return {
    updateNovaData
  }
}

module.exports = School()