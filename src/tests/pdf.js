
const factory = require('../helpers/factory')
const nova = require('../helpers/nova')

const week = 39

const schedules = [
  {
    // Lina Wennström, NTIJ
    novaId: 80220,
    id: '{210664B0-A9FC-4D57-AA6D-0E5A1DBA124A}',
    typeKey: 0
  },
  {
    // Klass 2D, NTIJ
    novaId: 80220,
    id: '{D6AAA429-325E-443A-89CD-D47BB619E219}',
    typeKey: 0
  },
  {
    // Klass ELT3B, LINDTEK
    novaId: 55700,
    id: '{C6CB18ED-52E1-47B2-A199-6E73A3074D5B}',
    typeKey: 1
  }
]

const pdfUrl = factory.generateNovaPdfUrl(schedules[2].novaId, schedules[2].typeKey, schedules[2].id, week, false)

nova.downloadPdfSchedule(pdfUrl).then(data => {
  const results = nova.parsePdfSchedule(data, week)
  results.forEach(obj => {
    console.log(obj.meta)
    console.log('')
  })
})