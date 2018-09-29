module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.changeColumn('schools', 'nova_id', {
        type: Sequelize.STRING,
        allowNull: true
      }),
      queryInterface.changeColumn('schools', 'nova_code', {
        type: Sequelize.STRING,
        allowNull: true
      })
    ])
  },

  down: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.changeColumn('schools', 'nova_id', {
        type: Sequelize.STRING,
        allowNull: false
      }),
      queryInterface.changeColumn('schools', 'nova_code', {
        type: Sequelize.STRING,
        allowNull: false
      })
    ])
  }
}