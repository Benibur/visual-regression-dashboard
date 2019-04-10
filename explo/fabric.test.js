const fabric          = require('fabric'                ).fabric
const path            = require('path'                  )
const fs              = require('fs'                    )

const filePath = 'sample.01.png'
const out = fs.createWriteStream('my.masked.png')

fabric.Image.fromURL(filePath, function(img) {
  // console.log(img);
  // const canvas = new fabric.StaticCanvas(null, { width: 800, height: 500 })
  const canvas = new fabric.StaticCanvas(null, { width: img.width, height: img.height })
  canvas.add(img)
  const rect = new fabric.Rect( {
    left  : 50,
    top   : 50,
    width : 50,
    height: 40,
    fill  : 'red'
  });
  canvas.add(rect)
  const rect2 = new fabric.Rect( {
    left  : 150,
    top   : 50,
    width : 50,
    height: 40,
    fill  : 'blue'
  });
  canvas.add(rect2)
  for (var i = 0; i < 10; i++) {
    canvas.add(new fabric.Rect({
      left  : 150+5*i,
      top   : 50+5*i,
      width : 50,
      height: 40+5*i,
      fill  : 'black',
      strokeWidth: 0,
    }))
  }
  canvas.renderAll()

  const stream = canvas.createPNGStream();
  stream.pipe(out)
  // stream.on('data', function(chunk) {
  //   out.write(chunk);
  // })


  // a timeout is required ? solution found here : https://stackoverflow.com/a/50352344/1216179
  // setTimeout(()=>{
  //   const stream = canvas.createPNGStream();
  //   stream.on('data', function(chunk) {
  //     out.write(chunk);
  //   })
  // }, 100)
})
