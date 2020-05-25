/* eslint-env jest */
/* global before, after */
const chai = require('chai');
const supertest = require('supertest');
const Promise = require('bluebird');

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
let teacherToken3;
let userId;
let teacherId;
let teacherId2;
let teacherId3;
let roomId;
let beaconId;
let courseId;
let currentDate;
let currentTime;
let currentDateTime;
let endTime;
const room = [
  { name: 'TC-110' },
  { name: 'TC-111' },
];
const beacon = [
  { macAddress: '7C:D1:C3:19:BC:EA' },
  { macAddress: '7C:D1:C3:19:BC:EB' },
];

describe('Check /event/{eventId} DELETE', () => {
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

    teacherToken3 = await testTeacherUserSignUp({
      password: 'password',
      email: 'test.teacher3@email.com',
      firstName: 'First name',
      lastName: 'Last name',
      userType: 'teacher',
    });
    teacherId3 = parseInt(await getUserId(teacherToken3), 10);

    const course = {
      courseCode: 'TIE-20106',
      courseName: 'Data Structures and Algorithms',
      coursePersonal: [teacherId, teacherId2],
    };
    courseId = parseInt(await addCourse(adminToken, course), 10);

    const body1 = [{ beaconId }];
    await addAssociation(adminToken, roomId, body1);

    currentDateTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Helsinki' }));
    currentDate = `${currentDateTime.getFullYear()}-${('0' + (currentDateTime.getMonth() + 1)).slice(-2)}-${('0' + currentDateTime.getDate()).slice(-2)}`; // eslint-disable-line prefer-template
    currentTime = `${('0' + currentDateTime.getHours()).slice(-2)}:${('0' + currentDateTime.getMinutes()).slice(-2)}:${('0' + currentDateTime.getSeconds()).slice(-2)}`; // eslint-disable-line prefer-template
    currentDateTime.setMinutes(currentDateTime.getMinutes() + 10);
    endTime = `${('0' + currentDateTime.getHours()).slice(-2)}:${('0' + currentDateTime.getMinutes()).slice(-2)}:${('0' + currentDateTime.getSeconds()).slice(-2)}`; // eslint-disable-line prefer-template
  });

  after(async () => {
    await pool.query('TRUNCATE beacon_room CASCADE');
    await pool.query('TRUNCATE event CASCADE');
    await pool.query('DELETE FROM room where created_by = $1', [userId]);
    await pool.query('DELETE FROM beacon where created_by = $1', [userId]);
    await pool.query('DELETE FROM course where created_by = $1', [userId]);
    await Promise.all([userId, teacherId, teacherId2, teacherId3].map((id) => pool.query('DELETE FROM users where id = $1', [id])));
  });

  it('event deleted successfully', async () => {
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
      everyAfter: 1,
      everyAfterType: 'day',
    });

    const events = await getEvents(teacherToken);
    const eventId = events[0].id;

    const res = await server
      .delete(`/event/${eventId}`)
      .set('api_key', teacherToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache');
    expect(res.statusCode).to.equal(201);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['message']);
    expect(res.body.message).to.equal(`Event ${eventId} has been deleted successfully`);
  });

  it('event deleted successfully by another course personal', async () => {
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
      everyAfter: 1,
      everyAfterType: 'day',
    });

    const events = await getEvents(teacherToken);
    const eventId = events[0].id;

    const res = await server
      .delete(`/event/${eventId}`)
      .set('api_key', teacherToken2)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache');
    expect(res.statusCode).to.equal(201);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['message']);
    expect(res.body.message).to.equal(`Event ${eventId} has been deleted successfully`);
  });

  it('event delete failed: as not one of course personal', async () => {
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
      everyAfter: 1,
      everyAfterType: 'day',
    });

    const events = await getEvents(teacherToken);
    const eventId = events[0].id;

    const res = await server
      .delete(`/event/${eventId}`)
      .set('api_key', teacherToken3)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache');
    expect(res.statusCode).to.equal(401);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['error']);
    expect(res.body.error).to.equal('user has to be one of course person of this course to delete');
  });

  it('non-exists event id delete: failed', async () => {
    const res = await server
      .delete('/event/1')
      .set('api_key', teacherToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache');
    expect(res.statusCode).to.equal(404);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['error']);
    expect(res.body.error).to.equal('Event id 1 not found.');
  });
});
