/* eslint-env jest */
/* global before */
const chai = require('chai');
const supertest = require('supertest');
const _ = require('lodash');

const { expect } = chai;
const server = supertest.agent(`http://${process.env.TEST_HOST}:8080/v1`);
const { pool } = require('../../../db/init');
const { generateRandom } = require('../../../utils/random_number');

let token;
let courseId;
const course = {
  courseCode: 'TIE-20106',
  courseName: 'Data Structures and Algorithms',
  coursePersonal: [4, 5],
};
describe('Check /course/{courseId} GET course api', () => {
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

    it('get a course', async () => {
      const res = await server
        .get(`/course/${courseId}`)
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache');

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.keys(['course_id', 'course_code', 'course_name', 'course_personal']);
      expect(res.body.course_code).to.equal(course.courseCode);
      expect(res.body.course_name).to.equal(course.courseName);
      expect(res.body.course_personal).to.be.an('array');
      _.each(res.body.course_personal, (teacher) => {
        expect(teacher).to.be.an('object');
        expect(teacher).to.have.keys(['id', 'first_name', 'last_name']);
      });
    });

    it('invalid course id', async () => {
      const res = await server
        .get('/course/abc')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache');

      expect(res.statusCode).to.equal(400);
    });

    it('unavalable course id', async () => {
      const id = generateRandom(courseId);
      const res = await server
        .get(`/course/${id}`)
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache');

      expect(res.statusCode).to.equal(404);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.keys(['error']);
      expect(res.body.error).to.equal(`Course ID: ${id} not found`);
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

      it('get a course = unauthorized', async () => {
        const res = await server
          .get('/course/1')
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
