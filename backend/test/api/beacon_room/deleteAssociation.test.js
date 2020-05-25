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
];
let roomId1;
let roomId2;
let beacon1;
let beacon2;
let body1;
let body2;
describe('Check /beaconRoom DELETE', () => {
  describe('admin user', () => {
    before(async () => {
      token = await testAdminUserSignUp();
      userId = await getUserId(token);

      roomId1 = parseInt(await addRoom(token, rooms[0]), 10);
      roomId2 = parseInt(await addRoom(token, rooms[1]), 10);

      beacon1 = parseInt(await addBeacon(token, beacons[0]), 10);
      beacon2 = parseInt(await addBeacon(token, beacons[1]), 10);

      body1 = [
        { beaconId: beacon1 },
      ];
      await addAssociation(token, roomId1, body1);

      body2 = [
        { beaconId: beacon2 },
      ];
      await addAssociation(token, roomId2, body2);
    });

    after(async () => {
      await pool.query('DELETE FROM room where created_by = $1', [userId]);
      await pool.query('DELETE FROM beacon where created_by = $1', [userId]);
      await pool.query('DELETE FROM users where id = $1', [userId]);
    });

    it('delete roomID1 and beaconID1 association: succeed', async () => {
      const res = await server
        .delete('/beaconRoom')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          roomId: roomId1,
          beaconId: beacon1,
        });

      expect(res.statusCode).to.equal(201);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.keys(['message']);
      expect(res.body.message).to.equal('Association removed');

      const newRes = await server
        .get(`/beaconRoom/${roomId1}`)
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache');

      expect(newRes.statusCode).to.equal(404);
      expect(newRes.body).to.be.an('object');
      expect(newRes.body).to.have.keys(['error']);
      expect(newRes.body.error).to.include('No beacons found for given room id.');
    });

    it('delete an not-exist association: failed', async () => {
      const res = await server
        .delete('/beaconRoom')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          roomId: roomId1,
          beaconId: beacon1,
        });

      expect(res.statusCode).to.equal(404);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.keys(['error']);
      expect(res.body.error).to.include('No association found');
    });

    it('with not-exist roomID: failed', async () => {
      const id = generateRandom([roomId1, roomId2]);
      const res = await server
        .delete('/beaconRoom')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          roomId: id,
          beaconId: beacon1,
        });

      expect(res.statusCode).to.equal(404);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.keys(['error']);
      expect(res.body.error).to.include('No association found');
    });

    it('with not-exist beaconID: failed', async () => {
      const id = generateRandom([beacon1, beacon2]);
      const res = await server
        .delete('/beaconRoom')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          roomId: roomId2,
          beaconId: id,
        });

      expect(res.statusCode).to.equal(404);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.keys(['error']);
      expect(res.body.error).to.include('No association found');
    });

    it('with invalid beaconID: failed', async () => {
      const res = await server
        .delete('/beaconRoom')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          roomId: roomId2,
          beaconId: 'abc',
        });

      expect(res.statusCode).to.equal(400);
    });

    it('with invalid roomID: failed', async () => {
      const res = await server
        .delete('/beaconRoom')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          roomId: 'abc',
          beaconId: beacon2,
        });

      expect(res.statusCode).to.equal(400);
    });

    it('without roomID: failed', async () => {
      const res = await server
        .delete('/beaconRoom')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          beaconId: beacon2,
        });

      expect(res.statusCode).to.equal(400);
    });

    it('without beaconID: failed', async () => {
      const res = await server
        .delete('/beaconRoom')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          roomId: roomId2,
        });

      expect(res.statusCode).to.equal(400);
    });

    it('give body as array: failed', async () => {
      const body = [{
        roomId: roomId2,
        beaconId: beacon2,
      }];
      const res = await server
        .delete('/beaconRoom')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send(body);

      expect(res.statusCode).to.equal(400);
    });
  });

  describe('"teacher" not allowed to delete association', () => {
    let roomId;
    let beaconId;
    before(async () => {
      token = await testAdminUserSignUp();
      userId = await getUserId(token);

      roomId = parseInt(await addRoom(token, rooms[0]), 10);
      beaconId = parseInt(await addBeacon(token, beacons[0]), 10);

      const body = [{ beaconId }];
      await addAssociation(token, roomId, body);

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

    it('delete an association: succeed', async () => {
      const res = await server
        .delete('/beaconRoom')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          roomId,
          beaconId,
        });

      expect(res.statusCode).to.equal(401);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.keys(['error']);
      expect(res.body.error).to.equal('User does not have permission.');
    });
  });

  describe('"student" not allowed to delete association', () => {
    let roomId;
    let beaconId;
    before(async () => {
      token = await testAdminUserSignUp();
      userId = await getUserId(token);

      roomId = parseInt(await addRoom(token, rooms[0]), 10);
      beaconId = parseInt(await addBeacon(token, beacons[0]), 10);

      const body = [{ beaconId }];
      await addAssociation(token, roomId, body);

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

    it('get all association: unauthorized', async () => {
      const res = await server
        .delete('/beaconRoom')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          roomId,
          beaconId,
        });

      expect(res.statusCode).to.equal(401);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.keys(['error']);
      expect(res.body.error).to.equal('User does not have permission.');
    });
  });
});
