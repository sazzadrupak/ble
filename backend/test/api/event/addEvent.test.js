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
let courseId2;

const room = [
  { name: 'TC-110' },
  { name: 'TC-111' },
];
const beacon = [
  { macAddress: '7C:D1:C3:19:BC:EA' },
  { macAddress: '7C:D1:C3:19:BC:EB' },
];

describe('Check /event POST', () => {
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

    const course2 = {
      courseCode: 'TIE-23156',
      courseName: 'Web architecture',
      coursePersonal: [teacherId1, teacherId2],
    };
    courseId2 = parseInt(await addCourse(adminToken, course2), 10);

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

  it('add an event as admin: failed', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: userId,
        eventName: 'DSA lecture',
        eventType: 'class',
        roomId,
        startDate: '2019-11-10',
        endDate: '2019-11-10',
        startTime: '14:00:19',
        endTime: '16:00:19',
        recurrent: false,
        everyAfter: 1,
        everyAfterType: 'day',
      });

    expect(res.statusCode).to.equal(401);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['error']);
    expect(res.body.error).to.include('event_personal is not a teacher.');
  });

  it('give courseId as empty value: failed', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId: '',
        eventPersonal: userId,
        eventName: 'DSA lecture',
        eventType: 'class',
        roomId,
        startDate: '2019-11-10',
        endDate: '2019-11-10',
        startTime: '14:00:19',
        endTime: '16:00:19',
        recurrent: false,
        everyAfter: 1,
        everyAfterType: 'day',
      });

    expect(res.statusCode).to.equal(400);
  });

  it('give an non-exists courseId value: failed', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId: generateRandom([courseId]),
        eventPersonal: teacherId1,
        eventName: 'DSA lecture',
        eventType: 'class',
        roomId,
        startDate: '2019-11-10',
        endDate: '2019-11-10',
        startTime: '14:00:19',
        endTime: '16:00:19',
        recurrent: false,
        everyAfter: 1,
        everyAfterType: 'day',
      });

    expect(res.statusCode).to.equal(404);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['error']);
    expect(res.body.error).to.include('Course not found');
  });

  it('give event personal not in course personal list: failed', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId2,
        eventName: 'DSA lecture',
        eventType: 'class',
        roomId,
        startDate: '2019-11-10',
        endDate: '2019-11-10',
        startTime: '14:00:19',
        endTime: '16:00:19',
        recurrent: false,
        everyAfter: 1,
        everyAfterType: 'day',
      });

    expect(res.statusCode).to.equal(404);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['error']);
    expect(res.body.error).to.include('The event personal is not found in this course personal list');
  });

  it('give empty event personal value: failed', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: '',
        eventName: 'DSA lecture',
        eventType: 'class',
        roomId,
        startDate: '2019-11-10',
        endDate: '2019-11-10',
        startTime: '14:00:19',
        endTime: '16:00:19',
        recurrent: false,
        everyAfter: 1,
        everyAfterType: 'day',
      });

    expect(res.statusCode).to.equal(400);
  });

  it('give non-exists event personal value: failed', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: generateRandom([teacherId1, teacherId2]),
        eventName: 'DSA lecture',
        eventType: 'class',
        roomId,
        startDate: '2019-11-10',
        endDate: '2019-11-10',
        startTime: '14:00:19',
        endTime: '16:00:19',
        recurrent: false,
        everyAfter: 1,
        everyAfterType: 'day',
      });

    expect(res.statusCode).to.equal(401);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['error']);
    expect(res.body.error).to.include('event_personal is not a teacher.');
  });

  it('give student id as event personal value: failed', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: studentId,
        eventName: 'DSA lecture',
        eventType: 'class',
        roomId,
        startDate: '2019-11-10',
        endDate: '2019-11-10',
        startTime: '14:00:19',
        endTime: '16:00:19',
        recurrent: false,
        everyAfter: 1,
        everyAfterType: 'day',
      });

    expect(res.statusCode).to.equal(401);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['error']);
    expect(res.body.error).to.include('event_personal is not a teacher.');
  });

  it('give empty event name value: failed', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventName: '',
        eventType: 'class',
        roomId,
        startDate: '2019-11-10',
        endDate: '2019-11-10',
        startTime: '14:00:19',
        endTime: '16:00:19',
        recurrent: false,
        everyAfter: 1,
        everyAfterType: 'day',
      });

    expect(res.statusCode).to.equal(400);
  });

  it('give event name value length less than five: failed', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventName: 'abcd',
        eventType: 'class',
        roomId,
        startDate: '2019-11-10',
        endDate: '2019-11-10',
        startTime: '14:00:19',
        endTime: '16:00:19',
        recurrent: false,
        everyAfter: 1,
        everyAfterType: 'day',
      });

    expect(res.statusCode).to.equal(400);
  });

  it('give event type value empty: failed', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventName: 'DSA lecture',
        eventType: '',
        roomId,
        startDate: '2019-11-10',
        endDate: '2019-11-10',
        startTime: '14:00:19',
        endTime: '16:00:19',
        recurrent: false,
        everyAfter: 1,
        everyAfterType: 'day',
      });

    expect(res.statusCode).to.equal(400);
  });

  it('give event type value neither "class" nor "exercise": failed', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventName: 'DSA lecture',
        eventType: 'invalid',
        roomId,
        startDate: '2019-11-10',
        endDate: '2019-11-10',
        startTime: '14:00:19',
        endTime: '16:00:19',
        recurrent: false,
        everyAfter: 1,
        everyAfterType: 'day',
      });

    expect(res.statusCode).to.equal(400);
  });

  it('give empty room id: failed', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventName: 'DSA lecture',
        eventType: 'class',
        roomId: '',
        startDate: '2019-11-10',
        endDate: '2019-11-10',
        startTime: '14:00:19',
        endTime: '16:00:19',
        recurrent: false,
        everyAfter: 1,
        everyAfterType: 'day',
      });

    expect(res.statusCode).to.equal(400);
  });

  it('give non-exists room id: failed', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventName: 'DSA lecture',
        eventType: 'class',
        roomId: generateRandom([roomId]),
        startDate: '2019-11-10',
        endDate: '2019-11-10',
        startTime: '14:00:19',
        endTime: '16:00:19',
        recurrent: false,
        everyAfter: 1,
        everyAfterType: 'day',
      });

    expect(res.statusCode).to.equal(404);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['error']);
    expect(res.body.error).to.include('Room not found');
  });

  it('give wrong format start date - 1: failed', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventName: 'DSA lecture',
        eventType: 'class',
        roomId,
        startDate: '2019:11:10',
        endDate: '2019-11-10',
        startTime: '14:00:19',
        endTime: '16:00:19',
        recurrent: false,
        everyAfter: 1,
        everyAfterType: 'day',
      });

    expect(res.statusCode).to.equal(400);
  });

  it('give wrong format start date - 2: failed', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventName: 'DSA lecture',
        eventType: 'class',
        roomId,
        startDate: '2019:11-10',
        endDate: '2019-11-10',
        startTime: '14:00:19',
        endTime: '16:00:19',
        recurrent: false,
        everyAfter: 1,
        everyAfterType: 'day',
      });

    expect(res.statusCode).to.equal(400);
  });

  it('give wrong format start date - 3: failed', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventName: 'DSA lecture',
        eventType: 'class',
        roomId,
        startDate: '201-11-10',
        endDate: '2019-11-10',
        startTime: '14:00:19',
        endTime: '16:00:19',
        recurrent: false,
        everyAfter: 1,
        everyAfterType: 'day',
      });

    expect(res.statusCode).to.equal(400);
  });

  it('give wrong format start date - 4: failed', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventName: 'DSA lecture',
        eventType: 'class',
        roomId,
        startDate: '2020-1-10',
        endDate: '2019-11-10',
        startTime: '14:00:19',
        endTime: '16:00:19',
        recurrent: false,
        everyAfter: 1,
        everyAfterType: 'day',
      });

    expect(res.statusCode).to.equal(400);
  });

  it('give wrong format start date - 5: failed', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventName: 'DSA lecture',
        eventType: 'class',
        roomId,
        startDate: '',
        endDate: '2019-11-10',
        startTime: '14:00:19',
        endTime: '16:00:19',
        recurrent: false,
        everyAfter: 1,
        everyAfterType: 'day',
      });

    expect(res.statusCode).to.equal(400);
  });

  it('give wrong format start date - 5: failed', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventName: 'DSA lecture',
        eventType: 'class',
        roomId,
        startDate: '2019-11',
        endDate: '2019-11-10',
        startTime: '14:00:19',
        endTime: '16:00:19',
        recurrent: false,
        everyAfter: 1,
        everyAfterType: 'day',
      });

    expect(res.statusCode).to.equal(400);
  });

  it('give wrong format start time - 1: failed', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventName: 'DSA lecture',
        eventType: 'class',
        roomId,
        startDate: '2020-01-23',
        endDate: '2020-01-31',
        startTime: '14:00:1',
        endTime: '16:00:19',
        recurrent: false,
        everyAfter: 1,
        everyAfterType: 'day',
      });

    expect(res.statusCode).to.equal(400);
  });

  it('give wrong format start time - 2: failed', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventName: 'DSA lecture',
        eventType: 'class',
        roomId,
        startDate: '2020-01-23',
        endDate: '2020-01-31',
        startTime: '14:0000',
        endTime: '16:00:19',
        recurrent: false,
        everyAfter: 1,
        everyAfterType: 'day',
      });

    expect(res.statusCode).to.equal(400);
  });

  it('give wrong format start time - 3: failed', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventName: 'DSA lecture',
        eventType: 'class',
        roomId,
        startDate: '2020-01-23',
        endDate: '2020-01-31',
        startTime: '14:00-00',
        endTime: '16:00:19',
        recurrent: false,
        everyAfter: 1,
        everyAfterType: 'day',
      });

    expect(res.statusCode).to.equal(400);
  });

  it('give wrong format start time - 4: failed', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventName: 'DSA lecture',
        eventType: 'class',
        roomId,
        startDate: '2020-01-23',
        endDate: '2020-01-31',
        startTime: '14:00',
        endTime: '16:00:19',
        recurrent: false,
        everyAfter: 1,
        everyAfterType: 'day',
      });

    expect(res.statusCode).to.equal(400);
  });

  it('give wrong format start time - 5: failed', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventName: 'DSA lecture',
        eventType: 'class',
        roomId,
        startDate: '2020-01-23',
        endDate: '2020-01-31',
        startTime: '',
        endTime: '16:00:19',
        recurrent: false,
        everyAfter: 1,
        everyAfterType: 'day',
      });

    expect(res.statusCode).to.equal(400);
  });

  it('give end date less than start date: failed', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventName: 'DSA lecture',
        eventType: 'class',
        roomId,
        startDate: '2020-01-23',
        endDate: '2020-01-01',
        startTime: '14:00:00',
        endTime: '16:00:19',
        recurrent: false,
        everyAfter: 1,
        everyAfterType: 'day',
      });
    expect(res.statusCode).to.equal(404);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['error']);
    expect(res.body.error).to.include('start date_time should be smaller than end date_time');
  });

  it('give end time less than start time: failed', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventName: 'DSA lecture',
        eventType: 'class',
        roomId,
        startDate: '2020-01-01',
        endDate: '2020-01-01',
        startTime: '16:00:00',
        endTime: '14:00:19',
        recurrent: false,
        everyAfter: 1,
        everyAfterType: 'day',
      });
    expect(res.statusCode).to.equal(404);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['error']);
    expect(res.body.error).to.include('start date_time should be smaller than end date_time');
  });

  it('no course id key: failed', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        eventPersonal: teacherId1,
        eventName: 'DSA lecture',
        eventType: 'class',
        roomId,
        startDate: '2020-01-01',
        endDate: '2020-01-01',
        startTime: '16:00:00',
        endTime: '14:00:19',
        recurrent: false,
        everyAfter: 1,
        everyAfterType: 'day',
      });
    expect(res.statusCode).to.equal(400);
  });

  it('no event personal key: failed', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventName: 'DSA lecture',
        eventType: 'class',
        roomId,
        startDate: '2020-01-01',
        endDate: '2020-01-01',
        startTime: '16:00:00',
        endTime: '14:00:19',
        recurrent: false,
        everyAfter: 1,
        everyAfterType: 'day',
      });
    expect(res.statusCode).to.equal(400);
  });

  it('no event name key: failed', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventType: 'class',
        roomId,
        startDate: '2020-01-01',
        endDate: '2020-01-01',
        startTime: '16:00:00',
        endTime: '14:00:19',
        recurrent: false,
        everyAfter: 1,
        everyAfterType: 'day',
      });
    expect(res.statusCode).to.equal(400);
  });

  it('no event type key: failed', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventName: 'DSA lecture',
        roomId,
        startDate: '2020-01-01',
        endDate: '2020-01-01',
        startTime: '16:00:00',
        endTime: '14:00:19',
        recurrent: false,
        everyAfter: 1,
        everyAfterType: 'day',
      });
    expect(res.statusCode).to.equal(400);
  });

  it('no room id key: failed', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventName: 'DSA lecture',
        eventType: 'class',
        startDate: '2020-01-01',
        endDate: '2020-01-01',
        startTime: '16:00:00',
        endTime: '14:00:19',
        recurrent: false,
        everyAfter: 1,
        everyAfterType: 'day',
      });
    expect(res.statusCode).to.equal(400);
  });

  it('no start date key: failed', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventName: 'DSA lecture',
        roomId,
        eventType: 'class',
        endDate: '2020-01-01',
        startTime: '16:00:00',
        endTime: '14:00:19',
        recurrent: false,
        everyAfter: 1,
        everyAfterType: 'day',
      });
    expect(res.statusCode).to.equal(400);
  });

  it('no end date key: failed', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventName: 'DSA lecture',
        roomId,
        eventType: 'class',
        startDate: '2020-01-01',
        startTime: '16:00:00',
        endTime: '14:00:19',
        recurrent: false,
        everyAfter: 1,
        everyAfterType: 'day',
      });
    expect(res.statusCode).to.equal(400);
  });

  it('no start time key: failed', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventName: 'DSA lecture',
        roomId,
        eventType: 'class',
        startDate: '2020-01-01',
        endDate: '2020-01-01',
        endTime: '14:00:19',
        recurrent: false,
        everyAfter: 1,
        everyAfterType: 'day',
      });
    expect(res.statusCode).to.equal(400);
  });

  it('no end time key: failed', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventName: 'DSA lecture',
        roomId,
        eventType: 'class',
        startDate: '2020-01-01',
        endDate: '2020-01-01',
        startTime: '16:00:00',
        recurrent: false,
        everyAfter: 1,
        everyAfterType: 'day',
      });
    expect(res.statusCode).to.equal(400);
  });

  it('give array as post body: failed', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send([{
        courseId,
        eventPersonal: teacherId1,
        eventName: 'DSA lecture',
        roomId,
        eventType: 'class',
        startDate: '2020-01-01',
        endDate: '2020-01-01',
        startTime: '16:00:00',
        endTime: '14:00:19',
        recurrent: false,
        everyAfter: 1,
        everyAfterType: 'day',
      }]);
    expect(res.statusCode).to.equal(400);
  });

  it('add one event: successful', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventName: 'DSA lecture',
        roomId,
        eventType: 'class',
        startDate: '2020-01-01',
        endDate: '2020-01-01',
        startTime: '14:00:00',
        endTime: '16:00:19',
        recurrent: false,
        everyAfter: 1,
        everyAfterType: 'day',
      });
    expect(res.statusCode).to.equal(201);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['message']);
    expect(res.body.message).to.include('1 event has been added');
  });

  it('add daily event: successful', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventName: 'DSA lecture',
        roomId,
        eventType: 'class',
        startDate: '2020-01-01',
        endDate: '2020-01-31',
        startTime: '14:00:00',
        endTime: '16:00:19',
        recurrent: false,
        everyAfter: 1,
        everyAfterType: 'day',
      });
    expect(res.statusCode).to.equal(201);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['message']);
    expect(res.body.message).to.include('31 event has been added');
  });

  it('add recurrence event - day: successful', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventName: 'DSA lecture',
        roomId,
        eventType: 'class',
        startDate: '2020-01-01',
        endDate: '2020-01-31',
        startTime: '14:00:00',
        endTime: '16:00:19',
        recurrent: true,
        everyAfter: 1,
        everyAfterType: 'day',
      });
    expect(res.statusCode).to.equal(201);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['message']);
    expect(res.body.message).to.include('31 event has been added');
  });

  it('add recurrence event - 1 day: successful', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventName: 'DSA lecture',
        roomId,
        eventType: 'class',
        startDate: '2020-01-01',
        endDate: '2020-01-31',
        startTime: '14:00:00',
        endTime: '16:00:19',
        recurrent: true,
        everyAfter: 1,
        everyAfterType: 'day',
      });
    expect(res.statusCode).to.equal(201);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['message']);
    expect(res.body.message).to.include('31 event has been added');
  });

  it('add recurrence event - 2 day: successful', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventName: 'DSA lecture',
        roomId,
        eventType: 'class',
        startDate: '2020-01-01',
        endDate: '2020-01-31',
        startTime: '14:00:00',
        endTime: '16:00:19',
        recurrent: true,
        everyAfter: 2,
        everyAfterType: 'day',
      });
    expect(res.statusCode).to.equal(201);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['message']);
    expect(res.body.message).to.include('16 event has been added');
  });

  it('add recurrence event - 3 day: successful', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventName: 'DSA lecture',
        roomId,
        eventType: 'class',
        startDate: '2020-01-01',
        endDate: '2020-01-31',
        startTime: '14:00:00',
        endTime: '16:00:19',
        recurrent: true,
        everyAfter: 3,
        everyAfterType: 'day',
      });
    expect(res.statusCode).to.equal(201);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['message']);
    expect(res.body.message).to.include('11 event has been added');
  });

  it('add recurrence event - 4 day: successful', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventName: 'DSA lecture',
        roomId,
        eventType: 'class',
        startDate: '2020-01-01',
        endDate: '2020-01-31',
        startTime: '14:00:00',
        endTime: '16:00:19',
        recurrent: true,
        everyAfter: 4,
        everyAfterType: 'day',
      });
    expect(res.statusCode).to.equal(201);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['message']);
    expect(res.body.message).to.include('8 event has been added');
  });

  it('add recurrence event - 5 day: successful', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventName: 'DSA lecture',
        roomId,
        eventType: 'class',
        startDate: '2020-01-01',
        endDate: '2020-01-31',
        startTime: '14:00:00',
        endTime: '16:00:19',
        recurrent: true,
        everyAfter: 5,
        everyAfterType: 'day',
      });
    expect(res.statusCode).to.equal(201);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['message']);
    expect(res.body.message).to.include('7 event has been added');
  });

  it('add recurrence event - 6 day: successful', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventName: 'DSA lecture',
        roomId,
        eventType: 'class',
        startDate: '2020-01-01',
        endDate: '2020-01-31',
        startTime: '14:00:00',
        endTime: '16:00:19',
        recurrent: true,
        everyAfter: 6,
        everyAfterType: 'day',
      });
    expect(res.statusCode).to.equal(201);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['message']);
    expect(res.body.message).to.include('6 event has been added');
  });

  it('add recurrence event - 1 week: successful', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventName: 'DSA lecture',
        roomId,
        eventType: 'class',
        startDate: '2020-01-01',
        endDate: '2020-01-31',
        startTime: '14:00:00',
        endTime: '16:00:19',
        recurrent: true,
        everyAfter: 1,
        everyAfterType: 'week',
      });
    expect(res.statusCode).to.equal(201);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['message']);
    expect(res.body.message).to.include('5 event has been added');
  });

  it('add recurrence event - 2 week: successful', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventName: 'DSA lecture',
        roomId,
        eventType: 'class',
        startDate: '2020-01-01',
        endDate: '2020-01-31',
        startTime: '14:00:00',
        endTime: '16:00:19',
        recurrent: true,
        everyAfter: 2,
        everyAfterType: 'week',
      });
    expect(res.statusCode).to.equal(201);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['message']);
    expect(res.body.message).to.include('3 event has been added');
  });

  it('add recurrence event - 3 week: successful', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventName: 'DSA lecture',
        roomId,
        eventType: 'class',
        startDate: '2020-02-01',
        endDate: '2020-02-31',
        startTime: '14:00:00',
        endTime: '16:00:19',
        recurrent: true,
        everyAfter: 3,
        everyAfterType: 'week',
      });
    expect(res.statusCode).to.equal(201);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['message']);
    expect(res.body.message).to.include('2 event has been added');
  });

  it('assign event to teacher who already assigned in another event at the same time: failed', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventName: 'DSA lecture',
        roomId,
        eventType: 'class',
        startDate: '2020-01-01',
        endDate: '2020-01-01',
        startTime: '14:00:00',
        endTime: '16:00:19',
        recurrent: false,
        everyAfter: 1,
        everyAfterType: 'day',
      });
    expect(res.statusCode).to.equal(201);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['message']);
    expect(res.body.message).to.include('1 event has been added');

    const newRes = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventName: 'DSA exercise',
        roomId: roomId2,
        eventType: 'exercise',
        startDate: '2020-01-01',
        endDate: '2020-01-01',
        startTime: '15:00:00',
        endTime: '17:00:19',
        recurrent: false,
        everyAfter: 1,
        everyAfterType: 'day',
      });

    expect(newRes.statusCode).to.equal(404);
    expect(newRes.body).to.be.an('object');
    expect(newRes.body).to.have.keys(['error']);
    expect(newRes.body.error).to.include('Teacher already been assigned to an event at the very same time');
  });

  it('assign event to teacher who already assigned in another event at the same time - endtime in other event time: failed', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventName: 'DSA lecture',
        roomId,
        eventType: 'class',
        startDate: '2020-01-01',
        endDate: '2020-01-01',
        startTime: '14:00:00',
        endTime: '16:00:19',
        recurrent: false,
        everyAfter: 1,
        everyAfterType: 'day',
      });
    expect(res.statusCode).to.equal(201);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['message']);
    expect(res.body.message).to.include('1 event has been added');

    const newRes = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventName: 'DSA exercise',
        roomId,
        eventType: 'exercise',
        startDate: '2020-01-01',
        endDate: '2020-01-01',
        startTime: '13:00:00',
        endTime: '15:00:19',
        recurrent: false,
        everyAfter: 1,
        everyAfterType: 'day',
      });

    expect(newRes.statusCode).to.equal(404);
    expect(newRes.body).to.be.an('object');
    expect(newRes.body).to.have.keys(['error']);
    expect(newRes.body.error).to.include('There is a event already in same time in same room');
  });

  it('event personal is not an teacher: failed', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: userId,
        eventName: 'DSA lecture',
        roomId,
        eventType: 'class',
        startDate: '2020-02-01',
        endDate: '2020-02-31',
        startTime: '14:00:00',
        endTime: '16:00:19',
        recurrent: true,
        everyAfter: 3,
        everyAfterType: 'week',
      });
    expect(res.statusCode).to.equal(401);
    // console.log(res.body);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['error']);
    expect(res.body.error).to.include('event_personal is not a teacher.');
  });

  it('event personal not in the course personal: failed', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId2,
        eventName: 'DSA lecture',
        roomId,
        eventType: 'class',
        startDate: '2020-02-01',
        endDate: '2020-02-31',
        startTime: '14:00:00',
        endTime: '16:00:19',
        recurrent: true,
        everyAfter: 3,
        everyAfterType: 'week',
      });
    expect(res.statusCode).to.equal(404);
    // console.log(res.body);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['error']);
    expect(res.body.error).to.include('The event personal is not found in this course personal list');
  });

  it('add new event in same time in same room of another event: failed', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventName: 'DSA lecture',
        roomId,
        eventType: 'class',
        startDate: '2020-02-01',
        endDate: '2020-02-31',
        startTime: '14:00:00',
        endTime: '16:00:19',
        recurrent: true,
        everyAfter: 3,
        everyAfterType: 'week',
      });
    expect(res.statusCode).to.equal(201);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['message']);
    expect(res.body.message).to.include('2 event has been added');

    const newRes = await server
      .post('/event')
      .set('api_key', teacherToken2)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId: courseId2,
        eventPersonal: teacherId2,
        eventName: 'Web architectue',
        roomId,
        eventType: 'class',
        startDate: '2020-02-01',
        endDate: '2020-02-31',
        startTime: '14:00:00',
        endTime: '16:00:19',
        recurrent: true,
        everyAfter: 3,
        everyAfterType: 'day',
      });
    expect(newRes.statusCode).to.equal(404);
    expect(newRes.body).to.be.an('object');
    expect(newRes.body).to.have.keys(['error']);
    expect(newRes.body.error).to.include('There is a event already in same time in same room');
  });

  it('assign teacher to different events in different room, but on same time: failed', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventName: 'DSA lecture',
        roomId,
        eventType: 'class',
        startDate: '2020-02-01',
        endDate: '2020-02-31',
        startTime: '14:00:00',
        endTime: '16:00:19',
        recurrent: true,
        everyAfter: 3,
        everyAfterType: 'week',
      });
    expect(res.statusCode).to.equal(201);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['message']);
    expect(res.body.message).to.include('2 event has been added');

    const newRes = await server
      .post('/event')
      .set('api_key', teacherToken2)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId: courseId2,
        eventPersonal: teacherId1,
        eventName: 'Web architectue',
        roomId: roomId2,
        eventType: 'class',
        startDate: '2020-02-01',
        endDate: '2020-02-05',
        startTime: '14:00:00',
        endTime: '16:00:19',
        recurrent: false,
        everyAfter: 1,
        everyAfterType: 'day',
      });

    expect(newRes.statusCode).to.equal(404);
    expect(newRes.body).to.be.an('object');
    expect(newRes.body).to.have.keys(['error']);
    expect(newRes.body.error).to.include('Teacher already been assigned to an event at the very same time');
  });

  it('additional property in post body: failed', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventName: 'DSA lecture',
        roomId,
        eventType: 'class',
        startDate: '2020-02-01',
        endDate: '2020-02-31',
        startTime: '14:00:00',
        endTime: '16:00:19',
        recurrent: true,
        everyAfter: 3,
        everyAfterType: 'week',
        additionalProperty: '',
      });
    expect(res.statusCode).to.equal(400);
  });

  it('Start time is greater than end time of event: failed', async () => {
    const res = await server
      .post('/event')
      .set('api_key', teacherToken1)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventName: 'DSA lecture',
        roomId,
        eventType: 'class',
        startDate: '2020-01-01',
        endDate: '2020-01-01',
        startTime: '23:00:00',
        endTime: '01:00:00',
        recurrent: false,
        everyAfter: 1,
        everyAfterType: 'day',
      });
    expect(res.statusCode).to.equal(404);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['error']);
    expect(res.body.error).to.include('start date_time should be smaller than end date_time.');
  });
});
