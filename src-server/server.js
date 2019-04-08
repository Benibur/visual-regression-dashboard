const http            = require('http'                  )
const path            = require('path'                  )
const express         = require('express'               )
const colors          = require('colors'                )
const reload          = require('reload'                )
const Watch           = require('gaze'                  ).Gaze
const fs              = require('fs'                    )
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
var   scanInProgress         = 0



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
  console.log('route for refresh comparison :',  `public/${p.projectId}-${p.suiteId}/${p.prId}`);
  // update the comparison
  scanPr(p.projectId, p.suiteId, p.prId, true)           // update the comparison TODO : delay in the case where a scan is in progress
  .then((comparison)=>{
    res.send(comparison)
  })
});


/*************************************************************/
/* ROUTE to SAVE a MASK                                      */
app.use(bodyParser.json())
app.post('/api/:projectId/:suiteId/:prId/mask/save/:filename', function(req, res) {
  const p = req.params
  console.log('route for mask/save/ of app',  p.projectId, '/', p.suiteId);
  // store the mask json file
  const maskPath = `public/${p.projectId}-${p.suiteId}/mask/`
  checkAndCreateDir(maskPath)
  fs.writeFileSync(maskPath + p.filename + '.json', JSON.stringify(req.body))
  // compute masked images
  const afterPath = `public/${p.projectId}-${p.suiteId}/${p.prId}/after/${p.filename}`
  computeMaskedImage(afterPath, req.body)
  const beforePath = `public/${p.projectId}-${p.suiteId}/before/${p.filename}`
  computeMaskedImage(beforePath, req.body)
  // update the comparison of the suite
  scanSuite(p.projectId, p.suiteId, true)
  .then(()=> {
    res.sendFile(path.resolve(`public/${p.projectId}-${p.suiteId}/${p.prId}/comparison-description.json`))
  })
});


/*************************************************************/
/* ROUTE to DELETE a MASK                                    */
app.use(bodyParser.json())
app.post('/api/:projectId/:suiteId/:prId/mask/delete/:filename', function(req, res) {
  const p = req.params
  console.log('ROUTE for mask/delete/ of app',  p.projectId, '/', p.suiteId, p.filename);
  const maskPath = `public/${p.projectId}-${p.suiteId}/mask/`
  checkAndCreateDir(maskPath)
  fs.unlinkSync(maskPath + p.filename + '.json')
  // update the comparison of the suite
  scanSuite(p.projectId, p.suiteId, true)
  .then(()=> {
    res.sendFile(path.resolve(`public/${p.projectId}-${p.suiteId}/${p.prId}/comparison-description.json`))
  })
});


/*************************************************************/
/* ROUTE to GET a MASK                                      */
app.get('/api/:projectId/:suiteId/mask/:filename', function(req, res) {
  const p = req.params
  console.log('route to get mask of app',  `public/${p.projectId}-${p.suiteId}/mask/${p.filename}.json`);
  const maskPath = `public/${p.projectId}-${p.suiteId}/mask/${p.filename}.json`
  // checkAndCreateDir(maskPath)
  if (fs.existsSync(maskPath)) {
    const json = fs.readFileSync(maskPath , 'utf8')
    res.send(json)
  }else {
    res.sent(false)
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
    console.log('Report has changed, run all scans and ask browser reload');
    scanAllProjects()
    .then(()=>{
      console.log('reports rescanned, let\'s refresh');
      reloadBrowser.reload(); // Fire server-side reload evenht TODO : be more specific than reloading the full web page
    })
});


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
/* SCAN A DIRECTORY and compare images to produce reports    */
function scanPr(projectId, suiteId, prId, force) {
  const prPath   = `public/${projectId}-${suiteId}/${prId}/`
  const compPath = `public/${projectId}-${suiteId}/${prId}/comparison-description.json`
  var   comparison = {}
  var   test
  console.log('\nSCAN', prPath);
  if (!force && fs.existsSync(compPath)) {
    console.log('comparison-description.json loaded');
    comparison = JSON.parse(fs.readFileSync(compPath, 'utf8'))
  }
  suiteDescription = JSON.parse(fs.readFileSync(`public/${projectId}-${suiteId}/suite-description.json`, 'utf8'))
  // check if the comparison has already been done (test and comparison must have the same beforeVersion)
  // if not, then run a comparison
  if (force || (comparison.beforeVersion != suiteDescription.beforeVersion) ) {
    scanInProgress++
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
      scanInProgress--
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
/*  */
function computeMaskedImage(filePath, masks){
  if (!fs.existsSync(filePath)) return
  console.log('computeMaskedImage', filePath, fabric.createCanvasForNode)
  const out = fs.createWriteStream(filePath + '.masked.png')
  const canvas = fabric.createCanvasForNode(null, { width: 200, height: 200 });
  const text = new fabric.Text('Hello world', {
    left: 100,
    top: 100,
    fill: '#f55',
    angle: 15
  });
  canvas.add(text)
  const stream = canvas.createPNGStream();
  stream.on('data', function(chunk) {
    out.write(chunk);
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
server.listen(PORT);
console.log('Hi! Cozy visual tests dashboard is running on http://localhost:'.magenta + PORT);
scanAllProjects().then(()=>{
  console.log('\n___all promises fullfiled');
  // console.log('testsDictionnary')
  // console.log(testsDictionnary)
  console.log('comparisonsDictionnary')
  console.log(JSON.stringify(comparisonsDictionnary, null, 2))
  reloadBrowser.reload(); // Fire server-side reload event when all the scans are done.
})
