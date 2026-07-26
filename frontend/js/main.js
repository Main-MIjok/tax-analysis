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
