const glob = require('glob')
const path = require('path')
const fs   = require('fs')
const options = {

}


// const files = glob.sync('../test/public/*/pr-*/after/*.png')
// const files = glob.sync('../public/Drive-0001/**/*.png')
const files = glob.sync('./public/*/!(before|mask)*/')
// const files = glob.sync('../test/public/**/@(comparison-description.json|index.html)')
// const files = glob.sync('../public/Drive-0001/*/@(after|diff)/sample.02.should_be_2_but_1_in_before.png.masked.png')
console.log(files.join('\n'));
// files.map((file)=>{
//   console.log('delete', file);
//   fs.unlink(file, ()=>{})
//   console.log(file.split(path.sep))
//   console.log(path.basename(path.dirname(file)));
// })
