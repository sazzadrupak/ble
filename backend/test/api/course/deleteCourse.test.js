/* eslint-env jest */
/* global before */
const chai = require('chai');
const supertest = require('supertest');

const { expect } = chai;
const server = supertest.agent(`http://${process.env.TEST_HOST}:8080/v1`);
const { pool } = require('../../../db/init');

let token;
let courseId;
const course = {
  courseCode: 'TIE-20106',
  courseName: 'Data Structures and Algorithms',
  coursePersonal: [4, 5],
};

describe('Check /course/{courseId} DELETE course api', () => {
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
        .post('/course')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send(course);
      courseId = res.body.message.split(': ')[1]; // eslint-disable-line prefer-destructuring
      return courseId;
    });

    afterEach(() => pool.query('DELETE FROM course'));

    it('delete a course', async () => {
      const res = await server
        .delete(`/course/${courseId}`)
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache');

      expect(res.statusCode).to.equal(201);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.keys(['message']);
      expect(res.body.message).to.equal(`Course ID: ${courseId} deleted successfully`);
    });

    it('invalid course id', async () => {
      const res = await server
        .delete('/course/abc')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache');

      expect(res.statusCode).to.equal(400);
    });

    it('unavalable course id', async () => {
      const res = await server
        .delete('/course/1')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache');

      expect(res.statusCode).to.equal(404);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.keys(['error']);
      expect(res.body.error).to.equal('Course ID: 1 not found');
    });

    it('delete again already a deleted course: failed', async () => {
      const res = await server
        .delete(`/course/${courseId}`)
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache');

      expect(res.statusCode).to.equal(201);

      const newRes = await server
        .delete(`/course/${courseId}`)
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache');

      expect(newRes.statusCode).to.equal(404);
      expect(newRes.body).to.be.an('object');
      expect(newRes.body).to.have.keys(['error']);
      expect(newRes.body.error).to.equal(`Course ID: ${courseId} not found`);
    });
  });

  describe('Unauthorized user', () => {
    describe('"student" not allowed to delete a course', () => {
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

      it('delete a course = unauthorized', async () => {
        const res = await server
          .delete('/course/1')
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
