module.exports = (connection, DataTypes) => {
  return connection.define('schedule', {
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
    typeKey: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'type_key'
    },
    uuid: {
      type: DataTypes.STRING,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    rawName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'raw_name'
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'first_name'
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'last_name'
    },
    initials: {
      type: DataTypes.STRING,
      allowNull: true
    },
    className: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'class_name'
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
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: [ 'uuid' ]
      }
    ]
  })
}
