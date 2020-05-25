
/* eslint linebreak-style: ["error", "windows"] */
const _ = require('lodash');
const { pool } = require('./init');

/**
 * Add an association between room and beacon
 * @param {Array} beacons ID of a beacon
 * @return {Object}
 */
const searchBeacon = (beacons) => new Promise((resolve, reject) => {
  pool.query(
    `SELECT room.id as room_id
    FROM beacon_room
    LEFT JOIN beacon ON beacon_room.beacon_id = beacon.id
    LEFT JOIN room ON beacon_room.room_id = room.id
    WHERE beacon.mac_address = ANY($1)
    GROUP BY room.id`, [beacons],
  )
    .then((data) => {
      if (data.rowCount === 0) {
        const error = new Error('No room found associated with any given beacon.');
        error.code = 404;
        throw error;
      }
      const roomIds = _.map(data.rows, 'room_id');
      const currentdate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Helsinki' }));
      const datetime = `${currentdate.getFullYear()}-${('0' + (currentdate.getMonth() + 1)).slice(-2)}-${('0' + currentdate.getDate()).slice(-2)} ${('0' + currentdate.getHours()).slice(-2)}:${('0' + currentdate.getMinutes()).slice(-2)}:${('0' + currentdate.getSeconds()).slice(-2)}`; // eslint-disable-line prefer-template

      pool.query(
        `SELECT event.id as event_id, course.course_name, room.name as room_name
        FROM event
        LEFT JOIN course ON event.course_id = course.id
        LEFT JOIN room ON event.room_id = room.id
        WHERE event.room_id = ANY($1)
        AND event.accept_attendance = true
        AND event.start_time <= $2
        AND event.end_time >= $2`,
        [roomIds, datetime],
      )
        .then((eventData) => {
          if (eventData.rowCount === 0) {
            const error = new Error(`No event found for given beacons or
            event is not active or
            current time is not in between event start and end time`);
            error.code = 404;
            throw error;
          }
          resolve(eventData.rows);
        })
        .catch((error) => {
          reject(error);
        });
    })
    .catch((error) => {
      reject(error);
    });
});

const takeAttendance = (attendance) => {
  const { eventId, studentId } = attendance;
  return new Promise((resolve, reject) => {
    pool.query(
      `SELECT event.id as event_id
      FROM event
      WHERE event.id = $1
      AND event.accept_attendance = true`, [eventId],
    )
      .then((data) => {
        if (data.rowCount === 0) {
          const error = new Error('Event session is not active yet or event is not found!');
          error.code = 404;
          throw error;
        }
        pool.query(
          `INSERT INTO attendance (event_id, student_id)
          VALUES ($1, $2) RETURNING *`,
          [eventId, studentId],
        )
          .then((addData) => {
            if (addData.rowCount > 0) {
              resolve({ message: 'Attendance added successfully' });
            } else {
              const error = new Error('Attendace taken failed.');
              error.code = 404;
              throw error;
            }
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
  searchBeacon,
  takeAttendance,
};
