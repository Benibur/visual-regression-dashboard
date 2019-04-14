const projectTemplate   = require('./templates/project.pug' )
const rowTemplate       = require('./templates/row.pug'     )
const moment            = require('moment'                  )


/*************************************************************/
/*  GLOBALS                                                  */
const resultsViewCtrler = {}
const testedApps        = {}
const req               = new XMLHttpRequest()
const resultsContainerV = document.getElementById('results-container')
var   STORE //  sotre of data, a dictionnary of comparisons {projectId.suiteId.prId:{comparison}}

moment.locale('fr');


/*************************************************************/
/* GET FROM SERVER THE LIST OF TESTS                         */
req.onreadystatechange = function(event) {
    // XMLHttpRequest.DONE === 4
    if (this.readyState === XMLHttpRequest.DONE) {
        if (this.status === 200) {
            STORE = JSON.parse(this.responseText)
            console.log(JSON.stringify(STORE, null, 2));
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
  // create comparison rows views
  for (var projectId in STORE) {
    var project = STORE[projectId]
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
        rowView.innerHTML = rowTemplate(comparison)
        rowView.addEventListener('click', goToReport(comparison), false)
        const refreshBtn = rowView.getElementsByClassName('refreshCell')[0]
        refreshBtn.addEventListener('click', refreshComparisonListener(comparison), false )

        projectRows.push(comparison)
      }
    }
    sortRows(projectRows)
    // check project has some rows
    if (projectRows.length === 0) continue
    // create project view
    console.log('create project :', {projectName: projectRows[0].projectName});
    var projectDiv = document.createElement("div")
    projectDiv.innerHTML = projectTemplate({projectName: projectRows[0].projectName})
    project.view = projectDiv
    resultsContainerV.appendChild(projectDiv)
    // insert project rows
    tableBody = projectDiv.getElementsByTagName('tbody')[0]
    projectRows.forEach(row => tableBody.appendChild(row.view))
  }
}

function sortRows(rows) {
  rows.sort((a,b) => {
    if(a.suiteId === b.suiteId) return (a.prId > b.prId)
    return (a.suiteId > b.suiteId)
  })
}


goToReport = (comparison) => {
  if (comparison.hasPassed === undefined) return // in case there is no screenshots yet
  return (event) => {
    if (event.ctrlKey) {
      window.open(`/report/${comparison.projectId}/${comparison.suiteId}/${comparison.prId}/index.html`)
    }else {
      window.location = `/report/${comparison.projectId}/${comparison.suiteId}/${comparison.prId}/index.html`
    }
    event.preventDefault()
    event.stopPropagation()
  }
}


/*************************************************************/
/*  VIEW CONTROLER HIDE OR SHOW ROWS                         */
resultsViewCtrler.hideSuccessRows = (shouldHide) =>{
  // create comparison rows views
  for (var projectId in STORE) {
    var project = STORE[projectId]
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
  if(e.target.nodeName==='LABEL') hideSuccessInput.checked = !hideSuccessInput.checked
  resultsViewCtrler.hideSuccessRows(hideSuccessInput.checked)
})


/*************************************************************/
/*  VIEW CONTROLER REFRESH A ROW                             */
resultsViewCtrler.refreshRow = (comp) =>{
  // find row's view
  const comparison = ((STORE[comp.projectId] || {})[comp.suiteId] || {})[comp.prId]
  if (!comparison){
    console.log('refreshRow of an unexisting row', comp);
    return
  }
  // update stored data with new data
  comp.view  = comparison.view
  comp.dateF = moment(comp.date).format('YYYY-MM-DD HH[h]mm')
  STORE[comp.projectId][comp.suiteId][comp.prId] = comp
  // update row's html
  comparison.view.innerHTML = rowTemplate(comp)

}


/*************************************************************/
/*  REFRESH ROWS LISTENER                                    */
refreshComparisonListener = (comparison) => {
  return (e) => {
    refreshComparison(comparison)
    e.stopPropagation()
  }
}

refreshComparison = (comparison) => {
  console.log(`refesh /report/${comparison.projectId}-${comparison.suiteId}/${comparison.prId}/`)
  req.onreadystatechange = function(event) {
      // XMLHttpRequest.DONE === 4
      if (this.readyState === XMLHttpRequest.DONE) {
          if (this.status === 200) {
              const comparison = JSON.parse(this.responseText)
              resultsViewCtrler.refreshRow(comparison)
          } else {
              console.log("Status de la réponse: %d (%s)", this.status, this.statusText);
          }
      }
  };
  req.open('POST', `/api/${comparison.projectId}/${comparison.suiteId}/${comparison.prId}/refresh`, true);
  req.send(null);
}
