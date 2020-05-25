/* eslint linebreak-style: ["error", "windows"] */
/* eslint quotes: ["error", "single", { "allowTemplateLiterals": true }] */

const _ = require('lodash');
const utils = require('../utils/writer.js');
const Association = require('../db/associationService');
const Auth = require('../middleware/authToken');
const { returnError } = require('../utils/error_code');

module.exports.addRoomBeaconAssociation = function addRoomBeaconAssociation(req, res) {
  const roomId = req.swagger.params.roomId.value;
  let beaconIds = req.swagger.params.body.value;
  Auth.auth(req.swagger.params.api_key.value)
    .then((response) => {
      Auth.checkUserType(response.user_id, `AND "user_type" = 'admin'`)
        .then(() => {
          beaconIds = _.uniqBy(beaconIds, 'beaconId');
          Association.addRoomBeaconAssociation(beaconIds, roomId)
            .then((addResponse) => {
              utils.writeJson(res, addResponse, 201);
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

module.exports.addAssociation = function addAssociation(req, res) {
  const { beaconId, roomId } = req.swagger.params.body.value;
  Auth.auth(req.swagger.params.api_key.value)
    .then((response) => {
      Auth.checkUserType(response.user_id, `AND "user_type" = 'admin'`)
        .then(() => {
          Association.addAssociation(beaconId, roomId)
            .then((addResponse) => {
              utils.writeJson(res, addResponse, 201);
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

/* module.exports.addAssociation = function addAssociation(req, res, next) {
  const beaconId = req.swagger.params['beaconId'].value;
  const roomId = req.swagger.params['roomId'].value;

  Association.addAssociation(beaconId, roomId)
      .then( function(response) {
        utils.writeJson(res, response, 201);
      })
      .catch( function(error) {
        utils.writeJson(res, {error: error.detail}, 404);
      });
}; */

module.exports.deleteAssociation = function deleteAssociation(req, res) {
  const { beaconId, roomId } = req.swagger.params.body.value;
  Auth.auth(req.swagger.params.api_key.value)
    .then((response) => {
      Auth.checkUserType(response.user_id, `AND "user_type" = 'admin'`)
        .then(() => {
          Association.getAssociation(beaconId, roomId)
            .then(() => {
              Association.deleteAssociation(beaconId, roomId)
                .then((deleteResponse) => {
                  utils.writeJson(res, deleteResponse, 201);
                })
                .catch((error) => {
                  returnError(error, res);
                });
            })
            .catch((error) => {
              utils.writeJson(res, { error: error.message }, 404);
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

module.exports.getAssociation = function getAssociation(req, res) {
  const beaconId = req.swagger.params.beaconId.value;
  const roomId = req.swagger.params.roomId.value;

  Association.getAssociation(beaconId, roomId)
    .then((response) => {
      utils.writeJson(res, response, 201);
    })
    .catch((error) => {
      returnError(error, res);
    });
};

module.exports.getBeaconInRoom = function getBeaconInRoom(req, res) {
  const roomId = req.swagger.params.roomId.value;
  Auth.auth(req.swagger.params.api_key.value)
    .then((response) => {
      Auth.checkUserType(response.user_id, `AND "user_type" > 'student'`)
        .then(() => {
          Association.getBeaconInRoom(roomId)
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

module.exports.getAllAssociations = function getAllAssociations(req, res) {
  Auth.auth(req.swagger.params.api_key.value)
    .then((response) => {
      Auth.checkUserType(response.user_id, `AND "user_type" > 'student'`)
        .then(() => {
          Association.getAllAssociations()
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
