/* eslint-env jest */
/* global before, after */
const chai = require('chai');
const _ = require('lodash');
const supertest = require('supertest');

const { expect } = chai;
const server = supertest.agent(`http://${process.env.TEST_HOST}:8080/v1`);
const { pool } = require('../../../db/init');
// const { generateRandom } = require('../../../utils/random_number');
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
let roomId2;
let beaconId;
let courseId;
let courseId2;
let currentDate;
let currentTime;
let currentDateTime;
let endTime;
let endDate;
let currentDate2;
let currentDate3;
let currentTime2;
let currentTime3;
let endDate2;
let endDate3;
let endTime2;
let endTime3;
const room = [
  { name: 'TC-110' },
  { name: 'TC-111' },
];
const beacon = [
  { macAddress: '7C:D1:C3:19:BC:EA' },
  { macAddress: '7C:D1:C3:19:BC:EB' },
];

let course1;
let course2;
describe('Check /eventSumByPersonal GET', () => {
  before(async () => {
    adminToken = await testAdminUserSignUp();
    userId = await getUserId(adminToken);

    roomId = parseInt(await addRoom(adminToken, room[0]), 10);
    roomId2 = parseInt(await addRoom(adminToken, room[1]), 10);
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

    course1 = {
      courseCode: 'TIE-20106',
      courseName: 'Data Structures and Algorithms',
      coursePersonal: [teacherId],
    };
    courseId = parseInt(await addCourse(adminToken, course1), 10);

    course2 = {
      courseCode: 'TIE-23156',
      courseName: 'WW2',
      coursePersonal: [teacherId],
    };
    courseId2 = parseInt(await addCourse(adminToken, course2), 10);

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

    currentDateTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Helsinki' }));
    currentDate = `${currentDateTime.getFullYear()}-${('0' + (currentDateTime.getMonth() + 1)).slice(-2)}-${('0' + currentDateTime.getDate()).slice(-2)}`; // eslint-disable-line prefer-template
    currentTime = `${('0' + currentDateTime.getHours()).slice(-2)}:${('0' + currentDateTime.getMinutes()).slice(-2)}:${('0' + currentDateTime.getSeconds()).slice(-2)}`; // eslint-disable-line prefer-template

    currentDateTime.setDate(currentDateTime.getDate() + 15);
    endDate = `${currentDateTime.getFullYear()}-${('0' + (currentDateTime.getMonth() + 1)).slice(-2)}-${('0' + currentDateTime.getDate()).slice(-2)}`; // eslint-disable-line prefer-template
    currentDateTime.setMinutes(currentDateTime.getMinutes() + 10);
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
      recurrent: true,
      everyAfter: 5,
      everyAfterType: 'day',
    });

    currentDateTime.setHours(currentDateTime.getHours() + 1);
    currentDate2 = `${currentDateTime.getFullYear()}-${('0' + (currentDateTime.getMonth() + 1)).slice(-2)}-${('0' + currentDateTime.getDate()).slice(-2)}`; // eslint-disable-line prefer-template
    currentTime2 = `${('0' + currentDateTime.getHours()).slice(-2)}:${('0' + currentDateTime.getMinutes()).slice(-2)}:${('0' + currentDateTime.getSeconds()).slice(-2)}`; // eslint-disable-line prefer-template
    currentDateTime.setDate(currentDateTime.getDate() + 15);
    endDate2 = `${currentDateTime.getFullYear()}-${('0' + (currentDateTime.getMonth() + 1)).slice(-2)}-${('0' + currentDateTime.getDate()).slice(-2)}`; // eslint-disable-line prefer-template
    currentDateTime.setMinutes(currentDateTime.getMinutes() + 10);
    endTime2 = `${('0' + currentDateTime.getHours()).slice(-2)}:${('0' + currentDateTime.getMinutes()).slice(-2)}:${('0' + currentDateTime.getSeconds()).slice(-2)}`; // eslint-disable-line prefer-template

    await addEvent(teacherToken, {
      courseId,
      eventPersonal: teacherId,
      eventName: 'DSA exercise',
      eventType: 'exercise',
      roomId: roomId2,
      startDate: currentDate2,
      endDate: endDate2,
      startTime: currentTime2,
      endTime: endTime2,
      recurrent: true,
      everyAfter: 5,
      everyAfterType: 'day',
    });

    currentDateTime.setDate(currentDateTime.getDate() - 25);
    currentDateTime.setHours(currentDateTime.getHours() + 1);
    currentDate3 = `${currentDateTime.getFullYear()}-${('0' + (currentDateTime.getMonth() + 1)).slice(-2)}-${('0' + currentDateTime.getDate()).slice(-2)}`; // eslint-disable-line prefer-template
    currentTime3 = `${('0' + currentDateTime.getHours()).slice(-2)}:${('0' + currentDateTime.getMinutes()).slice(-2)}:${('0' + currentDateTime.getSeconds()).slice(-2)}`; // eslint-disable-line prefer-template
    currentDateTime.setDate(currentDateTime.getDate() + 15);
    endDate3 = `${currentDateTime.getFullYear()}-${('0' + (currentDateTime.getMonth() + 1)).slice(-2)}-${('0' + currentDateTime.getDate()).slice(-2)}`; // eslint-disable-line prefer-template
    currentDateTime.setMinutes(currentDateTime.getMinutes() + 10);
    endTime3 = `${('0' + currentDateTime.getHours()).slice(-2)}:${('0' + currentDateTime.getMinutes()).slice(-2)}:${('0' + currentDateTime.getSeconds()).slice(-2)}`; // eslint-disable-line prefer-template

    await addEvent(teacherToken, {
      courseId: courseId2,
      eventPersonal: teacherId,
      eventName: 'Web two',
      eventType: 'class',
      roomId: roomId2,
      startDate: currentDate3,
      endDate: endDate3,
      startTime: currentTime3,
      endTime: endTime3,
      recurrent: true,
      everyAfter: 5,
      everyAfterType: 'day',
    });

    await addEvent(teacherToken, {
      courseId: courseId2,
      eventPersonal: teacherId,
      eventName: 'Web two',
      eventType: 'exercise',
      roomId: roomId2,
      startDate: '2020-01-24',
      endDate: '2020-01-24',
      startTime: '12:00:00',
      endTime: '14:00:00',
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
    await Promise.all([userId, teacherId, teacherId2, studentId].map((id) => pool.query('DELETE FROM users where id = $1', [id])));
  });

  it('get events summary for valid teacher: successful', async () => {
    const res = await server
      .get('/eventSumByPersonal')
      .set('api_key', teacherToken)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache');

    expect(res.statusCode).to.equal(200);
    expect(res.body).to.be.an('array');
    // console.log('BEFORE:\n', JSON.stringify(res.body, null, 2));
    _.each(res.body, (item) => {
      expect(item).to.be.an('object');
      expect(item).to.have.keys(['course_code', 'course_id', 'course_name', 'event_type']);
      if (item.course_code === 'TIE-20106') {
        expect(item.course_name).to.equal(course1.courseName);
        _.each(item.event_type, (type) => {
          expect(type).to.be.an('object');
          expect(type).to.have.keys(['type', 'total_event', 'next_event', 'next_event_id', 'room_name']);
          expect(['class', 'exercise']).to.include(type.type);
          expect(type.total_event).to.equal(4);
          expect(type.next_event).to.not.equal(null);
          expect(type.next_event_id).to.not.equal(null);
          expect(type.room_name).to.not.equal(null);
        });
      } else {
        expect(item.course_name).to.equal(course2.courseName);
        _.each(item.event_type, (type) => {
          expect(type).to.be.an('object');
          expect(type).to.have.keys(['type', 'total_event', 'next_event', 'next_event_id', 'room_name']);
          expect(['class', 'exercise']).to.include(type.type);
          if (type.type === 'class') {
            expect(type.total_event).to.equal(4);
            expect(type.next_event).to.not.equal('');
            expect(type.next_event_id).to.not.equal('');
            expect(type.room_name).to.not.equal('');
          } else {
            expect(type.total_event).to.equal(1);
            expect(type.next_event).to.equal('');
            expect(type.next_event_id).to.equal('');
            expect(type.room_name).to.equal('');
          }
        });
      }
    });
  });

  it('get events summary for teacher who does not have any event ', async () => {
    const res = await server
      .get('/eventSumByPersonal')
      .set('api_key', teacherToken2)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache');

    expect(res.statusCode).to.equal(200);
    expect(res.body).to.be.an('object');
    expect(res.body).to.have.keys(['message']);
    expect(res.body.message).to.include('No event found');
  });
});
