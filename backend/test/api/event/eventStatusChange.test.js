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
let teacherToken1;
let teacherToken2;
let studentToken;
let userId;
let teacherId1;
let teacherId2;
let studentId;
let roomId;
let roomId2;
let beaconId;
let beaconId2;
let courseId;

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
    const currentDateTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Helsinki' }));
    const currentDate = `${currentDateTime.getFullYear()}-${('0' + (currentDateTime.getMonth() + 1)).slice(-2)}-${('0' + currentDateTime.getDate()).slice(-2)}`; // eslint-disable-line prefer-template
    const currentTime = `${('0' + currentDateTime.getHours()).slice(-2)}:${('0' + currentDateTime.getMinutes()).slice(-2)}:${('0' + currentDateTime.getSeconds()).slice(-2)}`; // eslint-disable-line prefer-template

    currentDateTime.setDate(currentDateTime.getDate() + 1);
    const endDate = `${currentDateTime.getFullYear()}-${('0' + (currentDateTime.getMonth() + 1)).slice(-2)}-${('0' + currentDateTime.getDate()).slice(-2)}`; // eslint-disable-line prefer-template
    return {
      currentDateTime,
      currentDate,
      currentTime,
      endDate,
    };
  }
  before(async () => {
    adminToken = await testAdminUserSignUp();
    userId = await getUserId(adminToken);

    roomId = parseInt(await addRoom(adminToken, room[0]), 10);
    beaconId = parseInt(await addBeacon(adminToken, beacon[0]), 10);
    const body = [{ beaconId }];
    await addAssociation(adminToken, roomId, body);

    roomId2 = parseInt(await addRoom(adminToken, room[1]), 10);
    beaconId2 = parseInt(await addBeacon(adminToken, beacon[1]), 10);
    const body2 = [{ beaconId: beaconId2 }];
    await addAssociation(adminToken, roomId2, body2);

    teacherToken1 = await testTeacherUserSignUp({
      password: 'password',
      email: 'test.teacher1@email.com',
      firstName: 'First name',
      lastName: 'Last name',
      userType: 'teacher',
    });
    teacherId1 = parseInt(await getUserId(teacherToken1), 10);

    const course = {
      courseCode: 'TIE-20106',
      courseName: 'Data Structures and Algorithms',
      coursePersonal: [teacherId1],
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
  });

  after(async () => {
    await pool.query('DELETE FROM room where created_by = $1', [userId]);
    await pool.query('DELETE FROM beacon where created_by = $1', [userId]);
    await pool.query('DELETE FROM course where created_by = $1', [userId]);
    await Promise.all([userId, teacherId1, teacherId2, studentId].map((id) => pool.query('DELETE FROM users where id = $1', [id])));
  });


  afterEach(async () => {
    await pool.query('TRUNCATE beacon_room CASCADE');
    await pool.query('TRUNCATE event CASCADE');
  });

  it('current datetime is greater than events end time: failed', async () => {
    const {
      currentDateTime,
      currentDate,
      currentTime,
      endDate,
    } = timeInfo();
    const endTime = `${('0' + currentDateTime.getHours()).slice(-2)}:${('0' + currentDateTime.getMinutes()).slice(-2)}:${('0' + currentDateTime.getSeconds()).slice(-2)}`; // eslint-disable-line prefer-template
    await addEvent(teacherToken1, {
      courseId,
      eventPersonal: teacherId1,
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

    const events = await getEvents(teacherToken1);
    const res = await server
      .put(`/event/eventStatus/${events[0].id}`)
      .set('api_key', adminToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache');
    expect(res.statusCode).to.equal(404);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['error']);
    expect(res.body.error).to.include('Current time is not in between event start and end time.');
  });

  it('current datetime is smaller than events start time: failed', async () => {
    const {
      currentDateTime,
      currentDate,
      currentTime,
      endDate,
    } = timeInfo();
    const endTime = `${('0' + currentDateTime.getHours()).slice(-2)}:${('0' + currentDateTime.getMinutes()).slice(-2)}:${('0' + currentDateTime.getSeconds()).slice(-2)}`; // eslint-disable-line prefer-template
    await addEvent(teacherToken1, {
      courseId,
      eventPersonal: teacherId1,
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

    const events = await getEvents(teacherToken1);
    const res = await server
      .put(`/event/eventStatus/${events[0].id}`)
      .set('api_key', adminToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache');
    expect(res.statusCode).to.equal(404);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['error']);
    expect(res.body.error).to.include('Current time is not in between event start and end time.');
  });

  it('admin as event personal: failed', async () => {
    const {
      currentDateTime,
      currentDate,
      currentTime,
      endDate,
    } = timeInfo();
    currentDateTime.setHours(currentDateTime.getHours() + 1);
    const endTime = `${('0' + currentDateTime.getHours()).slice(-2)}:${('0' + currentDateTime.getMinutes()).slice(-2)}:${('0' + currentDateTime.getSeconds()).slice(-2)}`; // eslint-disable-line prefer-template
    await addEvent(teacherToken1, {
      courseId,
      eventPersonal: teacherId1,
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

    const events = await getEvents(teacherToken1);
    const res = await server
      .put(`/event/eventStatus/${events[0].id}`)
      .set('api_key', adminToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache');
    expect(res.statusCode).to.equal(404);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['error']);
    expect(res.body.error).to.include('User is not taking this event. Can not modify this event.');
  });

  it('another teacher event personal: failed', async () => {
    const {
      currentDateTime,
      currentDate,
      currentTime,
      endDate,
    } = timeInfo();
    currentDateTime.setHours(currentDateTime.getHours() + 1);
    const endTime = `${('0' + currentDateTime.getHours()).slice(-2)}:${('0' + currentDateTime.getMinutes()).slice(-2)}:${('0' + currentDateTime.getSeconds()).slice(-2)}`; // eslint-disable-line prefer-template
    await addEvent(teacherToken1, {
      courseId,
      eventPersonal: teacherId1,
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

    const events = await getEvents(teacherToken1);
    const res = await server
      .put(`/event/eventStatus/${events[0].id}`)
      .set('api_key', teacherToken2)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache');
    expect(res.statusCode).to.equal(404);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['error']);
    expect(res.body.error).to.include('User is not taking this event. Can not modify this event.');
  });

  it('non-exists event id: failed', async () => {
    const {
      currentDateTime,
      currentDate,
      currentTime,
      endDate,
    } = timeInfo();
    currentDateTime.setHours(currentDateTime.getHours() + 1);
    const endTime = `${('0' + currentDateTime.getHours()).slice(-2)}:${('0' + currentDateTime.getMinutes()).slice(-2)}:${('0' + currentDateTime.getSeconds()).slice(-2)}`; // eslint-disable-line prefer-template
    await addEvent(teacherToken1, {
      courseId,
      eventPersonal: teacherId1,
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

    const events = await getEvents(teacherToken1);
    const eventId = generateRandom([events[0].id]);
    const res = await server
      .put(`/event/eventStatus/${eventId}`)
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache');
    expect(res.statusCode).to.equal(404);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['error']);
    expect(res.body.error).to.include(`Event id ${eventId} not found.`);
  });

  it('change event status from false to true: successful', async () => {
    const {
      currentDateTime,
      currentDate,
      currentTime,
      endDate,
    } = timeInfo();
    currentDateTime.setHours(currentDateTime.getHours() + 1);
    const endTime = `${('0' + currentDateTime.getHours()).slice(-2)}:${('0' + currentDateTime.getMinutes()).slice(-2)}:${('0' + currentDateTime.getSeconds()).slice(-2)}`; // eslint-disable-line prefer-template
    await addEvent(teacherToken1, {
      courseId,
      eventPersonal: teacherId1,
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

    const events = await getEvents(teacherToken1);
    const res = await server
      .put(`/event/eventStatus/${events[0].id}`)
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache');
    expect(res.statusCode).to.equal(201);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['message', 'status']);
    expect(res.body.message).to.include('Event status has been changed from false to true');
    expect(res.body.status).to.equal(true);
  });

  it('change event status from false to true, and again true to false: successful', async () => {
    const {
      currentDateTime,
      currentDate,
      currentTime,
      endDate,
    } = timeInfo();
    currentDateTime.setHours(currentDateTime.getHours() + 1);
    const endTime = `${('0' + currentDateTime.getHours()).slice(-2)}:${('0' + currentDateTime.getMinutes()).slice(-2)}:${('0' + currentDateTime.getSeconds()).slice(-2)}`; // eslint-disable-line prefer-template
    await addEvent(teacherToken1, {
      courseId,
      eventPersonal: teacherId1,
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

    const events = await getEvents(teacherToken1);
    const res = await server
      .put(`/event/eventStatus/${events[0].id}`)
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache');
    expect(res.statusCode).to.equal(201);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['message', 'status']);
    expect(res.body.message).to.include('Event status has been changed from false to true');
    expect(res.body.status).to.equal(true);

    const newres = await server
      .put(`/event/eventStatus/${events[0].id}`)
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache');
    expect(newres.statusCode).to.equal(201);
    expect(newres.body).to.be.an('object');
    expect(newres.body).to.have.keys(['message', 'status']);
    expect(newres.body.message).to.include('Event status has been changed from true to false');
    expect(newres.body.status).to.equal(false);
  });

  it('change status before event start time: failed', async () => {
    const {
      currentDateTime,
      currentTime,
      endDate,
    } = timeInfo();
    currentDateTime.setHours(currentDateTime.getHours() + 1);
    const endTime = `${('0' + currentDateTime.getHours()).slice(-2)}:${('0' + currentDateTime.getMinutes()).slice(-2)}:${('0' + currentDateTime.getSeconds()).slice(-2)}`; // eslint-disable-line prefer-template
    await addEvent(teacherToken1, {
      courseId,
      eventPersonal: teacherId1,
      eventName: 'DSA lecture',
      eventType: 'class',
      roomId,
      startDate: endDate,
      endDate,
      startTime: currentTime,
      endTime,
      recurrent: false,
      everyAfter: 1,
      everyAfterType: 'day',
    });

    const events = await getEvents(teacherToken1);
    const res = await server
      .put(`/event/eventStatus/${events[0].id}`)
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache');
    expect(res.statusCode).to.equal(404);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['error']);
    expect(res.body.error).to.include('Current time is not in between event start and end time.');
  });

  it('change status after event end time: failed', async () => {
    const {
      currentDateTime,
      currentDate,
      currentTime,
    } = timeInfo();
    currentDateTime.setHours(currentDateTime.getHours() + 1);
    await addEvent(teacherToken1, {
      courseId,
      eventPersonal: teacherId1,
      eventName: 'DSA lecture',
      eventType: 'class',
      roomId,
      startDate: currentDate,
      endDate: currentDate,
      startTime: currentTime,
      endTime: currentTime,
      recurrent: false,
      everyAfter: 1,
      everyAfterType: 'day',
    });

    const events = await getEvents(teacherToken1);
    const res = await server
      .put(`/event/eventStatus/${events[0].id}`)
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache');
    expect(res.statusCode).to.equal(404);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['error']);
    expect(res.body.error).to.include('Current time is not in between event start and end time.');
  });
});
