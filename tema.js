(function () {
  try {
    var tema = "auto";
    var raw = JSON.parse(localStorage.getItem("recetapp.perfil") || "null");
    if (raw && (raw.tema === "light" || raw.tema === "dark" || raw.tema === "auto")) tema = raw.tema;
    var oscuro = tema === "dark" || (tema === "auto" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
    var resolved = oscuro ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", resolved);
    document.documentElement.style.colorScheme = resolved;
  } catch (e) {}
})();
