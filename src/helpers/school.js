// Dependencies
const Op = require('sequelize').Op
const async = require('async')
const moment = require('moment')
moment.tz.setDefault('Europe/Stockholm')

// Helpers
const Nova = require('./nova')
const Validator = require('./validator')

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
  
  function updateNovaMetaData(novaSchoolId, weekSupport) {
    return new Promise((resolve, reject) => {
      models.NovaSchool.update({
        novaWeekSupport: weekSupport,
        novaDataUpdatedAt: moment().format('YYYY-MM-DD HH:mm:ss')
      }, {
        where: { id: novaSchoolId }
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

  function getScheduleData(school) {
    return new Promise((resolve, reject) => {
      const data = {
        name: school.name,
        slug: school.slug
      }
      if (!school.novaProperties) return resolve(data)

      school.getNovaSchedules().then(schedules => {
        data.scheduleSource = 'Novaschem'
        data.schedules = 0
        data.types = []

        schedules.forEach(schedule => {
          data.schedules += 1
          const type = Nova.scheduleTypes[schedule.typeKey]
          if (!data.types.hasOwnProperty(type.slug)) {
            data.types[type.slug] = {
              name: type.name,
              slug: type.slug,
              schedules: 0
            }
          }
          
          data.types[type.slug].schedules += 1
        })
  
        for (let key in data.types) {
          data.types.push(data.types[key])
        }
  
        resolve(data)
      }).catch(error => reject(error))
    })
  }

  function getBySlug(slug, scheduleData = false) {
    return new Promise((resolve, reject) => {
      models.School.findOne({
        where: { slug: slug },
        attributes: [ 'id', 'name', 'slug', 'createdAt', 'updatedAt' ],
        include: [
          {
            model: models.NovaSchool,
            as: 'novaProperties',
            attributes: [ 'id', 'novaId', 'novaCode', 'novaWeekSupport', 'novaDataUpdatedAt' ]
          }
        ]
      }).then(school => {
        if (!school) return reject('not-found')
        if (!scheduleData) return resolve(school.toJSON())
          
        getScheduleData(school)
          .then(data => resolve(data))
        .catch(error => reject(error))
        
      }).catch(error => reject(error))
    })
  }

  function deleteNovaSchedules(school) {
    return new Promise((resolve, reject) => {
      // Find all schedules to delete.
      models.NovaSchedule.findAll({
        where: { schoolId: school.id }
      }).then(schedules => {
        async.eachOf(schedules, (schedule, callback) => {
          // Delete all schedule weeks.
          models.NovaScheduleWeek.destroy({
            where: { novaScheduleId: schedule.id }
          }).then(_ => {
            // Delete (destroy) the actual schedule.
            models.NovaSchedule.destroy({
              where: { id: schedule.id }
            }).then(_ => callback())
            .catch(error => reject(error))
          })
          .catch(error => reject(error))
        }, _ => resolve()) // All done.
      }).catch(error => reject(error))
    })
  }

  function deleteNovaProperties(school) {
    return new Promise((resolve, reject) => {
      if (!school.novaProperties) return resolve()
      
      // First remove the actual properties.
      models.NovaSchool.destroy({
        where: { id: school.novaProperties.id }
      }).then(_ => deleteNovaSchedules(school))
        .then(_ => resolve())
      .catch(error => reject(error))
    })
  }

  function deleteBySlug(slug) {
    return new Promise((resolve, reject) => {
      getBySlug(slug)
        .then(school => {
          if (!school) return reject('not-found')
        
          deleteNovaProperties(school).then(_ => {
            models.School.destroy({
              where: { id: school.id }
            }).then(_ => resolve()).catch(error => reject(error))
          }).catch(error => reject(error))
        })
      .catch(error => reject(error))
    })
  }

  function updateNovaDataBySlug(slug, force = false) {
    return new Promise((resolve, reject) => {
      getBySlug(slug)
        .then(school => {
          if (!school) return reject('not-found')

          // First of all, make sure it needs updating.
          Nova.checkSchoolDataUpdate(school)
            .then(needsUpdate => {
              if (!needsUpdate && !force) return resolve(false)

              // Download the school's data from Nova
              Nova.downloadSchoolData(school)
                .then(data => {
                  const weekSupport = (data.weeks.length > 0)
                            
                  // Fix the data to better suit storing in the database.
                  const schedules = Nova.prepareSchoolData(data.types, school.id)

                  // Remove old schedules that don't exist on Nova anymore.
                  const idList = schedules.map((schedule, i) => schedule.uuid)
                  
                  removeOldSchedules(idList, school.id)
                    .then(upsertSchedules(schedules))
                    .then(updateNovaMetaData(school.novaProperties.id, weekSupport))
                    .then(_ => resolve(true))
                  .catch(error => reject(error))
                })
              .catch(error => reject(error))
            })
          .catch(error => reject(error))
        })
      .catch(error => reject(error))
    })
  }

  function updateSchoolData(school, data) {
    return new Promise((resolve, reject) => {
      models.School.update(data, {
        where: { id: school.id }
      }).then(_ => resolve())
      .catch(error => reject(error))
    })
  }

  function updateSchoolNovaProperties(school, data) {
    return new Promise((resolve, reject) => {
      if (school.novaProperties) {
        // The school has nova data since before, so just update it.
        models.NovaSchool.update(data, {
          where: { id: school.novaProperties.id }
        }).then(_ => resolve())
        .catch(error => reject(error))
      } else {
        // If the school didn't have Nova data before, add it.
        data.schoolId = school.id
        models.NovaSchool.create(data)
          .then(_ => resolve())
        .catch(error => reject(error))
      }
    })
  }

  function updateBySlug(slug, data) {
    return new Promise((resolve, reject) => {
      getBySlug(slug)
        .then(school => {
          if (!school) return reject('not-found')
          if (!data.hasOwnProperty('name') && !data.hasOwnProperty('slug') && !data.hasOwnProperty('novaschem') && !data.hasOwnProperty('skola24')) return reject('No accepted properties provided.')

          // Go through the accepted props and validate them if they have a value.
          // Name and Slug are required to have a value if specified, novaId and novaCode does not. (allowNull: true / false)
          if (data.hasOwnProperty('name') && !Validator.validateName(data.name)) return reject('Invalid school name.', true)
          if (data.hasOwnProperty('slug') && !Validator.validateSlug(data.slug)) return reject('Invalid school slug.', true)
          if (data.hasOwnProperty('novaschem')) {
            if (data.novaschem.id && !Validator.validateNovaValue(data.novaschem.id)) return reject('Invalid Nova ID.', true)
            if (data.novaschem.code && !Validator.validateNovaValue(data.novaschem.code)) return reject('Invalid Nova code.', true)
          }

          // Make sure the school slug isn't taken.
          slugIsUnique(data.slug, school)
            .then(result => {
              if (!result.slugIsUnique && !result.isCurrentSlug) return reject('The slug you provided is already taken.', true)

              const updatePromises = []
              // Update regular school data
              if (data.name || data.slug) {
                const newData = {}
                if (data.name) newData.name = data.name
                if (data.slug) newData.slug = data.slug
                updatePromises.push(updateSchoolData(school, newData))
              }
              // Update Novaschem data
              if (data.hasOwnProperty('novaschem')) {
                const newNovaProps = {}
                if (data.novaschem.id) newNovaProps.novaId = data.novaschem.id
                if (data.novaschem.code) newNovaProps.novaCode = data.novaschem.code
                updatePromises.push( Object.keys(newNovaProps).length ? updateSchoolNovaProperties(school, newNovaProps) : deleteNovaProperties(school))
              }

              // Run update promises.
              Promise.all(updatePromises)
                .then(_ => resolve())
              .catch(error => reject(error))
            })
          .catch(error => reject(error))
        })
      .catch(error => reject(error))
    })
  }

  return {
    updateNovaData,
    slugIsUnique,
    getBySlug,
    deleteBySlug,
    updateBySlug,
    updateNovaDataBySlug
  }
}

module.exports = School()