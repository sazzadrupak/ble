/* eslint linebreak-style: ["error", "windows"] */

const { Pool } = require('pg');

const isProduction = process.env.NODE_ENV === 'production';
require('dotenv').config();

const connectionString = `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DATABASE}`;
// const connectionString = `postgresql://TIE:ZAQ!2wsx@postgres:5432/beacon_attendance`;

const pool = new Pool({
  connectionString: isProduction ? process.env.DATABASE_URL : connectionString,
  ssl: isProduction,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

module.exports = { pool };
