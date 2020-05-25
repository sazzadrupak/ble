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
const room = [
  { name: 'TC-110' },
  { name: 'TC-111' },
];
const beacon = [
  { macAddress: '7C:D1:C3:19:BC:EA' },
  { macAddress: '7C:D1:C3:19:BC:EB' },
  { macAddress: '7C:D1:C3:19:BC:01' },
  { macAddress: '7C:D1:C3:19:BC:02' },
];

let course1;
describe('Check /attendance/searchBeacon POST', () => {
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
  });

  after(async () => {
    await pool.query('DELETE FROM room where created_by = $1', [userId]);
    await pool.query('DELETE FROM beacon where created_by = $1', [userId]);
    await pool.query('DELETE FROM course where created_by = $1', [userId]);
    await Promise.all([userId, teacherId, teacherId2].map((id) => pool.query('DELETE FROM users where id = $1', [id])));
  });

  describe('one event', () => {
    let eventId;
    before(async () => {
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
    });

    after(async () => {
      await pool.query('TRUNCATE beacon_room CASCADE');
      await pool.query('TRUNCATE event CASCADE');
    });

    it('with one mac address', async () => {
      await Promise.all([...Array(1000).keys()].map(async () => {
        const res = await server
          .post('/attendance/searchBeacon')
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json')
          .set('Cache-Control', 'no-cache')
          .send([
            '7C:D1:C3:19:BC:EA',
          ]);
        expect(res.statusCode).to.equal(201);
        expect(res.body).to.be.an('array');
        expect(res.body.length).to.equal(1);
        expect(res.body[0]).to.have.keys(['event_id', 'course_name', 'room_name']);
        expect(res.body[0].event_id).to.equal(eventId);
        expect(res.body[0].course_name).to.equal('Data Structures and Algorithms');
        expect(res.body[0].room_name).to.equal('TC-110');
      }));
    });

    it('with two mac address', async () => {
      await Promise.all([...Array(1000).keys()].map(async () => {
        const res = await server
          .post('/attendance/searchBeacon')
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json')
          .set('Cache-Control', 'no-cache')
          .send([
            '7C:D1:C3:19:BC:EA',
            '7C:D1:C3:19:BC:EB',
          ]);
        expect(res.statusCode).to.equal(201);
        expect(res.body).to.be.an('array');
        expect(res.body.length).to.equal(1);
        expect(res.body[0]).to.have.keys(['event_id', 'course_name', 'room_name']);
        expect(res.body[0].event_id).to.equal(eventId);
        expect(res.body[0].course_name).to.equal('Data Structures and Algorithms');
        expect(res.body[0].room_name).to.equal('TC-110');
      }));
    });

    it('with three mac address', async () => {
      await Promise.all([...Array(1000).keys()].map(async () => {
        const res = await server
          .post('/attendance/searchBeacon')
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json')
          .set('Cache-Control', 'no-cache')
          .send([
            '7C:D1:C3:19:BC:EA',
            '7C:D1:C3:19:BC:EB',
            '7C:D1:C3:19:BC:EC',
          ]);
        expect(res.statusCode).to.equal(201);
        expect(res.body).to.be.an('array');
        expect(res.body.length).to.equal(1);
        expect(res.body[0]).to.have.keys(['event_id', 'course_name', 'room_name']);
        expect(res.body[0].event_id).to.equal(eventId);
        expect(res.body[0].course_name).to.equal('Data Structures and Algorithms');
        expect(res.body[0].room_name).to.equal('TC-110');
      }));
    });

    it('with same mac address', async () => {
      await Promise.all([...Array(1000).keys()].map(async () => {
        const res = await server
          .post('/attendance/searchBeacon')
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json')
          .set('Cache-Control', 'no-cache')
          .send([
            '7C:D1:C3:19:BC:EA',
            '7C:D1:C3:19:BC:EA',
          ]);
        expect(res.statusCode).to.equal(201);
        expect(res.body).to.be.an('array');
        expect(res.body.length).to.equal(1);
        expect(res.body[0]).to.have.keys(['event_id', 'course_name', 'room_name']);
        expect(res.body[0].event_id).to.equal(eventId);
        expect(res.body[0].course_name).to.equal('Data Structures and Algorithms');
        expect(res.body[0].room_name).to.equal('TC-110');
      }));
    });

    it('with no mac address', async () => {
      await Promise.all([...Array(1000).keys()].map(async () => {
        const res = await server
          .post('/attendance/searchBeacon')
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json')
          .set('Cache-Control', 'no-cache')
          .send();
        expect(res.statusCode).to.equal(400);
      }));
    });

    it('with no association mac address', async () => {
      await Promise.all([...Array(1000).keys()].map(async () => {
        const res = await server
          .post('/attendance/searchBeacon')
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json')
          .set('Cache-Control', 'no-cache')
          .send([
            '7C:D1:C3:19:BC:EB',
            '7C:D1:C3:19:BC:EC',
          ]);
        expect(res.statusCode).to.equal(404);
        expect(res.body).to.be.an('object');
        expect(res.body).to.have.keys(['error']);
        expect(res.body.error).to.equal('No room found associated with any given beacon.');
      }));
    });
  });

  describe('one event: one room, two beacon', () => {
    let eventId;
    before(async () => {
      const body = [{ beaconId }, { beaconId: beaconId2 }];
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
    });

    after(async () => {
      await pool.query('TRUNCATE beacon_room CASCADE');
      await pool.query('TRUNCATE event CASCADE');
    });

    it('with one mac address', async () => {
      await Promise.all([...Array(1000).keys()].map(async () => {
        const res = await server
          .post('/attendance/searchBeacon')
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json')
          .set('Cache-Control', 'no-cache')
          .send([
            '7C:D1:C3:19:BC:EA',
          ]);
        expect(res.statusCode).to.equal(201);
        expect(res.body).to.be.an('array');
        expect(res.body.length).to.equal(1);
        expect(res.body[0]).to.have.keys(['event_id', 'course_name', 'room_name']);
        expect(res.body[0].event_id).to.equal(eventId);
        expect(res.body[0].course_name).to.equal('Data Structures and Algorithms');
        expect(res.body[0].room_name).to.equal('TC-110');
      }));
    });

    it('with two mac address', async () => {
      await Promise.all([...Array(1000).keys()].map(async () => {
        const res = await server
          .post('/attendance/searchBeacon')
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json')
          .set('Cache-Control', 'no-cache')
          .send([
            '7C:D1:C3:19:BC:EA',
            '7C:D1:C3:19:BC:EB',
          ]);
        expect(res.statusCode).to.equal(201);
        expect(res.body).to.be.an('array');
        expect(res.body.length).to.equal(1);
        expect(res.body[0]).to.have.keys(['event_id', 'course_name', 'room_name']);
        expect(res.body[0].event_id).to.equal(eventId);
        expect(res.body[0].course_name).to.equal('Data Structures and Algorithms');
        expect(res.body[0].room_name).to.equal('TC-110');
      }));
    });

    it('with three mac address', async () => {
      await Promise.all([...Array(1000).keys()].map(async () => {
        const res = await server
          .post('/attendance/searchBeacon')
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json')
          .set('Cache-Control', 'no-cache')
          .send([
            '7C:D1:C3:19:BC:EA',
            '7C:D1:C3:19:BC:EB',
            '7C:D1:C3:19:BC:EC',
          ]);
        expect(res.statusCode).to.equal(201);
        expect(res.body).to.be.an('array');
        expect(res.body.length).to.equal(1);
        expect(res.body[0]).to.have.keys(['event_id', 'course_name', 'room_name']);
        expect(res.body[0].event_id).to.equal(eventId);
        expect(res.body[0].course_name).to.equal('Data Structures and Algorithms');
        expect(res.body[0].room_name).to.equal('TC-110');
      }));
    });

    it('with same mac address', async () => {
      await Promise.all([...Array(1000).keys()].map(async () => {
        const res = await server
          .post('/attendance/searchBeacon')
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json')
          .set('Cache-Control', 'no-cache')
          .send([
            '7C:D1:C3:19:BC:EA',
            '7C:D1:C3:19:BC:EA',
          ]);
        expect(res.statusCode).to.equal(201);
        expect(res.body).to.be.an('array');
        expect(res.body.length).to.equal(1);
        expect(res.body[0]).to.have.keys(['event_id', 'course_name', 'room_name']);
        expect(res.body[0].event_id).to.equal(eventId);
        expect(res.body[0].course_name).to.equal('Data Structures and Algorithms');
        expect(res.body[0].room_name).to.equal('TC-110');
      }));
    });

    it('with no mac address', async () => {
      await Promise.all([...Array(1000).keys()].map(async () => {
        const res = await server
          .post('/attendance/searchBeacon')
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json')
          .set('Cache-Control', 'no-cache')
          .send();
        expect(res.statusCode).to.equal(400);
      }));
    });

    it('with no association mac address', async () => {
      await Promise.all([...Array(1000).keys()].map(async () => {
        const res = await server
          .post('/attendance/searchBeacon')
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json')
          .set('Cache-Control', 'no-cache')
          .send([
            '7C:D1:C3:19:BC:ED',
            '7C:D1:C3:19:BC:EC',
          ]);
        expect(res.statusCode).to.equal(404);
        expect(res.body).to.be.an('object');
        expect(res.body).to.have.keys(['error']);
        expect(res.body.error).to.equal('No room found associated with any given beacon.');
      }));
    });
  });

  describe('two event: one beacon', () => {
    let eventId1;
    before(async () => {
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

      const teacher1Events = await getEvents(teacherToken);
      eventId1 = teacher1Events[0].id;
      await server
        .put(`/event/eventStatus/${eventId1}`)
        .set('api_key', teacherToken)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache');

      await addEvent(teacherToken2, {
        courseId,
        eventPersonal: teacherId2,
        eventName: 'DSA lecture',
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
    });

    after(async () => {
      await pool.query('TRUNCATE beacon_room CASCADE');
      await pool.query('TRUNCATE event CASCADE');
    });

    it('one mac address: one event show', async () => {
      await Promise.all([...Array(1000).keys()].map(async () => {
        const res = await server
          .post('/attendance/searchBeacon')
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json')
          .set('Cache-Control', 'no-cache')
          .send([
            '7C:D1:C3:19:BC:EA',
          ]);
        expect(res.statusCode).to.equal(201);
        expect(res.body).to.be.an('array');
        expect(res.body.length).to.equal(1);
        expect(res.body[0]).to.have.keys(['event_id', 'course_name', 'room_name']);
        expect(res.body[0].event_id).to.equal(eventId1);
        expect(res.body[0].course_name).to.equal('Data Structures and Algorithms');
        expect(res.body[0].room_name).to.equal('TC-110');
      }));
    });

    it('one right room beacon, other another rooms beacon', async () => {
      await Promise.all([...Array(1000).keys()].map(async () => {
        const res = await server
          .post('/attendance/searchBeacon')
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json')
          .set('Cache-Control', 'no-cache')
          .send([
            '7C:D1:C3:19:BC:EA',
            '7C:D1:C3:19:BC:EB',
          ]);
        expect(res.statusCode).to.equal(201);
        expect(res.body).to.be.an('array');
        expect(res.body.length).to.equal(1);
        expect(res.body[0]).to.have.keys(['event_id', 'course_name', 'room_name']);
        expect(res.body[0].event_id).to.equal(eventId1);
        expect(res.body[0].course_name).to.equal('Data Structures and Algorithms');
        expect(res.body[0].room_name).to.equal('TC-110');
      }));
    });

    it('with same mac address', async () => {
      await Promise.all([...Array(1000).keys()].map(async () => {
        const res = await server
          .post('/attendance/searchBeacon')
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json')
          .set('Cache-Control', 'no-cache')
          .send([
            '7C:D1:C3:19:BC:EA',
            '7C:D1:C3:19:BC:EA',
          ]);
        expect(res.statusCode).to.equal(201);
        expect(res.body).to.be.an('array');
        expect(res.body.length).to.equal(1);
        expect(res.body[0]).to.have.keys(['event_id', 'course_name', 'room_name']);
        expect(res.body[0].event_id).to.equal(eventId1);
        expect(res.body[0].course_name).to.equal('Data Structures and Algorithms');
        expect(res.body[0].room_name).to.equal('TC-110');
      }));
    });

    it('Two active event: post one mac address -  shows one event', async () => {
      let teacher2Events = await getEvents(teacherToken2);
      teacher2Events = teacher2Events.filter((event) => event.eventPersonal === teacherId2);
      const eventId = teacher2Events[0].id;
      await server
        .put(`/event/eventStatus/${eventId}`)
        .set('api_key', teacherToken2)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache');

      await Promise.all([...Array(1000).keys()].map(async () => {
        const res = await server
          .post('/attendance/searchBeacon')
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json')
          .set('Cache-Control', 'no-cache')
          .send([
            '7C:D1:C3:19:BC:EA',
            '7C:D1:C3:19:BC:EA',
          ]);
        expect(res.statusCode).to.equal(201);
        expect(res.body).to.be.an('array');
        expect(res.body.length).to.equal(1);
        expect(res.body[0]).to.have.keys(['event_id', 'course_name', 'room_name']);
        expect(res.body[0].event_id).to.equal(eventId1);
        expect(res.body[0].course_name).to.equal('Data Structures and Algorithms');
        expect(res.body[0].room_name).to.equal('TC-110');
      }));

      await server
        .put(`/event/eventStatus/${eventId}`)
        .set('api_key', teacherToken2)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache');
    });

    it('Two active event: post two mac address -  shows both event', async () => {
      let teacher2Events = await getEvents(teacherToken2);
      teacher2Events = teacher2Events.filter((event) => event.eventPersonal === teacherId2);
      const eventId = teacher2Events[0].id;
      await server
        .put(`/event/eventStatus/${eventId}`)
        .set('api_key', teacherToken2)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache');

      await Promise.all([...Array(1000).keys()].map(async () => {
        const res = await server
          .post('/attendance/searchBeacon')
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json')
          .set('Cache-Control', 'no-cache')
          .send([
            '7C:D1:C3:19:BC:EA',
            '7C:D1:C3:19:BC:EB',
          ]);
        expect(res.statusCode).to.equal(201);
        expect(res.body).to.be.an('array');
        expect(res.body.length).to.equal(2);

        res.body.forEach((element) => {
          expect(element).to.be.an('object');
          expect(element).to.have.keys(['event_id', 'course_name', 'room_name']);
          expect(['Data Structures and Algorithms', 'ww2']).to.include(element.course_name);
          expect(['TC-110', 'TC-111']).to.include(element.room_name);
        });
      }));

      await server
        .put(`/event/eventStatus/${eventId}`)
        .set('api_key', teacherToken)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache');
    });
  });
});
