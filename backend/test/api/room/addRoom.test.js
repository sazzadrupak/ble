/* eslint-env jest */
/* global before, after */
const chai = require('chai');
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

let token;
let userId;
describe('Check /room POST room api', () => {
  describe('admin user', () => {
    before(async () => {
      token = await testAdminUserSignUp();
      userId = await getUserId(token);
    });

    after(async () => {
      await pool.query('DELETE FROM room where created_by = $1', [userId]);
      await pool.query('DELETE FROM users where id = $1', [userId]);
    });

    it('give empty value: failed', async () => {
      const res = await server
        .post('/room')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          name: '',
        });

      expect(res.statusCode).to.equal(400);
    });

    it('give integer value: failed', async () => {
      const res = await server
        .post('/room')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          name: 1,
        });

      expect(res.statusCode).to.equal(400);
    });

    it('add additional property in request body: failed', async () => {
      const res = await server
        .post('/room')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          name: 'TC-110',
          additionalProperty: 'extra',
        });

      expect(res.statusCode).to.equal(400);
    });

    it('give wrong property in request body: failed', async () => {
      const res = await server
        .post('/room')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          wrongName: 'TC-110',
        });

      expect(res.statusCode).to.equal(400);
    });

    it('give valid value: succeded', async () => {
      const res = await server
        .post('/room')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          name: 'TC-110',
        });

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.keys(['message']);
      expect(res.body.message).to.include('Room added with ID:');
    });

    it('add duplicate room: falied', async () => {
      const res = await server
        .post('/room')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          name: 'TC-111',
        });

      expect(res.statusCode).to.equal(200);

      const newRes = await server
        .post('/room')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          name: 'TC-111',
        });

      expect(newRes.statusCode).to.equal(404);
      expect(newRes.body).to.be.an('object');
      expect(newRes.body).to.have.keys(['error']);
      expect(newRes.body.error).to.equal('Key (name)=(TC-111) already exists.');
    });
  });

  describe('"student" not allowed to add room', () => {
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

    it('add a room = unauthorized', async () => {
      const res = await server
        .post('/room')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          name: 'TC-110',
        });
      expect(res.statusCode).to.equal(401);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.keys(['error']);
      expect(res.body.error).to.equal('User does not have permission.');
    });
  });

  describe('"teacher" not allowed to add room', () => {
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

    it('add a room = unauthorized', async () => {
      const res = await server
        .post('/room')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          name: 'TC-110',
        });
      expect(res.statusCode).to.equal(401);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.keys(['error']);
      expect(res.body.error).to.equal('User does not have permission.');
    });
  });
});
