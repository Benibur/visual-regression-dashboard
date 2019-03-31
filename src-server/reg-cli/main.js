
const path        = require('path'       )
const compare     = require('./compare'  )
const log         = require('./log'      )
const IMAGE_FILES = '/**/*.+(tiff|jpeg|jpg|gif|png|bmp)';

//   Usage
//     $ reg-cli /path/to/actual-dir /path/to/expected-dir /path/to/diff-dir
//   Options
//     -U, --update Update expected images.(Copy \`actual images\` to \`expected images\`).
//     -J, --json Specified json report path. If omitted ./reg.json.
//     -I, --ignoreChange If true, error will not be thrown when image change detected.
//     -E, --extendedErrors If true, also added/deleted images will throw an error. If omitted false.
//     -R, --report Output html report to specified directory.
//     -P, --urlPrefix Add prefix to all image src.
//     -M, --matchingThreshold Matching threshold, ranges from 0 to 1. Smaller values make the comparison more sensitive. 0 by default.
//     -T, --thresholdRate Rate threshold for detecting change. When the difference ratio of the image is larger than the set rate detects the change.
//     -S, --thresholdPixel Pixel threshold for detecting change. When the difference pixel of the image is larger than the set pixel detects the change. This value takes precedence over \`thresholdRate\`.
//     -C, --concurrency How many processes launches in parallel. If omitted 4.
//     -A, --enableAntialias. Enable antialias. If omitted false.
//     -X, --additionalDetection. Enable additional difference detection(highly experimental). Select "none" or "client" (default: "none").
//   Examples
//     $ reg-cli /path/to/actual-dir /path/to/expected-dir /path/to/diff-dir -U -D ./reg.json
// `, {
//     alias: {
//       U: 'update',
//       J: 'json',
//       I: 'ignoreChange',
//       E: 'extendedErrors',
//       R: 'report',
//       P: 'urlPrefix',
//       M: 'matchingThreshold',
//       T: 'thresholdRate',
//       S: 'thresholdPixel',
//       C: 'concurrency',
//       A: 'enableAntialias',
//       X: 'additionalDetection',
//     },
//   });

function visualCompare(project, suite, prId, nextBeforeVersion) {
  const prPath         = `public/${project}-${suite}/${prId}/`
  const expectedDir    = `public/${project}-${suite}/before/`
  const json           = prPath + 'comparison-description.json'
  const report         = prPath + 'index.html'
  const actualDir      = prPath + 'after'
  const diffDir        = prPath + 'diff'   // TODO tests diff directory exists
  const urlPrefix      =
  console.log('Tests visuels de', prPath);

  // const observer = compare({
  return compare({
    actualDir                                   ,
    expectedDir                                 ,
    diffDir                                     ,
    json                                        ,
    project                                     ,
    suite                                       ,
    prId                                        ,
    nextBeforeVersion                           ,
    report                                      ,
    concurrency                     : 4         ,
    update                          : false     ,
    urlPrefix                       : './'      ,
    matchingThreshold               : Number(0) ,
    thresholdRate                   : Number(0) , // TODO  role ??
    thresholdPixel                  : Number(0) , // TODO  role ??
    enableAntialias                 : false     ,
    enableClientAdditionalDetection : false
  });

}

module.exports = visualCompare
