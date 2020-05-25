/* eslint linebreak-style: ["error", "windows"] */
/* eslint quotes: ["error", "single", { "allowTemplateLiterals": true }] */

const utils = require('../utils/writer.js');
const Attendance = require('../db/attendanceService');
const { returnError } = require('../utils/error_code');

async function searchBeacon(req, res) {
  const beacons = req.swagger.params.body.value;
  Attendance.searchBeacon(beacons)
    .then((response) => {
      utils.writeJson(res, response, 201);
    })
    .catch((error) => {
      returnError(error, res);
    });
}

async function takeAttendance(req, res) {
  const attendance = req.swagger.params.body.value;
  Attendance.takeAttendance(attendance)
    .then((takeResponse) => {
      utils.writeJson(res, takeResponse, 201);
    })
    .catch((error) => {
      if (error.code === '23505') {
        utils.writeJson(res, { message: 'Attendance already taken.' }, 201);
      }
      returnError(error, res);
    });
}

module.exports = {
  searchBeacon,
  takeAttendance,
};
