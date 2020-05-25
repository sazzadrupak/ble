/* eslint linebreak-style: ["error", "windows"] */
/* eslint func-names: ["error", "never"] */
const utils = require('../utils/writer.js');

const errorCodes = [400, 401, 404];

const returnError = function (error, res) {
  utils.writeJson(
    res,
    { error: (error.detail) ? error.detail : error.message },
    (errorCodes.includes(error.code)) ? error.code : 404,
  );
};

module.exports = {
  errorCodes,
  returnError,
};
