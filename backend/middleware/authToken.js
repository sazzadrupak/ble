/* eslint linebreak-style: ["error", "windows"] */
/* eslint func-names: ["error", "never"] */

require('dotenv').config();
const jwt = require('jsonwebtoken');
const { pool } = require('../db/init');

/*
 * Check the auth token
 * @param {String} token token provided from client via header
 * @return {Object}
 */
const auth = function (token) {
  return new Promise((resolve, reject) => {
    if (!token) {
      const error = {
        message: 'Access denied. No token provided.',
        code: 401,
      };
      reject(error);
    }
    try {
      const decrypt = jwt.verify(token, process.env.jwtAuthToken);
      resolve(decrypt);
    } catch (ex) {
      const error = {
        message: 'Invalid token',
        code: 400,
      };
      reject(error);
    }
  });
};


/*
 * Check the user type
 * @param {String} userId User ID of the user
 * @param {boolean} userType true for teacher, false for student
 * @return {Object}
 */
const checkUserType = function (userId, userType) {
  return new Promise((resolve, reject) => {
    pool.query(`SELECT * FROM users WHERE user_id = $1 ${userType}`,
      [userId])
      .then((data) => {
        if (data.rowCount && data.rowCount > 0) {
          resolve(data.rows[0]);
        } else {
          throw new Error('User does not have permission.');
        }
      })
      .catch((error) => {
        reject(error);
      });
  });
};

module.exports = {
  auth,
  checkUserType,
};
