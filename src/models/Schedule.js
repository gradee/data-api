module.exports = (connection, DataTypes) => {
  return connection.define('schedule', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    schoolId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'school_id'
    },
    typeKey: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'type_key'
    },
    scheduleId: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'schedule_id'
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
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
    tableName: 'schedules',
    timestamps: true
  })
}