function switchRole(role) {
    document.getElementById("tab-taxpayer").classList.remove("active");
    document.getElementById("tab-inspector").classList.remove("active");

    document.getElementById(`tab-${role}`).classList.add("active");

    const loginLabel = document.getElementById("login-label");
    const loginInput = document.getElementById("login");

    if (role === "taxpayer") {
        loginLabel.textContent = "Логин (ИНН)";
        loginInput.placeholder = "Введите ваш ИНН";
    } else if (role === "inspector") {
        loginLabel.textContent = "Логин (Табельный номер сотрудника)";
        loginInput.placeholder = "Введите логин инспектора";
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    const userNameElem = document.getElementById("userName");
    if (!userNameElem) return;

    const profileId = localStorage.getItem("profileId");
    if (!profileId) {
        alert("Сессия не найдена. Пожалуйста, авторизуйтесь.");
        window.location.href = "index.html";
        return;
    }

    try {
        const response = await fetch(`http://localhost:3000/api/taxpayer/${profileId}`);
        const data = await response.json();

        userNameElem.textContent = data.profile.full_name;
        const initials = data.profile.full_name
            .split(" ")
            .map(n => n[0])
            .join("")
            .toUpperCase();
        document.getElementById("userAvatar").textContent = initials;

        document.getElementById("totalDebt").textContent = `${data.totalDebt.toLocaleString("ru-RU")} Руб.`;

        const propertyContainer = document.getElementById("propertyContainer");
        propertyContainer.innerHTML = "";

        data.properties.forEach(prop => {
            const isCar = prop.tax_type.includes("Транспортный");
            const icon = isCar ? "🚗" : "🏠";
            const bgColor = isCar ? "#F3E8FF" : "#FCE7F3";

            propertyContainer.innerHTML += `
                <div class="property-card">
                    <div class="icon" style="background: ${bgColor};">${icon}</div>
                    <div class="info">
                        <h4>${prop.property_name}</h4>
                        <p>${prop.tax_type}</p>
                    </div>
                </div>
            `;
        });

        const tableBody = document.getElementById("paymentsTableBody");
        tableBody.innerHTML = "";

        data.payments.forEach((pay, index) => {
            const rowClass = index % 2 === 1 ? "row-alt" : "";
            const formattedDate = pay.payment_date
                ? new Date(pay.payment_date).toLocaleDateString("ru-RU")
                : "Срок до 01.12.2026";

            const statusClass = pay.status === "Оплачено" ? "status-success" : "status-pending";

            tableBody.innerHTML += `
                <tr class="${rowClass}">
                    <td>${formattedDate}</td>
                    <td>${pay.tax_type}</td>
                    <td>${pay.property_name || "-"}</td>
                    <td class="sum">${parseFloat(pay.amount).toLocaleString("ru-RU")} Руб.</td>
                    <td class="${statusClass}">${pay.status}</td>
                </tr>
            `;
        });
    } catch (err) {
        console.error("Ошибка при загрузке данных кабинета:", err);
    }
});
