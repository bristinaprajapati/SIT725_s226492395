const loginForm = document.getElementById("loginForm");
const message = document.getElementById("message");

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            message.textContent = data.message;
            return;
        }

        // Save JWT token
        localStorage.setItem("token", data.token);

        // Save user information
        localStorage.setItem("user", JSON.stringify(data.user));

        message.textContent = "Login successful!";

        // Redirect based on role
        if (data.user.role === "admin") {
            window.location.href = "/admin/dashboard.html";
        } else {
            window.location.href = "/student/dashboard.html";
        }

    } catch (error) {
        console.error(error);
        message.textContent = "Unable to connect to server.";
    }
});