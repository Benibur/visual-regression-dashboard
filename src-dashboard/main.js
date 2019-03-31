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
/*  VIEW CONTROLER INIT                                      */
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
    var projectRows = []
    for (var suiteId in project) {
      if (suiteId === 'view') continue
      var suite = project[suiteId]
      for (var prId in suite) {
        var comparison = suite[prId]
        // console.log(projectId, suiteId, prId, comparison)
        rowView = document.createElement('tr')
        comparison.view = rowView
        comparison.dateF = moment(comparison.date).format('YYYY-MM-DD HH[h]mm')
        console.log(comparison);
        rowView.innerHTML = rowTemplate(comparison)
        rowView.addEventListener('click', goToReport(comparison), false)
        const refreshBtn = rowView.getElementsByClassName('refreshCell')[0]
        refreshBtn.addEventListener('click', refreshComparisonListener(comparison), false )

        projectRows.push(comparison)
      }
    }
    sortRows(projectRows)
    projectRows.map(row => tableBody.appendChild(row.view))
  }
}

function sortRows(rows) {
  rows.sort((a,b) => {
    if(a.suite === b.suite) return (a.prId > b.prId)
    return (a.suite > b.suite)
  })
}


refreshComparisonListener = (comparison) => {
  return (e) => {
    refreshComparison(comparison)
    e.stopPropagation()
  }
}

refreshComparison = (comparison) => {
  console.log(`refesh /report/${comparison.project}-${comparison.suite}/${comparison.prId}/`)
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
  req.open('POST', `/api/${comparison.project}/${comparison.suite}/${comparison.prId}`, true);
  req.send(null);
}

goToReport = (comparison) => {
  console.log(`/report/${comparison.project}-${comparison.suite}/${comparison.prId}/`);
  return () => window.location = `/report/${comparison.project}-${comparison.suite}/${comparison.prId}/`
}


/*************************************************************/
/*  VIEW CONTROLER HIDE OR SHOW ROWS                         */
resultsViewCtrler.hideSuccessRows = (shouldHide) =>{
  // create comparison rows views
  for (var projectId in STORE) {
    var project = STORE[projectId]
    // project.view
    // tableBody = project.view.getElementsByTagName('tbody')[0]
    var numberOfVisibleRows = 0
    for (var suiteId in project) {
      if (suiteId === 'view') continue
      var suite = project[suiteId]
      for (var prId in suite) {
        var comparison = suite[prId]
        // console.log(projectId, suiteId, prId, comparison)
        if (!shouldHide || comparison.hasNew || comparison.hasFailed || comparison.hasDeleted ){
          numberOfVisibleRows ++
          comparison.view.style.display = 'table-row'
        }else {
          comparison.view.style.display = 'none'
        }
      }
    }
    if (numberOfVisibleRows===0) {
      project.view.style.display = 'none'
    }else {
      project.view.style.display = 'block'
    }
  }
}


const hideSuccessBtn = document.getElementById('hideSuccessBtn')
const hideSuccessInput = hideSuccessBtn.getElementsByTagName('INPUT')[0]
hideSuccessBtn.addEventListener('click', (e)=>{
  console.log('click hideSuccessBtn', hideSuccessInput.checked, e.target)
  if(e.target.nodeName==='LABEL') hideSuccessInput.checked = !hideSuccessInput.checked
  resultsViewCtrler.hideSuccessRows(hideSuccessInput.checked)
})
