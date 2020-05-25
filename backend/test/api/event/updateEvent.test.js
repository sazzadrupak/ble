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
let teacherId1;
let teacherId2;
let studentId;
let roomId;
let roomId2;
let beaconId;
let beaconId2;
let courseId;
let eventId;
let courseId2;
let currentDateTime;
let currentDate;
let currentTime;
let endTime;
let currentDate2;
let currentTime2;
let endTime2;
const room = [
  { name: 'TC-110' },
  { name: 'TC-111' },
];
const beacon = [
  { macAddress: '7C:D1:C3:19:BC:EA' },
  { macAddress: '7C:D1:C3:19:BC:EB' },
];

describe('Check /event/{eventId} PUT', () => {
  before(async () => {
    adminToken = await testAdminUserSignUp();
    userId = await getUserId(adminToken);

    roomId = parseInt(await addRoom(adminToken, room[0]), 10);
    roomId2 = parseInt(await addRoom(adminToken, room[1]), 10);
    beaconId = parseInt(await addBeacon(adminToken, beacon[0]), 10);
    beaconId2 = parseInt(await addBeacon(adminToken, beacon[1]), 10);
    const associationBody1 = [{ beaconId }];
    await addAssociation(adminToken, roomId, associationBody1);

    const associationBody2 = [{ beaconId: beaconId2 }];
    await addAssociation(adminToken, roomId2, associationBody2);

    teacherToken = await testTeacherUserSignUp({
      password: 'password',
      email: 'test.teacher1@email.com',
      firstName: 'First name',
      lastName: 'Last name',
      userType: 'teacher',
    });
    teacherId1 = parseInt(await getUserId(teacherToken), 10);

    const course1 = {
      courseCode: 'TIE-20106',
      courseName: 'Data Structures and Algorithms',
      coursePersonal: [teacherId1],
    };
    courseId = parseInt(await addCourse(adminToken, course1), 10);

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
      courseName: 'WW2',
      coursePersonal: [teacherId2],
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

    currentDateTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Helsinki' }));
    currentDate = `${currentDateTime.getFullYear()}-${('0' + (currentDateTime.getMonth() + 1)).slice(-2)}-${('0' + currentDateTime.getDate()).slice(-2)}`; // eslint-disable-line prefer-template
    currentTime = `${('0' + currentDateTime.getHours()).slice(-2)}:${('0' + currentDateTime.getMinutes()).slice(-2)}:${('0' + currentDateTime.getSeconds()).slice(-2)}`; // eslint-disable-line prefer-template

    currentDateTime.setMinutes(currentDateTime.getMinutes() + 10);
    endTime = `${('0' + currentDateTime.getHours()).slice(-2)}:${('0' + currentDateTime.getMinutes()).slice(-2)}:${('0' + currentDateTime.getSeconds()).slice(-2)}`; // eslint-disable-line prefer-template

    await addEvent(teacherToken, {
      courseId,
      eventPersonal: teacherId1,
      eventName: 'DSA lecture',
      eventType: 'class',
      roomId,
      startDate: currentDate,
      endDate: currentDate,
      startTime: currentTime,
      endTime,
      recurrent: true,
      everyAfter: 5,
      everyAfterType: 'day',
    });

    const eventsOne = await getEvents(teacherToken);
    eventId = eventsOne[0].id;

    currentDateTime.setHours(currentDateTime.getHours() + 1);
    currentDate2 = `${currentDateTime.getFullYear()}-${('0' + (currentDateTime.getMonth() + 1)).slice(-2)}-${('0' + currentDateTime.getDate()).slice(-2)}`; // eslint-disable-line prefer-template
    currentTime2 = `${('0' + currentDateTime.getHours()).slice(-2)}:${('0' + currentDateTime.getMinutes()).slice(-2)}:${('0' + currentDateTime.getSeconds()).slice(-2)}`; // eslint-disable-line prefer-template
    currentDateTime.setMinutes(currentDateTime.getMinutes() + 10);
    endTime2 = `${('0' + currentDateTime.getHours()).slice(-2)}:${('0' + currentDateTime.getMinutes()).slice(-2)}:${('0' + currentDateTime.getSeconds()).slice(-2)}`; // eslint-disable-line prefer-template

    await addEvent(teacherToken2, {
      courseId: courseId2,
      eventPersonal: teacherId2,
      eventName: 'DSA exercise',
      eventType: 'exercise',
      roomId: roomId2,
      startDate: currentDate2,
      endDate: currentDate2,
      startTime: currentTime2,
      endTime: endTime2,
      recurrent: true,
      everyAfter: 5,
      everyAfterType: 'day',
    });
  });

  after(async () => {
    await pool.query('TRUNCATE beacon_room CASCADE');
    await pool.query('TRUNCATE event CASCADE');
    await pool.query('DELETE FROM room where created_by = $1', [userId]);
    await pool.query('DELETE FROM beacon where created_by = $1', [userId]);
    await pool.query('DELETE FROM course where created_by = $1', [userId]);
    await Promise.all([userId, teacherId1, teacherId2, studentId].map((id) => pool.query('DELETE FROM users where id = $1', [id])));
  });

  it('update an event - same room, same start and end time: successful', async () => {
    const res = await server
      .put(`/event/${eventId}`)
      .set('api_key', teacherToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventName: 'DSA class',
        eventType: 'class',
        roomId,
        startDate: currentDate,
        endDate: currentDate,
        startTime: currentTime,
        endTime,
      });

    expect(res.statusCode).to.equal(201);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['message']);
    expect(res.body.message).to.equal('Event has been updated successfully.');
  });

  it('update an event - same room, new start and end time: successful', async () => {
    const thisDateTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Helsinki' }));
    const thisStartDate = `${thisDateTime.getFullYear()}-${('0' + (thisDateTime.getMonth() + 1)).slice(-2)}-${('0' + thisDateTime.getDate()).slice(-2)}`; // eslint-disable-line prefer-template
    const thisStartTime = `${('0' + thisDateTime.getHours()).slice(-2)}:${('0' + thisDateTime.getMinutes()).slice(-2)}:${('0' + thisDateTime.getSeconds()).slice(-2)}`; // eslint-disable-line prefer-template

    thisDateTime.setMinutes(thisDateTime.getMinutes() + 10);
    const thisEndTime = `${('0' + thisDateTime.getHours()).slice(-2)}:${('0' + thisDateTime.getMinutes()).slice(-2)}:${('0' + thisDateTime.getSeconds()).slice(-2)}`; // eslint-disable-line prefer-template
    const res = await server
      .put(`/event/${eventId}`)
      .set('api_key', teacherToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventName: 'DSA class',
        eventType: 'class',
        roomId,
        startDate: thisStartDate,
        endDate: thisStartDate,
        startTime: thisStartTime,
        endTime: thisEndTime,
      });
    expect(res.statusCode).to.equal(201);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['message']);
    expect(res.body.message).to.equal('Event has been updated successfully.');
  });

  it('update an event - conflict with other events room, start and end time: failed', async () => {
    const res = await server
      .put(`/event/${eventId}`)
      .set('api_key', teacherToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventName: 'DSA class',
        eventType: 'class',
        roomId: roomId2,
        startDate: currentDate2,
        endDate: currentDate2,
        startTime: currentTime2,
        endTime: endTime2,
      });

    expect(res.statusCode).to.equal(404);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['error']);
    expect(res.body.error).to.equal('This room has been occupied by other event in the same time.');
  });

  it('assign event to teacher who already assigned in another event at the same time: failed', async () => {
    const res = await server
      .put(`/event/${eventId}`)
      .set('api_key', teacherToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventName: 'DSA class',
        eventType: 'class',
        roomId: roomId2,
        startDate: currentDate2,
        endDate: currentDate2,
        startTime: currentTime2,
        endTime: endTime2,
      });

    expect(res.statusCode).to.equal(404);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['error']);
    expect(res.body.error).to.equal('This room has been occupied by other event in the same time.');
  });

  it('update an event - with other events room, but different start and end time: succeded', async () => {
    const thisDateTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Helsinki' }));
    const thisStartDate = `${thisDateTime.getFullYear()}-${('0' + (thisDateTime.getMonth() + 1)).slice(-2)}-${('0' + thisDateTime.getDate()).slice(-2)}`; // eslint-disable-line prefer-template
    const thisStartTime = `${('0' + thisDateTime.getHours()).slice(-2)}:${('0' + thisDateTime.getMinutes()).slice(-2)}:${('0' + thisDateTime.getSeconds()).slice(-2)}`; // eslint-disable-line prefer-template

    thisDateTime.setMinutes(thisDateTime.getMinutes() + 10);
    const thisEndTime = `${('0' + thisDateTime.getHours()).slice(-2)}:${('0' + thisDateTime.getMinutes()).slice(-2)}:${('0' + thisDateTime.getSeconds()).slice(-2)}`; // eslint-disable-line prefer-template
    const res = await server
      .put(`/event/${eventId}`)
      .set('api_key', teacherToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventName: 'DSA class',
        eventType: 'class',
        roomId: roomId2,
        startDate: thisStartDate,
        endDate: thisStartDate,
        startTime: thisStartTime,
        endTime: thisEndTime,
      });
    expect(res.statusCode).to.equal(201);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['message']);
    expect(res.body.message).to.equal('Event has been updated successfully.');
  });

  it('update an event - not as course personal: failed', async () => {
    const thisDateTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Helsinki' }));
    const thisStartDate = `${thisDateTime.getFullYear()}-${('0' + (thisDateTime.getMonth() + 1)).slice(-2)}-${('0' + thisDateTime.getDate()).slice(-2)}`; // eslint-disable-line prefer-template
    const thisStartTime = `${('0' + thisDateTime.getHours()).slice(-2)}:${('0' + thisDateTime.getMinutes()).slice(-2)}:${('0' + thisDateTime.getSeconds()).slice(-2)}`; // eslint-disable-line prefer-template

    thisDateTime.setMinutes(thisDateTime.getMinutes() + 10);
    const thisEndTime = `${('0' + thisDateTime.getHours()).slice(-2)}:${('0' + thisDateTime.getMinutes()).slice(-2)}:${('0' + thisDateTime.getSeconds()).slice(-2)}`; // eslint-disable-line prefer-template
    const res = await server
      .put(`/event/${eventId}`)
      .set('api_key', teacherToken2)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventName: 'DSA class',
        eventType: 'class',
        roomId: roomId2,
        startDate: thisStartDate,
        endDate: thisStartDate,
        startTime: thisStartTime,
        endTime: thisEndTime,
      });
    expect(res.statusCode).to.equal(404);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['error']);
    expect(res.body.error).to.equal('User who is updating this event is not related to given course');
  });

  it('update an event - event personal not in course personal: failed', async () => {
    const thisDateTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Helsinki' }));
    const thisStartDate = `${thisDateTime.getFullYear()}-${('0' + (thisDateTime.getMonth() + 1)).slice(-2)}-${('0' + thisDateTime.getDate()).slice(-2)}`; // eslint-disable-line prefer-template
    const thisStartTime = `${('0' + thisDateTime.getHours()).slice(-2)}:${('0' + thisDateTime.getMinutes()).slice(-2)}:${('0' + thisDateTime.getSeconds()).slice(-2)}`; // eslint-disable-line prefer-template

    thisDateTime.setMinutes(thisDateTime.getMinutes() + 10);
    const thisEndTime = `${('0' + thisDateTime.getHours()).slice(-2)}:${('0' + thisDateTime.getMinutes()).slice(-2)}:${('0' + thisDateTime.getSeconds()).slice(-2)}`; // eslint-disable-line prefer-template
    const res = await server
      .put(`/event/${eventId}`)
      .set('api_key', teacherToken2)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId2,
        eventName: 'DSA class',
        eventType: 'class',
        roomId: roomId2,
        startDate: thisStartDate,
        endDate: thisStartDate,
        startTime: thisStartTime,
        endTime: thisEndTime,
      });
    expect(res.statusCode).to.equal(404);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['error']);
    expect(res.body.error).to.equal('The event personal is not found in this course personal list');
  });

  it('update an event - start date time greater that end date time: failed', async () => {
    const thisDateTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Helsinki' }));
    const thisStartDate = `${thisDateTime.getFullYear()}-${('0' + (thisDateTime.getMonth() + 1)).slice(-2)}-${('0' + thisDateTime.getDate()).slice(-2)}`; // eslint-disable-line prefer-template
    const thisStartTime = `${('0' + thisDateTime.getHours()).slice(-2)}:${('0' + thisDateTime.getMinutes()).slice(-2)}:${('0' + thisDateTime.getSeconds()).slice(-2)}`; // eslint-disable-line prefer-template

    thisDateTime.setMinutes(thisDateTime.getMinutes() + 10);
    const thisEndTime = `${('0' + thisDateTime.getHours()).slice(-2)}:${('0' + thisDateTime.getMinutes()).slice(-2)}:${('0' + thisDateTime.getSeconds()).slice(-2)}`; // eslint-disable-line prefer-template
    const res = await server
      .put(`/event/${eventId}`)
      .set('api_key', teacherToken2)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId2,
        eventName: 'DSA class',
        eventType: 'class',
        roomId: roomId2,
        startDate: thisStartDate,
        endDate: thisStartDate,
        startTime: thisEndTime,
        endTime: thisStartTime,
      });
    expect(res.statusCode).to.equal(404);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['error']);
    expect(res.body.error).to.equal('start date_time should be smaller than end date_time.');
  });

  it('update an event - additinal property: failed', async () => {
    const thisDateTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Helsinki' }));
    const thisStartDate = `${thisDateTime.getFullYear()}-${('0' + (thisDateTime.getMonth() + 1)).slice(-2)}-${('0' + thisDateTime.getDate()).slice(-2)}`; // eslint-disable-line prefer-template
    const thisStartTime = `${('0' + thisDateTime.getHours()).slice(-2)}:${('0' + thisDateTime.getMinutes()).slice(-2)}:${('0' + thisDateTime.getSeconds()).slice(-2)}`; // eslint-disable-line prefer-template

    thisDateTime.setMinutes(thisDateTime.getMinutes() + 10);
    const thisEndTime = `${('0' + thisDateTime.getHours()).slice(-2)}:${('0' + thisDateTime.getMinutes()).slice(-2)}:${('0' + thisDateTime.getSeconds()).slice(-2)}`; // eslint-disable-line prefer-template
    const res = await server
      .put(`/event/${eventId}`)
      .set('api_key', teacherToken2)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId2,
        eventName: 'DSA class',
        eventType: 'class',
        roomId: roomId2,
        startDate: thisStartDate,
        endDate: thisStartDate,
        startTime: thisEndTime,
        endTime: thisStartTime,
        extra: 'extra',
      });
    expect(res.statusCode).to.equal(400);
  });

  it('update an event - missing required property: failed', async () => {
    const thisDateTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Helsinki' }));
    const thisStartDate = `${thisDateTime.getFullYear()}-${('0' + (thisDateTime.getMonth() + 1)).slice(-2)}-${('0' + thisDateTime.getDate()).slice(-2)}`; // eslint-disable-line prefer-template
    const thisStartTime = `${('0' + thisDateTime.getHours()).slice(-2)}:${('0' + thisDateTime.getMinutes()).slice(-2)}:${('0' + thisDateTime.getSeconds()).slice(-2)}`; // eslint-disable-line prefer-template

    thisDateTime.setMinutes(thisDateTime.getMinutes() + 10);
    const res = await server
      .put(`/event/${eventId}`)
      .set('api_key', teacherToken2)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventName: 'DSA class',
        eventType: 'class',
        roomId: roomId2,
        startDate: thisStartDate,
        endDate: thisStartDate,
        startTime: thisStartTime,
      });
    expect(res.statusCode).to.equal(400);
  });

  it('update an event - non exists course id: failed', async () => {
    const thisDateTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Helsinki' }));
    const thisStartDate = `${thisDateTime.getFullYear()}-${('0' + (thisDateTime.getMonth() + 1)).slice(-2)}-${('0' + thisDateTime.getDate()).slice(-2)}`; // eslint-disable-line prefer-template
    const thisStartTime = `${('0' + thisDateTime.getHours()).slice(-2)}:${('0' + thisDateTime.getMinutes()).slice(-2)}:${('0' + thisDateTime.getSeconds()).slice(-2)}`; // eslint-disable-line prefer-template

    thisDateTime.setMinutes(thisDateTime.getMinutes() + 10);
    const thisEndTime = `${('0' + thisDateTime.getHours()).slice(-2)}:${('0' + thisDateTime.getMinutes()).slice(-2)}:${('0' + thisDateTime.getSeconds()).slice(-2)}`; // eslint-disable-line prefer-template

    const id = generateRandom([courseId, courseId2]);
    const res = await server
      .put(`/event/${eventId}`)
      .set('api_key', teacherToken2)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId: id,
        eventPersonal: teacherId1,
        eventName: 'DSA class',
        eventType: 'class',
        roomId: roomId2,
        startDate: thisStartDate,
        endDate: thisStartDate,
        startTime: thisStartTime,
        endTime: thisEndTime,
      });
    expect(res.statusCode).to.equal(404);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['error']);
    expect(res.body.error).to.equal('Course not found');
  });

  it('update an event - non exists room id: failed', async () => {
    const thisDateTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Helsinki' }));
    const thisStartDate = `${thisDateTime.getFullYear()}-${('0' + (thisDateTime.getMonth() + 1)).slice(-2)}-${('0' + thisDateTime.getDate()).slice(-2)}`; // eslint-disable-line prefer-template
    const thisStartTime = `${('0' + thisDateTime.getHours()).slice(-2)}:${('0' + thisDateTime.getMinutes()).slice(-2)}:${('0' + thisDateTime.getSeconds()).slice(-2)}`; // eslint-disable-line prefer-template

    thisDateTime.setMinutes(thisDateTime.getMinutes() + 10);
    const thisEndTime = `${('0' + thisDateTime.getHours()).slice(-2)}:${('0' + thisDateTime.getMinutes()).slice(-2)}:${('0' + thisDateTime.getSeconds()).slice(-2)}`; // eslint-disable-line prefer-template

    const id = generateRandom([roomId, roomId2]);
    const res = await server
      .put(`/event/${eventId}`)
      .set('api_key', teacherToken2)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        courseId,
        eventPersonal: teacherId1,
        eventName: 'DSA class',
        eventType: 'class',
        roomId: id,
        startDate: thisStartDate,
        endDate: thisStartDate,
        startTime: thisStartTime,
        endTime: thisEndTime,
      });
    expect(res.statusCode).to.equal(404);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['error']);
    expect(res.body.error).to.equal('Room not found');
  });
});
