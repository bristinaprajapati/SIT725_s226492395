// Admin Room Management: add/edit/archive rooms, search & filter, pagination
// and an archive view. Talks to /api/rooms (src/routes/rooms.js). Write
// operations need an admin JWT, which is sent as a Bearer token.

// ----------------------------------------------------
// DOM ELEMENTS
// ----------------------------------------------------

const roomsGrid = document.getElementById('roomsGrid');
const roomsMessage = document.getElementById('roomsMessage');
const roomsPager = document.getElementById('roomsPager');
const adminName = document.getElementById('adminName');

const roomsToolbar = document.querySelector('.rooms-toolbar');
const roomSearch = document.getElementById('roomSearch');
const typeFilter = document.getElementById('typeFilter');
const statusFilter = document.getElementById('statusFilter');
const minPrice = document.getElementById('minPrice');
const maxPrice = document.getElementById('maxPrice');
const sortBy = document.getElementById('sortBy');
const clearFiltersButton = document.getElementById('clearFiltersButton');
const archivedToggle = document.getElementById('archivedToggle');

const refreshButton = document.getElementById('refreshButton');
const logoutButton = document.getElementById('logoutButton');
const addRoomButton = document.getElementById('addRoomButton');

const roomModal = document.getElementById('roomModal');
const roomModalTitle = document.getElementById('roomModalTitle');
const closeRoomModal = document.getElementById('closeRoomModal');
const cancelRoomForm = document.getElementById('cancelRoomForm');
const roomForm = document.getElementById('roomForm');
const roomFormError = document.getElementById('roomFormError');

const PAGE_SIZE = 9;

// ----------------------------------------------------
// CHECK ADMIN LOGIN
// ----------------------------------------------------

const token = localStorage.getItem('token');
const userData = localStorage.getItem('user');

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/';
}

if (!token || !userData) {
  window.location.href = '/';
} else {
  try {
    const user = JSON.parse(userData);

    if (user.role !== 'admin') {
      window.location.href = '/student/dashboard.html';
    } else if (user.name) {
      adminName.textContent = user.name;
    }
  } catch (error) {
    logout();
  }
}

// ----------------------------------------------------
// API HELPER (adds the JWT, unwraps errors)
// ----------------------------------------------------

async function api(url, options = {}) {
  const headers = { Authorization: `Bearer ${token}`, ...(options.headers || {}) };
  if (options.body) headers['Content-Type'] = 'application/json';

  const res = await fetch(url, { ...options, headers });

  let data = null;
  try {
    data = await res.json();
  } catch (err) {
    data = null;
  }

  if (res.status === 401) {
    logout();
    throw new Error('Your session has expired. Please log in again.');
  }

  if (!res.ok) {
    const detail = data && Array.isArray(data.errors) && data.errors.length
      ? data.errors.join(' • ')
      : data && data.message;
    const error = new Error(detail || 'Request failed.');
    error.status = res.status;
    throw error;
  }

  return data;
}

// ----------------------------------------------------
// ROOM ICON PLACEHOLDER (used when a room has no image)
// ----------------------------------------------------

const ROOM_ICON_SVG = `
  <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 21V7l9-4 9 4v14"></path>
    <path d="M9 21v-7h6v7"></path>
    <path d="M3 11h18"></path>
  </svg>
`;

const STATUS_GRADIENTS = {
  available: 'linear-gradient(135deg,#22c55e,#15803d)',
  occupied: 'linear-gradient(135deg,#f87171,#b91c1c)',
  reserved: 'linear-gradient(135deg,#fbbf24,#d97706)',
  maintenance: 'linear-gradient(135deg,#94a3b8,#475569)'
};

// ----------------------------------------------------
// STATE
// ----------------------------------------------------

let currentRooms = [];
let currentPage = 1;
let viewMode = 'active'; // 'active' | 'archived'
let debounceTimer = null;
let latestRequestId = 0;

// ----------------------------------------------------
// BUILD FILTER QUERY
// ----------------------------------------------------

function buildQuery() {
  const params = new URLSearchParams();

  if (roomSearch.value.trim()) params.set('search', roomSearch.value.trim());
  if (typeFilter.value) params.set('type', typeFilter.value);
  if (statusFilter.value) params.set('status', statusFilter.value);
  if (minPrice.value) params.set('minPrice', minPrice.value);
  if (maxPrice.value) params.set('maxPrice', maxPrice.value);
  if (sortBy.value) params.set('sort', sortBy.value);

  params.set('page', String(currentPage));
  params.set('limit', String(PAGE_SIZE));

  return params.toString();
}

// ----------------------------------------------------
// LOAD ROOMS
// ----------------------------------------------------

async function loadRooms() {
  // Only the most recent request may update the screen, so a slow earlier
  // response can't overwrite the results of a newer search/filter.
  const requestId = ++latestRequestId;
  roomsMessage.textContent = 'Loading rooms...';

  try {
    const data = viewMode === 'archived'
      ? await api('/api/rooms/archived')
      : await api(`/api/rooms?${buildQuery()}`);

    if (requestId !== latestRequestId) return;

    const rooms = Array.isArray(data) ? data : data.rooms || [];
    const pagination = Array.isArray(data) ? null : data.pagination || null;

    // Archived/deleted the last room on the final page: step back one page.
    if (pagination && rooms.length === 0 && pagination.total > 0 && currentPage > pagination.totalPages) {
      currentPage = pagination.totalPages;
      return loadRooms();
    }

    currentRooms = rooms;
    renderRooms(rooms, pagination);
  } catch (error) {
    if (requestId !== latestRequestId) return;
    console.error('Room loading error:', error);
    roomsMessage.textContent = error.message;
    roomsGrid.innerHTML = '';
    roomsPager.hidden = true;
  }
}

// Filters changed: go back to page 1, then reload.
function reloadFromFirstPage() {
  currentPage = 1;
  loadRooms();
}

function debouncedLoad() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(reloadFromFirstPage, 250);
}

// ----------------------------------------------------
// RENDER ROOM CARDS + PAGER
// ----------------------------------------------------

function renderRooms(rooms, pagination) {
  const archived = viewMode === 'archived';

  if (!Array.isArray(rooms) || rooms.length === 0) {
    roomsMessage.textContent = archived ? 'No archived rooms.' : 'No rooms match your filters.';
    roomsGrid.innerHTML = '';
    renderPager(null);
    return;
  }

  if (archived) {
    roomsMessage.textContent = `${rooms.length} archived room${rooms.length === 1 ? '' : 's'}. Restore a room to make it visible again.`;
  } else if (pagination) {
    const start = (pagination.page - 1) * pagination.limit + 1;
    const end = start + rooms.length - 1;
    roomsMessage.textContent = `Showing ${start}–${end} of ${pagination.total} room${pagination.total === 1 ? '' : 's'}.`;
  } else {
    roomsMessage.textContent = `${rooms.length} room${rooms.length === 1 ? '' : 's'} found.`;
  }

  roomsGrid.innerHTML = rooms.map((room) => roomCard(room, archived)).join('');
  renderPager(archived ? null : pagination);
}

function renderPager(pagination) {
  if (!pagination || pagination.totalPages <= 1) {
    roomsPager.hidden = true;
    roomsPager.innerHTML = '';
    return;
  }

  const { page, totalPages } = pagination;

  // Show first, last and a window of pages around the current one.
  const pages = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) pages.push(p);
  }

  let html = `<button type="button" class="pager-btn" data-page="${page - 1}" ${page === 1 ? 'disabled' : ''}>‹ Prev</button>`;

  let previous = 0;
  for (const p of pages) {
    if (p - previous > 1) html += '<span class="toolbar-label">…</span>';
    html += `<button type="button" class="pager-btn ${p === page ? 'is-current' : ''}" data-page="${p}" ${p === page ? 'aria-current="page"' : ''}>${p}</button>`;
    previous = p;
  }

  html += `<button type="button" class="pager-btn" data-page="${page + 1}" ${page === totalPages ? 'disabled' : ''}>Next ›</button>`;

  roomsPager.innerHTML = html;
  roomsPager.hidden = false;
}

function roomCard(room, archived) {
  const status = room.status || 'available';
  const gradient = STATUS_GRADIENTS[status] || STATUS_GRADIENTS.available;
  const firstImage = Array.isArray(room.images) && room.images.length ? room.images[0] : null;

  // If the image URL fails to load, hide it and reveal the placeholder
  // that sits right behind it.
  const media = firstImage
    ? `<img src="${escapeHtml(firstImage)}" alt="${escapeHtml(room.roomNumber)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
       <div class="room-media-placeholder" style="display:none;background:${gradient}">${ROOM_ICON_SVG}</div>`
    : `<div class="room-media-placeholder" style="background:${gradient}">${ROOM_ICON_SVG}</div>`;

  const amenities = (room.amenities || [])
    .slice(0, 4)
    .map((a) => `<span>${escapeHtml(a)}</span>`)
    .join('');

  const badgeClass = archived ? 'archived' : status;
  const badgeText = archived ? 'archived' : status;

  const actions = archived
    ? `<button type="button" class="btn-restore-room" data-action="restore" data-id="${escapeHtml(room._id)}">Restore</button>
    <button type="button" class="btn-delete-room" data-action="delete-permanent" data-id="${escapeHtml(room._id)}">Delete permanently</button>`
    : `<button type="button" class="btn-edit-room" data-action="edit" data-id="${escapeHtml(room._id)}">Edit</button>
       <button type="button" class="btn-delete-room" data-action="archive" data-id="${escapeHtml(room._id)}">Archive</button>`;

  return `
    <article class="admin-room-card">
      <div class="room-media">
        ${media}
        <span class="room-media-badge room-status-${escapeHtml(badgeClass)}">${escapeHtml(badgeText)}</span>
      </div>

      <div class="room-card-body">
        <div class="room-card-title">
          <span class="room-card-number">${escapeHtml(room.roomNumber)}</span>
          <span class="room-card-type">${escapeHtml(room.type)}</span>
        </div>

        <div class="room-card-location">${escapeHtml(room.building)} · Floor ${escapeHtml(String(room.floor))}</div>

        ${room.description ? `<p class="room-card-desc">${escapeHtml(room.description)}</p>` : ''}

        ${amenities ? `<div class="room-card-amenities">${amenities}</div>` : ''}

        <div class="room-card-stats">
          <div class="room-card-price">$${escapeHtml(String(room.pricePerMonth))}<span> /month</span></div>
          <div class="room-card-occupancy">${escapeHtml(String(room.occupied))}/${escapeHtml(String(room.capacity))} occupied</div>
        </div>
      </div>

      <div class="room-card-actions">${actions}</div>
    </article>
  `;
}

// ----------------------------------------------------
// MODAL: OPEN / CLOSE
// ----------------------------------------------------

function openAddRoom() {
  roomForm.reset();
  document.getElementById('roomId').value = '';
  roomModalTitle.textContent = 'Add Room';
  roomFormError.style.display = 'none';
  roomModal.style.display = 'flex';
}

function openEditRoom(roomId) {
  const room = currentRooms.find((r) => r._id === roomId);
  if (!room) return;

  document.getElementById('roomId').value = room._id;
  document.getElementById('roomNumber').value = room.roomNumber || '';
  document.getElementById('building').value = room.building || '';
  document.getElementById('floor').value = room.floor ?? '';
  document.getElementById('type').value = room.type || 'single';
  document.getElementById('capacity').value = room.capacity ?? '';
  document.getElementById('occupied').value = room.occupied ?? 0;
  document.getElementById('pricePerMonth').value = room.pricePerMonth ?? '';
  document.getElementById('status').value = room.status || 'available';
  document.getElementById('amenities').value = (room.amenities || []).join(', ');
  document.getElementById('images').value = (room.images || []).join(', ');
  document.getElementById('description').value = room.description || '';

  roomModalTitle.textContent = `Edit Room — ${room.roomNumber}`;
  roomFormError.style.display = 'none';
  roomModal.style.display = 'flex';
}

function closeRoomModalFn() {
  roomModal.style.display = 'none';
}

function showFormError(message) {
  roomFormError.textContent = message;
  roomFormError.style.display = 'block';
}

// ----------------------------------------------------
// SAVE ROOM (CREATE OR UPDATE)
// ----------------------------------------------------

function splitList(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (err) {
    return false;
  }
}

roomForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  roomFormError.style.display = 'none';

  const roomId = document.getElementById('roomId').value;

  const payload = {
    roomNumber: document.getElementById('roomNumber').value.trim(),
    building: document.getElementById('building').value.trim(),
    floor: Number(document.getElementById('floor').value),
    type: document.getElementById('type').value,
    capacity: Number(document.getElementById('capacity').value),
    occupied: document.getElementById('occupied').value ? Number(document.getElementById('occupied').value) : 0,
    pricePerMonth: Number(document.getElementById('pricePerMonth').value),
    status: document.getElementById('status').value,
    amenities: splitList(document.getElementById('amenities').value),
    images: splitList(document.getElementById('images').value),
    description: document.getElementById('description').value.trim()
  };

  // Quick client-side checks (the server validates again).
  if (payload.occupied > payload.capacity) {
    return showFormError('Currently occupied cannot be more than capacity.');
  }
  const isLocalImage = (v) => /^\/images\/rooms\/[\w.\-]+\.(jpe?g|png|webp|gif)$/i.test(v);
if (payload.images.some((url) => !isHttpUrl(url) && !isLocalImage(url))) {
  return showFormError('Each image must be an http(s) URL or a path like /images/rooms/room-a101.jpg');
}

  const saveButton = document.getElementById('saveRoomButton');
  saveButton.disabled = true;
  saveButton.textContent = 'Saving...';

  try {
    await api(roomId ? `/api/rooms/${roomId}` : '/api/rooms', {
      method: roomId ? 'PUT' : 'POST',
      body: JSON.stringify(payload)
    });

    closeRoomModalFn();
    await loadRooms();
  } catch (error) {
    console.error('Room save error:', error);
    showFormError(error.status === 409 ? 'A room with that room number already exists (it may be archived).' : error.message);
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = 'Save Room';
  }
});

// ----------------------------------------------------
// ARCHIVE / RESTORE
// ----------------------------------------------------

async function archiveRoom(roomId) {
  const room = currentRooms.find((r) => r._id === roomId);
  const label = room ? room.roomNumber : 'this room';

  const confirmed = window.confirm(
    `Archive room ${label}? It will be hidden from students but can be restored later.`
  );
  if (!confirmed) return;

  try {
    await api(`/api/rooms/${roomId}`, { method: 'DELETE' });
    await loadRooms();
  } catch (error) {
    console.error('Room archive error:', error);
    alert(error.message);
  }
}

async function permanentlyDeleteRoom(roomId) {
  const room = currentRooms.find((r) => r._id === roomId);
  const label = room ? room.roomNumber : 'this room';

  const confirmed = window.confirm(
    `PERMANENTLY delete room ${label}? This cannot be undone.`
  );
  if (!confirmed) return;

  try {
    await api(`/api/rooms/${roomId}/permanent`, { method: 'DELETE' });
    await loadRooms();
  } catch (error) {
    console.error('Room permanent delete error:', error);
    alert(error.message);
  }
}

async function restoreRoom(roomId) {
  try {
    await api(`/api/rooms/${roomId}/restore`, { method: 'PATCH' });
    await loadRooms();
  } catch (error) {
    console.error('Room restore error:', error);
    alert(error.message);
  }
}

// ----------------------------------------------------
// ARCHIVE VIEW TOGGLE
// ----------------------------------------------------

function setViewMode(mode) {
  viewMode = mode;
  currentPage = 1;

  const archived = mode === 'archived';
  roomsToolbar.classList.toggle('is-archived-view', archived);
  archivedToggle.textContent = archived ? '← Back to active rooms' : 'View archived';
  archivedToggle.setAttribute('aria-pressed', String(archived));

  loadRooms();
}

// ----------------------------------------------------
// ESCAPE HTML (safe for text and quoted attributes)
// ----------------------------------------------------

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ----------------------------------------------------
// EVENT WIRING
// ----------------------------------------------------

roomSearch.addEventListener('input', debouncedLoad);
typeFilter.addEventListener('change', reloadFromFirstPage);
statusFilter.addEventListener('change', reloadFromFirstPage);
sortBy.addEventListener('change', reloadFromFirstPage);
minPrice.addEventListener('input', debouncedLoad);
maxPrice.addEventListener('input', debouncedLoad);

clearFiltersButton.addEventListener('click', () => {
  roomSearch.value = '';
  typeFilter.value = '';
  statusFilter.value = '';
  minPrice.value = '';
  maxPrice.value = '';
  sortBy.value = '';
  reloadFromFirstPage();
});

// Card buttons (event delegation, so no inline onclick handlers are needed)
roomsGrid.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const { action, id } = button.dataset;
  if (action === 'edit') openEditRoom(id);
  if (action === 'archive') archiveRoom(id);
  if (action === 'restore') restoreRoom(id);
  if (action === 'delete-permanent') permanentlyDeleteRoom(id);
});

roomsPager.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-page]');
  if (!button || button.disabled) return;

  currentPage = Number(button.dataset.page);
  loadRooms();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

archivedToggle.addEventListener('click', () => setViewMode(viewMode === 'archived' ? 'active' : 'archived'));
refreshButton.addEventListener('click', loadRooms);
addRoomButton.addEventListener('click', openAddRoom);
closeRoomModal.addEventListener('click', closeRoomModalFn);
cancelRoomForm.addEventListener('click', closeRoomModalFn);

roomModal.addEventListener('click', (event) => {
  if (event.target === roomModal) closeRoomModalFn();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && roomModal.style.display !== 'none') closeRoomModalFn();
});

logoutButton.addEventListener('click', logout);

// ----------------------------------------------------
// INITIAL LOAD
// ----------------------------------------------------

loadRooms();