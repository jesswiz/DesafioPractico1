// firebase-config.js
// Solo configuración e inicialización de Firebase.
// Los demás módulos importan "auth" y "db" desde aquí.

import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

// Datos del proyecto (Consola de Firebase > Configuración del proyecto > Tus apps > Web).
// Estos valores identifican el proyecto, no son contraseñas: la seguridad real
// la dan las reglas de Firestore (firestore.rules).
const configuracion = {
  apiKey: "AIzaSyD-GUjD2sHEEsVh43DmYh3lWaTPnlItPxA",
  authDomain: "logic-trans.firebaseapp.com",
  projectId: "logic-trans",
  storageBucket: "logic-trans.firebasestorage.app",
  messagingSenderId: "115133777190",
  appId: "1:115133777190:web:2bab1ca412af6499ddade7",
};

// Se inicializa la aplicación una sola vez
const app = initializeApp(configuracion);

// Servicio de autenticación (correo y contraseña)
export const auth = getAuth(app);

// Base de datos Cloud Firestore
export const db = getFirestore(app);
