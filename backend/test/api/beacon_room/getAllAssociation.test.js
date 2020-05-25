/* eslint-env jest */
/* global before, after */
const chai = require('chai');
const _ = require('lodash');
const supertest = require('supertest');

const { expect } = chai;
const server = supertest.agent(`http://${process.env.TEST_HOST}:8080/v1`);
const { pool } = require('../../../db/init');

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
  { macAddress: '7C:D1:C3:19:BC:EC' },
];
let roomId1;
let roomId2;
let beacon1;
let beacon2;
let beacon3;
let body1;
let body2;
describe('Check /beaconRoom GET', () => {
  describe('admin user', () => {
    before(async () => {
      token = await testAdminUserSignUp();
      userId = await getUserId(token);

      roomId1 = parseInt(await addRoom(token, rooms[0]), 10);
      roomId2 = parseInt(await addRoom(token, rooms[1]), 10);

      beacon1 = parseInt(await addBeacon(token, beacons[0]), 10);
      beacon2 = parseInt(await addBeacon(token, beacons[1]), 10);
      beacon3 = parseInt(await addBeacon(token, beacons[2]), 10);

      body1 = [
        { beaconId: beacon1 },
        { beaconId: beacon2 },
      ];
      await addAssociation(token, roomId1, body1);

      body2 = [
        { beaconId: beacon3 },
      ];
      await addAssociation(token, roomId2, body2);
    });

    after(async () => {
      await pool.query('DELETE FROM room where created_by = $1', [userId]);
      await pool.query('DELETE FROM beacon where created_by = $1', [userId]);
      await pool.query('DELETE FROM users where id = $1', [userId]);
    });

    it('get all association: succeed', async () => {
      const res = await server
        .get('/beaconRoom')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache');

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.be.an('array');
      expect(res.body.length).to.equal(3);
      const expectedBeacons = [beacons[0].macAddress, beacons[1].macAddress, beacons[2].macAddress];
      _.each(res.body, (item) => {
        expect(item).to.be.an('object');
        expect(item).to.have.keys(['beacon_id', 'mac_address', 'room_id', 'room_name']);
        expect(expectedBeacons).to.include(item.mac_address);
        expect([rooms[0].name, rooms[1].name]).to.include(item.room_name);
      });
    });
  });

  describe('"teacher" allowed to get all association', () => {
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

    it('get all association: succeed', async () => {
      const res = await server
        .get('/beaconRoom')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache');

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.be.an('array');
      expect(res.body.length).to.equal(1);

      expect(res.body[0]).to.be.an('object');
      expect(res.body[0]).to.have.keys(['beacon_id', 'mac_address', 'room_id', 'room_name']);
      expect([beacons[0].macAddress]).to.include(res.body[0].mac_address);
      expect([rooms[0].name]).to.include(res.body[0].room_name);
    });
  });

  describe('"student" not allowed to get all association', () => {
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
        .get('/beaconRoom')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache');

      expect(res.statusCode).to.equal(401);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.keys(['error']);
      expect(res.body.error).to.equal('User does not have permission.');
    });
  });
});
