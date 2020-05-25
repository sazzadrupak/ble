/* eslint-env jest */
/* global before, after */
const chai = require('chai');
const supertest = require('supertest');
const Promise = require('bluebird');
const _ = require('lodash');

const { expect } = chai;
const server = supertest.agent(`http://${process.env.TEST_HOST}:8080/v1`);
const { pool } = require('../../../db/init');
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
let roomId2;
let beaconId;
let beaconId2;
let courseId;
let currentDate;
let currentTime;
let currentDateTime;
let endTime;
let studentIdOne;
let studentIdTwo;
let eventId;
let eventId2;
const room = [
  { name: 'TC-110' },
  { name: 'TC-111' },
];
const beacon = [
  { macAddress: '7C:D1:C3:19:BC:EA' },
  { macAddress: '7C:D1:C3:19:BC:EB' },
];

let course1;
describe('Check /event/attendanceResult GET', () => {
  before(async () => {
    adminToken = await testAdminUserSignUp();
    userId = await getUserId(adminToken);

    roomId = parseInt(await addRoom(adminToken, room[0]), 10);
    roomId2 = parseInt(await addRoom(adminToken, room[1]), 10);
    beaconId = parseInt(await addBeacon(adminToken, beacon[0]), 10);
    beaconId2 = parseInt(await addBeacon(adminToken, beacon[1]), 10);

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

    const body1 = [{ beaconId: beaconId2 }];
    await addAssociation(adminToken, roomId2, body1);

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

    await addEvent(teacherToken2, {
      courseId,
      eventPersonal: teacherId2,
      eventName: 'DSA exercise',
      eventType: 'exercise',
      roomId: roomId2,
      startDate: currentDate,
      endDate: currentDate,
      startTime: currentTime,
      endTime,
      recurrent: false,
      everyAfter: 5,
      everyAfterType: 'day',
    });

    let events2 = await getEvents(teacherToken2);
    events2 = events2.filter((event) => event.eventPersonal === teacherId2);
    eventId2 = events2[0].id;

    await server
      .put(`/event/eventStatus/${eventId2}`)
      .set('api_key', teacherToken2)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache');

    studentIdOne = await pool.query('SELECT id from users where user_type = $1 and id < 2500', ['student']);
    studentIdTwo = await pool.query('SELECT id from users where user_type = $1 and id >= 2500', ['student']);

    await Promise.all(studentIdOne.rows.map(async (studentId) => {
      await server
        .post('/attendance/takeAttendance')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          eventId,
          studentId: studentId.id,
        });
    }));

    await Promise.all(studentIdTwo.rows.map(async (studentId) => {
      await server
        .post('/attendance/takeAttendance')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          eventId: eventId2,
          studentId: studentId.id,
        });
    }));
  });

  after(async () => {
    await pool.query('TRUNCATE beacon_room CASCADE');
    await pool.query('TRUNCATE event CASCADE');
    await pool.query('DELETE FROM room where created_by = $1', [userId]);
    await pool.query('DELETE FROM beacon where created_by = $1', [userId]);
    await pool.query('DELETE FROM course where created_by = $1', [userId]);
    await Promise.all([userId, teacherId, teacherId2].map((id) => pool.query('DELETE FROM users where id = $1', [id])));
  });

  it('Event1 attendance', async () => {
    const res = await server
      .get(`/event/attendanceResult?eventId=${eventId}`)
      .set('api_key', teacherToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache');
    expect(res.statusCode).to.equal(200);
    expect(res.body).to.be.an('array');
    expect(res.body[0]).to.be.an('object');
    expect(res.body[0]).to.have.keys(['student_id', 'student_name', 'event_id', 'event_name', 'attendance_time']);

    let expectResult = [];
    studentIdOne.rows.map(async (studentId) => {
      expectResult.push({
        event_id: eventId,
        event_name: 'DSA lecture',
        student_id: studentId.id,
      });
    });
    expectResult = _.orderBy(expectResult, ['student_id'], ['asc']);

    const actualResult = res.body;
    const copy = _.map(actualResult, (o) => _.pick(o, ['event_id', 'event_name', 'student_id']));
    _.orderBy(copy, ['student_id'], ['asc']);
    expect(copy).to.deep.equal(expectResult);
  });

  it('Event2 attendance', async () => {
    const res = await server
      .get(`/event/attendanceResult?eventId=${eventId2}`)
      .set('api_key', teacherToken2)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache');
    expect(res.statusCode).to.equal(200);
    expect(res.body).to.be.an('array');
    expect(res.body[0]).to.be.an('object');
    expect(res.body[0]).to.have.keys(['student_id', 'student_name', 'event_id', 'event_name', 'attendance_time']);

    let expectResult = [];
    studentIdTwo.rows.map(async (studentId) => {
      expectResult.push({
        event_id: eventId2,
        event_name: 'DSA exercise',
        student_id: studentId.id,
      });
    });
    expectResult = _.orderBy(expectResult, ['student_id'], ['asc']);

    const actualResult = res.body;
    const copy = _.map(actualResult, (o) => _.pick(o, ['event_id', 'event_name', 'student_id']));
    _.orderBy(copy, ['student_id'], ['asc']);
    expect(copy).to.deep.equal(expectResult);
  });

  it('both event attendance', async () => {
    const res = await server
      .get('/event/attendanceResult')
      .set('api_key', teacherToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache');
    expect(res.statusCode).to.equal(200);
    expect(res.body).to.be.an('array');
    expect(res.body[0]).to.be.an('object');
    expect(res.body[0]).to.have.keys(['student_id', 'student_name', 'event_id', 'event_name', 'attendance_time']);

    const studentList1 = [];
    studentIdOne.rows.map(async (studentId) => {
      studentList1.push({
        event_id: eventId2,
        event_name: 'DSA lecture',
        student_id: studentId.id,
      });
    });

    const studentList2 = [];
    studentIdTwo.rows.map(async (studentId) => {
      studentList2.push({
        event_id: eventId2,
        event_name: 'DSA exercise',
        student_id: studentId.id,
      });
    });

    Array.prototype.push.apply(studentList1, studentList2);
    expect(res.body.length).to.equal(studentList1.length);
  });
});
