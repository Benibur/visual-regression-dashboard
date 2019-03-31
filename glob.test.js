const glob = require('glob')
const path = require('path')

const options = {

}

const files = glob.sync('*/*/pr-*')
console.log(files.join('\n'));
files.map((file)=>{
  console.log('\n'+file);
  console.log(file.split(path.sep))
  console.log(path.basename(path.dirname(file)));
})
