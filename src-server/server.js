const http            = require('http'                  )
const path            = require('path'                  )
const express         = require('express'               )
const colors          = require('colors'                )
const reload          = require('reload'                )
const Watch           = require('gaze'                  ).Gaze
const fs              = require('fs'                    )
const fsPromise       = require('fs'                    ).promises
const Promise         = require('bluebird'              )
const visualCompare   = require('../src-compare/main.js')
const bodyParser      = require('body-parser'           )
const glob            = require('glob'                  )
const fabric          = require('fabric'                ).fabric
const shorthash       = require('shorthash'             ).unique
const multer          = require('multer'                )


/*************************************************************/
/* GLOBALS                                                   */
const comparisonsDictionnary     = {}
const comparisonsDictionnaryByPr = {}
const app                        = express()
const server                     = http.createServer(app)
var   PORT                       = 8080


/*************************************************************/
/* BODY PARSER                                               */
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))


/*************************************************************/
/* COMMAND LINE PARAMETERS                                   */
/* expected parameters                                       */
/*   - PORT=XXXX                                             */
process.argv.forEach(function (val, index, array) {// look for PORT=XXXX
  const CLI_port = /PORT=([\d]+)/.exec(val)
  if (CLI_port) {
    PORT = CLI_port[1]
  }
})


/*************************************************************/
/* ROUTE to create a new RUN                                 */
app.post('/api/runs', function(req, res) {
  console.log('REQUEST to create a new run', req.body)
  // check project and suite exists, and create a new run
  const newRunId = checkAndCreateRun(req.body.projectName, req.body.suiteName)
  // create a new run
  res.send({id:newRunId})
})


/*************************************************************/
/* ROUTE to get the STATUS of a run                          */
/* a comparison of is run before sending the status          */
app.get('/api/runs/:prId/analysis', function(req, res) {
  console.log('REQUEST to get the STATUS of a RUN', req.params.prId)
  const comp = comparisonsDictionnaryByPr[req.params.prId]
  // rescan the pr
  scanPr(comp.projectId, comp.suiteId, comp.prId, true)
  .then((comp)=>{
    // then return status
    if (comp.hasFailed || comp.hasDeleted || comp.hasNew ) {
      res.send('pending')
    }else {
      res.send('accepted')
    }
  })
})


/*************************************************************/
/* ROUTE to upload a SCREENSHOT                              */
/* Does NOT launch a scanPr                                  */
app.post('/api/runs/:prId/screenshots', function(req, res, next) {
  console.log('REQUEST to upload a screenshot', req.params.prId)
  const comp = comparisonsDictionnaryByPr[req.params.prId]
  // we user the multer middleware to parse the form-data and store the uploaded file
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, `./public/${comp.projectId}-${comp.suiteId}/${comp.prId}/after`)
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname)
    }
  })
  const upload = multer({storage}).single('file')
  upload(req, res, function(err) {
    res.end('File is uploaded')
	})
})


/*************************************************************/
/* ROUTE to get the COMPARISONS                              */
/* structure : {project.suite.prId:{comparison}}             */
app.get('/api/comparisons-list', function(req, res) {
  res.json(getComparisons())
})


/*************************************************************/
/* ROUTE for the DASHBOARD page                              */
app.get('/', function(req, res) {
  res.sendFile(path.resolve('src-dashboard/public'));
});
app.use(express.static('src-dashboard/public'))


/*************************************************************/
/* ROUTE for the REPORT index.html web page                  */
app.use('/report/:projectId/:suiteId/:prId/*.(html|js)', (req, res)=>{
  const p = req.params
  res.sendFile(path.resolve(`src-report/public/${p[0]}.${p[1]}`))
})


/*************************************************************/
/* ROUTE for the REPORT json data                            */
app.use('/api/:projectId/:suiteId/:prId/data', (req, res)=>{
  const p = req.params
  console.log('REQUEST for the report data');
  res.sendFile(path.resolve(`public/${p.projectId}-${p.suiteId}/${p.prId}/comparison-result.json`))
})


/*************************************************************/
/* ROUTE for the REPORT assets                               */
app.use('/report/:projectId/:suiteId/:dir/:filename', (req, res)=>{
  const p = req.params
  res.sendFile(path.resolve(`public/${p.projectId}-${p.suiteId}/${p.dir}/${p.filename}`))
})


/*************************************************************/
/* ROUTE for the REPORT assets  (pr level)                   */
app.use('/report/:projectId/:suiteId/:prId/:dir/:filename', (req, res)=>{
  const p = req.params
  res.sendFile(path.resolve(`public/${p.projectId}-${p.suiteId}/${p.prId}/${p.dir}/${p.filename}`))
})


/*************************************************************/
/* ROUTE to set an image as a reference                      */
app.post('/api/:projectId/:suiteId/:prId/set-as-reference/:filename', function(req, res) {
  const p = req.params
  const src  = `public/${p.projectId}-${p.suiteId}/${p.prId}/after/${p.filename}`
  const diff = `public/${p.projectId}-${p.suiteId}/${p.prId}/diff/${p.filename}`
  const dest = `public/${p.projectId}-${p.suiteId}/before/${p.filename}`
  console.log('REQUEST for set-as-reference',  src);
  fs.copyFileSync(src, dest)
  try {
    console.log('try delete', diff);
    fs.unlinkSync(diff) // delete diff if exists
  }
  catch (e) {}
  finally {
    console.log('file moved, re-scan the suite on all PRs'); // TODO we should rescan the whole suite, not only the current pr ! ! a queue would be better.
    scanSuite(p.projectId, p.suiteId, true)           // update the comparison TODO : delay in the case where a scan is in progress
    .then(()=>{
      res.send(true)
    })
  }
});


/*************************************************************/
/* ROUTE TO DELETE an image from before                       */
app.post('/api/:projectId/:suiteId/:prId/delete-from-before/:filename', function(req, res) {
  const p = req.params
  const src  = `public/${p.projectId}-${p.suiteId}/before/${p.filename}`
  const mask = `public/${p.projectId}-${p.suiteId}/mask/${p.filename}.json`
  console.log('REQUEST for delete-from-before',  src);
  try {
    console.log('try delete', src);
    fs.unlinkSync(src) // delete diff
    try{fs.unlinkSync(mask)} catch (e){} // delete mask if exists
  }
  catch (e) {}
  finally {
    console.log('file deleted, re-scan the suite on all PRs'); // TODO we should rescan the whole suite, not only the current pr ! ! a queue would be better.
    scanSuite(p.projectId, p.suiteId, true)           // update the comparison TODO : delay in the case where a scan is in progress
    .then(()=>{
      res.send(true)
    })
  }
});


/*************************************************************/
/* ROUTE to refresh the comparison of a PR                   */
app.post('/api/:projectId/:suiteId/:prId/refresh', function(req, res) {
  const p = req.params
  console.log('REQUEST for refresh comparison :',  `public/${p.projectId}-${p.suiteId}/${p.prId}`);
  // update the comparison
  scanPr(p.projectId, p.suiteId, p.prId, true)           // update the comparison TODO : delay in the case where a scan is in progress
  .then((comparison)=>{
    res.send(comparison)
  })
});


/*************************************************************/
/* ROUTE to SAVE a MASK                                      */
app.post('/api/:projectId/:suiteId/:prId/mask/save/:filename', function(req, res) {
  const p        = req.params
  const promises = []
  console.log('REQUEST for mask/save/ of app',  p.projectId, '/', p.suiteId);
  // store the mask json file
  const suitePath = `public/${p.projectId}-${p.suiteId}/`
  checkAndCreateDir(suitePath + 'mask/')
  const promise1 = fsPromise.writeFile(suitePath + 'mask/' + p.filename + '.json', JSON.stringify(req.body))
  promises.push(promise1)
  // compute masked images (in /before and all the /after directories)
  const masks = req.body.objects
  const beforePath = `${suitePath}/before/${p.filename}`
  promises.push( computeMaskedImage(beforePath, masks) )
  const afterPaths  = glob.sync(`${suitePath}*/after/${p.filename}`) // get all /after path and create a promise for each
  for (afterPath of afterPaths) {
    promises.push( computeMaskedImage(afterPath, masks) )
  }
  console.log('afterPaths', afterPaths)
  Promise.all(promises)
  // update all the comparisons of the suite
  .then(()=> scanSuite(p.projectId, p.suiteId, true) )
  .then(()=> res.sendFile(path.resolve(`${suitePath}/${p.prId}/comparison-result.json`)) )
})


/*************************************************************/
/* ROUTE to DELETE a MASK                                    */
app.post('/api/:projectId/:suiteId/:prId/mask/delete/:filename', function(req, res) {
  const p = req.params
  console.log('REQUEST for mask/delete/ of app',  p.projectId, '/', p.suiteId, p.filename);
  const suitePath = `public/${p.projectId}-${p.suiteId}/`
  checkAndCreateDir(suitePath)
  const promises = []

  var pathsToDelete = []
  pathsToDelete.push(`${suitePath}mask/${p.filename}.json`)
  pathsToDelete.push(`${suitePath}before/${p.filename}.masked.png`)
  const afterPaths = glob.sync(`${suitePath}*/@(after|diff)/${p.filename}.masked.png`)
  pathsToDelete = pathsToDelete.concat(afterPaths)
  pathsToDelete.forEach(p => promises.push(fsPromise.unlink(p).catch(() => {})) )
  Promise.all(promises)
  .then( () => scanSuite(p.projectId, p.suiteId, true))
  .then( () => {
      res.sendFile(path.resolve(`public/${p.projectId}-${p.suiteId}/${p.prId}/comparison-result.json`))
    })
});


/*************************************************************/
/* ROUTE to GET a MASK                                      */
app.get('/api/:projectId/:suiteId/mask/:filename', function(req, res) {
  const p = req.params
  console.log('REQUEST to get mask of app',  `public/${p.projectId}-${p.suiteId}/mask/${p.filename}.json`);
  const maskPath = `public/${p.projectId}-${p.suiteId}/mask/${p.filename}.json`
  // checkAndCreateDir(maskPath)
  if (fs.existsSync(maskPath)) {
    const json = fs.readFileSync(maskPath , 'utf8')
    res.send(json)
  }else {
    res.send(false)
  }
});


// /*************************************************************/
// /* ROUTE to for all other requests                           */
// app.all('/*', function(req, res) {
//   console.log('UNEXPECTED REQUEST :', req.method, req.originalUrl )
// })


/*************************************************************/
/* BROWSER RELOADER                                          */
reloadBrowser = reload(app)


/*************************************************************/
/* RELOAD web page when the dashboard code changes           */
/* (for ease of dev)                                         */
const watchDashboard = new Watch('./src-dashboard/public/bundle.js')
watchDashboard.on('all', function (evt, filepath) {
    console.log('ask dashboard reload !');
    reloadBrowser.reload(); // Fire server-side reload event
})


/*************************************************************/
/* RELOAD web page when the report code changes              */
const watchReport = new Watch('./src-report/public/build.js')
watchReport.on('all', function (evt, filepath) {
  console.log('Report has changed, reload browsers')
})


/*************************************************************/
/* INITIAL SCAN of tests folders                             */
function scanAllProjects() {
  if (!fs.existsSync('public')) {
    console.log('./public/ does not exist')
    fs.mkdirSync('public')
  }
  const prDirectories = glob.sync('public/*/!(before|mask)*/')
  if (prDirectories.length === 0) return Promise.resolve()
  console.log(prDirectories);
  return Promise.map(prDirectories, dir => {
    dir = dir.split(path.sep)
    const match     = dir[1].match(/[\w_]+/g)
    const projectId = match[0]
    const suiteId   = match[1]
    const prId      = dir[2]
    // console.log('\nscanAllProjects', projectId, suiteId, prId)
    return scanPr(projectId, suiteId, prId, false)
  }, {concurrency:4})
}


/*************************************************************/
/* SCAN ALL THE PRs OF A SUITE                               */
function scanSuite(projectId, suiteId, force){
  const suite = (comparisonsDictionnary[projectId] || {})[suiteId]
  if (!suite) return
  const prIds = []
  for (var prId in suite) {
    prIds.push(prId)
  }
  return Promise.map(prIds, prId => {
    return scanPr(projectId, suiteId, prId, force)
  }, {concurrency:4})
}


/*************************************************************/
/* SCAN A PR DIRECTORY and compare images to produce reports */
function scanPr(projectId, suiteId, prId, force) {
  const prPath     = `public/${projectId}-${suiteId}/${prId}/`
  const compPath   = `public/${projectId}-${suiteId}/${prId}/comparison-result.json`
  var   comparison = {}
  var   test
  console.log('SCAN PR', `project:${projectId}  -  suite:${suiteId}  -  PR:${prId}`);
  if (!force && fs.existsSync(compPath)) {
    comparison = JSON.parse(fs.readFileSync(compPath, 'utf8'))
  }
  const suiteDescription = JSON.parse(fs.readFileSync(`public/${projectId}-${suiteId}/suite-description.json`, 'utf8'))
  // check if the comparison has already been done (test and comparison must have the same beforeVersion)
  // if not, then run a comparison
  if (force || (comparison.beforeVersion != suiteDescription.beforeVersion) ) {
    return visualCompare(suiteDescription, prId)
    .then((compResult)=>{
      const addedComp = {
        projectId                                  ,
        suiteId                                    ,
        prId                                       ,
        projectName : suiteDescription.projectName ,
        suiteName   : suiteDescription.suiteName   ,
        title       : suiteDescription.title       ,
        hasFailed   : compResult.hasFailed         ,
        hasNew      : compResult.hasNew            ,
        hasDeleted  : compResult.hasDeleted        ,
        hasPassed   : compResult.hasPassed         ,
        date        : compResult.date              ,
      }
      addComparison(projectId, suiteId, prId, addedComp)
      return addedComp
    })

  }else{
    // add or update the test to the list
    // console.log(`${projectId}-${suiteId}-${prId} : comparison (SANS scan)`, comparison.hasFailed);
    const addedComp = {
      projectId                                  ,
      suiteId                                    ,
      prId                                       ,
      projectName : suiteDescription.projectName ,
      suiteName   : suiteDescription.suiteName   ,
      title       : suiteDescription.title       ,
      hasFailed   : comparison.hasFailed         ,
      hasNew      : comparison.hasNew            ,
      hasDeleted  : comparison.hasDeleted        ,
      hasPassed   : comparison.hasPassed         ,
      date        : comparison.date              ,
    }
    addComparison(projectId, suiteId, prId, addedComp)
    return addedComp // TODO : not sure that that we should return a resolved promise instead of a value...
  }
}


/*******************************************************************/
/* INSERT or UPDATE a COMPARISON in the comparisonsDictionnary     */
function addComparison (projectId, suiteId, prId, comp) {
  // console.log('\naddComparison', projectId, suiteId, prId, comp);
  var existingPro, existingSuite
  existingPro = comparisonsDictionnary[projectId]
  if (!existingPro){
    existingPro = {}
    existingSuite={}
    comparisonsDictionnary[projectId] = existingPro
    existingPro[suiteId]=existingSuite
    existingSuite[prId]=comp
    comparisonsDictionnaryByPr[prId]=comp
    return comp
  }
  existingSuite = existingPro[suiteId]
  if (!existingSuite) {
    existingSuite = {}
    existingPro[suiteId] = existingSuite
    existingSuite[prId]=comp
    comparisonsDictionnaryByPr[prId]=comp
    return comp
  }
  existingSuite[prId] = comp
  comparisonsDictionnaryByPr[prId]=comp
  return comp
}


/********************************************************************/
/* If necessary creates the project and suite, then                 */
/* creates a new run id                                             */
/* id patern : {projectId}-{suiteId}-{random string of 9 caracters} */
function checkAndCreateRun(projectName, suiteName){
  const projectId = shorthash(projectName)
  const suiteId   = shorthash(suiteName)

  // 1) update comparisonsDictionnary
  var prId
  // project doesn't exists
  if (!comparisonsDictionnary[projectId]) {
    comparisonsDictionnary[projectId] = {}
    comparisonsDictionnary[projectId][suiteId]={}
    prId = `pr-${projectId}-${suiteId}-${Math.random().toString(36).substring(2, 11)}`
  // suite doesn't exists
  }else if (!comparisonsDictionnary[projectId][suiteId]) {
    comparisonsDictionnary[projectId][suiteId]={}
    prId = `pr-${projectId}-${suiteId}-${Math.random().toString(36).substring(2, 11)}`
  // project doesn't exists
  }else{
    prId = `pr-${projectId}-${suiteId}-${Math.random().toString(36).substring(2, 11)}`
    while (comparisonsDictionnary[projectId][suiteId][prId]) {  // test the prId doesn't exists
      prId = `pr-${projectId}-${suiteId}-${Math.random().toString(36).substring(2, 11)}`
    }
  }
  comparisonsDictionnaryByPr[prId] = {
    projectId,
    suiteId,
    prId,
    projectName,
    suiteName,
  }

  // 2) create directories
  fs.mkdirSync(`public/${projectId}-${suiteId}/${prId}/after`, {recursive: true})
  fs.mkdirSync(`public/${projectId}-${suiteId}/${prId}/diff` )
  if (!fs.existsSync(`public/${projectId}-${suiteId}/before`)) fs.mkdirSync(`public/${projectId}-${suiteId}/before`)
  if (!fs.existsSync(`public/${projectId}-${suiteId}/mask`  )) fs.mkdirSync(`public/${projectId}-${suiteId}/mask`  )
  if (!fs.existsSync(`public/${projectId}-${suiteId}/suite-description.json`  )) {
    const description = {
      projectId,
      suiteId,
      projectName,
      suiteName,
    }
    fs.writeFileSync(`public/${projectId}-${suiteId}/suite-description.json`, JSON.stringify(description))
  }
  return prId
}


/*************************************************************/
/* return a dictionnary of all the comparisons               */
/* structure : {project.suite.prId:{comparison}}             */
function getComparisons() {
  return comparisonsDictionnary
}


/*************************************************************/
/*  Apply a mask to a .png and                               */
/*  save resulting file in *.png.masked.png                  */
function computeMaskedImage(filePath, masks){
  console.log('computeMaskedImage', filePath)
  if (!fs.existsSync(filePath)) return false
  return new Promise((resolve, reject) => {
    fabric.Image.fromURL(filePath, function(img) {
      const out = fs.createWriteStream(filePath + '.masked.png')
      const canvas = new fabric.StaticCanvas(null, { width: img.width, height: img.height })
      canvas.add(img)
      for (var i = 0; i < masks.length; i++) {
        var mask = masks[i]
        mask.strokeWidth = 0
        mask.fill = 'red'
        canvas.add( new fabric.Rect(mask) )
      }
      canvas.renderAll()
      const stream = canvas.createPNGStream()
      stream.pipe(out)
      stream.on('end', () => resolve() )
    })
  })
}


/*************************************************************/
/* HELPERS                                                   */
function checkAndCreateDir(path) {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path)
  }
}


/*************************************************************/
/* START server when all directories are re scanned          */
scanAllProjects().then(()=>{
  console.log('__all scans terminated')
  server.listen(PORT);
  console.log('\nHi! Cozy visual tests dashboard is running on http://localhost:'.magenta + PORT)
  // console.log(JSON.stringify(comparisonsDictionnary, null, 2))
  reloadBrowser.reload(); // Fire server-side reload event when all the scans are done.
})
