/* eslint linebreak-style: ["error", "windows"] */
/* eslint func-names: ["error", "never"] */
const supertest = require('supertest');

const server = supertest.agent(`http://${process.env.TEST_HOST}:8080/v1`);

async function addRoom(token, room) {
  const res = await server
    .post('/room')
    .set('api_key', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json')
    .set('Cache-Control', 'no-cache')
    .send(room);
  if (res.statusCode === 200) {
    const roomId = res.body.message.split(': ')[1]; // eslint-disable-line prefer-destructuring
    return roomId;
  }
  throw new Error('Test room create problem.');
}

async function addBeacon(token, beacon) {
  const res = await server
    .post('/beacon')
    .set('api_key', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json')
    .set('Cache-Control', 'no-cache')
    .send(beacon);

  if (res.statusCode === 200) {
    const beaconId = res.body.message.split(': ')[1]; // eslint-disable-line prefer-destructuring
    return beaconId;
  }
  throw new Error('Test beacon create problem.');
}

async function addAssociation(token, roomId, body) {
  const res = await server
    .post(`/beaconRoom/${roomId}`)
    .set('api_key', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json')
    .set('Cache-Control', 'no-cache')
    .send(body);

  if (res.statusCode === 201) {
    return true;
  }
  throw new Error('Test association create problem.');
}

async function addCourse(token, course) {
  const res = await server
    .post('/course')
    .set('api_key', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json')
    .set('Cache-Control', 'no-cache')
    .send(course);

  if (res.statusCode === 200) {
    const courseId = res.body.message.split(': ')[1]; // eslint-disable-line prefer-destructuring
    return courseId;
  }
  throw new Error('Test association create problem.');
}

async function addEvent(token, event) {
  const res = await server
    .post('/event')
    .set('api_key', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json')
    .set('Cache-Control', 'no-cache')
    .send(event);

  if (res.statusCode === 201) {
    return true;
  }
  throw new Error('Test event create problem.');
}


async function getEvents(token) {
  const res = await server
    .get('/event')
    .set('api_key', token)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json')
    .set('Cache-Control', 'no-cache');

  if (res.statusCode === 200) {
    return res.body;
  }
  throw new Error('Test event get problem.');
}

module.exports = {
  addRoom,
  addBeacon,
  addAssociation,
  addCourse,
  addEvent,
  getEvents,
};
