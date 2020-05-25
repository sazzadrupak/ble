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

let token;
let roomId;
let userId;

const room = {
  name: 'TC-110',
};

describe('Check /room/{roomId} GET room api', () => {
  describe('Authorized user', () => {
    before(async () => {
      token = await testAdminUserSignUp();
      userId = await getUserId(token);
    });

    beforeEach(async () => {
      const res = await server
        .post('/room')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send(room);
      roomId = res.body.message.split(': ')[1]; // eslint-disable-line prefer-destructuring
      return roomId;
    });

    afterEach(() => pool.query('DELETE FROM room where created_by = $1', [userId]));

    after(() => pool.query('DELETE FROM users where id = $1', [userId]));

    it('get a room', async () => {
      const res = await server
        .get(`/room/${roomId}`)
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache');

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.keys(['id', 'name']);
      expect(res.body.name).to.equal(room.name);
    });

    it('invalid room id', async () => {
      const res = await server
        .get('/room/abc')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache');

      expect(res.statusCode).to.equal(400);
    });

    it('unavalable room id', async () => {
      const id = generateRandom([roomId]);
      const res = await server
        .get(`/room/${id}`)
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache');

      expect(res.statusCode).to.equal(404);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.keys(['error']);
      expect(res.body.error).to.equal(`Room with ID: ${id} not found`);
    });
  });

  describe('"student" not allowed to get room', () => {
    before(async () => {
      token = await testStudentUserSignUp({
        password: 'password',
        email: 'test.student@email.com',
        firstName: 'First name',
        lastName: 'Last name',
        userType: 'student',
      });
      userId = await getUserId(token);
    });

    after(async () => {
      await pool.query('DELETE FROM users where id = $1', [userId]);
    });

    it('get a room = unauthorized', async () => {
      const res = await server
        .get(`/room/${roomId}`)
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

  describe('"teacher" allowed to get room', () => {
    let adminToken;
    let adminUserId;

    before(async () => {
      adminToken = await testAdminUserSignUp();
      adminUserId = await getUserId(adminToken);

      token = await testTeacherUserSignUp({
        password: 'password',
        email: 'test.teacher1@email.com',
        firstName: 'First name',
        lastName: 'Last name',
        userType: 'teacher',
      });
      userId = await getUserId(token);
    });

    beforeEach(async () => {
      const res = await server
        .post('/room')
        .set('api_key', adminToken)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send(room);
      roomId = res.body.message.split(': ')[1]; // eslint-disable-line prefer-destructuring
      return roomId;
    });

    afterEach(() => pool.query('DELETE FROM room where created_by = $1', [adminUserId]));

    after(async () => {
      await pool.query('DELETE FROM users where id = $1', [userId]);
      await pool.query('DELETE FROM users where id = $1', [adminUserId]);
    });

    it('get a room = unauthorized', async () => {
      const res = await server
        .get(`/room/${roomId}`)
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache');
      expect(res.statusCode).to.equal(200);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.keys(['id', 'name']);
      expect(res.body.name).to.equal(room.name);
    });
  });
});
