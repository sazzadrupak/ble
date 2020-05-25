/* eslint-env jest */
/* global before, after */
const chai = require('chai');
const supertest = require('supertest');

const { expect } = chai;
const server = supertest.agent(`http://${process.env.TEST_HOST}:8080/v1`);
const { pool } = require('../../../db/init');

let token;
let beaconId;
const beacon = {
  macAddress: '7C:D1:C3:19:BC:EB',
};

describe('Check /beacon/{beaconId} DELETE beacon api', () => {
  describe('Authorized user', () => {
    before(async () => {
      const res = await server
        .post('/user/login')
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          password: process.env.ADMIN_PASSWORD,
          email: process.env.ADMIN_EMAIL,
        });
      token = res.body.token;
      return token;
    });

    before(async () => {
      const res = await server
        .post('/beacon')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send(beacon);
      beaconId = res.body.message.split(': ')[1]; // eslint-disable-line prefer-destructuring
      return beaconId;
    });

    after(() => pool.query('DELETE FROM beacon'));

    it('delete a beacon', async () => {
      const res = await server
        .delete(`/beacon/${beaconId}`)
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache');

      expect(res.statusCode).to.equal(201);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.keys(['message']);
      expect(res.body.message).to.equal(`Beacon ID: ${beaconId} deleted successfully`);
    });

    it('invalid beacon id', async () => {
      const res = await server
        .delete('/beacon/abc')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache');

      expect(res.statusCode).to.equal(400);
    });

    it('unavalable beacon id', async () => {
      const res = await server
        .delete('/beacon/1')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache');

      expect(res.statusCode).to.equal(404);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.keys(['error']);
      expect(res.body.error).to.equal('Beacon ID: 1 not found');
    });
  });

  describe('Unauthorized user', () => {
    describe('"student" not allowed to delete a beacon', () => {
      before(async () => {
        const res = await server
          .post('/user/login')
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json')
          .set('Cache-Control', 'no-cache')
          .send({
            password: 'password',
            email: 'student.one@tuni.fi',
          });
        token = res.body.token;
        return token;
      });

      it('delete a beacon = unauthorized', async () => {
        const res = await server
          .delete('/beacon/1')
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

    describe('"teacher" not allowed to delete a beacon', () => {
      before(async () => {
        const res = await server
          .post('/user/login')
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json')
          .set('Cache-Control', 'no-cache')
          .send({
            password: 'password',
            email: 'teacher.one@tuni.fi',
          });
        token = res.body.token;
        return token;
      });

      it('delete a beacon = unauthorized', async () => {
        const res = await server
          .delete('/beacon/1')
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
