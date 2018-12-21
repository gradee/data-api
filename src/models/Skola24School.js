module.exports = (connection, DataTypes) => {
  return connection.define('skola24_school', {
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
    uuid: {
      type: DataTypes.STRING,
      allowNull: false
    },
    host: {
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
    tableName: 'skola24_schools',
    timestamps: true
  })
}