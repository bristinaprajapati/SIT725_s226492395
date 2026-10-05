// Server-side validation for Room payloads.
// Returns an array of human-readable error strings (empty array = valid).
// `partial: true` is used for PUT updates, where only the fields that were
// actually sent are checked.

const ROOM_TYPES = ['single', 'double', 'triple', 'dorm', 'suite'];
const ROOM_STATUSES = ['available', 'occupied', 'reserved', 'maintenance'];

const toNumber = (value) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') return Number(value);
  return NaN;
};

const isWholeNumber = (value) => Number.isInteger(toNumber(value));

const isNonBlankString = (value, max) =>
  typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max;

const isHttpUrl = (value) => {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (err) {
    return false;
  }
};
const isImageRef = (value) =>
  isHttpUrl(value) ||
  (typeof value === 'string' && /^\/images\/rooms\/[\w.\-]+\.(jpe?g|png|webp|gif)$/i.test(value));

function validateRoom(body = {}, { partial = false } = {}) {
  const errors = [];
  const has = (field) => body[field] !== undefined;
  const check = (field) => !partial || has(field);

  if (check('roomNumber') && !isNonBlankString(body.roomNumber, 20)) {
    errors.push('roomNumber is required (max 20 characters)');
  }

  if (check('building') && !isNonBlankString(body.building, 100)) {
    errors.push('building is required (max 100 characters)');
  }

  if (check('floor')) {
    const floor = toNumber(body.floor);
    if (!isWholeNumber(body.floor) || floor < -5 || floor > 100) {
      errors.push('floor must be a whole number between -5 and 100');
    }
  }

  if (check('type') && !ROOM_TYPES.includes(body.type)) {
    errors.push(`type must be one of: ${ROOM_TYPES.join(', ')}`);
  }

  if (check('capacity')) {
    const capacity = toNumber(body.capacity);
    if (!isWholeNumber(body.capacity) || capacity < 1 || capacity > 20) {
      errors.push('capacity must be a whole number between 1 and 20');
    }
  }

  if (has('occupied')) {
    const occupied = toNumber(body.occupied);
    if (!isWholeNumber(body.occupied) || occupied < 0) {
      errors.push('occupied must be a whole number of 0 or more');
    }
  }

  if (check('pricePerMonth')) {
    const price = toNumber(body.pricePerMonth);
    if (!Number.isFinite(price) || price < 0 || price > 100000) {
      errors.push('pricePerMonth must be a number between 0 and 100000');
    }
  }

  if (has('currency') && !/^[A-Za-z]{3}$/.test(String(body.currency))) {
    errors.push('currency must be a 3-letter code such as USD');
  }

  if (has('status') && !ROOM_STATUSES.includes(body.status)) {
    errors.push(`status must be one of: ${ROOM_STATUSES.join(', ')}`);
  }

  if (has('amenities')) {
    const ok =
      Array.isArray(body.amenities) &&
      body.amenities.length <= 20 &&
      body.amenities.every((a) => isNonBlankString(a, 50));
    if (!ok) errors.push('amenities must be a list of up to 20 short text items');
  }

  if (has('images')) {
    const ok =
      Array.isArray(body.images) &&
      body.images.length <= 10 &&
      body.images.every(isImageRef);
    if (!ok) errors.push('images must be up to 10 http(s) URLs or /images/rooms/ file paths');
  }

  if (has('description') && (typeof body.description !== 'string' || body.description.length > 1000)) {
    errors.push('description must be text of at most 1000 characters');
  }

  return errors;
}

module.exports = { validateRoom, ROOM_TYPES, ROOM_STATUSES, toNumber };