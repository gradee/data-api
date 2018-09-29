
const factory = require('../helpers/factory')
const nova = require('../helpers/nova')

const novaId = 55700
const typeKey = 1
const scheduleId = '{C6CB18ED-52E1-47B2-A199-6E73A3074D5B}'
const week = 39

const pdfUrl = factory.generateNovaPdfUrl(novaId, typeKey, scheduleId, week, true)

nova.downloadPdfSchedule(pdfUrl).then(data => {
  const results = nova.parsePdfSchedule(data, week)
  results.forEach(obj => {
    console.log(obj.meta)
    console.log('')
  })
})