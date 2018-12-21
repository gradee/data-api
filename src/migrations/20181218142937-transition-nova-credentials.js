const async = require('async')

const models = require('../models')

module.exports = {
  up: (queryInterface, Sequelize) => {
    return new Promise((resolve, reject) => {
      models.School.findAll().then(schools => {
        async.eachSeries(schools, (school, cb) => {
          models.NovaSchool.create({
            schoolId: school.id,
            novaId: school.novaId,
            novaCode: school.novaCode,
            novaWeekSupport: school.novaWeekSupport,
            novaDataUpdatedAt: school.novaDataUpdatedAt
          }).then(_ => cb())
        }, (error) => {
          resolve()
        })
  
      }).catch(error => {
        console.log(error)
      })
    })
  },

  down: (queryInterface, Sequelize) => {
    return new Promise((resolve, reject) => {
      models.School.findAll().then(schools => {
        async.eachSeries(schools, (school, cb) => {
          models.NovaSchool.destroy({
            where: {
              schoolId: school.id
            }
          }).then(_ => cb())
        }, (error) => {
          resolve()
        })
      })
    })
  }
}