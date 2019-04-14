const glob           = require('glob'             )
const mkdirp         = require('make-dir'         )
const del            = require('del'              )
const fs             = require('fs'               )
const path           = require('path'             )
const bluebird       = require('bluebird'         )
const EventEmitter   = require('events'           )
const range          = require('lodash'           ).range
const log            = require('./log'            )
const createReport   = require('./report'         )
const ProcessAdaptor = require('./process-adaptor')

const IMAGE_FILES = '/**/*.+(tiff|jpeg|jpg|gif|png|bmp)';

const difference = (arrA, arrB) => arrA.filter(a => !arrB.includes(a))


const compareImages = (
  emitter,
  { expectedFiles, actualFiles, dirs, matchingThreshold, thresholdPixel, thresholdRate, concurrency, enableAntialias },
) => {
  const images = actualFiles.filter(actualImage => expectedFiles.includes(actualImage));
  concurrency = images.length < 20 ? 1 : concurrency || 4;
  const processes = range(concurrency).map(() => new ProcessAdaptor(emitter));
  return bluebird
    .map(
      images,
      image => {
        const p = processes.find(p => !p.isRunning());
        if (p) {
          return p.run({
            ...dirs,
            image,
            matchingThreshold,
            thresholdRate,
            thresholdPixel,
            enableAntialias,
          });
        }
      },
      { concurrency },
    )
    .then(result => {
      processes.forEach(p => p.close());
      return result;
    })
    .filter(r => !!r);
};


const cleanupExpectedDir = (expectedDir, changedFiles) => {
  const paths = changedFiles.map(image => path.join(expectedDir, image));
  del(paths);
};


const aggregate = result => {
  const passed = result.filter(r => r.passed).map(r => r.image);
  const failed = result.filter(r => !r.passed).map(r => r.image);
  const diffItems = failed.map(image => image.replace(/\.[^\.]+$/, '.png'));
  return { passed, failed, diffItems };
};


/*************************************************************/
/* GET THE "ITEM", ie excluding *.masked.png                 */
const extractItems = (expectedDir) => {
  // keep all files except *.masked.png
  return glob.sync(`${expectedDir}/!(*.masked.png)`).map(p => path.basename(p))
}

/*************************************************************/
/* GET THE FILES TO COMPARE, ie including *.masked.png       */
const extractFilesToCompare = (expectedDir) => {
  var filesToCompare = glob.sync(`${expectedDir}/*.png`).map(p => path.basename(p))
  // isolates masked images (*.masked.png)
  const maskedExpectedImages = filesToCompare.filter(file => file.endsWith('masked.png')).map(f=>f.slice(0,-11))
  // remove from expected files that have a masked counterpart (img1.png, img1.png.masked.png => remove img1.png)
  // ie : just keep the file with no mask or the masked version of files.
  return filesToCompare.filter(file => !maskedExpectedImages.find(mf => mf===file))
}


module.exports = (params) => {
  const {
    suiteDescription                ,
    actualDir                       ,
    expectedDir                     ,
    diffDir                         ,
    json                            ,
    projectId                       ,
    suiteId                         ,
    prId                            ,
    nextBeforeVersion               ,
    concurrency                     ,
    urlPrefix                       ,
    threshold                       ,
    matchingThreshold               ,
    thresholdRate                   ,
    thresholdPixel                  ,
    enableAntialias                 ,
    enableClientAdditionalDetection ,
  } = params;
  const dirs           = { actualDir, expectedDir, diffDir };
  const emitter        = new EventEmitter();
  // get all png filenames
  const expectedFiles  = extractFilesToCompare(expectedDir) // exclude *.masked.png
  const expectedImages = extractItems(expectedDir)          // exclude files have a corresponding *.masked.png
  const actualFiles    = extractFilesToCompare(actualDir)   // exclude *.masked.png
  const actualImages   = extractItems(actualDir)            // exclude files have a corresponding *.masked.png
  // console.log('expectedImages', expectedImages);
  // console.log('expectedFiles', expectedFiles);
  // console.log('actualImages', actualImages);
  // console.log('actualFiles', actualFiles);

  const deletedImages  = difference(expectedImages, actualImages);
  const newImages      = difference(actualImages, expectedImages);
  mkdirp.sync(expectedDir);
  mkdirp.sync(diffDir);

  setImmediate(() => emitter.emit('start'));
  var comp = compareImages(emitter, {
    expectedFiles,
    actualFiles,
    dirs,
    matchingThreshold,
    thresholdRate: thresholdRate || threshold,
    thresholdPixel,
    concurrency,
    enableAntialias: !!enableAntialias,
  })
    .then(result => aggregate(result))
    .then(({ passed, failed, diffItems }) => {
      return createReport({
        suiteDescription                                                               ,
        projectId             : projectId                                              ,
        suiteId               : suiteId                                                ,
        prId                  : prId                                                   ,
        beforeVersion         : nextBeforeVersion                                      ,
        date                  : Date.now()                                             ,
        passedItems           : passed.map( item => item.replace(/\.masked\.png$/, '')),
        failedItems           : failed.map( item => item.replace(/\.masked\.png$/, '')),
        diffItems             : diffItems                                              ,
        newItems              : newImages                                              ,
        deletedItems          : deletedImages                                          ,
        expectedItems         : expectedImages                                         ,
        previousExpectedImages: expectedImages                                         ,
        actualItems           : actualImages                                           ,
        json                  : json                                                   ,
        actualDir                                                                      ,
        expectedDir                                                                    ,
        diffDir                                                                        ,
        report                : ''                                                     ,
        urlPrefix             : ''                                                     ,
        enableClientAdditionalDetection:  !!enableClientAdditionalDetection            ,
      });
    })
    .then(result => {
      deletedImages.forEach(image => emitter.emit('compare', { type: 'delete', path: image }))
      newImages.forEach(image => emitter.emit('compare', { type: 'new', path: image }))
      return result
    })
    .then(result => {
      emitter.emit('complete', result)
      return result
    })
    .catch(err => emitter.emit('error', err))

  return comp
};
