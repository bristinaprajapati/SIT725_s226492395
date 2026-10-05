(function () {
  const MAX_ROOMS = 3;
  const grid = document.getElementById('grid');
  if (!grid) return;
  

  // selected = [{ id, label }]
  let selected = [];
  try {
    selected = JSON.parse(sessionStorage.getItem('compareRooms') || '[]');
  } catch (e) {
    selected = [];
  }
  if (!Array.isArray(selected)) selected = [];

  const save = () => {
    try {
      sessionStorage.setItem('compareRooms', JSON.stringify(selected));
    } catch (e) {}
  };

  const esc = (v) => {
    const d = document.createElement('div');
    d.textContent = v == null ? '' : String(v);
    return d.innerHTML;
  };
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
  const isSelected = (id) => selected.some((s) => s.id === id);

  // ---------- floating bar ----------
  const bar = document.createElement('div');
  bar.className = 'compare-bar';
  bar.hidden = true;
  bar.innerHTML = `
    <div class="compare-chips" id="compareChips"></div>
    <span class="compare-note" id="compareNote"></span>
    <div class="compare-actions">
      <button type="button" class="compare-clear" id="compareClear">Clear</button>
      <button type="button" class="compare-open" id="compareOpen">Compare</button>
    </div>`;
  document.body.appendChild(bar);

  const chips = bar.querySelector('#compareChips');
  const note = bar.querySelector('#compareNote');
  const openBtn = bar.querySelector('#compareOpen');

  // ---------- modal ----------
  const modal = document.createElement('div');
  modal.className = 'compare-modal';
  modal.hidden = true;
  modal.innerHTML = `
    <div class="compare-backdrop" data-close></div>
    <div class="compare-dialog" role="dialog" aria-modal="true" aria-label="Compare rooms">
      <button type="button" class="compare-close" data-close aria-label="Close">&times;</button>
      <h2>Compare rooms</h2>
      <div class="compare-scroll" id="compareTable"></div>
    </div>`;
  document.body.appendChild(modal);
  const table = modal.querySelector('#compareTable');

  // ---------- selection ----------
  function flash(msg) {
    note.textContent = msg;
    setTimeout(() => (note.textContent = ''), 2500);
  }

  function renderBar() {
    bar.hidden = selected.length === 0;
    chips.innerHTML = selected
      .map((s) => `<span class="compare-chip">${esc(s.label)}<button type="button" data-remove="${esc(s.id)}" aria-label="Remove ${esc(s.label)}">&times;</button></span>`)
      .join('');
    openBtn.disabled = selected.length < 2;
    openBtn.textContent = `Compare (${selected.length})`;
  }

  function paintButtons() {
    grid.querySelectorAll('.compare-btn').forEach((btn) => {
      const on = isSelected(btn.dataset.compareId);
      btn.classList.toggle('is-active', on);
      btn.textContent = on ? '✓ Comparing' : '+ Compare';
    });
  }

  function toggle(id, label) {
    if (isSelected(id)) {
      selected = selected.filter((s) => s.id !== id);
    } else {
      if (selected.length >= MAX_ROOMS) {
        flash(`You can compare up to ${MAX_ROOMS} rooms.`);
        return;
      }
      selected.push({ id, label });
    }
    save();
    paintButtons();
    renderBar();
  }

  // ---------- add a button to every card the page renders ----------
  function decorate() {
    grid.querySelectorAll('.room-card').forEach((card) => {
      if (card.querySelector('.compare-btn')) return;

      const detailsBtn = card.querySelector('[data-details-id]');
      const buttons = card.querySelector('.room-card-buttons');
      if (!detailsBtn || !buttons) return;

      const numberEl = card.querySelector('.room-number');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'compare-btn';
      btn.dataset.compareId = detailsBtn.dataset.detailsId;
      btn.dataset.label = numberEl ? numberEl.textContent.trim() : 'Room';
      buttons.appendChild(btn);
    });
    paintButtons();
  }

  new MutationObserver(decorate).observe(grid, { childList: true });
  decorate();

  // ---------- comparison table ----------
  function buildTable(rooms) {
    const free = (r) => Math.max((Number(r.capacity) || 0) - (Number(r.occupied) || 0), 0);
    const prices = rooms.map((r) => Number(r.pricePerMonth));
    const frees = rooms.map(free);
    const bestPrice = new Set(prices).size > 1 ? Math.min(...prices) : null;
    const bestFree = new Set(frees).size > 1 ? Math.max(...frees) : null;

    const amenities = [
      ...new Set(rooms.flatMap((r) => (r.amenities || []).map((a) => String(a).toLowerCase())))
    ].sort();

    const row = (label, cells) =>
      `<tr><th scope="row">${label}</th>${cells.map((c) => `<td class="${c.cls || ''}">${c.html}</td>`).join('')}</tr>`;
    const plain = (v) => ({ html: esc(v == null || v === '' ? '—' : v) });


    const head = `<tr><th></th>${rooms.map((r) => `<th scope="col">${esc(r.roomNumber)}</th>`).join('')}</tr>`;

    const body = [
      row('Building', rooms.map((r) => plain(r.building))),
      row('Floor', rooms.map((r) => plain(r.floor))),
      row('Type', rooms.map((r) => plain(cap(r.type)))),
      row('Price / month', rooms.map((r) => ({
        html: `$${esc(r.pricePerMonth)}`,
        cls: bestPrice !== null && Number(r.pricePerMonth) === bestPrice ? 'best' : ''
      }))),
      row('Beds free', rooms.map((r) => ({
        html: esc(free(r)),
        cls: bestFree !== null && free(r) === bestFree ? 'best' : ''
      }))),
      row('Capacity', rooms.map((r) => plain(r.capacity))),
      row('Status', rooms.map((r) => plain(cap(r.status)))),
      ...amenities.map((a) =>
        row(esc(cap(a)), rooms.map((r) => {
          const has = (r.amenities || []).some((x) => String(x).toLowerCase() === a);
          return { html: has ? '<span class="yes">✓</span>' : '<span class="no">—</span>' };
        }))
      ),
      row('Description', rooms.map((r) => plain(r.description))),
      row('', rooms.map((r) => ({
        html: `<a class="apply-btn" href="/application.html?roomId=${encodeURIComponent(r._id)}&roomTitle=${encodeURIComponent(r.roomNumber + ' - ' + r.building)}">Apply</a>`
      })))
    ].join('');

    return `<table class="compare-table"><thead>${head}</thead><tbody>${body}</tbody></table>
            <p class="compare-legend"><span class="best-swatch"></span> Best value in that row</p>`;
  }

  async function openCompare() {
    if (selected.length < 2) return;
    table.innerHTML = '<p>Loading…</p>';
    modal.hidden = false;

    try {
      const rooms = await Promise.all(
        selected.map(async (s) => {
          const res = await fetch(`/api/rooms/${encodeURIComponent(s.id)}`);
          if (!res.ok) throw new Error('Room not found');
          const data = await res.json();
          return data.data || data.room || data;
        })
      );
      table.innerHTML = buildTable(rooms);
    } catch (e) {
      table.innerHTML = '<p>Could not load these rooms. One may have been removed. Please clear and try again.</p>';
    }
  }

  // ---------- events ----------
  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('.compare-btn');
    if (btn) toggle(btn.dataset.compareId, btn.dataset.label);
  });

  bar.addEventListener('click', (e) => {
    const rm = e.target.closest('[data-remove]');
    if (rm) {
      selected = selected.filter((s) => s.id !== rm.dataset.remove);
      save();
      paintButtons();
      renderBar();
    }
  });

  document.getElementById('compareClear').addEventListener('click', () => {
    selected = [];
    save();
    paintButtons();
    renderBar();
  });

  openBtn.addEventListener('click', openCompare);

  modal.addEventListener('click', (e) => {
    if (e.target.hasAttribute('data-close')) modal.hidden = true;
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') modal.hidden = true;
  });

  renderBar();
})();