const luxon = require('luxon')
const factory = require('../helpers/factory')
const nova = require('../helpers/nova')

const schedules = [
  {
    // Lina Wennström, NTIJ
    novaId: 80220,
    id: '{210664B0-A9FC-4D57-AA6D-0E5A1DBA124A}',
    typeKey: 0,
    week: 39
  },
  {
    // Klass 2D, NTIJ
    novaId: 80220,
    id: '{D6AAA429-325E-443A-89CD-D47BB619E219}',
    typeKey: 0,
    week: 39
  },
  {
    // Klass ELT3B, LINDTEK
    novaId: 55700,
    id: '{C6CB18ED-52E1-47B2-A199-6E73A3074D5B}',
    typeKey: 1,
    week: 39
  },
  {
    // Klass: 17It IT-Gymnasiet Örebro
    novaId: 81620,
    id: '{FCDDA4A5-4F1F-4A9E-9F22-44B8F5D96520}',
    typeKey: 1,
    week: ''
  }
]

const s = schedules[3]

const pdfUrl = factory.generateNovaPdfUrl(s.novaId, s.typeKey, s.id, s.week)

const week = s.week || luxon.DateTime.local().get('weekNumber')
nova.downloadPdfSchedule(pdfUrl).then(data => {
  const results = nova.parsePdfSchedule(data, )

  results.forEach(obj => {
    console.log(obj.meta)
    console.log('')
  })
})