/* eslint linebreak-style: ["error", "windows"] */
/* eslint quotes: ["error", "single", { "allowTemplateLiterals": true }] */

require('dotenv').config();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const _ = require('lodash');
const utils = require('../utils/writer.js');
const User = require('../db/userService');

module.exports.login = function login(req, res) {
  const { email, password } = req.swagger.params.body.value;
  User.auth(email)
    .then((response) => {
      if (response) {
        bcrypt.compare(password, response.password, (err, isMatch) => {
          if (err) throw err;
          if (isMatch) {
            const token = jwt.sign(
              {
                id: response.id,
                user_id: response.user_id,
                email: response.email,
                userType: response.user_type,
              },
              process.env.jwtAuthToken,
            );
            const user = _.pick(response, ['id', 'user_id', 'user_type', 'first_name', 'last_name']);
            user.token = token;
            utils.writeJson(res, user, 200);
          } else {
            utils.writeJson(res, { error: 'You have entered an invalid username or password' }, 400);
          }
        });
      } else {
        utils.writeJson(res, { error: 'You have entered an invalid username or password' }, 400);
      }
    })
    .catch((error) => {
      utils.writeJson(res, { error: error.message }, 400);
    });
};

module.exports.signUp = function signUp(req, res) {
  const newUser = req.swagger.params.body.value;
  User.signUp(newUser)
    .then((response) => {
      utils.writeJson(res, response, 201);
    })
    .catch((error) => {
      utils.writeJson(res, { error: error.message }, 400);
    });
};

module.exports.allUsers = function allUsers(req, res) {
  User.allUsers()
    .then((response) => {
      utils.writeJson(res, response, 200);
    })
    .catch((error) => {
      utils.writeJson(res, { error: error.message }, 404);
    });
};
