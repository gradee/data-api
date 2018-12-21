module.exports = (connection, DataTypes) => {
  return connection.define('nova_school', {
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    schoolId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'school_id'
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
    tableName: 'nova_schools',
    timestamps: true
  })
}
