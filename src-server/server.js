const http            = require('http'              )
const path            = require('path'              )
const express         = require('express'           )
const colors          = require('colors'            )
const reload          = require('reload'            )
const watch           = require('node-watch'        )
const fs              = require('fs'                )
const Promise         = require('bluebird'          )
const visualCompare   = require('./reg-cli/main.js' )


/*************************************************************/
/* GLOBALS                                                   */
const PORT             = 8080
const testsDictionnary = {}
const app              = express()
const server           = http.createServer(app)
var   scanInProgress   = 0


/*************************************************************/
/* ROUTE to get the list of tests                            */
app.get('/tests-list', function(req, res) {
  res.json(getTestsList());
});


/*************************************************************/
/* ROUTE for the dashboard page                              */
app.get('/', function(req, res) {
  res.sendFile(path.resolve('src-dashboard/public'));
});
app.use(express.static('src-dashboard/public'))


/*************************************************************/
/* ROUTE for the test web pages                              */
app.use('/tests', express.static('public') );


/*************************************************************/
/* ROUTE to set an image as a reference                      */
app.post('/tests/:testId/set-as-reference/:filename', function(req, res) {
  console.log('route for set-as-reference of app',  req.params.testId, '/', req.params.filename);
  const src  = 'public/' + req.params.testId + '/after/'  + req.params.filename
  const dest = 'public/' + req.params.testId + '/before/' + req.params.filename
  const diff = 'public/' + req.params.testId + '/diff/'   + req.params.filename
  fs.copyFileSync(src, dest)
  try {
    console.log('try delete', diff);
    fs.unlinkSync(diff) // delete diff if exists
  }
  catch (e) {}
  finally {
    console.log('file moved, ow re-scan the directory');
    scanTest('public/'+req.params.testId, true)   // update the comparison TODO : delay in the case where a scan is in progress
    .then(()=>{
      res.send(true)
    })
  }
});


/*************************************************************/
/* BROWSER RELOADER                                          */
reloadBrowser = reload(app)


/*************************************************************/
/* RELOAD web page when the dashboard code changes           */
/* (for ease of dev)                                         */
watch("./src-dashboard/public",{ recursive: true }, function (evt, name) {
    console.log('reload client !');
    reloadBrowser.reload(); // Fire server-side reload event
})


/*************************************************************/
/* RELOAD of web page when the description of a test changes */
watch("./public",{ recursive: true, filter: /test\-description\.json$/}, function (evt, name) {
    scanTest(path.dirname(name))
    .then(()=>{
      console.log('ask browser reload !');
      reloadBrowser.reload(); // Fire server-side reload evenht TODO : be more specific than reloading the full web page
    })
});


/*************************************************************/
/* rerun scans when the report is changed                    */
watch("./src-server/report/dist",{ recursive: false}, function (evt, name) {
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
  const directoryPath =  'public'
  const fileNames = fs.readdirSync(directoryPath)
  console.log('');
  return Promise.map(fileNames, file => scanTest('public/'+file), {concurrency:4}) //
}


/*************************************************************/
/* SCAN A DIRECTORY and compare images to produce reports    */
function scanTest(dirPath, force) {
  var path = dirPath+'/comparison-description.json'
  var comparisonDescription = {}
  var testDescription
  console.log('\nscan', dirPath);
  if (fs.existsSync(path)) {
    comparisonDescription = JSON.parse(fs.readFileSync(path, 'utf8'))
  }
  testDescription = JSON.parse(fs.readFileSync(dirPath+'/test-description.json', 'utf8'))
  // check if the comparison has already been done (test and comparison must have the same runId)
  // if not, then run a comparison
  if ((comparisonDescription.runId != testDescription.runId) || force) {
    console.log('visual Comparison required for', dirPath, testDescription.runId)
    scanInProgress++
    var promise = visualCompare(dirPath, testDescription.runId, testDescription.testId)
    promise.then((result)=>{
        comparisonDescription.isError = result.isError
        testDescription.isError = result.isError
        testDescription.hasNew  = result.newItems.length > 0
        testsDictionnary[testDescription.testId] = testDescription
        console.log(result.testId, ': à la fin du scan (AVEC scan...) => testDescription.isError ', testDescription.isError);
        scanInProgress--
    })
    return promise
  }else{
    // add or update the test to the list
    testDescription.isError = comparisonDescription.isError
    testsDictionnary[testDescription.testId] = testDescription
    console.log('à la fin du scan (sans scan...), testDescription.isError ', testDescription.isError);
    return comparisonDescription // TODO : not sure that that we should return a resolved promise instead of a value...
  }
}


/*************************************************************/
/*  */
function getTestsList() {
  console.log('\n___getTestsList - scanInProgress =', scanInProgress);
  const testsList = []
  for (var test in testsDictionnary) {
    testsList.push(testsDictionnary[test])
  }
  testsList.sort((a, b)=> a.testId > b.testId )
  return testsList
}


/*************************************************************/
/* START server when all directories are re scanned          */
server.listen(PORT);
console.log('Hi! Cozy visual tests dashboard is running on http://localhost:'.magenta + PORT);
scanTests().then(()=>{
  console.log('all promises fullfiled');
  reloadBrowser.reload(); // Fire server-side reload event when all the scans are done.
})
