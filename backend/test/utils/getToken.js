/* eslint linebreak-style: ["error", "windows"] */
/* eslint func-names: ["error", "never"] */
const supertest = require('supertest');
const jwt = require('jsonwebtoken');

const server = supertest.agent(`http://${process.env.TEST_HOST}:8080/v1`);

async function testAdminUserSignUp() {
  let token;
  const res = await server
    .post('/user/signUp')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json')
    .set('Cache-Control', 'no-cache')
    .send({
      password: 'password',
      email: 'test.admin@email.com',
      firstName: 'First name',
      lastName: 'Last name',
      userType: 'admin',
    });
  if (res.statusCode === 201) {
    const newRes = await server
      .post('/user/login')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        password: 'password',
        email: 'test.admin@email.com',
      });
    token = newRes.body.token;
    return token;
  }
  throw new Error('Sign up problem');
}

async function testStudentUserSignUp(body) {
  let token;
  const res = await server
    .post('/user/signUp')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json')
    .set('Cache-Control', 'no-cache')
    .send(body);
  if (res.statusCode === 201) {
    const newRes = await server
      .post('/user/login')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        password: body.password,
        email: body.email,
      });
    token = newRes.body.token;
    return token;
  }
  throw new Error('Sign up problem');
}

async function testTeacherUserSignUp(body) {
  let token;
  const res = await server
    .post('/user/signUp')
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json')
    .set('Cache-Control', 'no-cache')
    .send(body);
  if (res.statusCode === 201) {
    const newRes = await server
      .post('/user/login')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .set('Cache-Control', 'no-cache')
      .send({
        password: body.password,
        email: body.email,
      });
    token = newRes.body.token;
    return token;
  }
  throw new Error('Sign up problem');
}

async function getUserId(token) {
  const response = jwt.verify(token, process.env.jwtAuthToken);
  return response.id;
}

module.exports = {
  testAdminUserSignUp,
  testStudentUserSignUp,
  testTeacherUserSignUp,
  getUserId,
};
