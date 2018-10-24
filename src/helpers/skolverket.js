// Dependencies
const request = require('request')

function Skolverket() {

  function getCourses(callback) {
    request.get('https://skolverket.gradee.io/gym/courses', (error, response, body) => {
      const data = JSON.parse(body)
      const courses = {}
      data.forEach(course => {
        courses[course.code] = course.name
      })
      callback(courses)
    })
  }

  return {
    getCourses
  }
}

module.exports = Skolverket()