// Dependencies
const request = require('request')

// Helpers
const Latinize = require('./latinize')

function Skola24() {

  function importSchoolsFromUrl(url) {
    return new Promise((resolve, reject) => {
      // Remove trailing slash
      if (url.substr(url.length - 1, url.length) === '/') url = url.substr(0, url.length - 1)
      // Remove prefix to get credentials (host + school name)
      url = url.replace('https://web.skola24.se/timetable/timetable-viewer/', '')
      const creds = url.split('/')
      // Reconstruct URL with properly encoded school name.
      url = 'https://web.skola24.se/timetable/timetable-viewer/' + creds[0] + '/' + encodeURIComponent(decodeURIComponent(creds[1]))

      request(url, (error, response, body) => {
        if (error) return reject(error)

        body = body.substr(body.indexOf("'].data = {") + 10, body.length)
        body = body.substr(0, body.lastIndexOf('</script>'))
        body = body.substr(0, body.lastIndexOf(';'))
        
        const data = JSON.parse(body)
        const schools = data.schools
        schools.forEach(school => {
          school.slug = Latinize(school.name.toLowerCase()).replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-').replace(/^-+/, '').replace(/-+$/, '')
          school.skola24 = {
            uuid: school.guid,
            host: data.selectedModel.domain
          }
          delete school.settings
          delete school.guid
        })

        resolve(schools)
      })
    })
  }

  return {
    importSchoolsFromUrl
  }
}

module.exports = Skola24()