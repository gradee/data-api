module.exports = (connection, DataTypes) => {
  return connection.define('schedule_week', {
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    scheduleId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'schedule_id'
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
    tableName: 'schedule_weeks',
    timestamps: true
  })
}
