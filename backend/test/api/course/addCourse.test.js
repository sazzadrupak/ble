/* eslint-env jest */
/* global before */
const chai = require('chai');
const supertest = require('supertest');

const { expect } = chai;
const server = supertest.agent(`http://${process.env.TEST_HOST}:8080/v1`);
const { pool } = require('../../../db/init');

let token;
describe('Check /course POST course api', () => {
  describe('admin user', () => {
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

    afterEach(() => pool.query('DELETE FROM course'));

    it('give empty value to name: failed', async () => {
      const res = await server
        .post('/course')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          courseCode: 'TIE-20106',
          courseName: '',
          coursePersonal: [4, 5],
        });
      expect(res.statusCode).to.equal(400);
    });

    it('give empty value to code: failed', async () => {
      const res = await server
        .post('/course')
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

    it('give wrong property name: failed', async () => {
      const res = await server
        .post('/course')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          courseCodeWrong: 'TIE-20106',
          courseName: 'Data Structures and Algorithms',
          coursePersonal: [4, 5],
        });
      expect(res.statusCode).to.equal(400);
    });

    it('required property missing: failed', async () => {
      const res = await server
        .post('/course')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          courseCode: 'TIE-20106',
          courseName: 'Data Structures and Algorithms',
        });
      expect(res.statusCode).to.equal(400);
    });

    it('give wrong formatted data: failed', async () => {
      const res = await server
        .post('/course')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          courseCode: 'TIE-20106',
          courseName: 'Data Structures and Algorithms',
          coursePersonal: [4, '5'],
        });
      expect(res.statusCode).to.equal(400);
    });

    it('give student/admin user id as course personnal: failed', async () => {
      const res = await server
        .post('/course')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          courseCode: 'TIE-20106',
          courseName: 'Data Structures and Algorithms',
          coursePersonal: [1, 4],
        });

      expect(res.statusCode).to.equal(404);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.keys(['error']);
      expect(res.body.error).to.include('All given course_personal is not teacher');
    });

    it('add empty course personal list: failed', async () => {
      const res = await server
        .post('/course')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          courseCode: 'TIE-20106',
          courseName: 'Data Structures and Algorithms',
          coursePersonal: [],
        });

      expect(res.statusCode).to.equal(400);
    });

    it('add duplicate course personal list: failed', async () => {
      const res = await server
        .post('/course')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          courseCode: 'TIE-20106',
          courseName: 'Data Structures and Algorithms',
          coursePersonal: [4, 4],
        });

      expect(res.statusCode).to.equal(400);
    });

    it('give 1 character value to code and name: pass', async () => {
      const res = await server
        .post('/course')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          courseCode: 'T',
          courseName: 'D',
          coursePersonal: [4, 5],
        });

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.keys(['message']);
      expect(res.body.message).to.include('Course added with ID:');
    });

    it('give valid post value: successful', async () => {
      const res = await server
        .post('/course')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          courseCode: 'TIE-20106',
          courseName: 'Data Structures and Algorithms',
          coursePersonal: [5, 4],
        });

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.keys(['message']);
      expect(res.body.message).to.include('Course added with ID:');
    });

    it('duplicate course code insert: failed', async () => {
      const res = await server
        .post('/course')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          courseCode: 'TIE-20106',
          courseName: 'Data Structures and Algorithms',
          coursePersonal: [5, 4],
        });

      expect(res.statusCode).to.equal(200);

      const resNew = await server
        .post('/course')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send({
          courseCode: 'TIE-20106',
          courseName: 'Data Structures and Algorithms',
          coursePersonal: [5, 4],
        });

      expect(resNew.statusCode).to.equal(404);
      expect(resNew.body).to.be.an('object');
      expect(resNew.body).to.have.keys(['error']);
      expect(resNew.body.error).to.include('Key (course_code)=(TIE-20106) already exists.');
    });
  });

  describe('"student" user not allowed to add course', () => {
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

    it('add a course = unauthorized', async () => {
      const res = await server
        .post('/course')
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
