/* eslint-env jest */
/* global before, after */
const chai = require('chai');
const supertest = require('supertest');
const Promise = require('bluebird');
const _ = require('lodash');

const { expect } = chai;
const server = supertest.agent(`http://${process.env.TEST_HOST}:8080/v1`);
const { pool } = require('../../../db/init');

let token;
const beacons = [
  {
    macAddress: '7C:D1:C3:19:BC:AA',
  },
  {
    macAddress: '7C:D1:C3:19:BC:AB',
  },
  {
    macAddress: '7C:D1:C3:19:BC:AC',
  },
  {
    macAddress: '7C:D1:C3:19:BC:AD',
  },
];

describe('Check /beacon GET beacon api', () => {
  describe('authorized user', () => {
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
      await Promise.map(beacons, (beacon) => server
        .post('/beacon')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send(beacon));
    });

    after(() => () => pool.query('DELETE FROM beacon'));

    describe('list beacons', () => {
      it('get beacons list', async () => {
        const res = await server
          .get('/beacon')
          .set('api_key', token)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json')
          .set('Cache-Control', 'no-cache');
        expect(res.statusCode).to.equal(200);
        expect(res.body).to.be.an('array');
        expect(_.size(res.body)).to.equal(4);
        const beaconList = _.orderBy(res.body, ['mac_address'], ['asc']);
        _.each(beaconList, (beacon, i) => {
          expect(beacon).to.be.an('object');
          expect(beacon).to.have.keys(['id', 'mac_address', 'active_status']);
          expect(beacon.mac_address).to.equal(beacons[i].macAddress);
          expect(beacon.active_status).to.equal(true);
        });
      });
    });
  });

  describe('"student" not allowed to get beacon list', () => {
    beforeEach(async () => {
      await Promise.map(beacons, (beacon) => server
        .post('/beacon')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send(beacon));
    });

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

    afterEach(() => pool.query('DELETE FROM beacon'));

    it('get beacon list = unauthorized', async () => {
      const res = await server
        .get('/beacon')
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
