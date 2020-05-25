/* eslint-env jest */
/* global before, after */
const chai = require('chai');
const supertest = require('supertest');

require('dotenv').config();

const { expect } = chai;
const server = supertest.agent('http://127.0.0.1:8080/v1');
const { pool } = require('../../../db/init');
const {
  testAdminUserSignUp,
  testStudentUserSignUp,
  testTeacherUserSignUp,
  getUserId,
} = require('../../utils/getToken');

let token;
let userId;
describe('Check /beacon POST beacon api', () => {
  describe('admin user', () => {
    before(async () => {
      token = await testAdminUserSignUp();
      userId = await getUserId(token);
    });

    after(async () => {
      await pool.query('DELETE FROM users where id = $1', [userId]);
    });

    afterEach(() => pool.query('DELETE FROM beacon where created_by = $1', [userId]));

    it('give empty value: failed', async () => {
      const res = await server
        .post('/beacon')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          macAddress: '',
        });

      expect(res.statusCode).to.equal(400);
    });

    it('give wrong format mac_address: failed', async () => {
      const res = await server
        .post('/beacon')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          macAddress: '7C:D1:C3:19:BC:E',
        });

      expect(res.statusCode).to.equal(400);
    });

    it('give wrong format mac_address: failed', async () => {
      const res = await server
        .post('/beacon')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          macAddress: '7C:D1:C3:19:BC',
        });

      expect(res.statusCode).to.equal(400);
    });

    it('give wrong format mac_address: failed', async () => {
      const res = await server
        .post('/beacon')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          macAddress: '7C:D1:C3:19:BC-OO',
        });

      expect(res.statusCode).to.equal(400);
    });

    it('add additional property in request body: failed', async () => {
      const res = await server
        .post('/beacon')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          macAddress: '7C:D1:C3:19:BC:EE',
          additionalProperty: 'extra',
        });

      expect(res.statusCode).to.equal(400);
    });

    it('give wrong property in request body: failed', async () => {
      const res = await server
        .post('/beacon')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          macAddressWrong: '7C:D1:C3:19:BC:EE',
        });

      expect(res.statusCode).to.equal(400);
    });

    it('add a beacon with valid value: successful', async () => {
      const res = await server
        .post('/beacon')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          macAddress: '7C:D1:C3:19:BC:EE',
        });

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.keys(['message']);
      expect(res.body.message).to.include('Beacon added with ID:');
    });

    it('add duplicate beacon: falied', async () => {
      const res = await server
        .post('/beacon')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          macAddress: '7C:D1:C3:19:BC:EE',
        });

      expect(res.statusCode).to.equal(200);

      const newRes = await server
        .post('/beacon')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          macAddress: '7C:D1:C3:19:BC:EE',
        });

      expect(newRes.statusCode).to.equal(404);
      expect(newRes.body).to.be.an('object');
      expect(newRes.body).to.have.keys(['error']);
      expect(newRes.body.error).to.equal('Key (mac_address)=(7C:D1:C3:19:BC:EE) already exists.');
    });
  });

  describe('"student" not allowed to add beacon', () => {
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

    it('add a beacon = unauthorized', async () => {
      const res = await server
        .post('/beacon')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          macAddress: '7C:D1:C3:19:BC:EE',
        });
      expect(res.statusCode).to.equal(401);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.keys(['error']);
      expect(res.body.error).to.equal('User does not have permission.');
    });
  });

  describe('"teacher" not allowed to add beacon', () => {
    before(async () => {
      token = await testTeacherUserSignUp({
        password: 'password',
        email: 'test.teacher1@email.com',
        firstName: 'First name',
        lastName: 'Last name',
        userType: 'teacher',
      });
      userId = await getUserId(token);
    });

    after(async () => {
      await pool.query('DELETE FROM users where id = $1', [userId]);
    });

    it('add a beacon = unauthorized', async () => {
      const res = await server
        .post('/beacon')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          macAddress: '7C:D1:C3:19:BC:EE',
        });
      expect(res.statusCode).to.equal(401);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.keys(['error']);
      expect(res.body.error).to.equal('User does not have permission.');
    });
  });
});
