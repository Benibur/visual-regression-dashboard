const glob = require('glob')
const path = require('path')

const options = {

}

const files = glob.sync('test/public/*/pr-*/after/*.png')
console.log(files.join('\n'));
files.map((file)=>{
  console.log(file);
  // console.log(file.split(path.sep))
  // console.log(path.basename(path.dirname(file)));
})
