// Dependencies
const Op = require('sequelize').Op
const async = require('async')
const moment = require('moment')
moment.tz.setDefault('Europe/Stockholm')

// Helpers
const Nova = require('./nova')

// Models
const models = require('../models')

function School() {

  function removeOldSchedules(idList, schoolId) {
    return new Promise((resolve, reject) => {
      models.NovaSchedule.destroy({
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
        models.NovaSchedule.upsert(schedule)
          .then(_ => callback())
        .catch(error => callback(error))
      }, (error) => {
        if (error) return reject(error)

        resolve()
      })
    })
  }
  
  function updateNovaMetaData(schoolId, weekSupport) {
    return new Promise((resolve, reject) => {
      models.School.update({
        novaWeekSupport: weekSupport,
        novaDataUpdatedAt: moment().format('YYYY-MM-DD HH:mm:ss')
      }, {
        where: {
          id: schoolId
        }
      }).then(_ => resolve())
      .catch(error => reject(error))
    })
  }

  function updateNovaData(school, force = false) {
    return new Promise((resolve, reject) => {
      // First of all, make sure it needs updating.
      Nova.checkSchoolDataUpdate(school).then(needsUpdate => {
        if (!needsUpdate && !force) return resolve(false)

        // Download the school's data from Nova
        Nova.downloadSchoolData(school).then(data => {
          const weekSupport = (data.weeks.length > 0)
                    
          // Fix the data to better suit storing in the database.
          const schedules = Nova.prepareSchoolData(data.types, school.id)

          // Remove old schedules that don't exist on Nova anymore.
          const idList = schedules.map((schedule, i) => schedule.uuid)
          
          removeOldSchedules(idList, school.id)
            .then(upsertSchedules(schedules))
            .then(updateNovaMetaData(school.id, weekSupport))
            .then(_ => resolve(true))
          .catch(error => reject(error))
        })
      })
    })
  }

  function slugIsUnique(slug, currentSchool = null) {
    return new Promise((resolve, reject) => {
      models.School.findOne({
        where: {
          slug: slug
        }
      }).then(school => {
        let result = { slugIsUnique: true }
        if (school) {
          result.slugIsUnique = false
          if (currentSchool && currentSchool.id === school.id) {
            result.isCurrentSlug = true
          }
        }
        resolve(result)
      }).catch(error => reject(error))
    })
  }

  return {
    updateNovaData,
    slugIsUnique
  }
}

module.exports = School()