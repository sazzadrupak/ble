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
} = require('../../utils/db_utils');

let token;
let userId;
const rooms = [
  { name: 'TC-110' },
  { name: 'TC-111' },
];

const beacons = [
  { macAddress: '7C:D1:C3:19:BC:EA' },
  { macAddress: '7C:D1:C3:19:BC:EB' },
  { macAddress: '7C:D1:C3:19:BC:EC' },
];
let roomId1;
let roomId2;
let beacon1;
let beacon2;
let beacon3;
describe('Check /beaconRoom/{roomId} POST', () => {
  describe('admin user', () => {
    before(async () => {
      token = await testAdminUserSignUp();
      userId = await getUserId(token);

      roomId1 = parseInt(await addRoom(token, rooms[0]), 10);
      roomId2 = parseInt(await addRoom(token, rooms[1]), 10);

      beacon1 = parseInt(await addBeacon(token, beacons[0]), 10);
      beacon2 = parseInt(await addBeacon(token, beacons[1]), 10);
      beacon3 = parseInt(await addBeacon(token, beacons[2]), 10);
    });

    after(async () => {
      await pool.query('DELETE FROM room where created_by = $1', [userId]);
      await pool.query('DELETE FROM beacon where created_by = $1', [userId]);
      await pool.query('DELETE FROM users where id = $1', [userId]);
    });


    afterEach(async () => {
      await pool.query('TRUNCATE beacon_room CASCADE');
    });

    it('add association for roomID1: succeed', async () => {
      const body = [
        { beaconId: beacon1 },
        { beaconId: beacon2 },
      ];

      const res = await server
        .post(`/beaconRoom/${roomId1}`)
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send(body);

      expect(res.statusCode).to.equal(201);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.keys(['message']);
      expect(res.body.message).to.include('2 associations has been added');
    });

    it('add association for roomID2: succeed', async () => {
      const body = [
        { beaconId: beacon3 },
      ];

      const res = await server
        .post(`/beaconRoom/${roomId2}`)
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send(body);

      expect(res.statusCode).to.equal(201);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.keys(['message']);
      expect(res.body.message).to.include('1 associations has been added');
    });

    it('add association for roomID2 with occupied beacon roomID1: failed', async () => {
      const body = [
        { beaconId: beacon1 },
      ];

      const res = await server
        .post(`/beaconRoom/${roomId1}`)
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send(body);
      expect(res.statusCode).to.equal(201);

      const newRes = await server
        .post(`/beaconRoom/${roomId2}`)
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send(body);

      expect(newRes.statusCode).to.equal(404);
      expect(newRes.body).to.be.an('object');
      expect(newRes.body).to.have.keys(['error']);
      expect(newRes.body.error).to.include(`Key (beacon_id)=(${beacon1}) already exists.`);
    });

    it('add association for roomID1 with occupied beacon by own: failed', async () => {
      const body = [
        { beaconId: beacon1 },
      ];

      const res = await server
        .post(`/beaconRoom/${roomId1}`)
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send(body);

      expect(res.statusCode).to.equal(201);

      const newRes = await server
        .post(`/beaconRoom/${roomId1}`)
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send(body);

      expect(newRes.statusCode).to.equal(404);
      expect(newRes.body).to.be.an('object');
      expect(newRes.body).to.have.keys(['error']);
      expect(newRes.body.error).to.include(`Key (beacon_id, room_id)=(${beacon1}, ${roomId1}) already exists.`);
    });

    it('add association for non-exists roomID: failed', async () => {
      const roomId = generateRandom([roomId1, roomId2]);
      const body = [
        { beaconId: beacon2 },
      ];

      const res = await server
        .post(`/beaconRoom/${roomId}`)
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send(body);

      expect(res.statusCode).to.equal(404);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.keys(['error']);
      expect(res.body.error).to.include(`Key (room_id)=(${roomId}) is not present in table "room".`);
    });

    it('add association for non-exists beaconId: failed', async () => {
      const beaconId = generateRandom([beacon1, beacon2, beacon3]);
      const body = [
        { beaconId },
      ];

      const res = await server
        .post(`/beaconRoom/${roomId1}`)
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send(body);

      expect(res.statusCode).to.equal(404);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.keys(['error']);
      expect(res.body.error).to.include(`Key (beacon_id)=(${beaconId}) is not present in table "beacon".`);
    });

    it('add association with same beaconID at same time: succeed for one beacon', async () => {
      const body = [
        { beaconId: beacon1 },
        { beaconId: beacon1 },
        { beaconId: beacon2 },
      ];

      const res = await server
        .post(`/beaconRoom/${roomId1}`)
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send(body);

      expect(res.statusCode).to.equal(201);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.keys(['message']);
      expect(res.body.message).to.include('2 associations has been added');
    });

    it('add association with invalid roomID: failed', async () => {
      const body = [
        { beaconId: beacon1 },
        { beaconId: beacon2 },
      ];

      const res = await server
        .post('/beaconRoom/abc')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send(body);

      expect(res.statusCode).to.equal(400);
    });

    it('add association with invalid beaconID: failed', async () => {
      const body = [
        { beaconId: 'invalid' },
      ];

      const res = await server
        .post(`/beaconRoom/${roomId1}`)
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send(body);

      expect(res.statusCode).to.equal(400);
    });

    it('give object body instead an array of beaconID: failed', async () => {
      const body = { beaconId: 'invalid' };

      const res = await server
        .post(`/beaconRoom/${roomId1}`)
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send(body);

      expect(res.statusCode).to.equal(400);
    });
  });

  describe('"student" not allowed to add association', () => {
    let roomId;
    let beaconId;
    before(async () => {
      token = await testAdminUserSignUp();
      userId = await getUserId(token);

      roomId = parseInt(await addRoom(token, rooms[0]), 10);
      beaconId = parseInt(await addBeacon(token, beacons[0]), 10);

      token = await testStudentUserSignUp({
        password: 'password',
        email: 'test.student@email.com',
        firstName: 'First name',
        lastName: 'Last name',
        userType: 'student',
      });
    });

    after(async () => {
      await pool.query('DELETE FROM room where created_by = $1', [userId]);
      await pool.query('DELETE FROM beacon where created_by = $1', [userId]);
      await pool.query('DELETE FROM users where id = $1', [userId]);
      userId = await getUserId(token);
      await pool.query('DELETE FROM users where id = $1', [userId]); // delete student test account
    });

    it('add a association = unauthorized', async () => {
      const body = [
        { beaconId },
      ];

      const res = await server
        .post(`/beaconRoom/${roomId}`)
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send(body);

      expect(res.statusCode).to.equal(401);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.keys(['error']);
      expect(res.body.error).to.equal('User does not have permission.');
    });
  });

  describe('"teacher" not allowed to add association', () => {
    let roomId;
    let beaconId;
    before(async () => {
      token = await testAdminUserSignUp();
      userId = await getUserId(token);

      roomId = parseInt(await addRoom(token, rooms[0]), 10);
      beaconId = parseInt(await addBeacon(token, beacons[0]), 10);

      token = await testTeacherUserSignUp({
        password: 'password',
        email: 'test.teacher1@email.com',
        firstName: 'First name',
        lastName: 'Last name',
        userType: 'teacher',
      });
    });

    after(async () => {
      await pool.query('DELETE FROM room where created_by = $1', [userId]);
      await pool.query('DELETE FROM beacon where created_by = $1', [userId]);
      await pool.query('DELETE FROM users where id = $1', [userId]);
      userId = await getUserId(token);
      await pool.query('DELETE FROM users where id = $1', [userId]); // delete teacher test account
    });

    it('add a association = unauthorized', async () => {
      const body = [
        { beaconId },
      ];

      const res = await server
        .post(`/beaconRoom/${roomId}`)
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send(body);

      expect(res.statusCode).to.equal(401);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.keys(['error']);
      expect(res.body.error).to.equal('User does not have permission.');
    });
  });
});
