module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.renameTable('schedules', 'nova_schedules'),
      queryInterface.renameTable('schedule_weeks', 'nova_schedule_weeks'),
      queryInterface.renameColumn('nova_schedule_weeks', 'schedule_id', 'nova_schedule_id')
    ])
  },
  down: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.renameTable('nova_schedules', 'schedules'),
      queryInterface.renameTable('nova_schedule_weeks', 'schedule_weeks'),
      queryInterface.renameColumn('schedule_weeks', 'nova_schedule_id', 'schedule_id')
    ])
  }
}
