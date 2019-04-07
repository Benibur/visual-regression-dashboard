
const Mustache   = require('mustache'     )
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
  console.log('in createJSONReport, beforeVersion', params.beforeVersion);
  // const json = {
  //   beforeVersion: params.beforeVersion,
  //   date         : params.date,
  //   hasPassed    : params.passedItems.length  > 0,
  //   hasFailed    : params.failedItems.length  > 0,
  //   hasNew       : params.newItems.length     > 0,
  //   hasDeleted   : params.deletedItems.length > 0,
  //   failedItems  : params.failedItems,
  //   newItems     : params.newItems,
  //   deletedItems : params.deletedItems,
  //   passedItems  : params.passedItems,
  //   expectedItems: params.expectedItems,
  //   actualItems  : params.actualItems,
  //   diffItems    : params.diffItems,
  //   actualDir    : `${params.urlPrefix}${path.relative(path.dirname(params.json), params.actualDir)}`,
  //   expectedDir  : `${params.urlPrefix}${path.relative(path.dirname(params.json), params.expectedDir)}`,
  //   diffDir      : `${params.urlPrefix}${path.relative(path.dirname(params.json), params.diffDir)}`,
  // };
  const htmlJson = {
    projectId     : params.projectId,
    suiteId       : params.suiteId,
    prId          : params.prId,
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
    actualDir     : `${params.urlPrefix}${path.relative(path.dirname(params.report), params.actualDir)}`,
    expectedDir   : `${params.urlPrefix}${path.relative(path.dirname(params.report), params.expectedDir)}`,
    diffDir       : `${params.urlPrefix}${path.relative(path.dirname(params.report), params.diffDir)}`,
    ximgdiffConfig: {
      enabled  : params.enableClientAdditionalDetection,
      workerUrl: `${params.urlPrefix}worker.js`,
    },
  };
  return htmlJson
};

const createHTMLReport = params => {
  const file     = path.join(__dirname, '../template/template.html');
  const js       = fs.readFileSync(path.join(__dirname, '../dist.old/build.js'));
  const template = fs.readFileSync(file);
  const json     = {
    projectId     : params.projectId,
    suiteId       : params.suiteId,
    prId          : params.prId,
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
    actualDir     : `${params.urlPrefix}${path.relative(path.dirname(params.report), params.actualDir)}`,
    expectedDir   : `${params.urlPrefix}${path.relative(path.dirname(params.report), params.expectedDir)}`,
    diffDir       : `${params.urlPrefix}${path.relative(path.dirname(params.report), params.diffDir)}`,
    ximgdiffConfig: {
      enabled  : params.enableClientAdditionalDetection,
      workerUrl: `${params.urlPrefix}worker.js`,
    },
  };
  const faviconType = json.hasFailed || json.hasNew || json.hasDeleted ? 'failure' : 'success';
  const view = {
    js,
    report: JSON.stringify(json),
    faviconData: loadFaviconAsDataURL(faviconType),
  };
  return Mustache.render(template.toString(), view);
};

function hasMask(item, projectId, suiteId) {
  return fs.existsSync(`./public/${projectId}-${suiteId}/mask/${item}.json`)
}

function createXimdiffWorker(params) {
  const file            = path.join(__dirname, '../template/worker_pre.js');
  const moduleJs        = fs.readFileSync(path.join(__dirname, '../report/dist/worker.js'), 'utf8');
  const wasmLoaderJs    = fs.readFileSync(detectDiff.getBrowserJsPath(), 'utf8');
  const template        = fs.readFileSync(file);
  const ximgdiffWasmUrl = `${params.urlPrefix}detector.wasm`;
  return Mustache.render(template.toString(), { ximgdiffWasmUrl }) + '\n' + moduleJs + '\n' + wasmLoaderJs;
}



module.exports = (params) => {
  if (!!params.report) {
    const html = createHTMLReport(params);
    mkdirp.sync(path.dirname(params.report));
    fs.writeFileSync(params.report, html);
    if (!!params.enableClientAdditionalDetection) {
      const workerjs = createXimdiffWorker(params);
      fs.writeFileSync(path.resolve(path.dirname(params.report), 'worker.js'), workerjs);
      const wasmBuf = fs.readFileSync(detectDiff.getBrowserWasmPath());
      fs.writeFileSync(path.resolve(path.dirname(params.report), 'detector.wasm'), wasmBuf);
    }
  }
  const json = createJSONReport(params);
  mkdirp.sync(path.dirname(params.json));
  fs.writeFileSync(params.json, JSON.stringify(json));
  return json;
};