console.log("Скрипт main.js успешно подключен!");
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
    if (!profileId || profileId === "undefined" || profileId === "null") {
        alert("Сессия не найдена. Пожалуйста, авторизуйтесь.");
        window.location.href = "index.html";
        return;
    }

    try {
        const response = await fetch(`http://localhost:3000/api/taxpayer/${profileId}`);
        const data = await response.json();

        console.log("Данные от сервера:", data);

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

            const iconPath = isCar ? "assets/car.svg" : "assets/house.svg";
            const bgColor = isCar ? "#F3E8FF" : "#FCE7F3";

            propertyContainer.innerHTML += `
                <div class="property-card">
                    <div class="icon" style="background: ${bgColor};">
                        <!-- Вставляем картинку вместо эмодзи -->
                        <img src="${iconPath}" alt="icon" style="width: 24px; height: 24px;">
                    </div>
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

    const payButton = document.getElementById("payButton");

    if (payButton) {
        payButton.addEventListener("click", async () => {
            const confirmPay = confirm("Вы уверены, что хотите оплатить все начисленные налоги?");
            if (!confirmPay) return;

            try {
                const payResponse = await fetch("http://localhost:3000/api/pay", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ taxpayerId: profileId }),
                });

                const result = await payResponse.json();

                if (result.success) {
                    alert("Успешно! Все задолженности погашены.");
                    window.location.reload();
                } else {
                    alert("Произошла ошибка при оплате.");
                }
            } catch (err) {
                console.error("Ошибка оплаты:", err);
                alert("Не удалось связаться с сервером.");
            }
        });
    }
});

document.addEventListener("DOMContentLoaded", async () => {
    const inspectorNameElem = document.getElementById("inspectorName");
    if (!inspectorNameElem) return;

    const profileId = localStorage.getItem("profileId");
    if (!profileId || profileId === "undefined" || profileId === "null") {
        alert("Сессия не найдена. Пожалуйста, авторизуйтесь.");
        window.location.href = "index.html";
        return;
    }

    try {
        const response = await fetch(`http://localhost:3000/api/inspector/${profileId}`);
        const data = await response.json();

        inspectorNameElem.textContent = data.profile.full_name;
        document.getElementById("inspectorRole").textContent =
            `${data.profile.position} (Код: ${data.profile.dept_code})`;

        const initials = data.profile.full_name
            .split(" ")
            .map(n => n[0])
            .join("")
            .toUpperCase();
        document.getElementById("inspectorAvatar").textContent = initials;

        const tableBody = document.getElementById("inspectorTableBody");
        tableBody.innerHTML = "";

        let totalDebt = 0;

        data.taxpayers.forEach((tp, index) => {
            const rowClass = index % 2 === 1 ? "row-alt" : "";
            const debtNum = parseFloat(tp.total_debt);
            totalDebt += debtNum;

            const debtHtml =
                debtNum > 0
                    ? `<span style="color: #E63946; font-weight: bold;">Долг: ${debtNum.toLocaleString("ru-RU")} ₽</span>`
                    : `<span style="color: #2A9D8F;">Нет задолженностей</span>`;

            tableBody.innerHTML += `
                <tr class="${rowClass}">
                    <td>${tp.inn}</td>
                    <td>${tp.full_name}</td>
                    <td>${debtHtml}</td>
                    <td style="display: flex; gap: 8px;">
                        <button class="btn-fine" data-id="${tp.id}" style="padding: 6px 12px; font-size: 12px; cursor: pointer; background: #E63946; color: white; border: none; border-radius: 4px;">Штраф 1000 ₽</button>
                        <button class="btn-delete" data-id="${tp.id}" style="padding: 6px 12px; font-size: 12px; cursor: pointer; background: #6C757D; color: white; border: none; border-radius: 4px;">Списать</button>
                    </td>
                </tr>
            `;
        });

        const fineButtons = document.querySelectorAll(".btn-fine");
        fineButtons.forEach(button => {
            button.addEventListener("click", async e => {
                const taxpayerId = e.target.getAttribute("data-id");

                const confirmFine = confirm("Вы уверены, что хотите начислить штраф 1000 ₽ этому налогоплательщику?");
                if (!confirmFine) return;

                try {
                    const fineResponse = await fetch("http://localhost:3000/api/add-tax", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ taxpayerId: taxpayerId, amount: 1000 }),
                    });

                    const result = await fineResponse.json();

                    if (result.success) {
                        alert("Штраф успешно занесен в базу данных!");
                        window.location.reload();
                    } else {
                        alert("Ошибка при начислении штрафа.");
                    }
                } catch (err) {
                    console.error("Ошибка сети:", err);
                    alert("Не удалось связаться с сервером.");
                }
            });
        });

        const deleteButtons = document.querySelectorAll(".btn-delete");
        deleteButtons.forEach(button => {
            button.addEventListener("click", async e => {
                const taxpayerId = e.target.getAttribute("data-id");

                const confirmDelete = confirm(
                    "Вы уверены, что хотите аннулировать (удалить) все неоплаченные начисления этого пользователя?",
                );
                if (!confirmDelete) return;

                try {
                    const delResponse = await fetch("http://localhost:3000/api/delete-tax", {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ taxpayerId: taxpayerId }),
                    });

                    const result = await delResponse.json();

                    if (result.success) {
                        alert("Неоплаченные начисления успешно удалены из базы данных!");
                        window.location.reload();
                    } else {
                        alert("Ошибка при удалении начисления.");
                    }
                } catch (err) {
                    console.error("Ошибка сети:", err);
                    alert("Не удалось связаться с сервером.");
                }
            });
        });

        document.getElementById("kpiCollected").textContent =
            `${parseFloat(data.totalCollected).toLocaleString("ru-RU")} ₽`;
        document.getElementById("kpiTaxpayers").textContent = data.taxpayers.length;
        document.getElementById("kpiDebt").textContent = `${totalDebt.toLocaleString("ru-RU")} ₽`;
    } catch (err) {
        console.error("Ошибка загрузки данных инспектора:", err);
    }
});

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("profileId");
        window.location.href = "index.html";
    });
}
