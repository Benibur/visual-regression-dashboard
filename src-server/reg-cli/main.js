#!/usr/bin/env node

/* @flow */

// const Spinner = require('cli-spinner').Spinner
const path    = require('path'       )
const compare = require('./compare'  )
const log     = require('./log'      )
// import meow from 'meow';
// import path from 'path';
// import compare from './compare';
// log = console.log
// import notifier from './notifier';
const { BALLOT_X, CHECK_MARK, TEARDROP, MULTIPLICATION_X, GREEK_CROSS, MINUS } = require('./icon')

const IMAGE_FILES = '/**/*.+(tiff|jpeg|jpg|gif|png|bmp)';

// const spinner = new Spinner();
// spinner.setSpinnerString(18);
//
// if (!process.argv[2] || !process.argv[3] || !process.argv[4]) {
//   log.fail('please specify actual, expected and diff images directory.');
//   log.fail('e.g.: $ reg-cli /path/to/actual-dir /path/to/expected-dir /path/to/diff-dir');
//   process.exit(1);
// }
//
// const cli = meow(`
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

function visualCompare(dirPath, runId, testId) {

  console.log('Tests visuels de', dirPath);

  const urlPrefix      = './'
  const json           = dirPath + '/comparison-description.json'
  const report         = dirPath + '/index.html'
  const actualDir      = dirPath + '/after'
  const expectedDir    = dirPath + '/before'
  const diffDir        = dirPath + '/diff'   // TODO tests diff directory exists
  const update         = false
  const extendedErrors = false
  const ignoreChange   = false  // TODO : role ?

  // const observer = compare({
  return compare({
    actualDir                              ,
    expectedDir                            ,
    diffDir                                ,
    update                                 ,
    report                                 ,
    json                                   ,
    runId                                  ,
    testId                                 ,
    urlPrefix                              ,
    matchingThreshold: Number(0)           ,
    thresholdRate: Number(0)               , // TODO : role ??
    thresholdPixel: Number(0)              , // TODO : role ??
    concurrency: 4                         ,
    enableAntialias: false                 ,
    enableClientAdditionalDetection: false
  });

  // observer.once('start', () => '');
  //
  // observer.on('compare', (params) => {
  //   // spinner.stop(true);
  //   const file = path.join(`${actualDir}`, `${params.path}`);
  //   switch (params.type) {
  //     case 'delete': return log.warn(`${MINUS} delete  ${file}`);
  //     case 'new': return log.info(`${GREEK_CROSS} append  ${file}`);
  //     case 'pass': return log.success(`${CHECK_MARK} pass    ${file}`);
  //     case 'fail': return log.fail(`${BALLOT_X} change  ${file}`);
  //   }
  //   // spinner.start();
  // });
  //
  // observer.once('update', () => log.success(`✨ your expected images are updated ✨`));
  //
  // observer.once('complete', ({ failedItems, deletedItems, newItems, passedItems }) => {
  //   // spinner.stop(true);
  //   // log.info('\n');
  //   if (failedItems.length) log.fail(`${BALLOT_X} ${failedItems.length} file(s) changed.`);
  //   if (deletedItems.length) log.warn(`${MINUS} ${deletedItems.length} file(s) deleted.`);
  //   if (newItems.length) log.info(`${GREEK_CROSS} ${newItems.length} file(s) appended.`);
  //   if (passedItems.length) log.success(`${CHECK_MARK} ${passedItems.length} file(s) passed.`);
  //   if (!update && (failedItems.length > 0 || (extendedErrors && (newItems.length > 0 || deletedItems.length > 0)))) {
  //     log.fail(`\nInspect your code changes, re-run with \`-U\` to update them. `);
  //   }
  //   console.log('à la fin du visual compare on retourne  dans le cb isError à', failedItems.length>0);
  //   cb(failedItems.length>0)
  //   return;
  // });
  //
  // observer.once('error', (error) => {
  //   log.fail(error);
  //   process.exit(1);
  // });
}

module.exports = visualCompare
