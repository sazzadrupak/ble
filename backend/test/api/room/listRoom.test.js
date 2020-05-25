/* eslint-env jest */
/* global before, after */
const chai = require('chai');
const supertest = require('supertest');
const Promise = require('bluebird');
const _ = require('lodash');

const { expect } = chai;
const server = supertest.agent(`http://${process.env.TEST_HOST}:8080/v1`);
const { pool } = require('../../../db/init');
const {
  testAdminUserSignUp,
  testStudentUserSignUp,
  testTeacherUserSignUp,
  getUserId,
} = require('../../utils/getToken');

const { addRoom } = require('../../utils/db_utils');

let token;
let userId;

const rooms = [
  { name: 'TC-110' },
  { name: 'TC-111' },
  { name: 'TC-112' },
];

describe('Check /room GET room api', () => {
  describe('Admin user', () => {
    before(async () => {
      token = await testAdminUserSignUp();
      userId = await getUserId(token);

      await Promise.each(rooms, async (room) => {
        await addRoom(token, room);
      });
    });

    after(async () => {
      await pool.query('DELETE FROM room where created_by = $1', [userId]);
      await pool.query('DELETE FROM users where id = $1', [userId]);
    });

    it('get room list', async () => {
      const res = await server
        .get('/room')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache');
      expect(res.statusCode).to.equal(200);
      expect(res.body).to.be.an('array');
      expect(_.size(res.body)).to.equal(3);

      const roomList = _.orderBy(res.body, ['name'], ['asc']);
      _.each(roomList, (room, i) => {
        expect(room).to.be.an('object');
        expect(room).to.have.keys(['id', 'name']);
        expect(room.name).to.equal(rooms[i].name);
      });
    });
  });

  describe('Admin user', () => {
    before(async () => {
      token = await testAdminUserSignUp();
      userId = await getUserId(token);

      await Promise.each(rooms, async (room) => {
        await addRoom(token, room);
      });

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

    it('"teacher" allowed to get room list', async () => {
      const res = await server
        .get('/room')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache');
      expect(res.statusCode).to.equal(200);
      expect(res.body).to.be.an('array');
      expect(_.size(res.body)).to.equal(3);

      const roomList = _.orderBy(res.body, ['name'], ['asc']);
      _.each(roomList, (room, i) => {
        expect(room).to.be.an('object');
        expect(room).to.have.keys(['id', 'name']);
        expect(room.name).to.equal(rooms[i].name);
      });
    });
  });

  describe('"student" not allowed to get room list', () => {
    before(async () => {
      token = await testAdminUserSignUp();
      userId = await getUserId(token);

      await Promise.each(rooms, async (room) => {
        await addRoom(token, room);
      });

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

    it('get room list = unauthorized', async () => {
      const res = await server
        .get('/room')
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
