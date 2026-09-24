const request = require('supertest');
const express = require('express');

const app = express();
app.get('/health', (_req, res) => res.status(200).json({ status: 'UP' }));

describe('Pipeline Automated Health Check Tests', () => {
  it('GET /health should return HTTP 200 OK', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toEqual(200);
  });
});