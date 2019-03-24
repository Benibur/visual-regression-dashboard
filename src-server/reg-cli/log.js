/* @flow */

const chalk = require('chalk');

module.exports = {
  info(text) {
    console.log(chalk.cyan(text));
  },
  warn(text) {
    console.log(chalk.gray(text));
  },
  success(text) {
    console.log(chalk.green(text));
  },
  fail(text) {
    console.log(chalk.red(text));
  },
};
