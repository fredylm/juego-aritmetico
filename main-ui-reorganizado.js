
let usuarioActual = null;
let juegoActivo = false;
let respuestaCorrecta = 0;
let puntaje = 0;
let errores = [];
let total = 0;
let tiempoRestante = 0;
let temporizador;
let subnivel = 1;

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
  if (document.getElementById("op-sum").checked) operaciones.push("suma");
  if (document.getElementById("op-sub").checked) operaciones.push("resta");
  if (document.getElementById("op-mul").checked) operaciones.push("multiplicacion");
  if (document.getElementById("op-div").checked) operaciones.push("division");

  if (operaciones.length === 0) return alert("Selecciona al menos una operación");

  const dificultad = document.getElementById("dificultad").value;

  juegoActivo = true;
  puntaje = 0;
  errores = [];
  total = 0;
  subnivel = 1;
  document.getElementById("aciertos").textContent = "0";
  document.getElementById("subnivel-texto").textContent = "1 de 5";
  document.getElementById("barra-subnivel").value = 1;
  document.getElementById("modal-juego").style.display = "block";

  siguienteOperacion(operaciones, dificultad);

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

function generarOperando(rango) {
  const [min, max] = rango;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function siguienteOperacion(operaciones, dificultad) {
  const op = operaciones[Math.floor(Math.random() * operaciones.length)];
  const rangos = niveles[op][dificultad][subnivel - 1];
  let [r1, r2] = rangos;
  let a = generarOperando(r1);
  let b = generarOperando(r2);

  if (op === "suma") {
    respuestaCorrecta = a + b;
    simbolo = "+";
  } else if (op === "resta") {
    if (b > a) [a, b] = [b, a];
    respuestaCorrecta = a - b;
    simbolo = "-";
  } else if (op === "multiplicacion") {
    respuestaCorrecta = a * b;
    simbolo = "×";
  } else if (op === "division") {
    respuestaCorrecta = b;
    a = b * a;
    simbolo = "÷";
  }

  document.getElementById("pregunta").textContent = `${a} ${simbolo} ${b}`;
  document.getElementById("respuesta").value = "";
  setTimeout(() => document.getElementById("respuesta").focus(), 50);
}

function responder() {
  if (!juegoActivo) return;
  const r = parseInt(document.getElementById("respuesta").value);
  const pregunta = document.getElementById("pregunta").textContent;
  if (r === respuestaCorrecta) {
    puntaje++;
    document.getElementById("aciertos").textContent = puntaje;
    document.getElementById("feedback").textContent = "¡Correcto!";
    if (puntaje % 5 === 0 && subnivel < 5) {
      subnivel++;
      document.getElementById("subnivel-texto").textContent = subnivel + " de 5";
      document.getElementById("barra-subnivel").value = subnivel;
    }
  } else {
    errores.push({ pregunta, respuestaCorrecta, respuestaUsuario: r });
    document.getElementById("feedback").textContent = `Incorrecto. Era ${respuestaCorrecta}`;
  }
  total++;
  const ops = [];
  if (document.getElementById("op-sum").checked) ops.push("suma");
  if (document.getElementById("op-sub").checked) ops.push("resta");
  if (document.getElementById("op-mul").checked) ops.push("multiplicacion");
  if (document.getElementById("op-div").checked) ops.push("division");
  const dificultad = document.getElementById("dificultad").value;
  siguienteOperacion(ops, dificultad);
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
  document.getElementById("modal-juego").style.display = "none";
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
  if (!datos.length) {
    cont.innerHTML = "<p>No hay partidas.</p>";
    document.getElementById("modal-historial").style.display = "block";
    return;
  }
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

function abrirModalUsuarios() {
  document.getElementById("modal-usuarios").style.display = "block";
}

function cerrarModal(id) {
  document.getElementById(id).style.display = "none";
}

function abrirJuego() {
  iniciarJuego();
}

document.addEventListener("DOMContentLoaded", async () => {
  usuarioActual = await localforage.getItem("usuarioSeleccionado");
  cargarUsuarios();
  document.getElementById("respuesta").addEventListener("keydown", e => {
    if (!document.getElementById("modal-juego").style.display.includes("block")) return;
    if (e.key === "Enter") responder();
  });
});
