const fs         = require('fs'           )
const mkdirp     = require('mkdirp'       )
const path       = require('path'         )
const detectDiff = require('x-img-diff-js')
const log        = require('./log'        )

const loadFaviconAsDataURL = type => {
  const fname = path.resolve(__dirname, `../assets/favicon_${type}.png`);
  const buffer = fs.readFileSync(fname);
  return 'data:image/png;base64,' + buffer.toString('base64');
};

const encodeFilePath = filePath => {
  return filePath
    .split(path.sep)
    .map(p => encodeURIComponent(p))
    .join(path.sep);
};


const createJSONReport = params => {
  return {
    projectId     : params.projectId,
    suiteId       : params.suiteId,
    prId          : params.prId,
    projectName   : params.suiteDescription.projectName,
    suiteName     : params.suiteDescription.suiteName,
    beforeVersion : params.beforeVersion,
    date          : params.date,
    type          : params.failedItems.length === 0 ? 'success' : 'danger',
    hasPassed     : params.passedItems.length  > 0,
    hasFailed     : params.failedItems.length  > 0,
    hasNew        : params.newItems.length     > 0,
    hasDeleted    : params.deletedItems.length > 0,
    newItems      : params.newItems.map(    item => ({ raw: item, encoded: encodeFilePath(item), hasMask: hasMask(item, params.projectId, params.suiteId) })),
    deletedItems  : params.deletedItems.map(item => ({ raw: item, encoded: encodeFilePath(item), hasMask: hasMask(item, params.projectId, params.suiteId) })),
    passedItems   : params.passedItems.map( item => ({ raw: item, encoded: encodeFilePath(item), hasMask: hasMask(item, params.projectId, params.suiteId) })),
    failedItems   : params.failedItems.map( item => ({ raw: item, encoded: encodeFilePath(item), hasMask: hasMask(item, params.projectId, params.suiteId) })),
    // ximgdiffConfig: {
    //   enabled  : params.enableClientAdditionalDetection,
    //   workerUrl: `${params.urlPrefix}worker.js`,
    // },
  }
}


function hasMask(item, projectId, suiteId) {
  return fs.existsSync(`./public/${projectId}-${suiteId}/mask/${item}.json`)
}


module.exports = (params) => {
  const json = createJSONReport(params);
  mkdirp.sync(path.dirname(params.json));
  fs.writeFileSync(params.json, JSON.stringify(json));
  return json;
};
