// menu.js
// Cambia el enlace de sesión del menú según si hay sesión iniciada:
//   sin sesión  -> "Ingresar"
//   con sesión  -> "Mi panel" y botón "Salir"
// Se incluye en todas las páginas.

import { obtenerSesion, cerrarSesion } from "./auth.js";

// <li id="menu-sesion"> que está en el menú de cada página
const itemSesion = document.querySelector("#menu-sesion");

async function prepararMenu() {
  if (!itemSesion) {
    return;
  }

  const { usuario, rol } = await obtenerSesion();

  // Sin sesión: se deja el enlace "Ingresar" que ya viene en el HTML
  if (!usuario) {
    return;
  }

  // Con sesión: se reemplaza por "Mi panel" y "Salir"
  itemSesion.textContent = "";

  const enlacePanel = document.createElement("a");
  // El administrador va a su propio panel
  enlacePanel.href = rol === "admin" ? "admin.html" : "panel.html";
  enlacePanel.textContent = "Mi panel";
  enlacePanel.title = "Sesión de " + (usuario.displayName || usuario.email);
  // Marca el enlace como activo si estamos en esa página
  if (window.location.pathname.endsWith(enlacePanel.getAttribute("href"))) {
    enlacePanel.classList.add("activo");
  }

  const botonSalir = document.createElement("button");
  botonSalir.type = "button";
  botonSalir.className = "boton-salir";
  botonSalir.textContent = "Salir";

  botonSalir.addEventListener("click", async () => {
    botonSalir.disabled = true;
    botonSalir.textContent = "Saliendo...";
    try {
      await cerrarSesion();
      window.location.href = "index.html";
    } catch (error) {
      console.error(error);
      alert("No se pudo cerrar la sesión. Inténtalo de nuevo.");
      botonSalir.disabled = false;
      botonSalir.textContent = "Salir";
    }
  });

  itemSesion.append(enlacePanel, botonSalir);
}

prepararMenu();
