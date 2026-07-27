document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");

    if (loginForm) {
        loginForm.addEventListener("submit", async e => {
            e.preventDefault();

            const login = document.getElementById("login").value;
            const password = document.getElementById("password").value;

            const isTaxpayer = document.getElementById("tab-taxpayer").classList.contains("active");
            const role = isTaxpayer ? "taxpayer" : "inspector";

            try {
                const response = await fetch("http://localhost:3000/api/login", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ login, password, role }),
                });

                const data = await response.json();

                if (data.success) {
                    localStorage.setItem("profileId", data.profileId);
                    window.location.href = data.redirect;
                } else {
                    alert("Ошибка входа: " + data.message);
                }
            } catch (error) {
                console.error("Ошибка сети:", error);
                alert("Не удалось подключиться к серверу!");
            }
        });
    }
});
