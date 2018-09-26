module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.renameColumn('schedules', 'schedule_id', 'uuid')
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.renameColumn('schedules', 'uuid', 'schedule_id')
  }
}