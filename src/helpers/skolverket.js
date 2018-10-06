const fs = require('fs')
const path = require('path')
const { parseString } = require('xml2js')

function Skolverket() {

  function getCourses(callback) {
    const file = path.resolve(__dirname + '/../../local/skolverket/subjectsAndCourses/amnen_och_kurser.xml')
    parseString(fs.readFileSync(file).toString(), (err, result) => {
      const subjects = result.SubjectsAndCourses.subject
      const courses = {}
      subjects.forEach(subj => {
        subj.courses.forEach(course => {
          courses[course.code[0]] = course.name[0]
        })
      })
      callback(courses)
    })
  }

  return {
    getCourses
  }
}

module.exports = Skolverket()