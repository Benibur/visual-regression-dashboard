/*************************************************************/
/*  GLOBALS                                                  */
const appTemplate       = require('./templates/template-app.pug' )
const rowTemplate       = require('./templates/template-row.pug' )
const resultsViewCtrler = {}
const testedApps        = {}
const req               = new XMLHttpRequest()
const resultsContainerV = document.getElementById('results-container')
var   tests // array of tests


/*************************************************************/
/* GET FROM SERVER THE LIST OF TESTS                         */
req.onreadystatechange = function(event) {
    // XMLHttpRequest.DONE === 4
    if (this.readyState === XMLHttpRequest.DONE) {
        if (this.status === 200) {
            tests = JSON.parse(this.responseText)
            resultsViewCtrler.init()
        } else {
            console.log("Status de la réponse: %d (%s)", this.status, this.statusText);
        }
    }
};
req.open('GET', '/tests-list', true);
req.send(null);


/*************************************************************/
/*  VIEW CONTROLER                                           */
resultsViewCtrler.init = ()=>{

  // init the testedApps dictionnary
  // {view : #domNode, testsData:[{#testData}]}
  for (test of tests) {
    if (!testedApps[test.appId]) {
      testedApps[test.appId] = {view: null, testsData: []}
    }
    testedApps[test.appId].testsData.push(test) //
  }
  console.log(testedApps);

  // create apps views
  for (var app in testedApps) {
    var newDiv = document.createElement("div")
    newDiv.innerHTML = appTemplate({appName:app})
    testedApps[app].view = newDiv
    resultsContainerV.appendChild(newDiv)
  }

  // create test rows views
  for (var app in testedApps) {
    tableBody = testedApps[app].view.getElementsByTagName('tbody')[0]
    for (test of testedApps[app].testsData) {
      row = document.createElement('tr')
      row.innerHTML = rowTemplate(test)
      tableBody.appendChild(row)
      gotoReport = (testId) => {
        return () => window.location = '/tests/' + testId
      }
      row.addEventListener('click', gotoReport(test.testId), false)
    }
  }

}
