// Load config file.
const config = require('./../../config/database').development

// Dependencies
const fs = require('fs')
const Sequelize = require('sequelize')

const connection = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  dialect: config.dialect,
  operatorsAliases: false,
  logging: false
})

/**
 * Import all models into the `m` object for reference.
 */
const m = {}
let files = fs.readdirSync(__dirname)
files = files.filter(file => file !== 'index.js').map(file => file.replace('.js', ''))

/**
 * Define all models in the `m` Object but in capitalized format for the actual model name.
 */
files.forEach((file) => {
  const model = file.charAt(0).toUpperCase() + file.slice(1)
  m[model] = connection.import(__dirname + '/' + file)
})

/**
 * Declare all relationships.
 */
m.School.hasMany(m.Schedule, { as: 'schedules', foreignKey: 'school_id' })
m.Schedule.belongsTo(m.School, { foreignKey: 'school_id' })
 

/**
 * Add all models to the `module.exports` object
 */
for (model in m) {
  module.exports[model] = m[model]
}

module.exports.connection = connection