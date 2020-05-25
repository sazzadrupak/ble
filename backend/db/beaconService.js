/* eslint linebreak-style: ["error", "windows"] */
const { pool } = require('./init');

/**
 * Add an Beacon
 * @param {Object} beacon new beacon item object
 * @param {Number} userId
 * @return {Object}
 */
const addBeacon = (beacon, userId) => {
  const { macAddress } = beacon;
  return new Promise((resolve, reject) => {
    pool.query('INSERT INTO beacon (mac_address, created_by) VALUES ($1, $2) RETURNING id',
      [macAddress, userId])
      .then((data) => {
        resolve({ message: `Beacon added with ID: ${data.rows[0].id}` });
      })
      .catch((error) => {
        reject(error);
      });
  });
};

/**
 * get all Beacons
 * @return {Object}
 */
const getBeacons = () => new Promise((resolve, reject) => {
  pool.query('SELECT id, mac_address, active_status FROM beacon')
    .then((data) => {
      resolve(data.rows);
    })
    .catch((error) => {
      reject(error);
    });
});

/**
 * update a Beacon
 * @param {Object} beacon beacon item object
 * @param {Number} beaconId beacon id
 * @param {Number} userId
 * @return {Object}
 */
const updateBeacon = (beacon, beaconId, userId) => {
  const { macAddress, activeStatus } = beacon;
  return new Promise((resolve, reject) => {
    pool.query(`UPDATE beacon set mac_address = $1, active_status = $2, updated_by = $3
    WHERE id = $4 RETURNING id`,
    [macAddress, activeStatus, userId, beaconId])
      .then((data) => {
        if (data.rowCount === 0) {
          const error = new Error(`Beacon ID: ${beaconId} not found`);
          error.code = 404;
          throw error;
        }
        resolve({ message: `Beacon ID: ${data.rows[0].id} updated successfully` });
      })
      .catch((error) => {
        reject(error);
      });
  });
};

/**
 * get a Beacon by id
 * @param {Number} beaconId beacon id
 * @return {Object}
 */
const getBeaconById = (beaconId) => new Promise((resolve, reject) => {
  pool.query('SELECT id, mac_address, active_status FROM beacon WHERE id = $1', [beaconId])
    .then((data) => {
      if (data.rowCount === 0) {
        const error = new Error(`Beacon ID: ${beaconId} not found`);
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
 * Delete a beacon
 * @param {Number} beaconId beacon id
 * @return {Object}
 */
const deleteBeacon = (beaconId) => new Promise((resolve, reject) => {
  pool.query('SELECT * FROM beacon WHERE id = $1', [beaconId])
    .then((data) => {
      if (data.rowCount === 0) {
        const error = new Error(`Beacon ID: ${beaconId} not found`);
        error.code = 404;
        throw error;
      }
      pool.query('DELETE FROM beacon WHERE id = $1 RETURNING id',
        [beaconId])
        .then((deleteData) => {
          if (deleteData.rowCount === 0) {
            const error = new Error(`Delete beacon ID: ${beaconId} failed`);
            error.code = 404;
            throw error;
          }
          resolve({ message: `Beacon ID: ${beaconId} deleted successfully` });
        })
        .catch((error) => {
          reject(error);
        });
    })
    .catch((error) => {
      reject(error);
    });
});

module.exports = {
  addBeacon,
  getBeacons,
  updateBeacon,
  getBeaconById,
  deleteBeacon,
};
