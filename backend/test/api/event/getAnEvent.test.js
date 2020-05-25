/* eslint-env jest */
/* global before, after */
const chai = require('chai');
const supertest = require('supertest');

const { expect } = chai;
const server = supertest.agent(`http://${process.env.TEST_HOST}:8080/v1`);
const { pool } = require('../../../db/init');
const { generateRandom } = require('../../../utils/random_number');
const {
  testAdminUserSignUp,
  testStudentUserSignUp,
  testTeacherUserSignUp,
  getUserId,
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
let studentToken;
let userId;
let teacherId;
let teacherId2;
let studentId;
let roomId;
let beaconId;
let courseId;
let events;
let currentDate;
let currentTime;
let currentDateTime;
let endDate;
let endTime;
const room = [
  { name: 'TC-110' },
  { name: 'TC-111' },
];
const beacon = [
  { macAddress: '7C:D1:C3:19:BC:EA' },
  { macAddress: '7C:D1:C3:19:BC:EB' },
];

describe('Check /event/eventStatus/{eventId} PUT', () => {
  function timeInfo() {
    currentDateTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Helsinki' }));
    currentDate = `${currentDateTime.getFullYear()}-${('0' + (currentDateTime.getMonth() + 1)).slice(-2)}-${('0' + currentDateTime.getDate()).slice(-2)}`; // eslint-disable-line prefer-template
    currentTime = `${('0' + currentDateTime.getHours()).slice(-2)}:${('0' + currentDateTime.getMinutes()).slice(-2)}:${('0' + currentDateTime.getSeconds()).slice(-2)}`; // eslint-disable-line prefer-template
    endDate = currentDate;
  }

  before(async () => {
    adminToken = await testAdminUserSignUp();
    userId = await getUserId(adminToken);

    roomId = parseInt(await addRoom(adminToken, room[0]), 10);
    beaconId = parseInt(await addBeacon(adminToken, beacon[0]), 10);
    const body = [{ beaconId }];
    await addAssociation(adminToken, roomId, body);

    teacherToken = await testTeacherUserSignUp({
      password: 'password',
      email: 'test.teacher1@email.com',
      firstName: 'First name',
      lastName: 'Last name',
      userType: 'teacher',
    });
    teacherId = parseInt(await getUserId(teacherToken), 10);

    const course = {
      courseCode: 'TIE-20106',
      courseName: 'Data Structures and Algorithms',
      coursePersonal: [teacherId],
    };
    courseId = parseInt(await addCourse(adminToken, course), 10);

    teacherToken2 = await testTeacherUserSignUp({
      password: 'password',
      email: 'test.teacher2@email.com',
      firstName: 'First name',
      lastName: 'Last name',
      userType: 'teacher',
    });
    teacherId2 = parseInt(await getUserId(teacherToken2), 10);

    studentToken = await testStudentUserSignUp({
      password: 'password',
      email: 'test.student@email.com',
      firstName: 'First name',
      lastName: 'Last name',
      userType: 'student',
    });
    studentId = parseInt(await getUserId(studentToken), 10);

    timeInfo();

    currentDateTime.setMinutes(currentDateTime.getMinutes() + 2);
    endTime = `${('0' + currentDateTime.getHours()).slice(-2)}:${('0' + currentDateTime.getMinutes()).slice(-2)}:${('0' + currentDateTime.getSeconds()).slice(-2)}`; // eslint-disable-line prefer-template

    await addEvent(teacherToken, {
      courseId,
      eventPersonal: teacherId,
      eventName: 'DSA lecture',
      eventType: 'class',
      roomId,
      startDate: currentDate,
      endDate,
      startTime: currentTime,
      endTime,
      recurrent: false,
      everyAfter: 1,
      everyAfterType: 'day',
    });
    events = await getEvents(teacherToken);
  });

  after(async () => {
    await pool.query('TRUNCATE beacon_room CASCADE');
    await pool.query('TRUNCATE event CASCADE');
    await pool.query('DELETE FROM room where created_by = $1', [userId]);
    await pool.query('DELETE FROM beacon where created_by = $1', [userId]);
    await pool.query('DELETE FROM course where created_by = $1', [userId]);
    await Promise.all([userId, teacherId, teacherId2, studentId].map((id) => pool.query('DELETE FROM users where id = $1', [id])));
  });

  it('get an event: successfull', async () => {
    const res = await server
      .get(`/event/${events[0].id}`)
      .set('api_key', teacherToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache');
    expect(res.statusCode).to.equal(200);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys([
      'acceptAttendance',
      'courseCode',
      'courseId',
      'courseName',
      'endDateTime',
      'eventName',
      'eventPersonal',
      'eventType',
      'firstName',
      'id',
      'lastName',
      'roomId',
      'roomName',
      'startDateTime',
    ]);
    expect(res.body.acceptAttendance).to.equal(false);
    expect(res.body.courseCode).to.equal('TIE-20106');
    expect(res.body.courseId).to.equal(courseId);
    expect(res.body.courseName).to.equal('Data Structures and Algorithms');
    expect(res.body.endDateTime).to.equal(`${currentDate} ${endTime}`);
    expect(res.body.eventName).to.equal('DSA lecture');
    expect(res.body.eventPersonal).to.equal(teacherId);
    expect(res.body.eventType).to.equal('class');
    expect(res.body.firstName).to.equal('First name');
    expect(res.body.lastName).to.equal('Last name');
    expect(res.body.roomId).to.equal(roomId);
    expect(res.body.roomName).to.equal('TC-110');
    expect(res.body.startDateTime).to.equal(`${currentDate} ${currentTime}`);
  });

  it('get an event as user not in course personal: failed', async () => {
    const res = await server
      .get(`/event/${events[0].id}`)
      .set('api_key', teacherToken2)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache');
    expect(res.statusCode).to.equal(401);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['error']);
    expect(res.body.error).to.equal('User does not have permission to view this event');
  });

  it('get an event as student: failed', async () => {
    const res = await server
      .get(`/event/${events[0].id}`)
      .set('api_key', studentToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache');
    expect(res.statusCode).to.equal(401);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['error']);
    expect(res.body.error).to.equal('User does not have permission.');
  });

  it('get non-exists event: failed', async () => {
    const id = generateRandom([events[0].id]);
    const res = await server
      .get(`/event/${id}`)
      .set('api_key', teacherToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache');
    expect(res.statusCode).to.equal(404);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['error']);
    expect(res.body.error).to.equal(`Event id ${id} not found.`);
  });

  it('get event by invalid id: failed', async () => {
    const res = await server
      .get('/event/abc')
      .set('api_key', teacherToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache');
    expect(res.statusCode).to.equal(400);
    expect(res.body).to.be.an('object');
  });
});
