// Logout Functionality
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "/login.html";
}

let currentApplications = [];

// Dynamic Fetch for Dashboard Counter Stats
async function fetchDashboardStats() {
  try {
    const token = localStorage.getItem("token");
    const response = await fetch("/api/dashboard/stats", {
      headers: { Authorization: `Bearer ${token}` },
    });

    let total = 0,
      pending = 0,
      approved = 0,
      rejected = 0;

    if (response.ok) {
      const stats = await response.json();
      const data = stats.data || stats;

      total = data.totalApplications ?? data.total ?? 0;
      pending =
        data.pendingApplications ?? data.pendingCount ?? data.pending ?? 0;
      approved =
        data.approvedApplications ?? data.approvedCount ?? data.approved ?? 0;
      rejected =
        data.rejectedApplications ?? data.rejectedCount ?? data.rejected ?? 0;
    }

    // Fallback: Calculate directly from live application records if stat endpoint returns 0
    if (total === 0 && currentApplications.length > 0) {
      total = currentApplications.length;
      pending = currentApplications.filter(
        (a) => (a.status || "").toLowerCase() === "pending"
      ).length;
      approved = currentApplications.filter(
        (a) => (a.status || "").toLowerCase() === "approved"
      ).length;
      rejected = currentApplications.filter(
        (a) => (a.status || "").toLowerCase() === "rejected"
      ).length;
    }

    // Update DOM counter elements
    const totalEl = document.getElementById("totalApplications");
    const pendingEl = document.getElementById("pendingApplications");
    const approvedEl = document.getElementById("approvedApplications");
    const rejectedEl = document.getElementById("rejectedApplications");

    if (totalEl) totalEl.innerText = total;
    if (pendingEl) pendingEl.innerText = pending;
    if (approvedEl) approvedEl.innerText = approved;
    if (rejectedEl) rejectedEl.innerText = rejected;
  } catch (err) {
    console.error("Error fetching dashboard stats:", err);
  }
}

// Dynamic Fetch for Applications List
async function fetchApplications() {
  try {
    const token = localStorage.getItem("token"); // <--- ADDED THIS LINE TO FIX THE BUG

    const response = await fetch("/api/applications", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();
    const container = document.getElementById("applications-list");

    // Handle plain array response or wrapped object
    const applications = Array.isArray(result) ? result : result.data || [];

    if (applications.length > 0) {
      currentApplications = applications;

      container.innerHTML = applications
        .map((app) => {
          const rawStatus = app.status || "pending";
          const isPending = (app.status || "").toLowerCase() === "pending";
          const roomName = app.roomTitle || app.room || "Standard Room";
          const studentName = app.studentName || app.name || "Jane Doe";
          const dateStr = app.createdAt
            ? new Date(app.createdAt).toLocaleDateString()
            : "N/A";

          return `
          <div class="app-card" id="app-${app._id}" style="border:1px solid #e5e7eb; padding:16px; margin-bottom:12px; border-radius:8px; background:white; position:relative; display:flex; flex-direction:column; justify-content:space-between;">
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <h3 style="margin:0; font-size:1.1rem; font-weight:700;">${escapeHtml(studentName)}</h3>
                <span style="${
                  rawStatus.toLowerCase() === "approved"
                    ? "background:#dcfce7; color:#15803d;"
                    : rawStatus.toLowerCase() === "rejected"
                      ? "background:#fee2e2; color:#b91c1c;"
                      : "background:#fef3c7; color:#b45309;"
                } padding:3px 10px; border-radius:12px; font-weight:700; font-size:11px; text-transform:uppercase; letter-spacing:0.02em;">${escapeHtml(rawStatus)}</span>
              </div>

              <p style="margin:4px 0;"><strong>Room:</strong> ${escapeHtml(roomName)}</p>
              <p style="margin:4px 0;"><strong>Date Submitted:</strong> ${dateStr}</p>
            </div>

            <div>
              ${
                isPending
                  ? `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px;">
                    <button onclick="updateStatus('${app._id}', 'Approved')" style="background:#28a745; color:white; border:none; padding:8px 12px; border-radius:5px; cursor:pointer; font-weight:600;">Approve</button>
                    <button onclick="updateStatus('${app._id}', 'Rejected')" style="background:#dc3545; color:white; border:none; padding:8px 12px; border-radius:5px; cursor:pointer; font-weight:600;">Reject</button>
                </div>
                `
                  : ""
              }
              <div style="display: flex; gap: 8px; margin-top: 10px;">
                <button onclick="showDetails('${app._id}')" style="flex:1; background:#14403f; color:white; border:none; padding:8px 12px; border-radius:5px; cursor:pointer; font-weight:600;">View Details</button>
                <button onclick="deleteApplication('${app._id}')" title="Delete Application" style="background:#475569; color:white; border:none; padding:8px 12px; border-radius:5px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; transition:background 0.2s;" onmouseover="this.style.background='#334155'" onmouseout="this.style.background='#475569'">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        `;
        })
        .join("");
    } else {
      currentApplications = [];
      container.innerHTML = "<p>No applications found.</p>";
    }
  } catch (err) {
    console.error("Error fetching applications:", err);
    document.getElementById("applications-list").innerHTML =
      '<p style="color: red;">Failed to load applications.</p>';
  }
}

// Function to open modal with full info & actions
function showDetails(appId) {
  const app = currentApplications.find((item) => item._id === appId);
  if (!app) return;

  const rawStatus = app.status || "pending";
  const isPending = rawStatus.toLowerCase() === "pending";
  const modalBody = document.getElementById("modalBody");
  const studentEmail =
    app.studentEmail || (app.user && app.user.email) || "N/A";

  modalBody.innerHTML = `
    <p><strong>Student ID:</strong> ${escapeHtml(app.studentId || app.user || "s98765432")}</p>
    <p><strong>Student Name:</strong> ${escapeHtml(app.studentName || app.name || "Jane Doe")}</p>
    <p><strong>Student Email:</strong> ${escapeHtml(studentEmail)}</p>
    <p><strong>Requested Room:</strong> ${escapeHtml(app.roomTitle || app.room || "Standard Room")}</p>
    <p><strong>Date Submitted:</strong> ${app.createdAt ? new Date(app.createdAt).toLocaleDateString() : "N/A"}</p>
    <p><strong>Status:</strong> <span style="text-transform:capitalize;">${escapeHtml(rawStatus)}</span></p>
    
    <div style="margin-top: 16px; border-top: 1px solid #eee; padding-top: 12px; display: flex; gap: 8px; flex-wrap: wrap;">
  ${
    isPending
      ? `
    <button onclick="updateStatus('${app._id}', 'Approved')" style="background:#22c55e; color:white; border:none; padding:8px 16px; border-radius:4px; cursor:pointer; font-weight:600;">Approve</button>
    <button onclick="updateStatus('${app._id}', 'Rejected')" style="background:#ef4444; color:white; border:none; padding:8px 16px; border-radius:4px; cursor:pointer; font-weight:600;">Reject</button>
  `
      : ""
  }
  <button onclick="deleteApplication('${app._id}')" title="Delete Application" style="background:#475569; color:white; border:none; padding:8px 14px; border-radius:4px; cursor:pointer; display:inline-flex; align-items:center; gap:6px; font-weight:600; transition:background 0.2s;" onmouseover="this.style.background='#334155'" onmouseout="this.style.background='#475569'">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
    Delete
  </button>
  </div>
  `;

  document.getElementById("detailsModal").style.display = "flex";
}

// Function to close modal
function closeModal() {
  document.getElementById("detailsModal").style.display = "none";
}

// Handle Approve / Reject Actions (Supports PATCH and PUT routes)
async function updateStatus(applicationId, newStatus) {
  try {
    const token = localStorage.getItem("token");
    let response = await fetch(`/api/applications/${applicationId}`, {
      method: "PATCH",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!response.ok && response.status === 404) {
      response = await fetch(`/api/applications/${applicationId}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus }),
      });
    }

    const result = await response.json();
    if (response.ok) {
      closeModal();
      await fetchApplications();
      await fetchDashboardStats();
    } else {
      alert(result.error || result.message || "Failed to update status");
    }
  } catch (err) {
    console.error("Error updating status:", err);
    alert("Server error updating status.");
  }
}

async function deleteApplication(applicationId) {
  if (!confirm("Are you sure you want to delete this application?")) return;

  try {
    const response = await fetch(`/api/applications/${applicationId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    const result = await response.json();
    if (response.ok) {
      closeModal();
      await fetchApplications();
      await fetchDashboardStats();
    } else {
      alert(result.error || "Failed to delete application");
    }
  } catch (err) {
    console.error("Error deleting application:", err);
    alert("Server error deleting application.");
  }
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = String(value ?? "");
  return div.innerHTML;
}

// Automatically load applications and counter stats on page load
async function initDashboard() {
  await fetchApplications();
  await fetchDashboardStats();
}

initDashboard();

// Automatically poll the server every 3 seconds for new applications
setInterval(async () => {
  await fetchApplications();
  await fetchDashboardStats();
}, 3000);