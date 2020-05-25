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

const { addBeacon } = require('../../utils/db_utils');

let token;
let userId;
let beaconId;
const beacon = { macAddress: '7C:D1:C3:19:BC:EA' };

describe('Check /beacon/{beaconId} PUT beacon api', () => {
  describe('Authorized user', () => {
    before(async () => {
      token = await testAdminUserSignUp();
      userId = await getUserId(token);

      beaconId = parseInt(await addBeacon(token, beacon), 10);
    });

    after(async () => {
      await pool.query('DELETE FROM beacon where created_by = $1', [userId]);
      await pool.query('DELETE FROM users where id = $1', [userId]);
    });

    it('update a beacon', async () => {
      const res = await server
        .put(`/beacon/${beaconId}`)
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          macAddress: '7C:D1:C3:19:BC:EC',
          activeStatus: true,
        });
      expect(res.statusCode).to.equal(201);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.keys(['message']);
      expect(res.body.message).to.equal(`Beacon ID: ${beaconId} updated successfully`);
    });

    it('invalid beacon id', async () => {
      const res = await server
        .put('/beacon/abc')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          macAddress: '7C:D1:C3:19:BC:EC',
          activeStatus: true,
        });

      expect(res.statusCode).to.equal(400);
    });

    it('unavalable beacon id', async () => {
      const id = generateRandom([beaconId]);
      const res = await server
        .put(`/beacon/${id}`)
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          macAddress: '7C:D1:C3:19:BC:EC',
          activeStatus: true,
        });

      expect(res.statusCode).to.equal(404);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.keys(['error']);
      expect(res.body.error).to.equal(`Beacon ID: ${id} not found`);
    });

    it('give empty value: failed', async () => {
      const res = await server
        .put(`/beacon/${beaconId}`)
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          macAddress: '',
          activeStatus: true,
        });

      expect(res.statusCode).to.equal(400);
    });

    it('give wrong format value: failed', async () => {
      const res = await server
        .put(`/beacon/${beaconId}`)
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          macAddress: '7C:D1:C3:19:BC:E',
          activeStatus: true,
        });

      expect(res.statusCode).to.equal(400);
    });

    it('give wrong format value: failed', async () => {
      const res = await server
        .put(`/beacon/${beaconId}`)
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          macAddress: '7C:D1:C3:19:BC',
          activeStatus: true,
        });

      expect(res.statusCode).to.equal(400);
    });

    it('give wrong format value: failed', async () => {
      const res = await server
        .put(`/beacon/${beaconId}`)
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          macAddress: '7C:D1:C3:19:BC-E2',
          activeStatus: true,
        });

      expect(res.statusCode).to.equal(400);
    });

    it('give duplicate address: falied', async () => {
      const res = await server
        .post('/beacon')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          macAddress: '7C:D1:C3:19:BC:E9',
        });
      expect(res.statusCode).to.equal(200);

      const newRes = await server
        .put(`/beacon/${beaconId}`)
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          macAddress: '7C:D1:C3:19:BC:E9',
          activeStatus: true,
        });

      expect(newRes.statusCode).to.equal(404);
      expect(newRes.body).to.be.an('object');
      expect(newRes.body).to.have.keys(['error']);
      expect(newRes.body.error).to.equal('Key (mac_address)=(7C:D1:C3:19:BC:E9) already exists.');
    });
  });

  describe('Unauthorized user', () => {
    describe('"student" not allowed to edit beacon', () => {
      before(async () => {
        token = await testAdminUserSignUp();
        userId = await getUserId(token);

        beaconId = parseInt(await addBeacon(token, beacon), 10);

        token = await testStudentUserSignUp({
          password: 'password',
          email: 'test.student@email.com',
          firstName: 'First name',
          lastName: 'Last name',
          userType: 'student',
        });
      });

      after(async () => {
        await pool.query('DELETE FROM beacon where created_by = $1', [userId]);
        await pool.query('DELETE FROM users where id = $1', [userId]); // delete admin test account
        userId = await getUserId(token);
        await pool.query('DELETE FROM users where id = $1', [userId]); // delete student test account
      });

      it('edit a beacon = unauthorized', async () => {
        const res = await server
          .put(`/beacon/${beaconId}`)
          .set('api_key', token)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json')
          .set('Cache-Control', 'no-cache')
          .send({
            macAddress: '7C:D1:C3:19:BC:EC',
            activeStatus: true,
          });
        expect(res.statusCode).to.equal(401);
        expect(res.body).to.be.an('object');
        expect(res.body).to.have.keys(['error']);
        expect(res.body.error).to.equal('User does not have permission.');
      });
    });

    describe('"teacher" not allowed to edit beacon', () => {
      before(async () => {
        token = await testAdminUserSignUp();
        userId = await getUserId(token);

        beaconId = parseInt(await addBeacon(token, beacon), 10);

        token = await testTeacherUserSignUp({
          password: 'password',
          email: 'test.teacher1@email.com',
          firstName: 'First name',
          lastName: 'Last name',
          userType: 'teacher',
        });
      });

      after(async () => {
        await pool.query('DELETE FROM beacon where created_by = $1', [userId]);
        await pool.query('DELETE FROM users where id = $1', [userId]); // delete admin test account
        userId = await getUserId(token);
        await pool.query('DELETE FROM users where id = $1', [userId]); // delete teacher test account
      });

      it('edit a beacon = unauthorized', async () => {
        const res = await server
          .put(`/beacon/${beaconId}`)
          .set('api_key', token)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json')
          .set('Cache-Control', 'no-cache')
          .send({
            macAddress: '7C:D1:C3:19:BC:EC',
            activeStatus: true,
          });
        expect(res.statusCode).to.equal(401);
        expect(res.body).to.be.an('object');
        expect(res.body).to.have.keys(['error']);
        expect(res.body.error).to.equal('User does not have permission.');
      });
    });
  });
});
