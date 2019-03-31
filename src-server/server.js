const http            = require('http'              )
const path            = require('path'              )
const express         = require('express'           )
const colors          = require('colors'            )
const reload          = require('reload'            )
const Watch           = require('gaze'              ).Gaze
const fs              = require('fs'                )
const Promise         = require('bluebird'          )
const visualCompare   = require('./reg-cli/main.js' )
const bodyParser      = require('body-parser'       )
const glob            = require('glob'              )


/*************************************************************/
/* GLOBALS                                                   */
const PORT                   = 8080
const testsDictionnary       = {}
const comparisonsDictionnary = {}
const app                    = express()
const server                 = http.createServer(app)
var   scanInProgress         = 0


/*************************************************************/
/* ROUTE to get the comparisons                              */
/* structure : {project.suite.prId:{comparison}}             */
app.get('/api/comparisons-list', function(req, res) {
  res.json(getComparisons())
})


/*************************************************************/
/* ROUTE for the dashboard page                              */
app.get('/', function(req, res) {
  res.sendFile(path.resolve('src-dashboard/public'));
});
app.use(express.static('src-dashboard/public'))


/*************************************************************/
/* ROUTE for the report web pages                              */
app.use('/report', express.static('public') );


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
    console.log('file moved, re-scan the directory');
    // scanTest('public/'+p.testId, true)   // update the comparison TODO : delay in the case where a scan is in progress
    scanTest(p.projectId, p.suiteId, p.prId, true)   // update the comparison TODO : delay in the case where a scan is in progress
    .then(()=>{
      res.send(true)
    })
  }
});


/*************************************************************/
/* ROUTE to SAVE a MASK                                      */
app.use(bodyParser.json())
app.post('/tests/:testId/mask/save/:dir/:filename', function(req, res) {
  console.log('route for mask/save/ of app',  req.params.testId, '/', req.params.filename);
  const maskPath = 'public/' + req.params.testId + '/mask/'
  checkAndCreateDir(maskPath)
  fs.writeFileSync(maskPath + req.params.filename + '.json', JSON.stringify(req.body, null, 2))
  // update the comparison
  scanTest('public/' + req.params.testId , true)
  .then(()=> res.send(true) )
});


/*************************************************************/
/* ROUTE to GET a MASK                                      */
app.get('/tests/:testId/mask/:filename', function(req, res) {
  console.log('route to get mask of app',  req.params.testId, '/mask/', req.params.filename);
  const maskPath = 'public/' + req.params.testId + '/mask/'
  // checkAndCreateDir(maskPath)
  const json = fs.readFileSync(maskPath + req.params.filename + '.json', 'utf8')
  res.send(json)
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
//     scanTest(path.dirname(name))
//     .then(()=>{
//       console.log('ask browser reload !');
//       reloadBrowser.reload(); // Fire server-side reload evenht TODO : be more specific than reloading the full web page
//     })
// });


/*************************************************************/
/* rerun scans when the report is changed                    */
const watchReport = new Watch('./src-server/report/dist/build.js')
watchReport.on('all', function (evt, filepath) {
    console.log('Report has changed, run all scans and ask browser reload');
    scanTests()
    .then(()=>{
      console.log('reports rescanned, let\'s refresh');
      reloadBrowser.reload(); // Fire server-side reload evenht TODO : be more specific than reloading the full web page
    })
});


/*************************************************************/
/* INITIAL SCAN of tests folders                             */
function scanTests() {
  const fileNames = fs.readdirSync('public')
  const prDirectories = glob.sync('*/*/pr-*')

  return Promise.map(prDirectories, dir => {
    dir = dir.split(path.sep)
    const match   = dir[1].match(/[\w_]+/g)
    const project = match[0]
    const suite   = match[1]
    const prId    = dir[2] // TODO : parseInt ?
    // console.log('\nscanTests', project, suite, prId)
    return scanTest(project, suite, prId, false)
  }, {concurrency:4})
}


/*************************************************************/
/* SCAN A DIRECTORY and compare images to produce reports    */
function scanTest(project, suite, prId, force) {
  const prPath   = `public/${project}-${suite}/${prId}/`
  const compPath = `public/${project}-${suite}/${prId}/comparison-description.json`
  var   comparison = {}
  var   test
  console.log('\nSCAN', prPath);
  if (fs.existsSync(compPath)) {
    console.log('comparison-description.json loaded');
    comparison = JSON.parse(fs.readFileSync(compPath, 'utf8'))
  }
  suiteDescription = JSON.parse(fs.readFileSync(`public/${project}-${suite}/suite-description.json`, 'utf8'))
  // check if the comparison has already been done (test and comparison must have the same beforeVersion)
  // if not, then run a comparison
  if ((comparison.beforeVersion != suiteDescription.beforeVersion) || force) {
    console.log(`Visual Comparison required for ${project}/${suite}/${prId} - ${suiteDescription.beforeVersion}, ${comparison.beforeVersion}`)
    scanInProgress++
    // updateMasked(dirPath)
    var promise = visualCompare(project, suite, prId, suiteDescription.beforeVersion)
    promise.then((result)=>{
        // result.hasNew  = result.newItems.length > 0 // TODO : rôle ?
        // comparisonsDictionnary[`${project}-${suite}-${prId}`] = comparison
        // testsDictionnary[`${project}-${suite}`] = test
        console.log(`${project}-${suite}/${prId} : comparison (AVEC scan) => comparison.isError`, result.isError);
        addComparison(project, suite, prId, {project, suite, prId, isError: result.isError, title:suiteDescription.title, date:result.date} )
        scanInProgress--
    })
    return promise
  }else{
    // add or update the test to the list
    // test.isError += comparison.isError ? 1 : -1
    console.log('add to testsDictionnary', `${project}-${suite}-${prId}` );
    // testsDictionnary[`${project}-${suite}`] = test
    // comparisonsDictionnary[`${project}-${suite}-${prId}`] = comparison
    console.log(`${project}-${suite}-${prId} : comparison (SANS scan) => comparison.isError`, comparison.isError);
    // addComparison(project, suite, prId, comparison)
    addComparison(project, suite, prId, {project, suite, prId, isError: comparison.isError, title:suiteDescription.title, date:Date.now() })
    return comparison // TODO : not sure that that we should return a resolved promise instead of a value...
  }
}


/*************************************************************/
/*  */
function addComparison (project, suite, prId, comp) {
  console.log('addComparison', project, suite, prId);
  var existingPro, existingSuite

  existingPro = comparisonsDictionnary[project]
  if (!existingPro){
    existingPro = {}
    existingSuite={}
    comparisonsDictionnary[project] = existingPro
    existingPro[suite]=existingSuite
    existingSuite[prId]=comp
    return
  }

  existingSuite = existingPro[suite]
  if (!existingSuite) {
    existingSuite = {}
    existingPro[suite] = existingSuite
    existingSuite[prId]=comp
    return
  }

  existingSuite[prId] = comp

  // comparisonsDictionnary[`${project}-${suite}-${prId}`] = comparison
  // comparisonsDictionnary[`${project}-${suite}-${prId}`] = comparison
  // comparisonsDictionnary[`${project}-${suite}-${prId}`] = comparison
  // testsDictionnary[`${project}-${suite}`] = test
  // console.log(`${project}-${suite}-${prId} : comparison (AVEC scan) =>`, test.isError)
}


/*************************************************************/
/*  */
function updateMasked(dirPath) {
  var pngDir = 'after'
  // for (var f of fs.) {
  //
  // }
  // pngDir = 'before'

}


/*************************************************************/
/* return a dictionnary of all the comparisons               */
/* structure : {project.suite.prId:{comparison}}             */
function getComparisons() {
  // console.log('\n___getTestsList - scanInProgress =', scanInProgress);
  // const testsList = []
  // for (var test in testsDictionnary) {
  //   testsList.push(testsDictionnary[test])
  // }
  // testsList.sort((a, b)=> a.testId > b.testId )
  // return testsList
  return comparisonsDictionnary
}


/*************************************************************/
/* START server when all directories are re scanned          */
server.listen(PORT);
console.log('Hi! Cozy visual tests dashboard is running on http://localhost:'.magenta + PORT);
scanTests().then(()=>{
  console.log('\n___all promises fullfiled');
  // console.log('testsDictionnary')
  // console.log(testsDictionnary)
  console.log('comparisonsDictionnary')
  console.log(JSON.stringify(comparisonsDictionnary, null, 2))
  reloadBrowser.reload(); // Fire server-side reload event when all the scans are done.
})


/*************************************************************/
/* HELPERS                                                   */
function checkAndCreateDir(path) {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path)
  }
}
