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


/*************************************************************/
/* GLOBALS                                                   */
const comparisonsDictionnary = {}
const app                    = express()
const server                 = http.createServer(app)
var   PORT                   = 8080


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
});


/*************************************************************/
/* ROUTE to create a new RUN                                 */
app.post('/api/runs', function(req, res) {
  console.log('ROUTE to create a new run', req.body)
  const projectId = req.body.projectName
  const suiteId   = req.body.suiteName
  // check project and suite exist
  const newRunId = checkAndCreateRun(projectId, suiteId)
  // create a new run
  res.send(newRunId)
})


/*************************************************************/
/* ROUTE to get the STATUS of a run                          */
app.get('/api/runs/:prId/analysis', function(req, res) {
  console.log('ROUTE to get the STATUS of a RUN', req.body)
  const projectId = req.body.projectName
  const suiteId   = req.body.suiteName
  // check project exists

  // check suite exists

  // create a new run
  res.send(true)
})


/*************************************************************/
/* ROUTE to upload a SCREENSHOT                              */
app.post('/api/runs/:prId/screenshots', function(req, res) {
  // const projectId = req.body.projectName
  // const suiteId   = req.body.suiteName
  console.log('ROUTE to upload a screenshot', req.body)
  // check project exists

  // check suite exists

  // create a new run
  res.send(true)
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
  console.log('ROUTE for the report data');
  res.sendFile(path.resolve(`public/${p.projectId}-${p.suiteId}/${p.prId}/comparison-description.json`))
})


/*************************************************************/
/* ROUTE for the REPORT assets (suite level)                 */
// app.use('/report', express.static('public') );
app.use('/report/:projectId/:suiteId/:dir/:filename', (req, res)=>{
  const p = req.params
  res.sendFile(path.resolve(`public/${p.projectId}-${p.suiteId}/${p.dir}/${p.filename}`))
})


/*************************************************************/
/* ROUTE for the REPORT assets  (pr level)                   */
// app.use('/report', express.static('public') );
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
  console.log('ROUTE for set-as-reference',  src);
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
  console.log('ROUTE for delete-from-before',  src);
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
  console.log('ROUTE for refresh comparison :',  `public/${p.projectId}-${p.suiteId}/${p.prId}`);
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
  console.log('ROUTE for mask/save/ of app',  p.projectId, '/', p.suiteId);
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
  .then(()=> res.sendFile(path.resolve(`${suitePath}/${p.prId}/comparison-description.json`)) )
})


/*************************************************************/
/* ROUTE to DELETE a MASK                                    */
app.post('/api/:projectId/:suiteId/:prId/mask/delete/:filename', function(req, res) {
  const p = req.params
  console.log('ROUTE for mask/delete/ of app',  p.projectId, '/', p.suiteId, p.filename);
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
      res.sendFile(path.resolve(`public/${p.projectId}-${p.suiteId}/${p.prId}/comparison-description.json`))
    })
});


/*************************************************************/
/* ROUTE to GET a MASK                                      */
app.get('/api/:projectId/:suiteId/mask/:filename', function(req, res) {
  const p = req.params
  console.log('ROUTE to get mask of app',  `public/${p.projectId}-${p.suiteId}/mask/${p.filename}.json`);
  const maskPath = `public/${p.projectId}-${p.suiteId}/mask/${p.filename}.json`
  // checkAndCreateDir(maskPath)
  if (fs.existsSync(maskPath)) {
    const json = fs.readFileSync(maskPath , 'utf8')
    res.send(json)
  }else {
    res.send(false)
  }
});


/*************************************************************/
/* BROWSER RELOADER                                          */
reloadBrowser = reload(app)


/*************************************************************/
/* RELOAD web page when the dashboard code changes           */
/* (for ease of dev)                                         */
const watchDashboard = new Watch('./src-dashboard/public/bundle.js')
// const watchDashboard = new Watch('./src-dashboard/public/*')
watchDashboard.on('all', function (evt, filepath) {
    console.log('ask dashboard reload !');
    reloadBrowser.reload(); // Fire server-side reload event
})


/*************************************************************/
/* RELOAD of web page when the description of a test changes */
// const watc
// watch("./public",{ recursive: true, filter: /test\-description\.json$/}, function (evt, name) {
//     scanPr(path.dirname(name))
//     .then(()=>{
//       console.log('ask browser reload !');
//       reloadBrowser.reload(); // Fire server-side reload evenht TODO : be more specific than reloading the full web page
//     })
// });


/*************************************************************/
/* rerun scans when the report is changed                    */
const watchReport = new Watch('./src-report/public/build.js')
watchReport.on('all', function (evt, filepath) {
  console.log('Report has changed, reload browsers')
})


/*************************************************************/
/* INITIAL SCAN of tests folders                             */
function scanAllProjects() {
  const filenames = fs.readdirSync('public')
  const prDirectories = glob.sync('public/*/pr-*')
  return Promise.map(prDirectories, dir => {
    dir = dir.split(path.sep)
    const match   = dir[1].match(/[\w_]+/g)
    const project = match[0]
    const suite   = match[1]
    const prId    = dir[2] // TODO : parseInt ?
    // console.log('\nscanAllProjects', project, suite, prId)
    return scanPr(project, suite, prId, false)
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
  const compPath   = `public/${projectId}-${suiteId}/${prId}/comparison-description.json`
  var   comparison = {}
  var   test
  console.log('\nSCAN PR', prPath);
  if (!force && fs.existsSync(compPath)) {
    comparison = JSON.parse(fs.readFileSync(compPath, 'utf8'))
  }
  suiteDescription = JSON.parse(fs.readFileSync(`public/${projectId}-${suiteId}/suite-description.json`, 'utf8'))
  // check if the comparison has already been done (test and comparison must have the same beforeVersion)
  // if not, then run a comparison
  if (force || (comparison.beforeVersion != suiteDescription.beforeVersion) ) {
    return visualCompare(projectId, suiteId, prId, suiteDescription.beforeVersion)
    .then((compResult)=>{
      const addedComp = {
        projectId                           ,
        suiteId                             ,
        prId                                ,
        hasFailed  : compResult.hasFailed   ,
        hasNew     : compResult.hasNew      ,
        hasDeleted : compResult.hasDeleted  ,
        hasPassed  : compResult.hasPassed   ,
        title      : suiteDescription.title ,
        date       : compResult.date        ,
      }
      addComparison(projectId, suiteId, prId, addedComp)
      return addedComp
    })

  }else{
    // add or update the test to the list
    console.log(`${projectId}-${suiteId}-${prId} : comparison (SANS scan) => comparison.hasFailed`, comparison.hasFailed);
    const addedComp = {
      projectId                           ,
      suiteId                             ,
      prId                                ,
      hasFailed  : comparison.hasFailed   ,
      hasNew     : comparison.hasNew      ,
      hasDeleted : comparison.hasDeleted  ,
      hasPassed  : comparison.hasPassed   ,
      date       : comparison.date        ,
      title      : suiteDescription.title ,
    }
    addComparison(projectId, suiteId, prId, addedComp)
    return addedComp // TODO : not sure that that we should return a resolved promise instead of a value...
  }
}


/*************************************************************/
/*  */
function addComparison (projectId, suiteId, prId, comp) {
  console.log('addComparison', projectId, suiteId, prId);
  var existingPro, existingSuite
  existingPro = comparisonsDictionnary[projectId]
  if (!existingPro){
    existingPro = {}
    existingSuite={}
    comparisonsDictionnary[projectId] = existingPro
    existingPro[suiteId]=existingSuite
    existingSuite[prId]=comp
    return comp
  }
  existingSuite = existingPro[suiteId]
  if (!existingSuite) {
    existingSuite = {}
    existingPro[suiteId] = existingSuite
    existingSuite[prId]=comp
    return comp
  }
  existingSuite[prId] = comp
  return comp
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
function checkAndCreateRun(projectId, suiteId){
  if (!comparisonsDictionnary[projectId]) {

  }
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
server.listen(PORT);
console.log('Hi! Cozy visual tests dashboard is running on http://localhost:'.magenta + PORT);
scanAllProjects().then(()=>{
  console.log('\n___all promises fullfiled')
  // console.log('comparisonsDictionnary')
  // console.log(JSON.stringify(comparisonsDictionnary, null, 2))
  reloadBrowser.reload(); // Fire server-side reload event when all the scans are done.
})
