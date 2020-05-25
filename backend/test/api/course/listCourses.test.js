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
const courses = [
  {
    courseCode: 'TIE-20106',
    courseName: 'Data Structures and Algorithms',
    coursePersonal: [4, 5],
  },
  {
    courseCode: 'TIE-20107',
    courseName: 'Web architecture',
    coursePersonal: [5, 6],
  },
  {
    courseCode: 'TIE-20108',
    courseName: 'Cloud application',
    coursePersonal: [4, 6],
  },
];

describe('Check /course GET course api', () => {
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
      await Promise.map(courses, (course) => server
        .post('/course')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send(course));
    });

    after(() => pool.query('DELETE FROM course'));

    describe('list course', () => {
      it('get course list', async () => {
        const res = await server
          .get('/course')
          .set('api_key', token)
          .set('Content-Type', 'application/json')
          .set('Accept', 'application/json')
          .set('Cache-Control', 'no-cache');
        expect(res.statusCode).to.equal(200);
        expect(res.body).to.be.an('array');
        expect(_.size(res.body)).to.equal(3);

        const courseList = _.orderBy(res.body, ['course_code'], ['asc']);
        _.each(courseList, (course, i) => {
          expect(course).to.be.an('object');
          expect(course).to.have.keys(['course_id', 'course_code', 'course_name', 'course_personal']);
          expect(course.course_code).to.equal(courses[i].courseCode);
          expect(course.course_name).to.equal(courses[i].courseName);
          expect(course.course_personal).to.be.an('array');

          _.each(course.course_personal, (teacher) => {
            expect(teacher).to.be.an('object');
            expect(teacher).to.have.keys(['id', 'first_name', 'last_name']);
          });
        });
      });
    });
  });

  describe('"student" not allowed to get course list', () => {
    before(async () => {
      await Promise.map(courses, (course) => server
        .post('/course')
        .set('api_key', token)
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
        .set('Cache-Control', 'no-cache')
        .send(course));
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

    after(() => pool.query('DELETE FROM course'));

    it('get course list = unauthorized', async () => {
      const res = await server
        .get('/course')
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
