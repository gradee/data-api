// Dependencies
const request = require('request')

// Helpers
const Latinize = require('./latinize')

function Skola24() {

  function importSchoolsFromUrl(url) {
    return new Promise((resolve, reject) => {
      request(url, (error, response, body) => {
        body = body.substr(body.indexOf("'].data = {") + 10, body.length)
        body = body.substr(0, body.lastIndexOf('</script>'))
        body = body.substr(0, body.lastIndexOf(';'))
        
        const schools = JSON.parse(body).schools
        schools.forEach(school => {
          let slug = Latinize(school.name.toLowerCase()).replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-').replace(/^-+/, '').replace(/-+$/, '')
          console.log(school.name)
          console.log(slug)
          console.log('')
        })

      })
    })
  }

  return {
    importSchoolsFromUrl
  }
}

module.exports = Skola24()