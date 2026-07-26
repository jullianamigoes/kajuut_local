// ==========================================
// CONEXIÓN Y ESTADO INICIAL
// ==========================================

// Conexión WebSocket al servidor KAJUUT
const socket = io();

// Lista local para acumular las preguntas en el navegador
let preguntasCargadas = [];

// ==========================================
// REFERENCIAS A ELEMENTOS DEL DOM
// ==========================================

// Controles de Sala
const cantJugadoresElem = document.getElementById("cant-jugadores");
const estadoSalaElem = document.getElementById("estado-sala");
const btnIniciar = document.getElementById("btn-iniciar");
const btnSiguiente = document.getElementById("btn-siguiente");
const mensajeAdmin = document.getElementById("mensaje-admin");
const btnReiniciar = document.getElementById("btn-reiniciar");

// Carga de Preguntas y Formulario
const inputJsonFile = document.getElementById("input-json-file");
const btnCargarJsonLocal = document.getElementById("btn-cargar-json-local");
const btnCargarJsonDefault = document.getElementById("btn-cargar-json-default");

const btnLimpiarPreguntas = document.getElementById("btn-limpiar-preguntas");
const btnAplicarPreguntas = document.getElementById("btn-aplicar-preguntas");
const formPregunta = document.getElementById("form-pregunta");
const listaPreguntasUI = document.getElementById("lista-preguntas-cargadas");
const countPreguntasElem = document.getElementById("count-preguntas");

// ==========================================
// LISTENERS / ESCUCHA DE EVENTOS WEBSOCKET
// ==========================================

socket.on("connect", () => {
    console.log("🟢 Conectado al servidor KAJUUT como Administrador.");
});

// Recibir estado inicial de la sala al conectar
// Recibir estado inicial de la sala al conectar
socket.on("estado_inicial", (data) => {
    actualizarEstadoUI(data.estado);
    if (data.jugadores) {
        cantJugadoresElem.textContent = data.jugadores.length;
    }
    // NUEVO: Pedir las preguntas actuales al conectar si no tenemos
    if (preguntasCargadas.length === 0) {
        socket.emit("cargar_preguntas_default");
    }
});

// Actualizar contador cuando un jugador entra o sale
socket.on("actualizar_jugadores", (data) => {
    cantJugadoresElem.textContent = data.jugadores.length;
});

// Manejo de errores enviados desde el backend
socket.on("error_admin", (data) => {
    mostrarMensaje(data.mensaje, true);
});

// Cambios de fase del juego
socket.on("nueva_pregunta_tv", () => {
    actualizarEstadoUI("PREGUNTA");
});

socket.on("fin_pregunta", () => {
    actualizarEstadoUI("RESULTADO");
});

socket.on("partida_finalizada", () => {
    actualizarEstadoUI("FINAL");
});


// Servidor confirma la actualización de preguntas
socket.on("preguntas_actualizadas", (data) => {
    preguntasCargadas = data.preguntas || [];
    renderizarListaPreguntas();
    
    if (preguntasCargadas.length > 0) {
        mostrarMensaje(`¡Sincronizado! Se cargaron ${preguntasCargadas.length} preguntas en el juego.`, false);
    } else {
        mostrarMensaje("Lista de preguntas vaciada en el servidor.", false);
    }
});


// Escuchar cuando el juego ha sido reseteado
socket.on("juego_reiniciado", (data) => {
    actualizarEstadoUI(data.estado);
    cantJugadoresElem.textContent = "0";
    
    // 🧹 VACIAR LA LISTA LOCAL Y LIMPIAR LA PANTALLA
    preguntasCargadas = [];
    renderizarListaPreguntas();
    
    mostrarMensaje("🔄 El juego y la lista de preguntas han sido reseteados correctamente.", false);
});


// ==========================================
// FUNCIONES AUXILIARES DE LA INTERFAZ (UI)
// ==========================================

// Muestra/Oculta botones según la fase del juego
function actualizarEstadoUI(estado) {
    estadoSalaElem.textContent = estado;

    // El botón de reiniciar siempre visible para poder cancelar/resetear cuando sea
    if (btnReiniciar) btnReiniciar.style.display = "inline-flex";

    if (estado === "ESPERA") {
        btnIniciar.style.display = "inline-flex";
        btnSiguiente.style.display = "none";
    } else if (estado === "PREGUNTA") {
        btnIniciar.style.display = "none";
        btnSiguiente.style.display = "none";
    } else if (estado === "RESULTADO") {
        btnIniciar.style.display = "none";
        btnSiguiente.style.display = "inline-flex";
    } else if (estado === "FINAL") {
        btnIniciar.style.display = "none";
        btnSiguiente.style.display = "none";
        mostrarMensaje("🏆 ¡Partida Finalizada!", false);
    }
}

// Muestra mensajes de exito (verde) o error (rojo) por 4 segundos
function mostrarMensaje(msg, esError = false) {
    mensajeAdmin.textContent = msg;
    mensajeAdmin.style.color = esError ? "#d9534f" : "#6BCB77";
    setTimeout(() => {
        mensajeAdmin.textContent = "";
    }, 4000);
}

// Dibuja en el HTML las preguntas acumuladas en el array local
function renderizarListaPreguntas() {
    listaPreguntasUI.innerHTML = "";
    countPreguntasElem.textContent = preguntasCargadas.length;

    if (preguntasCargadas.length === 0) {
        listaPreguntasUI.innerHTML = "<li style='color: var(--text-muted); font-style: italic;'>No hay preguntas cargadas. Agrega una con el formulario o carga el JSON por defecto.</li>";
        return;
    }

    preguntasCargadas.forEach((p, idx) => {
        const li = document.createElement("li");
        li.style.marginBottom = "8px";
        li.innerHTML = `<strong>#${idx + 1}:</strong> ${p.texto} <em>(Correcta: ${p.respuesta_correcta} | ${p.tiempo_limite}s)</em>`;
        listaPreguntasUI.appendChild(li);
    });
}


// ==========================================
// EVENTOS DE BOTONES DE CONTROL DE JUEGO
// ==========================================

// Botón para arrancar la partida
btnIniciar.addEventListener("click", () => {
    socket.emit("iniciar_juego");
});

// Botón para pasar a la siguiente pregunta tras ver el gráfico/podio
btnSiguiente.addEventListener("click", () => {
    socket.emit("siguiente_pregunta");
});

btnReiniciar.addEventListener("click", () => {
    if (confirm("¿Estás seguro de que deseas reiniciar la partida? Se borrarán los puntajes y la sesión actual.")) {
        socket.emit("reiniciar_juego");
    }
});

// ==========================================
// EVENTOS DE GESTIÓN DE PREGUNTAS (JSON vs CREAR)
// ==========================================

// 1. Cargar JSON desde el equipo local
btnCargarJsonLocal.addEventListener("click", () => {
    inputJsonFile.click(); // Abre la ventana del explorador de archivos
});

inputJsonFile.addEventListener("change", (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const datos = JSON.parse(event.target.result);

            // Validar que el JSON sea un arreglo
            if (!Array.isArray(datos)) {
                mostrarMensaje("El archivo JSON debe contener una lista [...] de preguntas.", true);
                return;
            }

            // Asignar el JSON importado a la lista local
            preguntasCargadas = datos;
            renderizarListaPreguntas();
            mostrarMensaje(`📂 ¡Cargadas ${preguntasCargadas.length} preguntas desde "${archivo.name}"! Recuerda hacer clic en "Guardar / Aplicar".`, false);

        } catch (error) {
            mostrarMensaje("Error al leer el archivo JSON. Estructura inválida.", true);
        }
    };

    reader.readAsText(archivo);
    // Limpiar el input para permitir re-seleccionar el mismo archivo si se desea
    inputJsonFile.value = "";
});

// 2. Cargar el JSON predeterminado de la carpeta del proyecto
btnCargarJsonDefault.addEventListener("click", () => {
    socket.emit("cargar_preguntas_default");
});

// 3. Vaciar la lista local del navegador
btnLimpiarPreguntas.addEventListener("click", () => {
    // 1. Vaciar array local del navegador
    preguntasCargadas = [];
    renderizarListaPreguntas();
    
    // 2. Avisar al servidor para que limpie RAM y borre los archivos de uploads
    socket.emit("vaciar_preguntas_server");
    
    mostrarMensaje("🗑️ Lista e imágenes del servidor eliminadas.", false);
});

// 4. Enviar la lista creada localmente al backend Flask
btnAplicarPreguntas.addEventListener("click", () => {
    console.log("Intentando aplicar preguntas. Cantidad local:", preguntasCargadas.length);

    if (preguntasCargadas.length === 0) {
        mostrarMensaje("⚠️ Agrega al menos una pregunta a la lista antes de presionar Guardar.", true);
        alert("⚠️ La lista local está vacía.\n\nUsa el formulario arriba para 'Agregar Pregunta a la Lista' o presiona 'Cargar Preguntas Por Defecto (JSON)' antes de aplicar.");
        return;
    }

    // Emitir lista custom por Socket al servidor
    socket.emit("guardar_preguntas_custom", { preguntas: preguntasCargadas });
    mostrarMensaje("⏳ Sincronizando preguntas con el servidor...", false);
});

// 5. Formulario: Agregar pregunta al arreglo local (con soporte de imagen)
formPregunta.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (preguntasCargadas.length >= 10) {
        mostrarMensaje("Se ha alcanzado el límite máximo de 10 preguntas.", true);
        return;
    }

    const texto = document.getElementById("texto-pregunta").value.trim();
    const opcionA = document.getElementById("opcion-a").value.trim();
    const opcionB = document.getElementById("opcion-b").value.trim();
    const opcionC = document.getElementById("opcion-c").value.trim();
    const opcionD = document.getElementById("opcion-d").value.trim();
    const respuestaCorrecta = document.getElementById("respuesta-correcta").value;
    const tiempoLimite = parseInt(document.getElementById("tiempo-limite").value, 10);
    const inputImagen = document.getElementById("imagen-pregunta");

    let urlImagen = null;

    // Subir imagen vía HTTP primero si el usuario seleccionó una
    if (inputImagen.files.length > 0) {
        const formData = new FormData();
        formData.append("imagen", inputImagen.files[0]);

        try {
            const respuesta = await fetch("/api/subir_imagen", {
                method: "POST",
                body: formData
            });
            const data = await respuesta.json();
            if (data.exito) {
                urlImagen = data.url;
            } else {
                mostrarMensaje("Error al subir la imagen: " + data.mensaje, true);
                return;
            }
        } catch (err) {
            mostrarMensaje("Error de red al subir la imagen.", true);
            return;
        }
    }

    // Armar el objeto pregunta compatible con la clase Pregunta de Python
    const nuevaPregunta = {
        texto: texto,
        opciones: {
            "A": opcionA,
            "B": opcionB,
            "C": opcionC,
            "D": opcionD
        },
        respuesta_correcta: respuestaCorrecta,
        tiempo_limite: tiempoLimite,
        imagen: urlImagen,
        audio: null
    };

    // Guardar en la lista local y renderizar
    preguntasCargadas.push(nuevaPregunta);
    renderizarListaPreguntas();
    formPregunta.reset();
    mostrarMensaje("¡Pregunta agregada a la lista local! Haz clic en 'Guardar / Aplicar' para subirla al juego.", false);
});