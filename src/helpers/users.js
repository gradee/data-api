// Models
const models = require('../models')

function Users() {

  function emailIsUnique(email) {
    return new Promise((resolve, reject) => {
      models.User.findOne({
        where: {
          email: email
        }
      }).then(user => {
        return resolve(user === null)
      }).catch(error => reject(error))
    })
  }

  return {
    emailIsUnique
  }
}

module.exports = Users()