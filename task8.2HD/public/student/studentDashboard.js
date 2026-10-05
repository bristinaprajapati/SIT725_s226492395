console.log("STUDENT DASHBOARD JS LOADED");

const STUDENT_DASHBOARD_REFRESH_MS = 30000;
let studentDashboardLoading = false;

document.addEventListener("DOMContentLoaded", function () {
    loadStudentDashboard();

    const refreshButton = document.getElementById("refreshDashboardBtn");

    if (refreshButton) {
        refreshButton.addEventListener("click", function () {
            loadStudentDashboard();
        });
    }

    setInterval(function () {
        loadStudentDashboard({ silent: true });
    }, STUDENT_DASHBOARD_REFRESH_MS);

    document.addEventListener("visibilitychange", function () {
        if (!document.hidden) {
            loadStudentDashboard({ silent: true });
        }
    });
});


async function loadStudentDashboard({ silent = false } = {}) {

    if (studentDashboardLoading) {
        return;
    }

    const message = document.getElementById("dashboardMessage");
    const refreshButton = document.getElementById("refreshDashboardBtn");

    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "/";
        return;
    }

    studentDashboardLoading = true;

    if (refreshButton) {
        refreshButton.disabled = true;
    }

    if (message && !silent) {
        message.textContent = "Loading dashboard...";
    }

    try {

        const response = await fetch("/api/dashboard/student", {
            method: "GET",
            cache: "no-store",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });

        // Expired / invalid token: send the student back to login
        if (response.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.location.href = "/";
            return;
        }

        let result = null;

        try {
            result = await response.json();
        } catch (parseError) {
            // Non-JSON body, e.g. an HTML "Cannot GET" page from a server
            // that hasn't been restarted since the route was added
        }

        console.log("Student dashboard response:", result);

        if (!response.ok || !result || !result.data) {
            throw new Error(
                (result && result.message) ||
                `Unable to load student dashboard (HTTP ${response.status})`
            );
        }

        renderStudentDashboard(result.data);

        if (message) {
            message.textContent =
                "Dashboard updated at " + new Date().toLocaleTimeString() + ".";
        }

    } catch (error) {

        console.error("Student dashboard error:", error);

        if (message) {
            message.textContent =
                error.message || "Unable to load dashboard.";
        }

    } finally {

        studentDashboardLoading = false;

        if (refreshButton) {
            refreshButton.disabled = false;
        }
    }
}


function renderStudentDashboard(data) {

    const applications = data.applications || {};
    const complaints = data.complaints || {};
    const student = data.student || {};
    const room = data.room || null;

    if (student.name) {
        setText("studentName", student.name);
        setText("welcomeName", student.name);
    }

    // Applications
    setCount("myTotalApplications", applications.total);
    setCount("myPendingApplications", applications.pending);
    setCount("myApprovedApplications", applications.approved);
    setCount("myRejectedApplications", applications.rejected);

    // Complaints
    setCount("myTotalComplaints", complaints.total);
    setCount("myPendingComplaints", complaints.pending);
    setCount("myProgressComplaints", complaints.inProgress);
    setCount("myResolvedComplaints", complaints.resolved);

    // Room
    if (room) {
        setText("myRoom", room.roomTitle || room.roomId || "—");
        setText("myRoomStatus", room.status || "Assigned");
    } else {
        setText("myRoom", "—");
        setText("myRoomStatus", "Not assigned");
    }
}


function setCount(id, value) {
    setText(id, value === undefined || value === null || value === "" ? 0 : value);
}


function setText(id, value) {

    const element = document.getElementById(id);

    if (!element) {
        console.warn(`Element #${id} not found`);
        return;
    }

    element.textContent = value;
}