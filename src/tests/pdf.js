
const nova = require('../helpers/nova')


function sortArrayByKey(arr, key) {
  arr.sort((a, b) => {
    if (a[key] > b[key]) return 1
    if (a[key] < b[key]) return -1
    return 0
  })
}

const pdfUrl = 'http://www.novasoftware.se/ImgGen/schedulegenerator.aspx?format=pdf&schoolid=55700/sv-se&type=1&id=%7bC6CB18ED-52E1-47B2-A199-6E73A3074D5B%7d&period=&week=39&mode=0&printer=0&colors=2&head=1&clock=1&foot=1&day=0&width=2480&height=3507&count=1&decrypt=0'

nova.downloadPdfSchedule(pdfUrl).then(data => {
  const page = data.formImage.Pages[0]
  let fills = page.Fills
  let texts = page.Texts

  /**
   * Go through fills
   */

  // Sort by height, and remove the grey background boxes.
  sortArrayByKey(fills, 'h')
  const weekBacks = fills.splice(fills.length - 5, 5)
  // Grab any background box and define the bottom border of the schedule using the box's Y position and it's height.
  borders.bottom = weekBacks[0].y + weekBacks[0].h
  sortArrayByKey(weekBacks, 'x')
  
  console.log(fills)
})