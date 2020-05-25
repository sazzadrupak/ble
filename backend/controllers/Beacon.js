/* eslint linebreak-style: ["error", "windows"] */
/* eslint quotes: ["error", "single", { "allowTemplateLiterals": true }] */

const utils = require('../utils/writer.js');
const Beacon = require('../db/beaconService');
const Auth = require('../middleware/authToken');
const { returnError } = require('../utils/error_code');

module.exports.addBeacon = function addBeacon(req, res) {
  const newBeacon = req.swagger.params.beacon.value;
  Auth.auth(req.swagger.params.api_key.value)
    .then((response) => {
      Auth.checkUserType(response.user_id, `AND "user_type" = 'admin'`)
        .then(() => {
          Beacon.addBeacon(newBeacon, response.id)
            .then((addResponse) => {
              utils.writeJson(res, addResponse, 200);
            })
            .catch((error) => {
              returnError(error, res);
            });
        })
        .catch((error) => {
          utils.writeJson(res, { error: error.message }, 401);
        });
    })
    .catch((error) => {
      utils.writeJson(res, { error: error.message }, error.code);
    });
};

module.exports.getBeacons = function getBeacons(req, res) {
  Auth.auth(req.swagger.params.api_key.value)
    .then((response) => {
      Auth.checkUserType(response.user_id, `AND "user_type" > 'student'`)
        .then(() => {
          Beacon.getBeacons()
            .then((getResponse) => {
              utils.writeJson(res, getResponse, 200);
            })
            .catch((error) => {
              returnError(error, res);
            });
        })
        .catch((error) => {
          utils.writeJson(res, { error: error.message }, 401);
        });
    })
    .catch((error) => {
      utils.writeJson(res, { error: error.message }, error.code);
    });
};

module.exports.updateBeacon = function updateBeacon(req, res) {
  const beacon = req.swagger.params.beacon.value;
  const beaconId = req.swagger.params.beaconId.value;
  Auth.auth(req.swagger.params.api_key.value)
    .then((response) => {
      Auth.checkUserType(response.user_id, `AND "user_type" = 'admin'`)
        .then(() => {
          if (Number.isInteger(beaconId)) {
            Beacon.updateBeacon(beacon, beaconId, response.id)
              .then((updateResponse) => {
                utils.writeJson(res, updateResponse, 201);
              })
              .catch((error) => {
                returnError(error, res);
              });
          } else {
            utils.writeJson(res, { error: 'Invalid ID supplied' }, 400);
          }
        })
        .catch((error) => {
          utils.writeJson(res, { error: error.message }, 401);
        });
    })
    .catch((error) => {
      utils.writeJson(res, { error: error.message }, error.code);
    });
};

module.exports.getBeaconById = function getBeaconById(req, res) {
  const beaconId = req.swagger.params.beaconId.value;
  Auth.auth(req.swagger.params.api_key.value)
    .then((response) => {
      Auth.checkUserType(response.user_id, `AND "user_type" > 'student'`)
        .then(() => {
          if (Number.isInteger(beaconId)) {
            Beacon.getBeaconById(beaconId)
              .then((getResponse) => {
                utils.writeJson(res, getResponse, 200);
              })
              .catch((error) => {
                returnError(error, res);
              });
          } else {
            utils.writeJson(res, { error: 'Invalid ID supplied' }, 400);
          }
        })
        .catch((error) => {
          utils.writeJson(res, { error: error.message }, 401);
        });
    })
    .catch((error) => {
      utils.writeJson(res, { error: error.message }, error.code);
    });
};

module.exports.deleteBeacon = function deleteBeacon(req, res) {
  const beaconId = req.swagger.params.beaconId.value;
  Auth.auth(req.swagger.params.api_key.value)
    .then((response) => {
      Auth.checkUserType(response.user_id, `AND "user_type" = 'admin'`)
        .then(() => {
          if (Number.isInteger(beaconId)) {
            Beacon.deleteBeacon(beaconId)
              .then((deleteResponse) => {
                utils.writeJson(res, deleteResponse, 201);
              })
              .catch((error) => {
                returnError(error, res);
              });
          } else {
            utils.writeJson(res, { error: 'Invalid ID supplied' }, 400);
          }
        })
        .catch((error) => {
          utils.writeJson(res, { error: error.message }, 401);
        });
    })
    .catch((error) => {
      utils.writeJson(res, { error: error.message }, error.code);
    });
};
