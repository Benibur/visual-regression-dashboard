const fabric          = require('fabric'                ).fabric
const path            = require('path'                  )
const fs              = require('fs'                    )

const filePath = 'public/Drive-0001/pr-001/after/sample.02.should_be_2_but_1_in_before.png'
console.log('computeMaskedImage', filePath)
const out = fs.createWriteStream('mypng.masked.png')
// const canvas = fabric.createCanvasForNode(null, { width: 200, height: 200 });


fabric.Image.fromURL(filePath, function(img) {
  console.log(img);
  const canvas = new fabric.StaticCanvas(null, { width: img.width, height: img.height })
  canvas.add(img)
  const rect = new fabric.Rect( {
    left: 50,
    top: 50,
    width:50,
    height:50,
    fill: 'red'
  });
  canvas.add(rect)
  canvas.renderAll()
  // a timeout is required ? solution found here : https://stackoverflow.com/a/50352344/1216179
  setTimeout(()=>{
    const stream = canvas.createPNGStream();
    stream.on('data', function(chunk) {
      out.write(chunk);
    })
  }, 100)
})
