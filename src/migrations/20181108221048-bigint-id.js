// Dependencies
const async = require('async')

function cleanTableConstraints(queryInterface, table) {
  return new Promise((resolve, reject) => {
    queryInterface.getForeignKeyReferencesForTable(table).then(results => {
      if (results.length) {
        async.eachSeries(results, (row, callback) => {
          console.log(row)
          queryInterface.removeConstraint(table, row.constraintName)
            .then(_ => callback())
          .catch(error => reject(error))
        }, () => {
          resolve()
        })
      } else {
        resolve()
      }
    }).catch(error => reject(error))
  })
}

module.exports = {
  up: (queryInterface, Sequelize) => {
    return new Promise((resolve, reject) => {
      // Remove all constraints from all tables.
      cleanTableConstraints(queryInterface, 'schedule_weeks')
        .then(_ => cleanTableConstraints(queryInterface, 'schedules'))
        .then(_ => cleanTableConstraints(queryInterface, 'schools'))
        .then(_ => queryInterface.changeColumn('schedule_weeks', 'schedule_id', { type: Sequelize.BIGINT }))
        .then(_ => queryInterface.changeColumn('schedule_weeks', 'id', { type: Sequelize.BIGINT, allowNull: false, autoIncrement: true }))
        .then(_ => queryInterface.changeColumn('schedules', 'school_id', { type: Sequelize.BIGINT }))
        .then(_ => queryInterface.changeColumn('schedules', 'id', { type: Sequelize.BIGINT, allowNull: false, autoIncrement: true }))
        .then(_ => queryInterface.changeColumn('schools', 'id', { type: Sequelize.BIGINT, allowNull: false, autoIncrement: true }))
        .then(_ => resolve())
      .catch(error => reject(error))
    })
  },
  down: (queryInterface, Sequelize) => {
    return Promise.all([
      // Reset ScheduleWeek table 'id' to INT
      queryInterface.changeColumn('schedule_weeks', 'schedule_id', {
        type: Sequelize.INTEGER
      }),
      // Rest ScheduleWeek table 'id' to INT
      queryInterface.changeColumn('schedule_weeks', 'id', {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true
      }),
      // Reset Schedule table 'school_id' to INT
      queryInterface.changeColumn('schedules', 'school_id', {
        type: Sequelize.INTEGER
      }),
      // Reset Schedule table 'id' to INT
      queryInterface.changeColumn('schedules', 'id', {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true
      }),
      // Reset School table 'id' to INT
      queryInterface.changeColumn('schools', 'id', {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true
      })
    ])
  }
}
