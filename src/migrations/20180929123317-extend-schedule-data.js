module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.addColumn('schedules', 'raw_name', {
        type: Sequelize.STRING,
        allowNull: false,
        after: 'name'
      }),
      queryInterface.addColumn('schedules', 'first_name', {
        type: Sequelize.STRING,
        allowNull: true,
        after: 'raw_name'
      }),
      queryInterface.addColumn('schedules', 'last_name', {
        type: Sequelize.STRING,
        allowNull: true,
        after: 'first_name'
      }),
      queryInterface.addColumn('schedules', 'initials', {
        type: Sequelize.STRING,
        allowNull: true,
        after: 'last_name'
      }),
      queryInterface.addColumn('schedules', 'class_name', {
        type: Sequelize.STRING,
        allowNull: true,
        after: 'initials'
      })
    ])
  },

  down: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.removeColumn('schedules', 'raw_name'),
      queryInterface.removeColumn('schedules', 'first_name'),
      queryInterface.removeColumn('schedules', 'last_name'),
      queryInterface.removeColumn('schedules', 'initials'),
      queryInterface.removeColumn('schedules', 'class_name')
    ])
  }
}
