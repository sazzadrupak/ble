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
  name: 'TIE-20106',
};

describe('Check /room/{roomId} DELETE', () => {
  describe('Admin user', () => {
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

    afterEach(async () => {
      await pool.query('DELETE FROM room where created_by = $1', [userId]);
    });

    after(async () => {
      await pool.query('DELETE FROM users where id = $1', [userId]);
    });

    it('delete a room', async () => {
      const res = await server
        .delete(`/room/${roomId}`)
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache');

      expect(res.statusCode).to.equal(201);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.keys(['message']);
      expect(res.body.message).to.equal(`Room ID: ${roomId} deleted successfully`);
    });

    it('invalid room id', async () => {
      const res = await server
        .delete('/room/abc')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache');

      expect(res.statusCode).to.equal(400);
    });

    it('unavalable room id', async () => {
      const id = generateRandom([roomId]);
      const res = await server
        .delete(`/room/${id}`)
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache');

      expect(res.statusCode).to.equal(404);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.keys(['error']);
      expect(res.body.error).to.equal(`Room with ID: ${id} not found`);
    });

    it('delete again already a deleted room: failed', async () => {
      const res = await server
        .delete(`/room/${roomId}`)
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache');

      expect(res.statusCode).to.equal(201);

      const newRes = await server
        .delete(`/room/${roomId}`)
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache');

      expect(newRes.statusCode).to.equal(404);
      expect(newRes.body).to.be.an('object');
      expect(newRes.body).to.have.keys(['error']);
      expect(newRes.body.error).to.equal(`Room with ID: ${roomId} not found`);
    });
  });

  describe('Unauthorized user', () => {
    describe('"student" not allowed to delete a room', () => {
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

      it('delete a room = unauthorized', async () => {
        const res = await server
          .delete(`/room/${roomId}`)
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

    describe('"teacher" not allowed to delete a room', () => {
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

      it('delete a room = unauthorized', async () => {
        const res = await server
          .delete(`/room/${roomId}`)
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
});
