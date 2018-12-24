// Dependencies
const Op = require('sequelize').Op
const async = require('async')
const moment = require('moment')
const { DateTime } = require('luxon')

// Helpers
const Nova = require('./nova')
const Validator = require('./validator')
const Skola24 = require('./skola24')

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

  function getSchoolScheduleData(school) {
    return new Promise((resolve, reject) => {
      const data = {
        name: school.name,
        slug: school.slug
      }
      if (!school.novaProperties && !school.skola24Properties) return resolve(data)

      if (school.skola24Properties) {
        school.getSkola24Schedules()
          .then(schedules => {
            data.scheduleSource = 'Skola24'
            data.schedules = 0
            data.types = []

            schedules.forEach(schedule => {
              data.schedules += 1
              const type = Skola24.scheduleTypes[schedule.typeKey]
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
          })
        .catch(error => reject(error))
      } else {
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
      }
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
          },
          {
            model: models.Skola24School,
            as: 'skola24Properties',
            attributes: [ 'id', 'uuid', 'host' ]
          }
        ]
      }).then(school => {
        if (!school) return reject('not-found')
        if (!scheduleData) return resolve(school.toJSON())
          
        getSchoolScheduleData(school)
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

  function updateNovaScheduleData(school, force = false) {
    return new Promise((resolve, reject) => {
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
              // Update Skola24 data
              if (data.hasOwnProperty('skola24')) {
                const newSkola24Props = {}
                if (data.skola24.uuid) newSkola24Props.uuid = data.skola24.uuid
                if (data.skola24.host) newSkola24Props.host = data.skola24.host
                updatePromises.push( Object.keys(newSkola24Props).length ? updateSkola24Properties(school, newSkola24Props) : deleteSkola24Properties(school))
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

  function addNew(data) {
    return new Promise((resolve, reject) => {
      models.School.create(data)
        .then(school => resolve(school))
      .catch(error => reject(error))
    })
  }

  function addNewSkola24Properties(data) {
    return new Promise((resolve, reject) => {
      models.Skola24School.create(data)
        .then(_ => resolve())
      .catch(error => reject(error))
    })
  }

  function updateSkola24Properties(school, props) {
    return new Promise((resolve, reject) => {
      models.Skola24School.update(props, {
        where: { schoolId: school.id }
      }).then(_ => resolve())
      .catch(error => reject(error))
    })
  }

  function deleteSkola24Properties(school) {
    return new Promise((resolve, reject) => {
      models.Skola24School.destroy({
        where: { schoolId: school.id }
      }).then(_ => resolve())
      .catch(error => reject(error))
    })
  }

  function createMultipleWithSkola24(schools) {
    return new Promise((resolve, reject) => {
      // For each school, make sure it's created, or updated if it exists.
      async.each(schools, (schoolData, callback) => {
        slugIsUnique(schoolData.slug)
          .then(result => {
            if (result.slugIsUnique) {
              addNew({ name: schoolData.name, slug: schoolData.slug })
                .then(school => {
                  addNewSkola24Properties({ schoolId: school.id, uuid: schoolData.skola24.uuid, host: schoolData.skola24.host })
                    .then(_ => callback())
                  .catch(error => reject(error))
                })
              .catch(error => reject(error))
            } else {
              updateBySlug(schoolData.slug, schoolData)
                .then(_ => callback())
              .catch(error => {
                reject(error)
              })
            }
          })
        .catch(error => reject(error))
      }, () => {
        resolve()
      })
    })
  }

  function updateSkola24ScheduleData(school) {
    return new Promise((resolve, reject) => {
      Skola24.getSchoolData(school)
        .then(data => Skola24.updateSchoolData(school, data))
        .then(_ => resolve(true))
      .catch(error => reject(error))
    })
  }

  function updateScheduleDataBySlug(slug, force = false) {
    return new Promise((resolve, reject) => {
      getBySlug(slug)
        .then(school => {
          if (!school) return reject('Not found.', true)

          if (school.novaProperties) {
            updateNovaScheduleData(school, force)
              .then(didUpdate => resolve(didUpdate))
            .catch(error => reject(error))
          } else if (school.skola24Properties) {
            updateSkola24ScheduleData(school)
              .then(didUpdate => resolve(didUpdate))
            .catch(error => reject(error))
          }
        })
      .catch(error => reject(error))
    })
  }

  function getSchedulesBySlug(school, typeSlug) {
    return new Promise((resolve, reject) => {
      let typeKey
      let validTypeSlug = false
      Nova.scheduleTypes.forEach((type, i) => {
        if (type.slug === typeSlug) {
          validTypeSlug = true
          typeKey = i
        }
      })
      if (!validTypeSlug) return reject('not-found')

      if (school.novaProperties) {
        models.NovaSchedule.findAll({
          where: {
            schoolId: school.id,
            typeKey: typeKey
          },
          attributes: [['uuid', 'id'], 'name'],
          raw: true
        }).then(schedules => resolve(schedules))
        .catch(error => reject(error))
      } else if (school.skola24Properties) {
        models.Skola24Schedule.findAll({
          where: {
            schoolId: school.id,
            typeKey: typeKey
          },
          attributes: [['uuid', 'id'], 'name'],
          raw: true
        }).then(schedules => resolve(schedules))
        .catch(error => reject(error))
      } else {
        return reject('not-found')
      }
    })
  }

  function getTypedScheduleById(school, typeSlug, uuid, attributes = null) {
    return new Promise((resolve, reject) => {
      let typeKey
      let validTypeSlug = false
      Nova.scheduleTypes.forEach((type, i) => {
        if (type.slug === typeSlug) {
          validTypeSlug = true
          typeKey = i
        }
      })
      if (!validTypeSlug) return reject('not-found')

      if (school.novaProperties) {
        models.NovaSchedule.findOne({
          where: {
            uuid: uuid,
            schoolId: school.id,
            typeKey: typeKey
          },
          attributes: attributes ? attributes : [['uuid', 'id'], 'name', 'firstName', 'lastName', 'initials', 'className'],
          raw: true
        }).then(schedule => resolve(schedule))
        .catch(error => reject(error))
      } else if (school.skola24Properties) {
        models.Skola24Schedule.findOne({
          where: {
            uuid: uuid,
            schoolId: school.id,
            typeKey: typeKey
          },
          attributes: attributes ? attributes : [['uuid', 'id'], 'name', 'firstName', 'lastName', 'initials', 'className'],
          raw: true
        }).then(schedule => resolve(schedule))
        .catch(error => reject(error))
      } else {
        return reject('not-found')
      }
    })
  }

  function getScheduleData(school, schedule, week) {
    return new Promise((resolve, reject) => {
      if (school.novaProperties) {
        Nova.getScheduleData(school, schedule, week)
          .then(data => resolve({ schedule: schedule, data: data }))
        .catch(error => reject(error))
      } else {
        Skola24.getScheduleData(school, schedule, week)
          .then(data => resolve({ schedule: schedule, data: data }))
        .catch(error => reject(error))
      }
    })
  }

  function getTypedScheduleData(school, typeSlug, uuid, week) {
    return new Promise((resolve, reject) => {
      getTypedScheduleById(school, typeSlug, uuid, [ 'uuid', 'typeKey' ])
        .then(schedule => {
          if (!schedule) return reject('not-found')
          
          getScheduleData(school, schedule, week)
            .then(data => resolve(data))
          .catch(error => reject(error))
        })
      .catch(error => reject(error))
    })
  }

  function getCurrentScheduleEvent(school, schedule) {
    return new Promise((resolve, reject) => {
      const now = DateTime.local().setZone('Europe/Stockholm')
      getScheduleData(school, schedule, now.get('weekNumber'))
        .then(results => {
          if (!results.data.length) return resolve([])

          const lessons = []
          results.data.forEach(lesson => {
            const start = DateTime.fromISO(lesson.startTime)
            const end = DateTime.fromISO(lesson.endTime)
            if (now >= start && now <= end) {
              lessons.push(lesson)
            }
          })
          resolve(lessons)
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
    createMultipleWithSkola24,
    updateScheduleDataBySlug,
    getSchedulesBySlug,
    getTypedScheduleById,
    updateSkola24ScheduleData,
    getTypedScheduleData,
    getCurrentScheduleEvent
  }
}

module.exports = School()