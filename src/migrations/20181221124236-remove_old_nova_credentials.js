module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.removeColumn('schools', 'nova_id'),
      queryInterface.removeColumn('schools', 'nova_code'),
      queryInterface.removeColumn('schools', 'nova_week_support'),
      queryInterface.removeColumn('schools', 'nova_data_updated_at')
    ])
  },
  down: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.addColumn('schools', 'nova_id', {
        type: Sequelize.DataTypes.STRING,
        allowNull: true,
        after: 'slug'
      }),
      queryInterface.addColumn('schools', 'nova_code', {
        type: Sequelize.DataTypes.STRING,
        allowNull: true,
        after: 'nova_id'
      }),
      queryInterface.addColumn('schools', 'nova_week_support', {
        type: Sequelize.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        after: 'nova_code'
      }),
      queryInterface.addColumn('schools', 'nova_data_updated_at', {
        type: Sequelize.DataTypes.DATE,
        after: 'nova_week_support'
      })
    ])
  }
}