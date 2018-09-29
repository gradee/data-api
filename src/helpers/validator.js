// Dependencies
const fs = require('fs')

function Validator() {
  const bannedSlugs = JSON.parse(fs.readFileSync(__dirname + '/../../banned-slugs.json').toString())

  function validateName(str) {
    const p = /^[a-zA-ZàáâäãåąčćęèéêëėįìíîïłńòóôöõøùúûüųūÿýżźñçčšžÀÁÂÄÃÅĄĆČĖĘÈÉÊËÌÍÎÏĮŁŃÒÓÔÖÕØÙÚÛÜŲŪŸÝŻŹÑßÇŒÆČŠŽ∂ð ,.\'-]+$/
    return p.test(str)
  }

  function validateSlug(str) {
    if (bannedSlugs.indexOf(str) > -1) return false
    const p = /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/
    return p.test(str)
  }

  function validateNovaValue(str) {
    const p = /^[L0-9]+$/
    return p.test(str)
  }

  return {
    validateName,
    validateSlug,
    validateNovaValue
  }
}

module.exports = Validator()