module.exports = {
  up: (queryInterface, Sequelize) => {
    return new Promise((resolve, reject) => {
      queryInterface.sequelize.query('SELECT * FROM schedules', { type: queryInterface.sequelize.QueryTypes.SELECT }).then(schedules => {
        let schedulesUpdated = 0
        schedules.forEach(schedule => {
          const uuid = schedule.uuid.replace('{', '').replace('}', '')
          queryInterface.sequelize.query('UPDATE schedules SET uuid = $1 WHERE id = $2', {
            bind: [uuid, schedule.id]
          }).then(_ => {
            schedulesUpdated += 1
            updateCallback()
          }).catch(error => reject(error))
        })

        function updateCallback() {
          if (schedulesUpdated === schedules.length) resolve()
        }
      }).catch(error => reject(error))
    })
  },

  down: (queryInterface, Sequelize) => {
    return new Promise((resolve, reject) => {
      queryInterface.sequelize.query('SELECT * FROM schedules', { type: queryInterface.sequelize.QueryTypes.SELECT }).then(schedules => {
        let schedulesUpdated = 0
        schedules.forEach(schedule => {
          const uuid = '{' + schedule.uuid + '}'
          queryInterface.sequelize.query('UPDATE schedules SET uuid = $1 WHERE id = $2', {
            bind: [uuid, schedule.id]
          }).then(_ => {
            schedulesUpdated += 1
            updateCallback()
          }).catch(error => reject(error))
        })
  
        function updateCallback() {
          if (schedulesUpdated === schedules.length) resolve()
        }
      }).catch(error => reject(error))
    })
  }
}
