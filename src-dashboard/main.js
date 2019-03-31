const projectTemplate   = require('./templates/project.pug' )
const rowTemplate       = require('./templates/row.pug'     )
const moment            = require('moment'                  )

/*************************************************************/
/*  GLOBALS                                                  */
const resultsViewCtrler = {}
const testedApps        = {}
const req               = new XMLHttpRequest()
const resultsContainerV = document.getElementById('results-container')
var   STORE //  sotre of data, a dictionnary of comparisons {project.suite.prId:{comparison}}

moment.locale('fr');

/*************************************************************/
/* GET FROM SERVER THE LIST OF TESTS                         */

req.onreadystatechange = function(event) {
    // XMLHttpRequest.DONE === 4
    if (this.readyState === XMLHttpRequest.DONE) {
        if (this.status === 200) {
            STORE = JSON.parse(this.responseText)
            console.log(STORE);
            resultsViewCtrler.init()
        } else {
            console.log("Status de la réponse: %d (%s)", this.status, this.statusText);
        }
    }
};
req.open('GET', '/api/comparisons-list', true);
req.send(null);


/*************************************************************/
/*  VIEW CONTROLER                                           */
resultsViewCtrler.init = ()=>{
  console.log('resultsViewCtrler.init()');
  // create apps views
  for (var projectId in STORE) {
    var project = STORE[projectId]
    var newDiv = document.createElement("div")
    newDiv.innerHTML = projectTemplate({appName:projectId})
    project.view = newDiv
    resultsContainerV.appendChild(newDiv)
  }

  // create comparison rows views
  for (var projectId in STORE) {
    var project = STORE[projectId]
    tableBody = project.view.getElementsByTagName('tbody')[0]
    for (var suiteId in project) {
      if (suiteId === 'view') continue
      var suite = project[suiteId]
      for (var prId in suite) {
        var comparison = suite[prId]
        // console.log(projectId, suiteId, prId, comparison)
        row = document.createElement('tr')
        comparison.view = row
        comparison.dateF = moment(comparison.date).format('YYYY-MM-DD HH[h]mm')
        console.log(comparison.dateF);
        row.innerHTML = rowTemplate(comparison)
        tableBody.appendChild(row)
        row.addEventListener('click', goToReport(comparison), false)
      }
    }
  }
}

goToReport = (comparison) => {
  return () => window.location = `/report/${comparison.project}-${comparison.suite}/${comparison.prId}/`
}
