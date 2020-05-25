/* eslint linebreak-style: ["error", "windows"] */
/* eslint func-names: ["error", "never"] */

const _ = require('lodash');

const generateRandom = function (except, min = 1, max = 2) {
  const num = Math.floor(Math.random() * (max - min + 1)) + min;
  return (_.includes(except, num)) ? generateRandom(min, max) : num;
};

module.exports = {
  generateRandom,
};
