function getActiveFilters() {
  const startDate = document.querySelector('#filterStartDate')?.value || '';
  const endDate = document.querySelector('#filterEndDate')?.value || '';
  const category = document.querySelector('#filterCategory')?.value || 'all';

  return { startDate, endDate, category };
}

function buildStatsQuery({ startDate, endDate, category }) {
  const params = new URLSearchParams();
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  if (category && category !== 'all') params.set('category', category);
  const query = params.toString();
  return query ? `?${query}` : '';
}

function buildTrendsQuery({ startDate, endDate }) {
  const params = new URLSearchParams();
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  const query = params.toString();
  return query ? `?${query}` : '';
}


let isDashboardLoading = false;

let dashboardAbortController = null;

function setDashboardLoading(isLoading) {
  isDashboardLoading = isLoading;

  const refreshButton = document.querySelector('#refreshDashboardBtn');
  const container = document.querySelector('.dashboard-container');

  if (refreshButton) {
    refreshButton.disabled = isLoading;
    refreshButton.textContent = isLoading ? 'Refreshing…' : 'Refresh';
  }

  if (container) {
    container.classList.toggle('is-loading', isLoading);
  }
}

function updateLastUpdatedLabel() {
  const lastUpdated = document.querySelector('#lastUpdated');
  if (lastUpdated) {
    lastUpdated.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
  }
}

async function loadDashboard({ silent = false } = {}) {
  if (isDashboardLoading) return;

  const message = document.querySelector('#dashboardMessage');

  if (dashboardAbortController) {
    dashboardAbortController.abort();
  }
  dashboardAbortController = new AbortController();

  setDashboardLoading(true);

  if (message && !silent) {
    message.textContent = 'Loading dashboard...';
  }

  try {
    const token = localStorage.getItem('token');
    const filters = getActiveFilters();

    const response = await fetch(`/api/dashboard/stats${buildStatsQuery(filters)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      signal: dashboardAbortController.signal
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.message || 'Unable to load dashboard statistics'
      );
    }

    renderDashboard(result.data);
    loadTrends(buildTrendsQuery(filters));
    updateLastUpdatedLabel();

    if (message) {
      message.textContent = 'Dashboard updated successfully.';
    }
  } catch (error) {

    if (error.name === 'AbortError') return;

    console.error('Dashboard error:', error);

    if (message) {
      message.textContent = error.message;
    }
  } finally {
    setDashboardLoading(false);
  }
}

function renderDashboard(data) {
  // Room statistics (omitted from the response when category filters them out)
  if (data.rooms) {
    setValue('#totalRooms', data.rooms.totalRooms);
    setValue('#totalCapacity', data.rooms.totalCapacity);
    setValue('#totalOccupied', data.rooms.totalOccupied);
    setValue('#availableBeds', data.rooms.availableBeds);
    setValue('#occupancyRate', `${data.rooms.occupancyRate}%`);
  }

  // Application statistics
  if (data.applications) {
    setValue('#totalApplications', data.applications.total);
    setValue('#pendingApplications', data.applications.pending);
    setValue('#approvedApplications', data.applications.approved);
    setValue('#rejectedApplications', data.applications.rejected);
  }

  // Complaint statistics
  if (data.complaints) {
    setValue('#totalComplaints', data.complaints.total);
    setValue('#pendingComplaints', data.complaints.pending);
    setValue('#progressComplaints', data.complaints.inProgress);
    setValue('#resolvedComplaints', data.complaints.resolved);
  }
}


const dashboardCharts = {
  applicationsTrend: null,
  complaintsTrend: null,
  complaintsBreakdown: null
};

async function loadTrends(queryString = '') {
  try {
    const token = localStorage.getItem('token');

    const response = await fetch(`/api/dashboard/trends${queryString}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });

    let result = null;
    try {
      result = await response.json();
    } catch (parseError) {
      // Non-JSON body, e.g. an HTML "Cannot GET" page from a stale server
    }

    if (!response.ok || !result) {
      throw new Error(
        (result && result.message) ||
          `HTTP ${response.status} from /api/dashboard/trends`
      );
    }

    renderTrendCharts(result.data);
  } catch (error) {
    console.error('Dashboard trends error:', error);

    const message = document.querySelector('#dashboardMessage');
    if (message) {
      message.textContent = `Charts unavailable: ${error.message}`;
    }
  }
}

function renderTrendCharts(data) {
  if (typeof Chart === 'undefined') {
    throw new Error('Chart.js did not load (check the CDN script tag and your internet connection)');
  }

  renderLineChart(
    'applicationsTrendChart',
    'applicationsTrend',
    data.applications.labels,
    data.applications.series
  );

  renderLineChart(
    'complaintsTrendChart',
    'complaintsTrend',
    data.complaints.labels,
    data.complaints.series
  );

  renderBreakdownChart('complaintsBreakdownChart', data.complaints.series);
}

function renderLineChart(canvasId, chartKey, labels, series) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const colors = ['#f59e0b', '#3b82f6', '#22c55e', '#ef4444'];

  const datasets = Object.keys(series).map((statusKey, index) => ({
    label: statusKey,
    data: series[statusKey],
    borderColor: colors[index % colors.length],
    backgroundColor: colors[index % colors.length],
    tension: 0.25,
    fill: false
  }));

  if (dashboardCharts[chartKey]) {
    dashboardCharts[chartKey].data.labels = labels;
    dashboardCharts[chartKey].data.datasets = datasets;
    dashboardCharts[chartKey].update();
    return;
  }

  dashboardCharts[chartKey] = new Chart(canvas, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
    }
  });
}

function renderBreakdownChart(canvasId, series) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const labels = Object.keys(series);
  const totals = labels.map((key) => series[key].reduce((sum, n) => sum + n, 0));
  const colors = ['#f59e0b', '#3b82f6', '#22c55e', '#ef4444'];

  if (dashboardCharts.complaintsBreakdown) {
    dashboardCharts.complaintsBreakdown.data.labels = labels;
    dashboardCharts.complaintsBreakdown.data.datasets[0].data = totals;
    dashboardCharts.complaintsBreakdown.update();
    return;
  }

  dashboardCharts.complaintsBreakdown = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data: totals, backgroundColor: colors }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

function setValue(selector, value) {
  const element = document.querySelector(selector);

  if (element) {
    element.textContent = value;
  }
}

function setupDashboard() {
  const refreshButton = document.querySelector('#refreshDashboardBtn');
  const filterForm = document.querySelector('#dashboardFilters');
  const resetButton = document.querySelector('#resetFiltersBtn');

  if (refreshButton) {
    refreshButton.addEventListener('click', loadDashboard);
  }

  if (filterForm) {
    filterForm.addEventListener('submit', (event) => {
      event.preventDefault();
      loadDashboard();
    });
  }

  if (resetButton) {
    resetButton.addEventListener('click', () => {
      if (filterForm) filterForm.reset();
      loadDashboard();
    });
  }

  loadDashboard();


  const AUTO_REFRESH_INTERVAL_MS = 30000;
  setInterval(() => {
    loadDashboard({ silent: true });
  }, AUTO_REFRESH_INTERVAL_MS);
}

document.addEventListener('DOMContentLoaded', setupDashboard);