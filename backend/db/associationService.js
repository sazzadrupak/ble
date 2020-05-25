/* eslint linebreak-style: ["error", "windows"] */
const { pool } = require('./init');

/**
 * Add an association between room and beacon
 * @param {Number} beaconId ID of a beacon
 * @param {Number} roomId ID of a room
 * @return {Object}
 */
const addAssociation = (beaconId, roomId) => new Promise((resolve, reject) => {
  pool.query('INSERT INTO beacon_room (beacon_id, room_id) VALUES ($1, $2) RETURNING *', [beaconId, roomId])
    .then((data) => {
      if (data.rowCount > 0) {
        resolve({ message: 'Association created' });
      } else {
        const error = new Error('Association creation failed');
        error.code = 404;
        throw error;
      }
    })
    .catch((error) => {
      reject(error);
    });
});

/**
 * delete an association
 * @param {Number} beaconId ID of a beacon
 * @param {Number} roomId ID of a room
 * @return {Object}
 */
const deleteAssociation = (beaconId, roomId) => new Promise((resolve, reject) => {
  pool.query('DELETE FROM beacon_room WHERE beacon_id = $1 AND room_id = $2 RETURNING *', [beaconId, roomId])
    .then((data) => {
      if (data.rowCount === 0) {
        const error = new Error('Delete association failed');
        error.code = 404;
        throw error;
      }
      resolve({ message: 'Association removed' });
    })
    .catch((error) => {
      reject(error);
    });
});

/**
 * get an association
 * @param {Number} beaconId ID of a beacon
 * @param {Number} roomId ID of a room
 * @return {Object}
 */
const getAssociation = (beaconId, roomId) => new Promise((resolve, reject) => {
  pool.query(
    `SELECT beacon."mac_address", beacon."id" as beacon_id,
    room."name" as room_name, room."id" as room_id
    FROM beacon_room
    LEFT JOIN beacon on beacon_room."beacon_id" = beacon."id"
    LEFT JOIN room on beacon_room."room_id" = room."id"
    WHERE beacon_room."beacon_id" = $1 AND beacon_room."room_id" = $2`, [beaconId, roomId],
  )
    .then((data) => {
      if (data.rowCount === 0) {
        const error = new Error('No association found');
        error.code = 404;
        throw error;
      }
      resolve(data.rows[0]);
    })
    .catch((error) => {
      reject(error);
    });
});

/**
 * Add an association between room id and beacon ids
 * @param {Array} beaconIds ID of a beacon
 * @param {Number} roomId ID of a room
 * @return {Object}
 */
const addRoomBeaconAssociation = (beaconIds, roomId) => {
  const beaconIdsResult = beaconIds.map((beacon) => `(${roomId}, ${beacon.beaconId})`);
  const result = beaconIdsResult.join(', ');
  return new Promise((resolve, reject) => {
    pool.query(`INSERT INTO beacon_room (room_id, beacon_id) VALUES ${result}`)
      .then((data) => {
        if (data.rowCount === 0) {
          const error = new Error('No association created');
          error.code = 404;
          throw error;
        }
        resolve({ message: `${data.rowCount} associations has been added` });
      })
      .catch((error) => {
        reject(error);
      });
  });
};

/**
 * Get all beacons in a room
 * @param {Number} roomId ID of a room
 * @return {Object}
 */
const getBeaconInRoom = (roomId) => new Promise((resolve, reject) => {
  pool.query(
    `SELECT beacon."mac_address", beacon."id"
    FROM beacon
    LEFT JOIN beacon_room on beacon."id" = beacon_room."beacon_id"
    WHERE beacon_room."room_id" = $1`, [roomId],
  )
    .then((data) => {
      if (data.rowCount === 0) {
        const error = new Error('No beacons found for given room id.');
        error.code = 404;
        throw error;
      }
      resolve(data.rows);
    })
    .catch((error) => {
      reject(error);
    });
});

const getAllAssociations = () => new Promise((resolve, reject) => {
  pool.query(
    `SELECT beacon."mac_address", beacon."id" as beacon_id,
    room."name" as room_name, room."id" as room_id
    FROM beacon_room
    LEFT JOIN beacon on beacon_room."beacon_id" = beacon."id"
    LEFT JOIN room on beacon_room."room_id" = room."id"`,
  )
    .then((data) => {
      if (data.rowCount === 0) {
        const error = new Error('No associations found.');
        error.code = 404;
        throw error;
      }
      resolve(data.rows);
    })
    .catch((error) => {
      reject(error);
    });
});

module.exports = {
  addAssociation,
  deleteAssociation,
  getAssociation,
  addRoomBeaconAssociation,
  getBeaconInRoom,
  getAllAssociations,
};
