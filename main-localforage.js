
let usuarioActual = null;
let juegoActivo = false;
let respuestaCorrecta = 0;
let puntaje = 0;
let errores = [];
let total = 0;
let tiempoRestante = 0;
let temporizador;

async function cargarUsuarios() {
  const usuarios = (await localforage.getItem("usuarios")) || [];
  const lista = document.getElementById("user-list");
  lista.innerHTML = "";
  usuarios.forEach(u => {
    const li = document.createElement("li");
    li.textContent = u;
    if (u === usuarioActual) li.classList.add("selected");
    li.onclick = () => {
      usuarioActual = u;
      localforage.setItem("usuarioSeleccionado", u);
      cargarUsuarios();
    };
    lista.appendChild(li);
  });
  document.getElementById("jugador").textContent = usuarioActual || "Ninguno";
}

async function addUser() {
  const input = document.getElementById("new-user");
  const name = input.value.trim();
  if (!name) return alert("Escribe un nombre");
  const usuarios = (await localforage.getItem("usuarios")) || [];
  if (usuarios.includes(name)) return alert("Ese usuario ya existe");
  usuarios.push(name);
  await localforage.setItem("usuarios", usuarios);
  usuarioActual = name;
  await localforage.setItem("usuarioSeleccionado", name);
  input.value = "";
  cargarUsuarios();
}

async function editUser() {
  if (!usuarioActual) return alert("Selecciona un usuario");
  const nuevo = prompt("Nuevo nombre:", usuarioActual);
  if (!nuevo) return;
  const usuarios = (await localforage.getItem("usuarios")) || [];
  if (usuarios.includes(nuevo)) return alert("Ese nombre ya existe");
  const actualizados = usuarios.map(u => u === usuarioActual ? nuevo : u);
  await localforage.setItem("usuarios", actualizados);
  const historial = (await localforage.getItem("historial")) || [];
  historial.forEach(p => {
    if (p.jugador === usuarioActual) p.jugador = nuevo;
  });
  await localforage.setItem("historial", historial);
  usuarioActual = nuevo;
  await localforage.setItem("usuarioSeleccionado", nuevo);
  cargarUsuarios();
}

async function deleteUser() {
  if (!usuarioActual) return alert("Selecciona un usuario");
  if (!confirm("¿Eliminar usuario?")) return;
  const usuarios = (await localforage.getItem("usuarios")) || [];
  const actualizados = usuarios.filter(u => u !== usuarioActual);
  await localforage.setItem("usuarios", actualizados);
  let historial = (await localforage.getItem("historial")) || [];
  historial = historial.filter(p => p.jugador !== usuarioActual);
  await localforage.setItem("historial", historial);
  usuarioActual = null;
  await localforage.removeItem("usuarioSeleccionado");
  cargarUsuarios();
}

async function iniciarJuego() {
  if (!usuarioActual) return alert("Selecciona un usuario");
  const tiempo = parseInt(document.getElementById("tiempo").value);
  if (isNaN(tiempo) || tiempo < 10) return alert("Tiempo mínimo 10s");

  const operaciones = [];
  if (document.getElementById("op-sum").checked) operaciones.push("+");
  if (document.getElementById("op-sub").checked) operaciones.push("-");
  if (document.getElementById("op-mul").checked) operaciones.push("*");
  if (document.getElementById("op-div").checked) operaciones.push("/");

  if (operaciones.length === 0) return alert("Selecciona al menos una operación");

  const dificultad = document.getElementById("dificultad").value;
  const rango = dificultad === "easy" ? 10 : dificultad === "medium" ? 20 : 50;

  juegoActivo = true;
  puntaje = 0;
  errores = [];
  total = 0;
  document.getElementById("aciertos").textContent = "0";
  document.getElementById("juego").style.display = "block";

  siguienteOperacion(operaciones, rango);

  tiempoRestante = tiempo;
  document.getElementById("tiempo-restante").textContent = tiempoRestante;
  temporizador = setInterval(() => {
    tiempoRestante--;
    document.getElementById("tiempo-restante").textContent = tiempoRestante;
    if (tiempoRestante <= 0) {
      clearInterval(temporizador);
      juegoActivo = false;
      mostrarResultado();
    }
  }, 1000);
}

function siguienteOperacion(operaciones, rango) {
  const op = operaciones[Math.floor(Math.random() * operaciones.length)];
  let a = Math.floor(Math.random() * rango) + 1;
  let b = Math.floor(Math.random() * rango) + 1;

  if (op === "-") {
    if (b > a) [a, b] = [b, a];
    respuestaCorrecta = a - b;
  } else if (op === "*") {
    respuestaCorrecta = a * b;
  } else if (op === "/") {
    b = Math.floor(Math.random() * (rango - 1)) + 1;
    a = a * b;
    respuestaCorrecta = a / b;
  } else {
    respuestaCorrecta = a + b;
  }

  const simbolo = op === "*" ? "×" : op === "/" ? "÷" : op;
  document.getElementById("pregunta").textContent = `${a} ${simbolo} ${b}`;
  document.getElementById("respuesta").value = "";
  document.getElementById("respuesta").focus();
}

function responder() {
  if (!juegoActivo) return;
  const r = parseInt(document.getElementById("respuesta").value);
  const pregunta = document.getElementById("pregunta").textContent;
  if (r === respuestaCorrecta) {
    puntaje++;
    document.getElementById("aciertos").textContent = puntaje;
    document.getElementById("feedback").textContent = "¡Correcto!";
  } else {
    errores.push({ pregunta, respuestaCorrecta, respuestaUsuario: r });
    document.getElementById("feedback").textContent = `Incorrecto. Era ${respuestaCorrecta}`;
  }
  total++;
  const ops = [];
  if (document.getElementById("op-sum").checked) ops.push("+");
  if (document.getElementById("op-sub").checked) ops.push("-");
  if (document.getElementById("op-mul").checked) ops.push("*");
  if (document.getElementById("op-div").checked) ops.push("/");
  const rango = document.getElementById("dificultad").value === "easy" ? 10 : document.getElementById("dificultad").value === "medium" ? 20 : 50;
  siguienteOperacion(ops, rango);
}

async function mostrarResultado() {
  const div = document.getElementById("contenido-resultado");
  let html = `<p><strong>Jugador:</strong> ${usuarioActual}</p>
              <p><strong>Aciertos:</strong> ${puntaje} de ${total}</p>`;
  if (errores.length > 0) {
    html += "<ul>";
    errores.forEach(e => {
      html += `<li>${e.pregunta} = ${e.respuestaCorrecta} (Tú: ${e.respuestaUsuario})</li>`;
    });
    html += "</ul>";
  } else {
    html += "<p>¡Sin errores!</p>";
  }
  div.innerHTML = html;
  document.getElementById("modal-resultado").style.display = "block";

  const historial = (await localforage.getItem("historial")) || [];
  historial.push({
    jugador: usuarioActual,
    fecha: new Date().toLocaleString(),
    correctas: puntaje,
    total,
    errores
  });
  await localforage.setItem("historial", historial);
}

async function verHistorial() {
  const historial = (await localforage.getItem("historial")) || [];
  const datos = historial.filter(p => p.jugador === usuarioActual);
  const cont = document.getElementById("contenido-historial");
  if (!datos.length) return cont.innerHTML = "<p>No hay partidas.</p>", document.getElementById("modal-historial").style.display = "block";

  let html = "<ul>";
  datos.forEach(p => {
    html += `<li><strong>${p.fecha}</strong>: ${p.correctas}/${p.total}<ul>`;
    p.errores.forEach(e => html += `<li>${e.pregunta} = ${e.respuestaCorrecta} (Tú: ${e.respuestaUsuario})</li>`);
    html += "</ul></li>";
  });
  html += "</ul>";
  cont.innerHTML = html;
  document.getElementById("modal-historial").style.display = "block";
}

document.addEventListener("DOMContentLoaded", async () => {
  usuarioActual = await localforage.getItem("usuarioSeleccionado");
  cargarUsuarios();
  document.getElementById("respuesta").addEventListener("keydown", e => {
    if (e.key === "Enter") responder();
  });
});
