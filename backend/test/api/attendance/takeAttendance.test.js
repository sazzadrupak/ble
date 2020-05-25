/* eslint-env jest */
/* global before, after */
const chai = require('chai');
const supertest = require('supertest');
const Promise = require('bluebird');

const { expect } = chai;
const server = supertest.agent(`http://${process.env.TEST_HOST}:8080/v1`);
const { pool } = require('../../../db/init');
const { generateRandom } = require('../../../utils/random_number');
const {
  testAdminUserSignUp,
  testTeacherUserSignUp,
  getUserId,
//  testStudentUserSignUp,
} = require('../../utils/getToken');

const {
  addRoom,
  addBeacon,
  addAssociation,
  addCourse,
  addEvent,
  getEvents,
} = require('../../utils/db_utils');

let adminToken;
let teacherToken;
let teacherToken2;
let userId;
let teacherId;
let teacherId2;
let roomId;
let beaconId;
let courseId;
let currentDate;
let currentTime;
let currentDateTime;
let endTime;
let studentIds;
let eventId;
const room = [
  { name: 'TC-110' },
  { name: 'TC-111' },
];
const beacon = [
  { macAddress: '7C:D1:C3:19:BC:EA' },
  { macAddress: '7C:D1:C3:19:BC:EB' },
];

let course1;
describe('Check /attendance/takeAttendance POST', () => {
  before(async () => {
    adminToken = await testAdminUserSignUp();
    userId = await getUserId(adminToken);

    roomId = parseInt(await addRoom(adminToken, room[0]), 10);
    beaconId = parseInt(await addBeacon(adminToken, beacon[0]), 10);

    teacherToken = await testTeacherUserSignUp({
      password: 'password',
      email: 'test.teacher1@email.com',
      firstName: 'First name',
      lastName: 'Last name',
      userType: 'teacher',
    });
    teacherId = parseInt(await getUserId(teacherToken), 10);

    teacherToken2 = await testTeacherUserSignUp({
      password: 'password',
      email: 'test.teacher2@email.com',
      firstName: 'First name',
      lastName: 'Last name',
      userType: 'teacher',
    });
    teacherId2 = parseInt(await getUserId(teacherToken2), 10);

    course1 = {
      courseCode: 'TIE-20106',
      courseName: 'Data Structures and Algorithms',
      coursePersonal: [teacherId, teacherId2],
    };
    courseId = parseInt(await addCourse(adminToken, course1), 10);

    const body = [{ beaconId }];
    await addAssociation(adminToken, roomId, body);

    currentDateTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Helsinki' }));
    currentDate = `${currentDateTime.getFullYear()}-${('0' + (currentDateTime.getMonth() + 1)).slice(-2)}-${('0' + currentDateTime.getDate()).slice(-2)}`; // eslint-disable-line prefer-template
    currentTime = `${('0' + currentDateTime.getHours()).slice(-2)}:${('0' + currentDateTime.getMinutes()).slice(-2)}:${('0' + currentDateTime.getSeconds()).slice(-2)}`; // eslint-disable-line prefer-template
    currentDateTime.setMinutes(currentDateTime.getMinutes() + 10);
    endTime = `${('0' + currentDateTime.getHours()).slice(-2)}:${('0' + currentDateTime.getMinutes()).slice(-2)}:${('0' + currentDateTime.getSeconds()).slice(-2)}`; // eslint-disable-line prefer-template

    await addEvent(teacherToken, {
      courseId,
      eventPersonal: teacherId,
      eventName: 'DSA lecture',
      eventType: 'class',
      roomId,
      startDate: currentDate,
      endDate: currentDate,
      startTime: currentTime,
      endTime,
      recurrent: false,
      everyAfter: 5,
      everyAfterType: 'day',
    });

    const events = await getEvents(teacherToken);
    eventId = events[0].id;
    await server
      .put(`/event/eventStatus/${eventId}`)
      .set('api_key', teacherToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache');

    studentIds = await pool.query('SELECT id from users where user_type = $1', ['student']);
    /* await Promise.all([...Array(500).keys()].map(async (num) => {
      const studentToken = await testStudentUserSignUp({
        password: 'password',
        email: `test${num}@email.com`,
        firstName: 'First name',
        lastName: 'Last name',
        userType: 'student',
      });
      const studentId = parseInt(await getUserId(studentToken), 10);
      return studentId;
    })); */
  });

  after(async () => {
    await pool.query('TRUNCATE beacon_room CASCADE');
    await pool.query('TRUNCATE event CASCADE');
    await pool.query('DELETE FROM room where created_by = $1', [userId]);
    await pool.query('DELETE FROM beacon where created_by = $1', [userId]);
    await pool.query('DELETE FROM course where created_by = $1', [userId]);
    await Promise.all([userId, teacherId, teacherId2].map((id) => pool.query('DELETE FROM users where id = $1', [id])));
  });

  it('Attendance added successfully', async () => {
    await Promise.all(studentIds.rows.map(async (studentId) => {
      const res = await server
        .post('/attendance/takeAttendance')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          eventId,
          studentId: studentId.id,
        });
      expect(res.statusCode).to.equal(201);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.keys(['message']);
      expect(res.body.message).to.equal('Attendance added successfully');
    }));
  });

  it('Attendance already taken.', async () => {
    await Promise.all(studentIds.rows.map(async (studentId) => {
      const res = await server
        .post('/attendance/takeAttendance')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          eventId,
          studentId: studentId.id,
        });
      expect(res.statusCode).to.equal(201);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.keys(['message']);
      expect(res.body.message).to.equal('Attendance already taken.');
    }));
  });

  it('Wrong event id: failed', async () => {
    await Promise.all(studentIds.rows.map(async (studentId) => {
      const res = await server
        .post('/attendance/takeAttendance')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          eventId: generateRandom([eventId]),
          studentId: studentId.id,
        });
      expect(res.statusCode).to.equal(404);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.keys(['error']);
      expect(res.body.error).to.equal('Event session is not active yet or event is not found!');
    }));
  });

  it('Wrong student id: failed', async () => {
    const res = await server
      .post('/attendance/takeAttendance')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        eventId,
        studentId: 0,
      });
    expect(res.statusCode).to.equal(404);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['error']);
    expect(res.body.error).to.equal('Key (student_id)=(0) is not present in table "users".');
  });
});
