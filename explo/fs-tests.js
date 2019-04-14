fs = require('fs')
if (fs.existsSync('./public')) {
  console.log('true')
}else {
  console.log(false)
}
fs.mkdirSync('public/A/B/after', {recursive: true}) // requires node >10 
