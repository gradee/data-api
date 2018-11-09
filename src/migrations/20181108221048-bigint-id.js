
function upgradeTableColumns(queryInterface, Sequelize, table, columns) {
  queryInterface.getForeignKeyReferencesForTable(table).then(results => {
    const promiseQueue = []
    if (results.length) {
      results.forEach(row => {
        promiseQueue.push(queryInterface.removeConstraint(table, row.constraintName))
      })
    }
    for (let column in columns) {
      promiseQueue.push(queryInterface.changeColumn(table, column, columns[column]))
    }
    return Promise.all(promiseQueue)
  })
}

module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      upgradeTableColumns(queryInterface, Sequelize, 'schedule_weeks', {
        'schedule_id': {
          type: Sequelize.BIGINT,
          allowNull: false
        },
        'id': {
          type: Sequelize.BIGINT,
          allowNull: false,
          autoIncrement: true
        }
      }),
      upgradeTableColumns(queryInterface, Sequelize, 'schedules', {
        'school_id': {
          type: Sequelize.BIGINT,
          allowNull: false
        },
        'id': {
          type: Sequelize.BIGINT,
          allowNull: false,
          autoIncrement: true
        }
      }),
      upgradeTableColumns(queryInterface, Sequelize, 'schools', {
        'id': {
          type: Sequelize.BIGINT,
          allowNull: false,
          autoIncrement: true
        }
      })
    ])
  },
  down: (queryInterface, Sequelize) => {
    return Promise.all([
      // Reset Schedule table 'id' to BIGING
      queryInterface.changeColumn('schedules', 'id', {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true
      }),
      // Reset Schedule table 'school_id' to BIGING
      queryInterface.changeColumn('schedules', 'school_id', {
        type: Sequelize.INTEGER,
        allowNull: false
      }),
      // Rest ScheduleWeek table 'id' to BIGING
      queryInterface.changeColumn('schedule_weeks', 'id', {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true
      }),
      // Reset ScheduleWeek table 'id' to BIGING
      queryInterface.changeColumn('schedule_weeks', 'schedule_id', {
        type: Sequelize.INTEGER,
        allowNull: false
      }),
      // Reset School table 'id' to BIGING
      queryInterface.changeColumn('schools', 'id', {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true
      })
    ])
  }
}
