/* eslint linebreak-style: ["error", "windows"] */
/* eslint quotes: ["error", "single", { "allowTemplateLiterals": true }] */

const utils = require('../utils/writer.js');
const Room = require('../db/roomService');
const Auth = require('../middleware/authToken');
const { returnError } = require('../utils/error_code');

module.exports.addRoom = function addRoom(req, res) {
  const newRoom = req.swagger.params.body.value;
  Auth.auth(req.swagger.params.api_key.value)
    .then((response) => {
      Auth.checkUserType(response.user_id, `AND "user_type" = 'admin'`)
        .then(() => {
          Room.addRoom(newRoom, response.id)
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

module.exports.getAllRooms = function getAllRooms(req, res) {
  Auth.auth(req.swagger.params.api_key.value)
    .then((response) => {
      Auth.checkUserType(response.user_id, `AND "user_type" > 'student'`)
        .then(() => {
          Room.getAllRooms()
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

module.exports.updateRoom = function updateRoom(req, res) {
  const room = req.swagger.params.body.value;
  const roomId = req.swagger.params.roomId.value;
  Auth.auth(req.swagger.params.api_key.value)
    .then((response) => {
      Auth.checkUserType(response.user_id, `AND "user_type" = 'admin'`)
        .then(() => {
          if (Number.isInteger(roomId)) {
            Room.updateRoom(room, roomId, response.id)
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

module.exports.getRoomById = function getRoomById(req, res) {
  const roomId = req.swagger.params.roomId.value;
  Auth.auth(req.swagger.params.api_key.value)
    .then((response) => {
      Auth.checkUserType(response.user_id, `AND "user_type" > 'student'`)
        .then(() => {
          if (Number.isInteger(roomId)) {
            Room.getRoomById(roomId)
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

module.exports.deleteRoom = function deleteRoom(req, res) {
  const roomId = req.swagger.params.roomId.value;
  Auth.auth(req.swagger.params.api_key.value)
    .then((response) => {
      Auth.checkUserType(response.user_id, `AND "user_type" = 'admin'`)
        .then(() => {
          if (Number.isInteger(roomId)) {
            Room.deleteRoom(roomId)
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
