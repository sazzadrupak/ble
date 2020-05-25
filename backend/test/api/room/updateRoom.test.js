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
let userId;
let roomId;
describe('Check /room PUT room api', () => {
  describe('admin user', () => {
    before(async () => {
      token = await testAdminUserSignUp();
      userId = await getUserId(token);
    });

    before(async () => {
      const res = await server
        .post('/room')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          name: 'TC-110',
        });
      roomId = res.body.message.split(': ')[1]; // eslint-disable-line prefer-destructuring
      return roomId;
    });

    after(async () => {
      await pool.query('DELETE FROM room where created_by = $1', [userId]);
      await pool.query('DELETE FROM users where id = $1', [userId]);
    });

    it('give valid value: succeded', async () => {
      const res = await server
        .put(`/room/${roomId}`)
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          name: 'TC-111',
        });
      expect(res.statusCode).to.equal(201);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.keys(['message']);
      expect(res.body.message).to.equal(`Room ID: ${roomId} updated successfully`);
    });

    it('give empty value: failed', async () => {
      const res = await server
        .put(`/room/${roomId}`)
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          name: '',
        });
      expect(res.statusCode).to.equal(400);
    });

    it('give wrong property name: failed', async () => {
      const res = await server
        .put(`/room/${roomId}`)
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          nameWrong: 'TC-111',
        });
      expect(res.statusCode).to.equal(400);
    });

    it('give integer value: failed', async () => {
      const res = await server
        .put(`/room/${roomId}`)
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
        .put(`/room/${roomId}`)
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

    it('update with duplicate room name: falied', async () => {
      const res = await server
        .post('/room')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          name: 'TC-112',
        });

      expect(res.statusCode).to.equal(200);

      const newRes = await server
        .put(`/room/${roomId}`)
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          name: 'TC-112',
        });

      expect(newRes.statusCode).to.equal(404);
      expect(newRes.body).to.be.an('object');
      expect(newRes.body).to.have.keys(['error']);
      expect(newRes.body.error).to.equal('Key (name)=(TC-112) already exists.');
    });

    it('not exists room update: failed', async () => {
      const id = generateRandom([roomId]);
      const res = await server
        .put(`/room/${id}`)
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          name: 'TC-112',
        });

      expect(res.statusCode).to.equal(404);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.keys(['error']);
      expect(res.body.error).to.equal(`Room with ID: ${id} not found`);
    });
  });

  describe('"student" not allowed to update room', () => {
    before(async () => {
      token = await testAdminUserSignUp();
      userId = await getUserId(token);

      const res = await server
        .post('/room')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          name: 'TC-110',
        });
      roomId = res.body.message.split(': ')[1]; // eslint-disable-line prefer-destructuring

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
      await pool.query('DELETE FROM users where id = $1', [userId]); // delete admin test account
      userId = await getUserId(token);
      await pool.query('DELETE FROM users where id = $1', [userId]); // delete student test account
    });

    it('add a room = unauthorized', async () => {
      const res = await server
        .put(`/room/${roomId}`)
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

  describe('"teacher" not allowed to update room', () => {
    before(async () => {
      token = await testAdminUserSignUp();
      userId = await getUserId(token);

      const res = await server
        .post('/room')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          name: 'TC-110',
        });
      roomId = res.body.message.split(': ')[1]; // eslint-disable-line prefer-destructuring

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
      await pool.query('DELETE FROM users where id = $1', [userId]); // delete admin test account
      userId = await getUserId(token);
      await pool.query('DELETE FROM users where id = $1', [userId]); // delete teacher test account
    });

    it('add a room = unauthorized', async () => {
      const res = await server
        .put(`/room/${roomId}`)
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
