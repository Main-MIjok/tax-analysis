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
                <div class="property-card" style="position: relative;">
                    <!-- Желтая кнопка "Изменить" -->
                    <button class="btn-edit-prop" data-id="${prop.id}" style="position: absolute; top: 10px; right: 40px; background: #FFC107; color: #333; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 12px; font-weight: bold;" title="Изменить название">✎</button>

                    <!-- Красная кнопка "Удалить" -->
                    <button class="btn-delete-prop" data-id="${prop.id}" style="position: absolute; top: 10px; right: 10px; background: #E63946; color: white; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 12px; font-weight: bold;" title="Удалить имущество">✖</button>

                    <div class="icon" style="background: ${bgColor};">
                        <img src="${iconPath}" alt="icon" style="width: 24px; height: 24px;">
                    </div>
                    <div class="info">
                        <h4>${prop.property_name}</h4>
                        <p>${prop.tax_type}</p>
                    </div>
                </div>
            `;
        });

        const deletePropButtons = document.querySelectorAll(".btn-delete-prop");
        deletePropButtons.forEach(btn => {
            btn.addEventListener("click", async (e) => {
                const propId = e.target.getAttribute("data-id");
23113
                if (!confirm("Вы уверены, что хотите снять этот объект с регистрации?")) return;

                try {
                    const response = await fetch(`http://localhost:3000/api/delete-property/${propId}`, {
                        method: "DELETE"
                    });
                    const result = await response.json();

                    if (result.success) {
                        window.location.reload();
                    } else {
                        alert(result.error || "Ошибка удаления");
                    }
                } catch (err) {
                    console.error("Ошибка сети:", err);
                    alert("Не удалось связаться с сервером.");
                }
            });
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
            const debtNum = parseFloat(tp.total_debt) || 0;
            totalDebt += debtNum;

            const debtHtml = debtNum > 0
                ? `<span style="color: #E63946; font-weight: bold;">Долг: ${debtNum.toLocaleString("ru-RU")} ₽</span>`
                : `<span style="color: #2A9D8F;">Нет задолженностей</span>`;

            tableBody.innerHTML += `
                <tr class="${rowClass}">
                    <td>${tp.inn}</td>
                    <td>${tp.full_name}</td>
                    <td>${debtHtml}</td>
                    <td style="display: flex; gap: 5px; align-items: center; justify-content: flex-start;">
                        <button class="fine-btn" data-id="${tp.id}" style="padding: 4px 8px; background: #007BFF; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; height: 32px;" title="Выписать штраф">Штраф</button>
                        <button class="cancel-btn" data-id="${tp.id}" style="padding: 4px 8px; background: #6C757D; color: white; border: none; border-radius: 4px; cursor: ${debtNum > 0 ? 'pointer' : 'not-allowed'}; opacity: ${debtNum > 0 ? '1' : '0.5'}; font-size: 12px; height: 32px;" title="Аннулировать долги" ${debtNum === 0 ? 'disabled' : ''}>Аннулировать</button>
                        <button class="btn-edit-taxpayer" data-id="${tp.id}" style="padding: 4px 8px; background: #FFC107; color: #333; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; height: 32px;" title="Изменить ФИО">✎</button>
                        <button class="btn-delete-taxpayer" data-id="${tp.id}" style="padding: 4px 8px; background: #DC3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; height: 32px;" title="Удалить гражданина">✖</button>
                    </td>
                </tr>
            `;
          });

        const paymentsBody = document.getElementById("inspectorPaymentsTableBody");
        if (paymentsBody && data.payments) {
            paymentsBody.innerHTML = "";

            if (data.payments.length === 0) {
                paymentsBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 15px; color: #666;">Пока нет оплаченных налогов.</td></tr>`;
            } else {
                data.payments.forEach(pay => {
                    const dateObj = new Date(pay.payment_date);
                    const dateStr = !isNaN(dateObj) ? dateObj.toLocaleDateString("ru-RU") : "Неизвестно";

                    paymentsBody.innerHTML += `
                        <tr style="border-bottom: 1px solid #EEE;">
                            <td style="padding: 10px;">${pay.full_name}</td>
                            <td style="padding: 10px;">${pay.tax_name}</td>
                            <td style="padding: 10px; color: #28A745; font-weight: bold;">${parseFloat(pay.amount).toLocaleString("ru-RU")} ₽</td>
                            <td style="padding: 10px; color: #666;">${dateStr}</td>
                        </tr>
                    `;
                });
            }
        }

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

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");

    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const login = document.getElementById("login").value;
            const password = document.getElementById("password").value;

            try {
                const response = await fetch("http://localhost:3000/api/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ login, password })
                });

                const data = await response.json();

                if (data.success) {
                    localStorage.setItem("profileId", data.profileId);
                    localStorage.setItem("role", data.role);

                    if (data.role === "inspector") {
                        window.location.href = "inspector.html";
                    } else if (data.role === "taxpayer") {
                        window.location.href = "taxpayer.html";
                    }
                } else {
                    alert(data.error || "Неверный логин или пароль");
                }
            } catch (err) {
                console.error("Ошибка при авторизации:", err);
                alert("Не удалось подключиться к серверу. Убедитесь, что бэкенд запущен.");
            }
        });
    }
});


document.addEventListener("DOMContentLoaded", () => {
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    const tabContents = document.querySelectorAll('.tab-content');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();

            navItems.forEach(nav => nav.classList.remove('active'));
            tabContents.forEach(tab => tab.style.display = 'none');

            item.classList.add('active');
            const targetTabId = item.getAttribute('data-tab');
            document.getElementById(targetTabId).style.display = 'block';
        });
    });

    const btnToggleForm = document.getElementById('btn-toggle-add-form');
    const formSection = document.getElementById('section-add-taxpayer');

    if (btnToggleForm && formSection) {
        btnToggleForm.addEventListener('click', () => {
            if (formSection.style.display === 'none') {
                formSection.style.display = 'block';
                btnToggleForm.textContent = 'Скрыть форму';
                btnToggleForm.style.background = '#6c757d';
            } else {
                formSection.style.display = 'none';
                btnToggleForm.textContent = '+ Зарегистрировать';
                btnToggleForm.style.background = '#28A745';
            }
        });
    }

    const formAddTaxpayer = document.getElementById("form-add-taxpayer");
    if (formAddTaxpayer) {
        formAddTaxpayer.addEventListener("submit", async (e) => {
            e.preventDefault();
            const inn = document.getElementById("new-inn").value.trim();
            const fullName = document.getElementById("new-fullname").value.trim();
            const passport = document.getElementById("new-passport").value.trim();
            const password = document.getElementById("new-password").value.trim();

            try {
                const response = await fetch("http://localhost:3000/api/add-taxpayer", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ inn, fullName, passport, password })
                });
                const result = await response.json();
                if (result.success) {
                    alert("Успешно добавлено!");
                    window.location.reload();
                } else alert(result.error);
            } catch (err) {
                alert("Ошибка сети.");
            }
        });
    }
});

// ==========================================
// ЛОГИКА НАЛОГОПЛАТЕЛЬЩИКА: ДОБАВЛЕНИЕ ИМУЩЕСТВА
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const btnToggleProp = document.getElementById("btn-toggle-add-property");
    const sectionProp = document.getElementById("section-add-property");
    const formProp = document.getElementById("form-add-property");

    // 1. Показать/скрыть форму
    if (btnToggleProp && sectionProp) {
        btnToggleProp.addEventListener("click", () => {
            if (sectionProp.style.display === "none") {
                sectionProp.style.display = "block";
                btnToggleProp.textContent = "Отмена";
                btnToggleProp.style.background = "#6c757d";
            } else {
                sectionProp.style.display = "none";
                btnToggleProp.textContent = "+ Добавить имущество";
                btnToggleProp.style.background = "#007BFF";
            }
        });
    }

    // 2. Отправка данных на сервер
    if (formProp) {
        formProp.addEventListener("submit", async (e) => {
            e.preventDefault();

            // Получаем ID текущего пользователя из памяти браузера
            const taxpayerId = localStorage.getItem("profileId");
            const propertyName = document.getElementById("new-prop-name").value.trim();
            const taxTypeId = document.getElementById("new-prop-type").value;

            if (!taxpayerId) {
                alert("Ошибка сессии. Перезайдите в систему.");
                return;
            }

            try {
                const response = await fetch("http://localhost:3000/api/add-property", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ taxpayerId, propertyName, taxTypeId })
                });

                const result = await response.json();

                if (result.success) {
                    alert("Имущество успешно зарегистрировано!");
                    window.location.reload(); // Перезагружаем страницу для отображения новой карточки
                } else {
                    alert(result.error || "Ошибка при регистрации имущества");
                }
            } catch (err) {
                console.error("Ошибка:", err);
                alert("Не удалось связаться с сервером.");
            }
        });
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const btnLoadReports = document.getElementById("btn-load-reports");
    const btnExportCsv = document.getElementById("btn-export-csv");
    const reportsTableBody = document.getElementById("reportsTableBody");

    let reportData = [];

    if (btnLoadReports && reportsTableBody) {
        btnLoadReports.addEventListener("click", async () => {
            reportsTableBody.innerHTML = "<tr><td colspan='3' style='text-align: center;'>Загрузка аналитики...</td></tr>";
            if (btnExportCsv) btnExportCsv.style.display = "none";

            try {
                const response = await fetch("http://localhost:3000/api/reports");
                reportData = await response.json();

                reportsTableBody.innerHTML = "";

                if (reportData.length === 0) {
                    reportsTableBody.innerHTML = "<tr><td colspan='3' style='text-align: center;'>Нет данных об оплаченных налогах.</td></tr>";
                    return;
                }

                reportData.forEach(row => {
                    reportsTableBody.innerHTML += `
                        <tr>
                            <td><strong>${row.tax_name}</strong></td>
                            <td>${row.payment_count} шт.</td>
                            <td style="color: #28A745; font-weight: bold;">${row.total_sum} ₽</td>
                        </tr>
                    `;
                });

                if (btnExportCsv) btnExportCsv.style.display = "block";

            } catch (err) {
                console.error("Ошибка выгрузки:", err);
                reportsTableBody.innerHTML = "<tr><td colspan='3' style='text-align: center; color: red;'>Ошибка соединения с сервером</td></tr>";
            }
        });
    }

    if (btnExportCsv) {
        btnExportCsv.addEventListener("click", () => {
            if (reportData.length === 0) return;

            let csvContent = "\uFEFFВид налога;Количество платежей;Собрано средств (Руб)\n";

            reportData.forEach(row => {
                csvContent += `${row.tax_name};${row.payment_count};${row.total_sum}\n`;
            });

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");

            const dateStr = new Date().toISOString().slice(0, 10);
            link.setAttribute("href", url);
            link.setAttribute("download", `FNS_Report_${dateStr}.csv`);
            link.style.visibility = 'hidden';

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const formSettings = document.getElementById("form-update-inspector");
    const navSettings = document.querySelector('.sidebar-nav .nav-item[data-tab="tab-settings"]');

    if (navSettings && formSettings) {
        navSettings.addEventListener("click", async () => {
            const profileId = localStorage.getItem("profileId");
            if (!profileId) return;

            try {
                const response = await fetch(`http://localhost:3000/api/inspector/${profileId}`);
                const data = await response.json();

                if (data.profile) {
                    document.getElementById("setting-fullname").value = data.profile.full_name || '';
                    document.getElementById("setting-position").value = data.profile.position || '';
                    document.getElementById("setting-dept").value = data.profile.dept_code || '';
                }
            } catch (err) {
                console.error("Ошибка загрузки профиля для настроек:", err);
            }
        });

        formSettings.addEventListener("submit", async (e) => {
            e.preventDefault();
            const profileId = localStorage.getItem("profileId");

            const fullName = document.getElementById("setting-fullname").value.trim();
            const position = document.getElementById("setting-position").value.trim();
            const deptCode = document.getElementById("setting-dept").value.trim();

            try {
                const response = await fetch(`http://localhost:3000/api/inspector/update/${profileId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ fullName, position, deptCode })
                });

                const result = await response.json();
                if (result.success) {
                    alert("Профиль успешно обновлен!");
                    window.location.reload();
                } else {
                    alert(result.error || "Ошибка сохранения");
                }
            } catch (err) {
                console.error("Ошибка сети:", err);
                alert("Не удалось связаться с сервером.");
            }
        });
    }
});

document.addEventListener("click", async (e) => {
    if (e.target.classList.contains("btn-edit-taxpayer")) {
        const tpId = e.target.getAttribute("data-id");
        const newName = prompt("Введите новое ФИО налогоплательщика:");
        if (!newName) return;

        await fetch(`http://localhost:3000/api/taxpayer/update/${tpId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fullName: newName })
        });
        window.location.reload();
    }

    if (e.target.classList.contains("btn-delete-taxpayer")) {
        const tpId = e.target.getAttribute("data-id");
        if (!confirm("ВНИМАНИЕ! Это действие удалит пользователя, все его налоги и имущество. Продолжить?")) return;

        await fetch(`http://localhost:3000/api/taxpayer/delete/${tpId}`, { method: "DELETE" });
        window.location.reload();
    }

    if (e.target.classList.contains("btn-edit-prop")) {
        const propId = e.target.getAttribute("data-id");
        const newPropName = prompt("Укажите новое название или марку объекта:");
        if (!newPropName) return;

        await fetch(`http://localhost:3000/api/property/update/${propId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ propertyName: newPropName })
        });
        window.location.reload();
    }

    if (e.target.classList.contains("fine-btn")) {
        const tpId = e.target.getAttribute("data-id");

        const amountStr = prompt("Введите сумму штрафа (в рублях):");
        if (!amountStr) return;

        const amount = parseFloat(amountStr.replace(',', '.'));
        if (isNaN(amount) || amount <= 0) {
            alert("Пожалуйста, введите корректную числовую сумму больше нуля.");
            return;
        }

        try {
            await fetch("http://localhost:3000/api/add-tax", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ taxpayerId: tpId, amount: amount })
            });
            window.location.reload();
        } catch (err) {
            console.error("Ошибка начисления штрафа:", err);
            alert("Не удалось начислить штраф.");
        }
    }

    if (e.target.classList.contains("cancel-btn")) {
        const tpId = e.target.getAttribute("data-id");

        if (!confirm("Вы уверены, что хотите обнулить все задолженности этого гражданина?")) return;

        try {
            await fetch("http://localhost:3000/api/delete-tax", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ taxpayerId: tpId })
            });
            window.location.reload();
        } catch (err) {
            console.error("Ошибка аннулирования:", err);
            alert("Не удалось аннулировать долг.");
        }
    }
});
