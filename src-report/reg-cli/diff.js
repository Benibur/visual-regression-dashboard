/* @flow */

// import { imgDiff } from 'img-diff-js'; // $FlowIgnore
const imgDiff = require('img-diff-js').imgDiff
const md5File = require('md5-file')
const path    = require('path')

// export type DiffCreatorParams = {
//   actualDir: string;
//   expectedDir: string;
//   diffDir: string;
//   image: string;
//   matchingThreshold: number,
//   thresholdRate?: number,
//   thresholdPixel?: number,
//   enableAntialias: boolean;
// }
//
// export type DiffResult = {
//   image: string;
//   passed: boolean;
// }

const getMD5 = (file) => new Promise((resolve, reject) => {
  md5File(file, (err, hash) => {
    if (err) reject(err);
    resolve(hash);
  })
});

const isPassed = ({ width, height, diffCount, thresholdPixel, thresholdRate }) => {
  if (typeof thresholdPixel === "number") {
    return diffCount <= thresholdPixel;
  } else if (typeof thresholdRate === "number") {
    const totalPixel = width * height;
    const ratio = diffCount / totalPixel;
    return ratio <= thresholdRate;
  }
  return diffCount === 0;
};

const createDiff = ({
  actualDir, expectedDir, diffDir, image, matchingThreshold, thresholdRate, thresholdPixel, enableAntialias
}) => {
  return Promise.all([
    getMD5(path.join(actualDir, image)),
    getMD5(path.join(expectedDir, image)),
  ]).then(([actualHash, expectedHash]) => {
    if (actualHash === expectedHash) {
      if (!process || !process.send) return;
      return process.send({ passed: true, image });
    }
    const diffImage = image.replace(/\.[^\.]+$/, ".png");
    return imgDiff({
      actualFilename: path.join(actualDir, image),
      expectedFilename: path.join(expectedDir, image),
      diffFilename: path.join(diffDir, diffImage),
      options: {
        threshold: matchingThreshold,
        includeAA: !enableAntialias,
      },
    })
      .then(({ width, height, diffCount }) => {
        const passed = isPassed({ width, height, diffCount, thresholdPixel, thresholdRate });
        if (!process || !process.send) return;
        process.send({ passed, image });
      })
  })
};

process.on('message', (data) => {
  createDiff(data);
});
