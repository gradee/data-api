module.exports = (connection, DataTypes) => {
  return connection.define('nova_schedule_week', {
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    novaScheduleId: {
      type: DataTypes.BIGINT,
      field: 'nova_schedule_id'
    },
    weekNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'week_number'
    },
    fileUpdatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'file_updated_at'
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
    tableName: 'nova_schedule_weeks',
    timestamps: true
  })
}
