const Room = require('../models/Room');
const Application = require('../../models/Application');
const { validateRoom, toNumber } = require('../validators/roomValidator');
// NOTE: Mongoose validation errors, duplicate-key errors (code 11000) and
// CastErrors are NOT formatted here — they're passed to next(err) and
// handled once, centrally, by middleware/errorhandler.js.

const ACTIVE_ROOM = { $ne: true }; // matches rooms where isArchived is false OR missing (older records)
const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 50;

// Escape user input so characters like ( + * ? [ don't break the $regex
// (an unescaped "(" makes MongoDB throw, which showed up as "search broken").
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const validationFailed = (res, errors) =>
  res.status(400).json({ success: false, message: 'Validation failed', errors });

// GET /api/rooms
// Public, student-facing room catalogue (archived rooms are never returned).
//
// Without `page`/`limit` it returns a plain array (the student page relies on
// that). With either param it returns { rooms, pagination }.
exports.getRooms = async (req, res, next) => {
  try {
    const { search, type, status, minPrice, maxPrice, sort, page, limit } = req.query;

    const filter = { isArchived: ACTIVE_ROOM };

    if (type) filter.type = type;
    if (status) filter.status = status;

    // Filter by monthly price (reject junk like ?minPrice=abc instead of 500-ing)
    const min = minPrice ? Number(minPrice) : undefined;
    const max = maxPrice ? Number(maxPrice) : undefined;

    if ((min !== undefined && !Number.isFinite(min)) || (max !== undefined && !Number.isFinite(max))) {
      return res.status(400).json({ success: false, message: 'minPrice and maxPrice must be numbers' });
    }
    if (min !== undefined && max !== undefined && min > max) {
      return res.status(400).json({ success: false, message: 'minPrice cannot be greater than maxPrice' });
    }
    if (min !== undefined || max !== undefined) {
      filter.pricePerMonth = {};
      if (min !== undefined) filter.pricePerMonth.$gte = min;
      if (max !== undefined) filter.pricePerMonth.$lte = max;
    }

    // Search room number, building or amenities
    if (search && String(search).trim()) {
      const safeSearch = escapeRegex(String(search).trim());
      filter.$or = [
        { roomNumber: { $regex: safeSearch, $options: 'i' } },
        { building: { $regex: safeSearch, $options: 'i' } },
        { amenities: { $regex: safeSearch, $options: 'i' } }
      ];
    }

    // Sorting. `_id` is a tie-breaker so pages never repeat or skip rooms
    // when several rooms share the same price / timestamp.
    let sortOption = { createdAt: -1, _id: -1 };
    if (sort === 'price_asc') sortOption = { pricePerMonth: 1, _id: 1 };
    else if (sort === 'price_desc') sortOption = { pricePerMonth: -1, _id: 1 };
    else if (sort === 'oldest') sortOption = { createdAt: 1, _id: 1 };

    // No pagination requested -> plain array (backwards compatible)
    if (page === undefined && limit === undefined) {
      const rooms = await Room.find(filter).sort(sortOption);
      return res.json(rooms);
    }

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(limit, 10) || DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);

    const [rooms, total] = await Promise.all([
      Room.find(filter)
        .sort(sortOption)
        .skip((pageNumber - 1) * pageSize)
        .limit(pageSize),
      Room.countDocuments(filter)
    ]);

    res.json({
      rooms,
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total,
        totalPages: Math.max(Math.ceil(total / pageSize), 1)
      }
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/rooms/archived  (admin only)
exports.getArchivedRooms = async (req, res, next) => {
  try {
    const rooms = await Room.find({ isArchived: true }).sort({ archivedAt: -1 });
    res.json(rooms);
  } catch (err) {
    next(err);
  }
};

// GET /api/rooms/:id
exports.getRoom = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room || room.isArchived) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    res.json(room);
  } catch (err) {
    next(err);
  }
};

// POST /api/rooms  (admin only)
exports.createRoom = async (req, res, next) => {
  try {
    const errors = validateRoom(req.body);
    if (errors.length) return validationFailed(res, errors);

    const {
      roomNumber,
      building,
      floor,
      type,
      capacity,
      occupied,
      pricePerMonth,
      currency,
      status,
      amenities,
      images,
      description
    } = req.body;

    if (toNumber(occupied || 0) > toNumber(capacity)) {
      return res.status(400).json({
        success: false,
        message: 'occupied cannot exceed capacity'
      });
    }

    const room = await Room.create({
      roomNumber: String(roomNumber).trim(),
      building: String(building).trim(),
      floor,
      type,
      capacity,
      occupied: occupied || 0,
      pricePerMonth,
      currency: currency || 'USD',
      status: status || 'available',
      amenities: amenities || [],
      images: images || [],
      description: description || ''
    });

    res.status(201).json(room);
  } catch (err) {
    next(err);
  }
};

// PUT /api/rooms/:id  (admin only)
// Only touches fields that are actually sent, so partial updates
// (like flipping a room to "maintenance") don't require resending
// the whole record.
exports.updateRoom = async (req, res, next) => {
  try {
    const allowedFields = [
      'roomNumber',
      'building',
      'floor',
      'type',
      'capacity',
      'occupied',
      'pricePerMonth',
      'currency',
      'status',
      'amenities',
      'images',
      'description'
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields provided to update'
      });
    }

    if (
      updates.capacity !== undefined &&
      updates.occupied !== undefined &&
      toNumber(updates.occupied) > toNumber(updates.capacity)
    ) {
      return res.status(400).json({
        success: false,
        message: 'occupied cannot exceed capacity'
      });
    }

    const errors = validateRoom(updates, { partial: true });
    if (errors.length) return validationFailed(res, errors);

    // Only one of capacity/occupied was sent: compare against the stored value
    // so e.g. lowering capacity below the current occupancy is rejected.
    if ((updates.capacity === undefined) !== (updates.occupied === undefined)) {
      const existing = await Room.findById(req.params.id);

      if (!existing) {
        return res.status(404).json({ success: false, message: 'Room not found' });
      }

      const capacity = toNumber(updates.capacity !== undefined ? updates.capacity : existing.capacity);
      const occupied = toNumber(updates.occupied !== undefined ? updates.occupied : existing.occupied);

      if (occupied > capacity) {
        return res.status(400).json({
          success: false,
          message: 'occupied cannot exceed capacity'
        });
      }
    }

    const room = await Room.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    res.json(room);
  } catch (err) {
    next(err);
  }
};

// Adjust a room's occupied count by `delta` (+1 when an application is
// approved, -1 when a previously-approved application is rejected/reset).
// Clamped to [0, capacity] so it can never go negative or over-book a
// room. The Room schema's pre('save') hook takes care of flipping
// `status` between 'available' and 'occupied' as occupied changes.
// Used by the applications route — never called directly from a client.
exports.adjustRoomOccupancy = async (roomId, delta) => {
  if (!roomId) return null;

  let room;
  try {
    room = await Room.findById(roomId);
  } catch (err) {
    return null; // invalid/unknown room id — nothing to sync
  }

  if (!room) return null;

  const next = room.occupied + delta;
  room.occupied = Math.max(0, Math.min(next, room.capacity));

  await room.save();
  return room;
};

// DELETE /api/rooms/:id  (admin only)
// Soft delete: the room is archived, not removed. Blocked while the room
// still has occupants or Pending/Approved applications pointing at it.
exports.deleteRoom = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room || room.isArchived) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    if (room.occupied > 0) {
      return res.status(409).json({
        success: false,
        message: `Room ${room.roomNumber} still has ${room.occupied} occupant(s). Move them out before archiving.`
      });
    }

    // Applications store the room reference as a string (id, or room number as a fallback)
    const activeApplications = await Application.countDocuments({
      roomId: { $in: [String(room._id), room.roomNumber] },
      status: { $in: ['Pending', 'Approved'] }
    });

    if (activeApplications > 0) {
      return res.status(409).json({
        success: false,
        message: `Room ${room.roomNumber} has ${activeApplications} active application(s). Reject or resolve them before archiving.`
      });
    }

    const archived = await Room.findByIdAndUpdate(
      req.params.id,
      { isArchived: true, archivedAt: new Date() },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Room archived',
      room: archived
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/rooms/:id/permanent  (admin only)
// Hard delete. Only allowed for rooms that are ALREADY archived, have no
// occupants and have no Pending/Approved applications. Cannot be undone.
exports.permanentDeleteRoom = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    if (!room.isArchived) {
      return res.status(409).json({
        success: false,
        message: 'Archive the room first. Only archived rooms can be permanently deleted.'
      });
    }

    if (room.occupied > 0) {
      return res.status(409).json({
        success: false,
        message: `Room ${room.roomNumber} still has ${room.occupied} occupant(s). Move them out before deleting.`
      });
    }

    const activeApplications = await Application.countDocuments({
      roomId: { $in: [String(room._id), room.roomNumber] },
      status: { $in: ['Pending', 'Approved'] }
    });

    if (activeApplications > 0) {
      return res.status(409).json({
        success: false,
        message: `Room ${room.roomNumber} has ${activeApplications} active application(s). Resolve them before deleting.`
      });
    }

    await Room.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: `Room ${room.roomNumber} permanently deleted` });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/rooms/:id/restore  (admin only)
exports.restoreRoom = async (req, res, next) => {
  try {
    const room = await Room.findOneAndUpdate(
      { _id: req.params.id, isArchived: true },
      { isArchived: false, $unset: { archivedAt: 1 } },
      { new: true }
    );

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Archived room not found'
      });
    }

    res.json({ success: true, message: 'Room restored', room });
  } catch (err) {
    next(err);
  }
};