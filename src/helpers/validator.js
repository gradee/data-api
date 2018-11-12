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

  function validateEmail(str) {
    const p = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    return p.test(str)
  }

  return {
    validateName,
    validateSlug,
    validateNovaValue,
    validateEmail
  }
}

module.exports = Validator()
