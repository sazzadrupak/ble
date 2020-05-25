/* eslint-env jest */
/* global before */
const chai = require('chai');
const supertest = require('supertest');

const { expect } = chai;
const server = supertest.agent(`http://${process.env.TEST_HOST}:8080/v1`);
const { pool } = require('../../../db/init');
const { generateRandom } = require('../../../utils/random_number');

let token;
let beaconId;
const beacon = {
  macAddress: '7C:D1:C3:19:BC:EB',
};

describe('Check /beacon/{beaconId} GET beacon api', () => {
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

    beforeEach(async () => {
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

    afterEach(() => pool.query('DELETE FROM beacon'));

    it('get a beacon', async () => {
      const res = await server
        .get(`/beacon/${beaconId}`)
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache');

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.keys(['id', 'mac_address', 'active_status']);
      expect(res.body.mac_address).to.equal(beacon.macAddress);
      expect(res.body.active_status).to.equal(true);
    });

    it('invalid beacon id', async () => {
      const res = await server
        .get('/beacon/abc')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache');

      expect(res.statusCode).to.equal(400);
    });

    it('unavalable beacon id', async () => {
      const id = generateRandom(beaconId);
      const res = await server
        .get(`/beacon/${id}`)
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache');

      expect(res.statusCode).to.equal(404);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.keys(['error']);
      expect(res.body.error).to.equal(`Beacon ID: ${id} not found`);
    });
  });

  describe('Unauthorized user', () => {
    describe('"student" not allowed to get a beacon', () => {
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

      it('get a beacon = unauthorized', async () => {
        const res = await server
          .get('/beacon/1')
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
