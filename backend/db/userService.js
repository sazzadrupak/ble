/* eslint linebreak-style: ["error", "windows"] */
/* eslint func-names: ["error", "never"] */

const bcrypt = require('bcrypt');
const { pool } = require('./init');

/*
 * Get an user by email
 * @param {string} email email of user
 * @return {Object}
 */
const auth = function (email) {
  return new Promise((resolve, reject) => {
    pool.query('SELECT * FROM users WHERE email = $1',
      [email])
      .then((data) => {
        resolve(data.rows[0]);
      })
      .catch((error) => {
        reject(error);
      });
  });
};

/*
 * Sign up an User
 * @param {Object} newUser required info of a new user
 * @return {Object}
 */
const signUp = async function (newUser) {
  return new Promise((resolve, reject) => {
    const {
      firstName, lastName, email, password, userType,
    } = newUser;
    bcrypt.hash(password, 10, (err, hash) => {
      if (err) throw err;
      pool.query(`INSERT INTO users
      (first_name, last_name, email, password, user_type)
      VALUES ($1, $2, $3, $4, $5)`, [firstName, lastName, email, hash, userType])
        .then((data) => {
          if (data.rowCount > 0) {
            resolve({
              message: 'User signup was successful',
            });
          } else {
            throw new Error('user sign up failed');
          }
        })
        .catch((error) => {
          reject(error);
        });
    });
  });
};

/*
 * Get all users
 * @return {Object}
 */
const allUsers = async function () {
  return new Promise((resolve, reject) => {
    pool.query('SELECT id, user_id, first_name, last_name, email, user_type FROM users')
      .then((data) => {
        resolve(data.rows);
      })
      .catch((error) => {
        reject(error);
      });
  });
};

module.exports = {
  auth,
  signUp,
  allUsers,
};
