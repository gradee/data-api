// Load system config from `.env`
require('dotenv').config()

// Dependencies
const request = require('request')
const moment = require('moment')

function Factory() {
  const novaViewBaseUrl = 'http://www.novasoftware.se/webviewer/(S(cuybov55kqxjfn45yuspxieg))/MZDesign1.aspx'
  const novaPdfBaseUrl = 'http://www.novasoftware.se/ImgGen/schedulegenerator.aspx?format=pdf'

  function fakeTypePost(params) {
    return new Promise((resolve, reject) => {
      request.post({
        url: params.url,
        form: {
          '__EVENTTARGET': 'TypeDropDownList',
          'TypeDropDownList': params.scheduleType,
          'WeekDropDownList': params.week
        }
      },
      (error, response, body) => {
        if (error) reject(error);

        resolve();
      });
    });
  }

  function fakeSchedulePost(params) {
    return new Promise((resolve, reject) => {
      request.post({
        url: params.url,
        form: {
          '__EVENTTARGET': 'ScheduleIDDropDownList',
          'ScheduleIDDropDownList': params.scheduleId,
          'WeekDropDownList': params.week
        }
      },
      (error, response, body) => {
        if (error) reject(error);

        resolve();
      });
    });
  }

  function generateNovaBaseUrl(id, code, type) {
    let url = novaViewBaseUrl
    url += '?schoolId=' + id
    url += '&code=' + code
    if (type !== undefined && type !== null) url += '&type=' + type
    return url
  }

  function generateNovaPdfUrl(params) {
    // Params: (schoolId, scheduleType, scheduleId, week, disrupt = false)
    let url = novaPdfBaseUrl
    url += '&schoolid=' + params.schoolId
    url += '&type=' + params.scheduleType
    url += '&id=' + params.scheduleId
    url += '&week=' + params.week
    url += '&period=&mode=0&colors=32&width=2480&height=3500'
    if (!params.disrupt) url += '&printer=1'
    // If you remove the printer=1, you strip away everything but the schedule, but that would require more work to map out the schedule.

    return url
  }

  function generateLessonDataUrl(params) {
    return new Promise((resolve, reject) => {
      // Params: (schoolId, schoolCode, scheduleId, scheduleType, week)

      request(generateNovaBaseUrl(params), (err, res, body) => {
        const urlId = body.substring(body.indexOf('<input name="PrinterDialogUrl" type="hidden" id="PrinterDialogUrl" value="') + 85, body.indexOf('/printerdialog.aspx" />'));

        let url = ''
        url += 'http://www.novasoftware.se/webviewer/' + urlId + '/MZDesign1.aspx'
        url += '?schoolid=' + params.schoolId
        url += '&code=' + params.schoolCode

        fakeTypePost({ url: url, scheduleType: params.scheduleType, week: params.week })
          .then(() => fakeSchedulePost({ url: url, scheduleId: params.scheduleId, week: params.week }))
          .then(() => resolve(url))
        .catch((error) => reject(error))
      })

    })
  }

  return {
    generateNovaBaseUrl,
    generateNovaPdfUrl,
    generateLessonDataUrl
  }
}

module.exports = Factory()