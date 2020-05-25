/* eslint linebreak-style: ["error", "windows"] */
/* eslint quotes: ["error", "single", { "allowTemplateLiterals": true }] */

const utils = require('../utils/writer.js');
const Course = require('../db/courseService');
const Auth = require('../middleware/authToken');
const { returnError } = require('../utils/error_code');

module.exports.addCourse = function addCourse(req, res) {
  const newCourse = req.swagger.params.body.value;
  Auth.auth(req.swagger.params.api_key.value)
    .then((response) => {
      Auth.checkUserType(response.user_id, `AND "user_type" > 'student'`)
        .then(() => {
          Course.addCourse(newCourse, response.id)
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

module.exports.getCourseById = function getCourseById(req, res) {
  const courseId = req.swagger.params.courseId.value;
  Auth.auth(req.swagger.params.api_key.value)
    .then((response) => {
      Auth.checkUserType(response.user_id, `AND "user_type" > 'student'`)
        .then(() => {
          Course.getCourseById(courseId)
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

module.exports.getCourses = function getCourses(req, res) {
  Auth.auth(req.swagger.params.api_key.value)
    .then((response) => {
      Auth.checkUserType(response.user_id, `AND "user_type" > 'student'`)
        .then(() => {
          Course.getCourses()
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

module.exports.updateCourse = function updateCourse(req, res) {
  const courseId = req.swagger.params.courseId.value;
  const course = req.swagger.params.body.value;
  Auth.auth(req.swagger.params.api_key.value)
    .then((response) => {
      Auth.checkUserType(response.user_id, `AND "user_type" > 'student'`)
        .then(() => {
          Course.updateCourse(courseId, course, response.id)
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

module.exports.deleteCourse = function deleteCourse(req, res) {
  const courseId = req.swagger.params.courseId.value;
  Auth.auth(req.swagger.params.api_key.value)
    .then((response) => {
      Auth.checkUserType(response.user_id, `AND "user_type" > 'student'`)
        .then(() => {
          Course.deleteCourse(courseId)
            .then((deleteResponse) => {
              utils.writeJson(res, deleteResponse, 201);
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

module.exports.getTeacherWiseCourses = function getTeacherWiseCourses(req, res) {
  Auth.auth(req.swagger.params.api_key.value)
    .then((response) => {
      Auth.checkUserType(response.user_id, `AND "user_type" = 'teacher'`)
        .then(() => {
          Course.getTeacherWiseCourses(response.id)
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
