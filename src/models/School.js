module.exports = (connection, DataTypes) => {
  return connection.define('school', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false
    },
    novaId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'nova_id'
    },
    novaCode: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'nova_code'
    },
    novaWeekSupport: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      field: 'nova_week_support',
      defaultValue: true
    },
    novaDataUpdatedAt: {
      type: DataTypes.DATE,
      field: 'nova_data_updated_at'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at'
    }
  }, {
    tableName: 'schools',
    timestamps: true
  })
}