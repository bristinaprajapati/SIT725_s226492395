// Tests for the link between application approvals and room availability
// (Room Module Sprint task: "Room availability auto-update logic").
//
// Both the Application and Room models are mocked so these run fast and
// without a live MongoDB connection, matching the approach already used
// in tests/room.test.js.
//
// Run with: npm test

const express = require('express');
const request = require('supertest');
const applicationRoutes = require('../routes/applications');
const errorHandler = require('../middleware/errorhandler');
const Application = require('../models/Application');
const Room = require('../src/models/Room');

jest.mock('../models/Application', () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn()
}));

jest.mock('../src/models/Room', () => ({
  findById: jest.fn()
}));

const app = express();
app.use(express.json());
app.use('/api/applications', applicationRoutes);
app.use(errorHandler);

afterEach(() => {
  jest.clearAllMocks();
});

function makeRoom(overrides = {}) {
  return {
    _id: 'room1',
    capacity: 2,
    occupied: 0,
    save: jest.fn().mockResolvedValue(true),
    ...overrides
  };
}

describe('PATCH /api/applications/:id (room availability sync)', () => {
  it('increments room occupancy when an application is approved', async () => {
    Application.findById.mockResolvedValue({ _id: 'app1', status: 'Pending', roomId: 'room1' });
    Application.findByIdAndUpdate.mockResolvedValue({
      _id: 'app1',
      status: 'Approved',
      roomId: 'room1'
    });

    const room = makeRoom({ occupied: 0 });
    Room.findById.mockResolvedValue(room);

    const res = await request(app).patch('/api/applications/app1').send({ status: 'Approved' });

    expect(res.status).toBe(200);
    expect(Room.findById).toHaveBeenCalledWith('room1');
    expect(room.occupied).toBe(1);
    expect(room.save).toHaveBeenCalled();
  });

  it('decrements room occupancy when a previously approved application is rejected', async () => {
    Application.findById.mockResolvedValue({ _id: 'app1', status: 'Approved', roomId: 'room1' });
    Application.findByIdAndUpdate.mockResolvedValue({
      _id: 'app1',
      status: 'Rejected',
      roomId: 'room1'
    });

    const room = makeRoom({ occupied: 1 });
    Room.findById.mockResolvedValue(room);

    const res = await request(app).patch('/api/applications/app1').send({ status: 'Rejected' });

    expect(res.status).toBe(200);
    expect(room.occupied).toBe(0);
    expect(room.save).toHaveBeenCalled();
  });

  it('decrements room occupancy when an approved application is reset to pending', async () => {
    Application.findById.mockResolvedValue({ _id: 'app1', status: 'Approved', roomId: 'room1' });
    Application.findByIdAndUpdate.mockResolvedValue({
      _id: 'app1',
      status: 'Pending',
      roomId: 'room1'
    });

    const room = makeRoom({ occupied: 1 });
    Room.findById.mockResolvedValue(room);

    await request(app).patch('/api/applications/app1').send({ status: 'Pending' });

    expect(room.occupied).toBe(0);
  });

  it('does not touch the room when the status does not actually change', async () => {
    Application.findById.mockResolvedValue({ _id: 'app1', status: 'Pending', roomId: 'room1' });
    Application.findByIdAndUpdate.mockResolvedValue({
      _id: 'app1',
      status: 'Pending',
      roomId: 'room1'
    });

    await request(app).patch('/api/applications/app1').send({ status: 'Pending' });

    expect(Room.findById).not.toHaveBeenCalled();
  });

  it('never drops occupancy below zero, even if it is already at zero', async () => {
    Application.findById.mockResolvedValue({ _id: 'app1', status: 'Approved', roomId: 'room1' });
    Application.findByIdAndUpdate.mockResolvedValue({
      _id: 'app1',
      status: 'Rejected',
      roomId: 'room1'
    });

    const room = makeRoom({ occupied: 0 });
    Room.findById.mockResolvedValue(room);

    await request(app).patch('/api/applications/app1').send({ status: 'Rejected' });

    expect(room.occupied).toBe(0);
  });

  it('never pushes occupancy above capacity', async () => {
    Application.findById.mockResolvedValue({ _id: 'app1', status: 'Pending', roomId: 'room1' });
    Application.findByIdAndUpdate.mockResolvedValue({
      _id: 'app1',
      status: 'Approved',
      roomId: 'room1'
    });

    const room = makeRoom({ occupied: 2, capacity: 2 });
    Room.findById.mockResolvedValue(room);

    await request(app).patch('/api/applications/app1').send({ status: 'Approved' });

    expect(room.occupied).toBe(2);
  });

  it('still updates the application when the linked room no longer exists', async () => {
    Application.findById.mockResolvedValue({ _id: 'app1', status: 'Pending', roomId: 'ghost' });
    Application.findByIdAndUpdate.mockResolvedValue({
      _id: 'app1',
      status: 'Approved',
      roomId: 'ghost'
    });

    Room.findById.mockResolvedValue(null);

    const res = await request(app).patch('/api/applications/app1').send({ status: 'Approved' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Approved');
  });

  it('returns 404 when the application does not exist', async () => {
    Application.findById.mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/applications/doesnotexist')
      .send({ status: 'Approved' });

    expect(res.status).toBe(404);
    expect(Application.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects an invalid status value before touching the application', async () => {
    const res = await request(app).patch('/api/applications/app1').send({ status: 'Bogus' });

    expect(res.status).toBe(400);
    expect(Application.findById).not.toHaveBeenCalled();
  });
});