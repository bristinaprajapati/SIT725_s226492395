// Automated tests for the Room Management module (Sanika's Sprint 1 allocation).
//
// The Room model is mocked, so these tests run fast and don't require a
// live MongoDB connection — useful for CI and for running live during
// the 9.2D demo.
//
// Run with: npm test

const request = require('supertest');
const app = require('./testApp');
const Room = require('../src/models/Room');
const Application = require('../models/Application');
const { adminAuth, studentAuth } = require('./authHelper');

// IMPORTANT: don't use plain jest.mock('../src/models/Room') here.
// Jest's automocker doesn't reliably detect methods on Mongoose models
// (find, create, findByIdAndUpdate, etc.), so it silently produces an
// object where those methods are undefined instead of jest.fn() stubs.
// Passing an explicit factory guarantees every method we call in these
// tests actually exists as a mock function.
jest.mock('../src/models/Room', () => ({
  find: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findOneAndUpdate: jest.fn(),
  countDocuments: jest.fn()
}));

jest.mock('../models/Application', () => ({
  countDocuments: jest.fn()
}));

const sampleRoom = {
  _id: '652f1f1f1f1f1f1f1f1f1f1f',
  roomNumber: 'A-101',
  building: 'Hillcrest Hall',
  floor: 1,
  type: 'single',
  capacity: 1,
  occupied: 0,
  pricePerMonth: 450,
  currency: 'USD',
  status: 'available',
  amenities: ['wifi', 'desk'],
  images: [],
  description: 'Cozy single room.'
};

afterEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/rooms', () => {
  it('returns all rooms with no query params', async () => {
    const sortMock = jest.fn().mockResolvedValue([sampleRoom]);
    Room.find.mockReturnValue({ sort: sortMock });

    const res = await request(app).get('/api/rooms');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(Room.find).toHaveBeenCalledWith({ isArchived: { $ne: true } });
  });

  it('applies type, status and price filters together', async () => {
    const sortMock = jest.fn().mockResolvedValue([sampleRoom]);
    Room.find.mockReturnValue({ sort: sortMock });

    const res = await request(app).get(
      '/api/rooms?type=single&status=available&minPrice=100&maxPrice=500'
    );

    expect(res.status).toBe(200);
    expect(Room.find).toHaveBeenCalledWith({
      isArchived: { $ne: true },
      type: 'single',
      status: 'available',
      pricePerMonth: { $gte: 100, $lte: 500 }
    });
  });

  it('applies a case-insensitive search across roomNumber, building and amenities', async () => {
    const sortMock = jest.fn().mockResolvedValue([sampleRoom]);
    Room.find.mockReturnValue({ sort: sortMock });

    await request(app).get('/api/rooms?search=hillcrest');

    const filterArg = Room.find.mock.calls[0][0];
    expect(filterArg.$or).toEqual([
      { roomNumber: { $regex: 'hillcrest', $options: 'i' } },
      { building: { $regex: 'hillcrest', $options: 'i' } },
      { amenities: { $regex: 'hillcrest', $options: 'i' } }
    ]);
  });

  it('sorts by price ascending when sort=price_asc', async () => {
    const sortMock = jest.fn().mockResolvedValue([sampleRoom]);
    Room.find.mockReturnValue({ sort: sortMock });

    await request(app).get('/api/rooms?sort=price_asc');

    expect(sortMock).toHaveBeenCalledWith({ pricePerMonth: 1, _id: 1 });
  });
});

describe('GET /api/rooms/:id', () => {
  it('returns 200 and the room when found', async () => {
    Room.findById.mockResolvedValue(sampleRoom);

    const res = await request(app).get(`/api/rooms/${sampleRoom._id}`);

    expect(res.status).toBe(200);
    expect(res.body.roomNumber).toBe('A-101');
  });

  it('returns 404 when the room does not exist', async () => {
    Room.findById.mockResolvedValue(null);

    const res = await request(app).get('/api/rooms/doesnotexist');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/rooms', () => {
  it('rejects a request missing required fields', async () => {
    const res = await request(app).post('/api/rooms').set('Authorization', adminAuth()).send({
      roomNumber: 'A-999'
      // building, floor, type, capacity, pricePerMonth all missing
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(Room.create).not.toHaveBeenCalled();
  });

  it('rejects an unrecognised status value at the schema level', async () => {
    // Simulates Mongoose's enum validation rejecting the room.
    Room.create.mockRejectedValue({
      name: 'ValidationError',
      errors: { status: { message: '`bogus` is not a valid enum value for path `status`.' } }
    });

    const res = await request(app).post('/api/rooms').set('Authorization', adminAuth()).send({
      roomNumber: 'A-999',
      building: 'Test Hall',
      floor: 1,
      type: 'single',
      capacity: 1,
      pricePerMonth: 300,
      status: 'bogus'
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
  });

  it('rejects a negative capacity at the schema level', async () => {
    // Simulates Mongoose's min-value validation (capacity has min: 1)
    Room.create.mockRejectedValue({
      name: 'ValidationError',
      errors: {
        capacity: { message: 'Path `capacity` (-1) is less than minimum allowed value (1).' }
      }
    });

    const res = await request(app).post('/api/rooms').set('Authorization', adminAuth()).send({
      roomNumber: 'A-998',
      building: 'Test Hall',
      floor: 1,
      type: 'single',
      capacity: -1,
      pricePerMonth: 300
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
  });

  it('rejects a negative pricePerMonth at the schema level', async () => {
    // Simulates Mongoose's min-value validation (pricePerMonth has min: 0)
    Room.create.mockRejectedValue({
      name: 'ValidationError',
      errors: {
        pricePerMonth: { message: 'Path `pricePerMonth` (-50) is less than minimum allowed value (0).' }
      }
    });

    const res = await request(app).post('/api/rooms').set('Authorization', adminAuth()).send({
      roomNumber: 'A-997',
      building: 'Test Hall',
      floor: 1,
      type: 'single',
      capacity: 1,
      pricePerMonth: -50
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
  });

  it('rejects a duplicate roomNumber', async () => {
    // Simulates MongoDB's duplicate-key error for the unique roomNumber index.
    // errorHandler.js has a dedicated branch for err.code === 11000.
    Room.create.mockRejectedValue({
      code: 11000,
      message: 'E11000 duplicate key error collection: rooms index: roomNumber_1'
    });

    const res = await request(app).post('/api/rooms').set('Authorization', adminAuth()).send({
      roomNumber: 'A-101', // already exists, per seed data
      building: 'Hillcrest Hall',
      floor: 1,
      type: 'single',
      capacity: 1,
      pricePerMonth: 450
    });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe('A record with this information already exists');
  });

  it('creates a room and defaults optional fields when valid', async () => {
    Room.create.mockResolvedValue(sampleRoom);

    const res = await request(app).post('/api/rooms').set('Authorization', adminAuth()).send({
      roomNumber: 'A-101',
      building: 'Hillcrest Hall',
      floor: 1,
      type: 'single',
      capacity: 1,
      pricePerMonth: 450
    });

    expect(res.status).toBe(201);
    expect(Room.create).toHaveBeenCalledWith(
      expect.objectContaining({
        occupied: 0,
        currency: 'USD',
        status: 'available',
        amenities: [],
        images: [],
        description: ''
      })
    );
  });
});

describe('PUT /api/rooms/:id', () => {
  it('rejects an update with no recognised fields', async () => {
    const res = await request(app)
      .put(`/api/rooms/${sampleRoom._id}`)
      .set('Authorization', adminAuth())
      .send({ notARealField: true });

    expect(res.status).toBe(400);
    expect(Room.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects occupied greater than capacity', async () => {
    const res = await request(app)
      .put(`/api/rooms/${sampleRoom._id}`)
      .set('Authorization', adminAuth())
      .send({ capacity: 2, occupied: 5 });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/occupied cannot exceed capacity/);
  });

  it('updates a room with valid partial data', async () => {
    Room.findByIdAndUpdate.mockResolvedValue({
      ...sampleRoom,
      status: 'maintenance'
    });

    const res = await request(app)
      .put(`/api/rooms/${sampleRoom._id}`)
      .set('Authorization', adminAuth())
      .send({ status: 'maintenance' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('maintenance');
    expect(Room.findByIdAndUpdate).toHaveBeenCalledWith(
      sampleRoom._id,
      { status: 'maintenance' },
      { new: true, runValidators: true }
    );
  });

  it('returns 404 when updating a room that does not exist', async () => {
    Room.findByIdAndUpdate.mockResolvedValue(null);

    const res = await request(app)
      .put('/api/rooms/doesnotexist')
      .set('Authorization', adminAuth())
      .send({ status: 'maintenance' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/rooms/:id (archive)', () => {
  const emptyRoom = { ...sampleRoom, occupied: 0 };

  it('archives (soft deletes) a room with no occupants or active applications', async () => {
    Room.findById.mockResolvedValue(emptyRoom);
    Application.countDocuments.mockResolvedValue(0);
    Room.findByIdAndUpdate.mockResolvedValue({ ...emptyRoom, isArchived: true });

    const res = await request(app)
      .delete(`/api/rooms/${sampleRoom._id}`)
      .set('Authorization', adminAuth());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Room archived');
    expect(Room.findByIdAndUpdate).toHaveBeenCalledWith(
      sampleRoom._id,
      expect.objectContaining({ isArchived: true, archivedAt: expect.any(Date) }),
      { new: true }
    );
  });

  it('blocks archiving a room that still has occupants', async () => {
    Room.findById.mockResolvedValue({ ...emptyRoom, occupied: 1 });

    const res = await request(app)
      .delete(`/api/rooms/${sampleRoom._id}`)
      .set('Authorization', adminAuth());

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/occupant/);
    expect(Room.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('blocks archiving a room with Pending/Approved applications', async () => {
    Room.findById.mockResolvedValue(emptyRoom);
    Application.countDocuments.mockResolvedValue(2);

    const res = await request(app)
      .delete(`/api/rooms/${sampleRoom._id}`)
      .set('Authorization', adminAuth());

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/active application/);
    expect(Room.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('returns 404 when the room does not exist', async () => {
    Room.findById.mockResolvedValue(null);

    const res = await request(app)
      .delete('/api/rooms/doesnotexist')
      .set('Authorization', adminAuth());

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('returns 404 when the room is already archived', async () => {
    Room.findById.mockResolvedValue({ ...emptyRoom, isArchived: true });

    const res = await request(app)
      .delete(`/api/rooms/${sampleRoom._id}`)
      .set('Authorization', adminAuth());

    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/rooms/:id/restore', () => {
  it('restores an archived room', async () => {
    Room.findOneAndUpdate.mockResolvedValue({ ...sampleRoom, isArchived: false });

    const res = await request(app)
      .patch(`/api/rooms/${sampleRoom._id}/restore`)
      .set('Authorization', adminAuth());

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Room restored');
  });

  it('returns 404 when there is no archived room with that id', async () => {
    Room.findOneAndUpdate.mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/rooms/doesnotexist/restore')
      .set('Authorization', adminAuth());

    expect(res.status).toBe(404);
  });
});

describe('GET /api/rooms/archived', () => {
  it('returns archived rooms to an admin', async () => {
    const sortMock = jest.fn().mockResolvedValue([{ ...sampleRoom, isArchived: true }]);
    Room.find.mockReturnValue({ sort: sortMock });

    const res = await request(app).get('/api/rooms/archived').set('Authorization', adminAuth());

    expect(res.status).toBe(200);
    expect(Room.find).toHaveBeenCalledWith({ isArchived: true });
  });

  it('is not available to students', async () => {
    const res = await request(app).get('/api/rooms/archived').set('Authorization', studentAuth());
    expect(res.status).toBe(403);
  });

  it('a public GET by id returns 404 for an archived room', async () => {
    Room.findById.mockResolvedValue({ ...sampleRoom, isArchived: true });

    const res = await request(app).get(`/api/rooms/${sampleRoom._id}`);

    expect(res.status).toBe(404);
  });
});

describe('Route protection', () => {
  it('rejects create/update/archive/restore without a token (401)', async () => {
    const calls = [
      request(app).post('/api/rooms').send({}),
      request(app).put(`/api/rooms/${sampleRoom._id}`).send({ status: 'maintenance' }),
      request(app).delete(`/api/rooms/${sampleRoom._id}`),
      request(app).patch(`/api/rooms/${sampleRoom._id}/restore`)
    ];

    const results = await Promise.all(calls);
    results.forEach((r) => expect(r.status).toBe(401));
    expect(Room.create).not.toHaveBeenCalled();
    expect(Room.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects a student token with 403', async () => {
    const res = await request(app)
      .post('/api/rooms')
      .set('Authorization', studentAuth())
      .send({ roomNumber: 'A-1' });

    expect(res.status).toBe(403);
    expect(Room.create).not.toHaveBeenCalled();
  });

  it('keeps the catalogue (GET /api/rooms) public', async () => {
    Room.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([sampleRoom]) });

    const res = await request(app).get('/api/rooms');

    expect(res.status).toBe(200);
  });
});

describe('Server-side validation', () => {
  const valid = {
    roomNumber: 'B-201',
    building: 'Test Hall',
    floor: 2,
    type: 'double',
    capacity: 2,
    pricePerMonth: 500
  };

  const post = (body) => request(app).post('/api/rooms').set('Authorization', adminAuth()).send(body);

  it.each([
    ['an invalid room type', { type: 'penthouse' }, /type must be one of/],
    ['a non-integer floor', { floor: 1.5 }, /floor must be a whole number/],
    ['a capacity above the limit', { capacity: 99 }, /capacity must be/],
    ['an invalid image URL', { images: ['not-a-url'] }, /images must be/],
    ['a javascript: image URL', { images: ['javascript:alert(1)'] }, /images must be/],
    ['a blank room number', { roomNumber: '   ' }, /roomNumber is required/]
  ])('rejects %s with 400 and a helpful error list', async (_label, override, pattern) => {
    const res = await post({ ...valid, ...override });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
    expect(res.body.errors.join(' ')).toMatch(pattern);
    expect(Room.create).not.toHaveBeenCalled();
  });

  it('rejects occupied greater than capacity on create', async () => {
    const res = await post({ ...valid, capacity: 2, occupied: 3 });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/occupied cannot exceed capacity/);
    expect(Room.create).not.toHaveBeenCalled();
  });

  it('rejects lowering capacity below the stored occupancy on update', async () => {
    Room.findById.mockResolvedValue({ ...sampleRoom, capacity: 4, occupied: 3 });

    const res = await request(app)
      .put(`/api/rooms/${sampleRoom._id}`)
      .set('Authorization', adminAuth())
      .send({ capacity: 2 });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/occupied cannot exceed capacity/);
    expect(Room.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects an invalid field value on update', async () => {
    const res = await request(app)
      .put(`/api/rooms/${sampleRoom._id}`)
      .set('Authorization', adminAuth())
      .send({ pricePerMonth: -5 });

    expect(res.status).toBe(400);
    expect(res.body.errors.join(' ')).toMatch(/pricePerMonth/);
  });
});

describe('GET /api/rooms pagination and query validation', () => {
  function mockPagedFind(rooms, total) {
    const limitMock = jest.fn().mockResolvedValue(rooms);
    const skipMock = jest.fn().mockReturnValue({ limit: limitMock });
    const sortMock = jest.fn().mockReturnValue({ skip: skipMock });
    Room.find.mockReturnValue({ sort: sortMock });
    Room.countDocuments.mockResolvedValue(total);
    return { skipMock, limitMock };
  }

  it('returns { rooms, pagination } when page/limit are supplied', async () => {
    const { skipMock, limitMock } = mockPagedFind([sampleRoom], 11);

    const res = await request(app).get('/api/rooms?page=2&limit=5');

    expect(res.status).toBe(200);
    expect(skipMock).toHaveBeenCalledWith(5);
    expect(limitMock).toHaveBeenCalledWith(5);
    expect(res.body.rooms).toHaveLength(1);
    expect(res.body.pagination).toEqual({ page: 2, limit: 5, total: 11, totalPages: 3 });
  });

  it('caps the page size and falls back to page 1 for bad input', async () => {
    const { skipMock, limitMock } = mockPagedFind([], 0);

    const res = await request(app).get('/api/rooms?page=-3&limit=999');

    expect(skipMock).toHaveBeenCalledWith(0);
    expect(limitMock).toHaveBeenCalledWith(50);
    expect(res.body.pagination.totalPages).toBe(1);
  });

  it('rejects non-numeric price filters with 400', async () => {
    const res = await request(app).get('/api/rooms?minPrice=abc');

    expect(res.status).toBe(400);
    expect(Room.find).not.toHaveBeenCalled();
  });

  it('rejects minPrice greater than maxPrice with 400', async () => {
    const res = await request(app).get('/api/rooms?minPrice=900&maxPrice=100');

    expect(res.status).toBe(400);
  });

  it('escapes regex characters in the search term', async () => {
    Room.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });

    const res = await request(app).get('/api/rooms?search=' + encodeURIComponent('wifi (fast'));

    expect(res.status).toBe(200);
    expect(Room.find.mock.calls[0][0].$or[0].roomNumber.$regex).toBe('wifi \\(fast');
  });
});