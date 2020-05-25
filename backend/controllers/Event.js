/* eslint linebreak-style: ["error", "windows"] */
/* eslint quotes: ["error", "single", { "allowTemplateLiterals": true }] */

const utils = require('../utils/writer.js');
const Event = require('../db/eventService');
const Auth = require('../middleware/authToken');
const { returnError } = require('../utils/error_code');

module.exports.addEvent = function addEvent(req, res) {
  const newEvent = req.swagger.params.body.value;
  Auth.auth(req.swagger.params.api_key.value)
    .then((response) => {
      Auth.checkUserType(response.user_id, `AND "user_type" > 'student'`)
        .then(() => {
          Event.addEvent(newEvent, response.id)
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

module.exports.changeEventStatus = function changeEventStatus(req, res) {
  const eventId = req.swagger.params.eventId.value;
  Auth.auth(req.swagger.params.api_key.value)
    .then((response) => {
      Auth.checkUserType(response.user_id, `AND "user_type" > 'student'`)
        .then(() => {
          Event.changeEventStatus(eventId, response.id)
            .then((changeResponse) => {
              utils.writeJson(res, changeResponse, 201);
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

module.exports.updateEvent = function updateEvent(req, res) {
  const editEvent = req.swagger.params.body.value;
  const eventId = req.swagger.params.eventId.value;
  Auth.auth(req.swagger.params.api_key.value)
    .then((response) => {
      Auth.checkUserType(response.user_id, `AND "user_type" > 'student'`)
        .then(() => {
          Event.updateEvent(editEvent, eventId, response.id)
            .then((updateResponse) => {
              utils.writeJson(res, updateResponse, 201);
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

module.exports.getEventbyId = function getEventbyId(req, res) {
  const eventId = req.swagger.params.eventId.value;
  Auth.auth(req.swagger.params.api_key.value)
    .then((response) => {
      Auth.checkUserType(response.user_id, `AND "user_type" > 'student'`)
        .then(() => {
          Event.getEventbyId(eventId, response.id)
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

module.exports.getAllEventsAssignedToUser = function getAllEventsAssignedToUser(req, res) {
  Auth.auth(req.swagger.params.api_key.value)
    .then((response) => {
      Auth.checkUserType(response.user_id, `AND "user_type" > 'student'`)
        .then(() => {
          Event.getAllEventsAssignedToUser(response.id)
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

module.exports.deleteEvent = function deleteEvent(req, res) {
  const eventId = req.swagger.params.eventId.value;
  Auth.auth(req.swagger.params.api_key.value)
    .then((response) => {
      Auth.checkUserType(response.user_id, `AND "user_type" > 'student'`)
        .then(() => {
          Event.deleteEvent(eventId, response.id)
            .then((updateResponse) => {
              utils.writeJson(res, updateResponse, 201);
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

module.exports.getAllEvents = function getAllEvents(req, res) {
  Auth.auth(req.swagger.params.api_key.value)
    .then((response) => {
      Auth.checkUserType(response.user_id, `AND "user_type" > 'student'`)
        .then(() => {
          Event.getAllEvents()
            .then((allEvents) => {
              utils.writeJson(res, allEvents, 200);
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

module.exports.attendanceResult = function attendanceResult(req, res) {
  const eventId = (req.swagger.params.eventId.value) ? req.swagger.params.eventId.value : '';
  Auth.auth(req.swagger.params.api_key.value)
    .then((response) => {
      Auth.checkUserType(response.user_id, `AND "user_type" > 'student'`)
        .then(() => {
          Event.attendanceResult(eventId)
            .then((allStudents) => {
              utils.writeJson(res, allStudents, 200);
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

module.exports.courseEvents = function courseEvents(req, res) {
  const courseId = req.swagger.params.courseId.value;
  Auth.auth(req.swagger.params.api_key.value)
    .then((response) => {
      Auth.checkUserType(response.user_id, `AND "user_type" > 'student'`)
        .then(() => {
          Event.courseEvents(courseId, response.id)
            .then((allCourses) => {
              utils.writeJson(res, allCourses, 200);
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

module.exports.eventSumByPersonal = function eventSumByPersonal(req, res) {
  Auth.auth(req.swagger.params.api_key.value)
    .then((response) => {
      Auth.checkUserType(response.user_id, `AND "user_type" = 'teacher'`)
        .then(() => {
          Event.eventSumByPersonal(response.id)
            .then((allEvents) => {
              utils.writeJson(res, allEvents, 200);
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
