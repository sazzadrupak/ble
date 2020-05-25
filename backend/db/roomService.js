/* eslint linebreak-style: ["error", "windows"] */
/* eslint func-names: ["error", "never"] */
const { pool } = require('./init');

/*
 * Add an room
 * @param {Object} room new room item object
 * @param {Number} userId created by
 * @return {Object}
 */
const addRoom = function (room, userId) {
  return new Promise((resolve, reject) => {
    const { name } = room;
    pool.query('INSERT INTO room (name, created_by) VALUES ($1, $2) RETURNING id', [name, userId])
      .then((data) => {
        if (data.rowCount > 0) {
          resolve({ message: `Room added with ID: ${data.rows[0].id}` });
        } else {
          const error = new Error('Can not insert room');
          error.code = 404;
          throw error;
        }
      })
      .catch((error) => {
        reject(error);
      });
  });
};

/*
 * get all Rooms
 * @return {Object}
 */
const getAllRooms = function () {
  return new Promise((resolve, reject) => {
    pool.query('SELECT id, name FROM room')
      .then((data) => {
        resolve(data.rows);
      })
      .catch((error) => {
        reject(error);
      });
  });
};

/*
 * update a Room
 * @param {Object} room room item object
 * @param {Number} roomId room id
 * @param {Number} userId updated by
 * @return {Object}
 */
const updateRoom = function (room, roomId, userId) {
  const { name } = room;
  return new Promise((resolve, reject) => {
    pool.query('UPDATE room set name = $1, updated_by = $2 WHERE id = $3 RETURNING id', [name, userId, roomId])
      .then((data) => {
        if (data.rowCount === 0) {
          const error = new Error(`Room with ID: ${roomId} not found`);
          error.code = 404;
          throw error;
        }
        resolve(
          {
            message: `Room ID: ${data.rows[0].id} updated successfully`,
          },
        );
      })
      .catch((error) => {
        reject(error);
      });
  });
};

/*
 * get a Room by id
 * @param {Number} roomId room id
 * @return {Object}
 */
const getRoomById = function (roomId) {
  return new Promise((resolve, reject) => {
    pool.query('SELECT id, name FROM room WHERE id = $1', [roomId])
      .then((data) => {
        if (data.rowCount === 0) {
          const error = new Error(`Room with ID: ${roomId} not found`);
          error.code = 404;
          throw error;
        }
        resolve(data.rows[0]);
      })
      .catch((error) => {
        reject(error);
      });
  });
};

/*
 * Delete a room
 * @param {Number} roomId room id
 * @return {Object}
 */
const deleteRoom = function (roomId) {
  return new Promise((resolve, reject) => {
    pool.query('SELECT * FROM room WHERE id = $1', [roomId])
      .then((data) => {
        if (data.rowCount === 0) {
          const error = new Error(`Room with ID: ${roomId} not found`);
          error.code = 404;
          throw error;
        }
        pool.query('DELETE FROM room WHERE id = $1 RETURNING id', [roomId])
          .then((deleteData) => {
            if (deleteData.rowCount === 0) {
              const error = new Error(`Delete room ID: ${roomId} failed`);
              error.code = 404;
              throw error;
            }
            resolve({ message: `Room ID: ${roomId} deleted successfully` });
          })
          .catch((error) => {
            reject(error);
          });
      })
      .catch((error) => {
        reject(error);
      });
  });
};

module.exports = {
  addRoom,
  getAllRooms,
  updateRoom,
  getRoomById,
  deleteRoom,
};
