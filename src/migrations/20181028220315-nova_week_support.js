module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('schools', 'nova_week_support', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      after: 'nova_code'
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('schools', 'nova_week_support')
  }
}