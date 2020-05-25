/* eslint-env jest */
/* global before, after */
const chai = require('chai');
const supertest = require('supertest');

const { expect } = chai;
const server = supertest.agent(`http://${process.env.TEST_HOST}:8080/v1`);
const { pool } = require('../../../db/init');

let token;
let courseId;
describe('Check /course/{courseId} PUT course api', () => {
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
        .post('/course')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          courseCode: 'TIE-20106',
          courseName: 'Data Structures and Algorithms',
          coursePersonal: [4, 5],
        });
      courseId = res.body.message.split(': ')[1]; // eslint-disable-line prefer-destructuring
      return courseId;
    });

    after(() => pool.query('DELETE FROM course'));

    it('update a course: successful', async () => {
      const res = await server
        .put(`/course/${courseId}`)
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          courseCode: 'TIE-20107',
          courseName: 'Data Structures and Algorithms',
          coursePersonal: [4, 5],
        });

      expect(res.statusCode).to.equal(201);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.keys(['message']);
      expect(res.body.message).to.equal(`Course ID: ${courseId} updated successfully`);
    });

    it('add empty course name: failed', async () => {
      const res = await server
        .put(`/course/${courseId}`)
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          courseCode: '',
          courseName: 'Data Structures and Algorithms',
          coursePersonal: [4, 5],
        });

      expect(res.statusCode).to.equal(400);
    });

    it('add empty course code: failed', async () => {
      const res = await server
        .put(`/course/${courseId}`)
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          courseCode: 'TIE-20107',
          courseName: '',
          coursePersonal: [4, 5],
        });

      expect(res.statusCode).to.equal(400);
    });

    it('add empty course personal list: failed', async () => {
      const res = await server
        .put(`/course/${courseId}`)
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          courseCode: 'TIE-20107',
          courseName: 'Data Structures and Algorithms',
          coursePersonal: [],
        });

      expect(res.statusCode).to.equal(400);
    });

    it('add duplicate course personal value: failed', async () => {
      const res = await server
        .put(`/course/${courseId}`)
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          courseCode: 'TIE-20107',
          courseName: 'Data Structures and Algorithms',
          coursePersonal: [5, 5],
        });

      expect(res.statusCode).to.equal(400);
    });

    it('duplicate course code insert: failed', async () => {
      const res = await server
        .post('/course')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          courseCode: 'TIE-20108',
          courseName: 'Data Structures and Algorithms',
          coursePersonal: [5, 4],
        });

      expect(res.statusCode).to.equal(200);

      const resNew = await server
        .put(`/course/${courseId}`)
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          courseCode: 'TIE-20108',
          courseName: 'Data Structures and Algorithms',
          coursePersonal: [4, 5],
        });

      expect(resNew.statusCode).to.equal(404);
      expect(resNew.body).to.be.an('object');
      expect(resNew.body).to.have.keys(['error']);
      expect(resNew.body.error).to.include('Key (course_code)=(TIE-20108) already exists.');
    });
  });

  describe('"student" user not allowed to edit course', () => {
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

    it('edit a course = unauthorized', async () => {
      const res = await server
        .put('/course/1')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          courseCode: 'TIE-20106',
          courseName: 'Data Structures and Algorithms',
          coursePersonal: [5, 4],
        });
      expect(res.statusCode).to.equal(401);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.keys(['error']);
      expect(res.body.error).to.equal('User does not have permission.');
    });
  });
});
