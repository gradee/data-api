const http = require('http')
const fs = require('fs')
const tar = require('tar')
const rimraf = require('rimraf')
const schedule = require('node-schedule')

/**
 * Download archive file for "Gymnasieskolan och komvux gymnasial"
 */

function downloadArchive() {
  // Ensure the local folder exists.
  if (!fs.existsSync(__dirname + '/../../local')) {
    fs.mkdirSync(__dirname + '/../../local')
  }

  // Delete old contents of skolverket folder, if it exists.
  if (fs.existsSync(__dirname + '/../../local/skolverket')) {
    rimraf.sync(__dirname + '/../../local/skolverket')
  }
  fs.mkdirSync(__dirname + '/../../local/skolverket')

  // Download the archive files.
  const request = http.get('http://opendata.skolverket.se/data/syllabus.tgz', (response) => {
    response.pipe(
      tar.x({
        strip: 1,
        C: __dirname + '/../../local/skolverket'
      })
    )
  })

  request.on('finish', () => {
    console.log('Archive updated on ' + new Date())
  })
}

// Run on script start.
downloadArchive()

// Set up job to run at 1am every day.
schedule.scheduleJob('0 1 * * *', downloadArchive)