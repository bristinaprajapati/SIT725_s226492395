const els = {
  search: document.getElementById('search'),
  type: document.getElementById('type'),
  status: document.getElementById('status'),
  sort: document.getElementById('sort'),
  minPrice: document.getElementById('minPrice'),
  maxPrice: document.getElementById('maxPrice'),
  clearFilters: document.getElementById('clearFilters'),
  grid: document.getElementById('grid'),
  resultCount: document.getElementById('resultCount'),
  emptyState: document.getElementById('emptyState'),
  savedToggle: document.getElementById('savedToggle'),
  savedCount: document.getElementById('savedCount'),
};

let debounceTimer = null;
let currentRooms = [];
let showSavedOnly = false;

// ----------------------------------------------------
// SAVED ROOMS (wishlist) — persisted per-browser in localStorage
// ----------------------------------------------------

function getSavedIds() {
  try {
    return JSON.parse(localStorage.getItem('savedRooms') || '[]');
  } catch (err) {
    return [];
  }
}

function setSavedIds(ids) {
  localStorage.setItem('savedRooms', JSON.stringify(ids));
  els.savedCount.textContent = ids.length;
}

function toggleSaved(roomId) {
  const ids = getSavedIds();
  const idx = ids.indexOf(roomId);
  if (idx === -1) {
    ids.push(roomId);
  } else {
    ids.splice(idx, 1);
  }
  setSavedIds(ids);
  renderGrid();
}

// ----------------------------------------------------
// PLACEHOLDER / MEDIA HELPERS
// ----------------------------------------------------

const ROOM_ICON_SVG = `
  <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="34" height="34">
    <path d="M3 21V7l9-4 9 4v14"></path>
    <path d="M9 21v-7h6v7"></path>
    <path d="M3 11h18"></path>
  </svg>
`;

const STATUS_GRADIENTS = {
  available: 'linear-gradient(135deg,#22c55e,#15803d)',
  occupied: 'linear-gradient(135deg,#f87171,#b91c1c)',
  reserved: 'linear-gradient(135deg,#fbbf24,#d97706)',
  maintenance: 'linear-gradient(135deg,#94a3b8,#475569)',
};

function mediaMarkup(room) {
  const gradient = STATUS_GRADIENTS[room.status] || STATUS_GRADIENTS.available;
  const firstImage = Array.isArray(room.images) && room.images.length ? room.images[0] : null;
  const extraCount = Array.isArray(room.images) ? room.images.length - 1 : 0;

  if (!firstImage) {
    return `<div class="room-media-placeholder" style="background:${gradient}">${ROOM_ICON_SVG}</div>`;
  }

  return `
    <img class="room-media-img" src="${escapeHtml(firstImage)}" alt="${escapeHtml(room.roomNumber)}"
         onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" />
    <div class="room-media-placeholder" style="display:none;background:${gradient}">${ROOM_ICON_SVG}</div>
    ${extraCount > 0 ? `<span class="room-media-count">+${extraCount} photo${extraCount === 1 ? '' : 's'}</span>` : ''}
  `;
}

// ----------------------------------------------------
// FILTER QUERY
// ----------------------------------------------------

function buildQuery() {
  const params = new URLSearchParams();
  if (els.search.value.trim()) params.set('search', els.search.value.trim());
  if (els.type.value) params.set('type', els.type.value);
  if (els.status.value) params.set('status', els.status.value);
  if (els.sort.value) params.set('sort', els.sort.value);
  if (els.minPrice.value) params.set('minPrice', els.minPrice.value);
  if (els.maxPrice.value) params.set('maxPrice', els.maxPrice.value);
  return params.toString();
}

// ----------------------------------------------------
// CARD RENDERING
// ----------------------------------------------------

function roomCard(room) {
  const amenities = (room.amenities || [])
    .slice(0, 4)
    .map((a) => `<span class="amenity">${escapeHtml(a)}</span>`)
    .join('');

  const saved = getSavedIds().includes(room._id);
  const roomIdAttr = escapeHtml(room._id || '');

  return `
    <article class="room-card">
      <div class="room-media" data-room-id="${roomIdAttr}">
        ${mediaMarkup(room)}
        <button type="button" class="favorite-btn ${saved ? 'is-saved' : ''}" data-favorite-id="${roomIdAttr}" aria-label="Save room" title="Save room">${saved ? '♥' : '♡'}</button>
      </div>

      <div class="room-head">
        <div>
          <div class="room-number">${escapeHtml(room.roomNumber)}</div>
          <div class="room-building">${escapeHtml(room.building)} · Floor ${room.floor}</div>
        </div>
        <span class="status-tag status-${room.status}">${room.status}</span>
      </div>

      <div class="room-type">${escapeHtml(room.type)} room</div>

      ${room.description ? `<p class="room-desc">${escapeHtml(room.description)}</p>` : ''}

      ${amenities ? `<div class="room-amenities">${amenities}</div>` : ''}

      <div class="room-foot">
        <div class="room-price">$${room.pricePerMonth}<span> /month</span></div>
        <div class="room-occupancy">${room.occupied}/${room.capacity} occupied</div>
      </div>

      <div class="room-card-buttons">
        <button type="button" class="details-btn" data-details-id="${roomIdAttr}">View details</button>
        <a class="apply-btn" href="/application.html?roomId=${encodeURIComponent(room._id || room.roomNumber)}&roomTitle=${encodeURIComponent(room.roomNumber + ' - ' + room.building)}">Apply</a>
      </div>
    </article>
  `;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : str;
  return div.innerHTML;
}

// ----------------------------------------------------
// LOAD + RENDER
// ----------------------------------------------------

async function loadRooms() {
  try {
    const query = buildQuery();
    const res = await fetch(`/api/rooms${query ? '?' + query : ''}`);
    const data = await res.json();
    currentRooms = Array.isArray(data) ? data : data.value || data.rooms || [];
    renderGrid();
  } catch (err) {
    els.resultCount.textContent = '';
    els.emptyState.textContent = 'Could not load rooms. Please try again shortly.';
    els.emptyState.hidden = false;
    console.error(err);
  }
}

function renderGrid() {
  const savedIds = getSavedIds();
  els.savedCount.textContent = savedIds.length;

  const rooms = showSavedOnly
    ? currentRooms.filter((r) => savedIds.includes(r._id))
    : currentRooms;

  els.resultCount.textContent = `${rooms.length} room${rooms.length === 1 ? '' : 's'} found`;
  els.grid.innerHTML = rooms.map(roomCard).join('');
  els.emptyState.hidden = rooms.length !== 0;
  if (rooms.length === 0) {
    els.emptyState.textContent = showSavedOnly
      ? "You haven't saved any rooms yet."
      : 'No rooms match those filters. Try widening your search.';
  }
}

function debouncedLoad() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(loadRooms, 250);
}

// ----------------------------------------------------
// ROOM DETAILS MODAL
// ----------------------------------------------------

const modalEls = {
  modal: document.getElementById('roomModal'),
  backdrop: document.getElementById('roomModalBackdrop'),
  close: document.getElementById('roomModalClose'),
  mainImage: document.getElementById('modalMainImage'),
  mainPlaceholder: document.getElementById('modalMainPlaceholder'),
  thumbs: document.getElementById('modalThumbs'),
  roomNumber: document.getElementById('modalRoomNumber'),
  roomBuilding: document.getElementById('modalRoomBuilding'),
  statusTag: document.getElementById('modalStatusTag'),
  roomType: document.getElementById('modalRoomType'),
  description: document.getElementById('modalDescription'),
  amenities: document.getElementById('modalAmenities'),
  price: document.getElementById('modalPrice'),
  occupancy: document.getElementById('modalOccupancy'),
  applyBtn: document.getElementById('modalApplyBtn'),
};

function setModalImage(url, gradient) {
  if (url) {
    modalEls.mainImage.src = url;
    modalEls.mainImage.hidden = false;
    modalEls.mainPlaceholder.hidden = true;
    modalEls.mainImage.onerror = () => {
      modalEls.mainImage.hidden = true;
      modalEls.mainPlaceholder.hidden = false;
    };
  } else {
    modalEls.mainImage.hidden = true;
    modalEls.mainPlaceholder.hidden = false;
    modalEls.mainPlaceholder.style.background = gradient;
    modalEls.mainPlaceholder.innerHTML = ROOM_ICON_SVG;
  }
}

function openRoomDetails(roomId) {
  const room = currentRooms.find((r) => r._id === roomId);
  if (!room) return;

  const gradient = STATUS_GRADIENTS[room.status] || STATUS_GRADIENTS.available;
  const images = Array.isArray(room.images) ? room.images.filter(Boolean) : [];

  setModalImage(images[0] || null, gradient);

  modalEls.thumbs.innerHTML = images
    .map(
      (url, i) =>
        `<img src="${escapeHtml(url)}" class="room-modal-thumb ${i === 0 ? 'is-active' : ''}" data-thumb-url="${escapeHtml(url)}" onerror="this.style.display='none';" />`
    )
    .join('');

  modalEls.thumbs.querySelectorAll('.room-modal-thumb').forEach((thumb) => {
    thumb.addEventListener('click', () => {
      modalEls.thumbs.querySelectorAll('.room-modal-thumb').forEach((t) => t.classList.remove('is-active'));
      thumb.classList.add('is-active');
      setModalImage(thumb.dataset.thumbUrl, gradient);
    });
  });

  modalEls.roomNumber.textContent = room.roomNumber;
  modalEls.roomBuilding.textContent = `${room.building} · Floor ${room.floor}`;
  modalEls.statusTag.textContent = room.status;
  modalEls.statusTag.className = `status-tag status-${room.status}`;
  modalEls.roomType.textContent = `${room.type} room`;
  modalEls.description.textContent = room.description || 'No description provided for this room yet.';
  modalEls.amenities.innerHTML = (room.amenities || [])
    .map((a) => `<span class="amenity">${escapeHtml(a)}</span>`)
    .join('');
  modalEls.price.innerHTML = `$${room.pricePerMonth}<span> /month</span>`;
  modalEls.occupancy.textContent = `${room.occupied}/${room.capacity} occupied`;
  modalEls.applyBtn.href = `/application.html?roomId=${encodeURIComponent(room._id || room.roomNumber)}&roomTitle=${encodeURIComponent(room.roomNumber + ' - ' + room.building)}`;

  modalEls.modal.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeRoomDetails() {
  modalEls.modal.hidden = true;
  document.body.style.overflow = '';
}

modalEls.close.addEventListener('click', closeRoomDetails);
modalEls.backdrop.addEventListener('click', closeRoomDetails);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !modalEls.modal.hidden) closeRoomDetails();
});

// ----------------------------------------------------
// EVENT WIRING
// ----------------------------------------------------

els.search.addEventListener('input', debouncedLoad);
els.type.addEventListener('change', loadRooms);
els.status.addEventListener('change', loadRooms);
els.sort.addEventListener('change', loadRooms);
els.minPrice.addEventListener('input', debouncedLoad);
els.maxPrice.addEventListener('input', debouncedLoad);

els.clearFilters.addEventListener('click', () => {
  els.search.value = '';
  els.type.value = '';
  els.status.value = '';
  els.sort.value = '';
  els.minPrice.value = '';
  els.maxPrice.value = '';
  loadRooms();
});

els.savedToggle.addEventListener('click', () => {
  showSavedOnly = !showSavedOnly;
  els.savedToggle.classList.toggle('is-active', showSavedOnly);
  renderGrid();
});

// Delegate clicks on the grid for favorite buttons & details buttons
els.grid.addEventListener('click', (e) => {
  const favBtn = e.target.closest('[data-favorite-id]');
  if (favBtn) {
    toggleSaved(favBtn.dataset.favoriteId);
    return;
  }

  const detailsBtn = e.target.closest('[data-details-id]');
  if (detailsBtn) {
    openRoomDetails(detailsBtn.dataset.detailsId);
  }
});

setSavedIds(getSavedIds());
loadRooms();