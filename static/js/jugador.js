// Conexión WebSocket al servidor KAJUUT
const socket = io();

// Variables de estado local del Jugador
let emojiSeleccionado = null;
let miSessionId = null;
let tiempoInicioPregunta = 0;

// Elementos de la Interfaz (DOM)
const seccionRegistro = document.getElementById("seccion-registro");
const seccionEspera = document.getElementById("seccion-espera");
const seccionBotones = document.getElementById("seccion-botones");

const formRegistro = document.getElementById("form-registro");
const aliasInput = document.getElementById("alias-input");
const gridEmojis = document.getElementById("grid-emojis");
const btnUnirse = document.getElementById("btn-unirse");
const mensajeError = document.getElementById("mensaje-error");

const avatarEspera = document.getElementById("avatar-espera");
const aliasEspera = document.getElementById("alias-espera");
const textoEstadoEspera = document.getElementById("texto-estado-espera");
const puntajeJugador = document.getElementById("puntaje-jugador");

const botonesOpcion = document.querySelectorAll(".btn-opcion");

// ==========================================
// ESCUCHA DE EVENTOS WEBSOCKET
// ==========================================

socket.on("connect", () => {
    console.log("🟢 Conectado a KAJUUT desde dispositivo móvil.");
});

socket.on("estado_inicial", (data) => {
    renderizarEmojis(data.emojis_libres || []);
});

socket.on("actualizar_jugadores", (data) => {
    if (data.emojis_libres) {
        renderizarEmojis(data.emojis_libres);
    }
});

socket.on("registro_exitoso", (data) => {
    miSessionId = data.session_id;
    
    // Cambiar a pantalla de espera
    seccionRegistro.style.display = "none";
    seccionEspera.style.display = "flex";
    
    avatarEspera.textContent = data.avatar;
    aliasEspera.textContent = data.alias;
    textoEstadoEspera.textContent = "¡Estás dentro! Esperando a que el admin inicie el juego...";
});

socket.on("registro_fallido", (data) => {
    mensajeError.textContent = data.mensaje;
    btnUnirse.disabled = false;
});

socket.on("nueva_pregunta_jugador", (data) => {
    // Transición a la botonera táctil
    seccionEspera.style.display = "none";
    seccionBotones.style.display = "grid";

    // Habilitar todos los botones para responder
    botonesOpcion.forEach(btn => {
        btn.disabled = false;
        btn.style.opacity = "1";
    });

    // Guardar el timestamp de inicio para calcular la velocidad de respuesta
    tiempoInicioPregunta = Date.now();
});

socket.on("respuesta_recibida", (data) => {
    // Deshabilitar botones tras responder y mostrar pantalla de espera
    seccionBotones.style.display = "none";
    seccionEspera.style.display = "flex";
    
    textoEstadoEspera.textContent = ` Respóndiste: ${data.opcion}. ¡Esperando el tiempo límite o a tus compañeros!`;
});

socket.on("fin_pregunta", (data) => {
    seccionBotones.style.display = "none";
    seccionEspera.style.display = "flex";

    // Actualizar puntaje acumulado si está en el podio/clasificación
    if (data.podio) {
        const miInfo = data.podio.find(j => j.alias === aliasEspera.textContent);
        if (miInfo) {
            puntajeJugador.textContent = miInfo.puntaje;
        }
    }

    textoEstadoEspera.textContent = "⏱️ ¡Tiempo agotado! Revisa la pantalla TV para ver la respuesta correcta.";
});

socket.on("partida_finalizada", (data) => {
    seccionBotones.style.display = "none";
    seccionEspera.style.display = "flex";

    if (data.podio) {
        const miInfo = data.podio.find(j => j.alias === aliasEspera.textContent);
        if (miInfo) {
            puntajeJugador.textContent = miInfo.puntaje;
        }
    }

    textoEstadoEspera.textContent = "🏆 ¡Partida terminada! Mira el podio en la pantalla principal.";
});

socket.on("juego_reiniciado", () => {
    // Redirigir o recargar la pantalla para que el jugador vuelva al lobby de entrada
    window.location.reload(); 
});

// ==========================================
// RENDERIZADO DE EMOJIS Y SELECCIÓN
// ==========================================

function renderizarEmojis(emojisLibres) {
    gridEmojis.innerHTML = "";
    
    emojisLibres.forEach(emoji => {
        const div = document.createElement("div");
        div.className = "emoji-option";
        div.textContent = emoji;

        if (emoji === emojiSeleccionado) {
            div.classList.add("seleccionado");
        }

        div.addEventListener("click", () => {
            document.querySelectorAll(".emoji-option").forEach(el => el.classList.remove("seleccionado"));
            div.classList.add("seleccionado");
            emojiSeleccionado = emoji;
            validarFormulario();
        });

        gridEmojis.appendChild(div);
    });

    // Resetear selección si el emoji elegido ya fue ocupado por otro
    if (emojiSeleccionado && !emojisLibres.includes(emojiSeleccionado)) {
        emojiSeleccionado = null;
        validarFormulario();
    }
}

aliasInput.addEventListener("input", validarFormulario);

function validarFormulario() {
    const aliasValido = aliasInput.value.trim().length > 0;
    btnUnirse.disabled = !(aliasValido && emojiSeleccionado);
}

// Envío del formulario de registro
formRegistro.addEventListener("submit", (e) => {
    e.preventDefault();
    mensajeError.textContent = "";

    const alias = aliasInput.value.trim();
    if (alias && emojiSeleccionado) {
        btnUnirse.disabled = true;
        socket.emit("unirse_sala", {
            alias: alias,
            avatar: emojiSeleccionado
        });
    }
});

// ==========================================
// RESPUESTA TÁCTIL DEL JUGADOR
// ==========================================

botonesOpcion.forEach(btn => {
    btn.addEventListener("click", () => {
        // Deshabilitar botonera al presionar
        botonesOpcion.forEach(b => b.disabled = true);

        const opcionElegida = btn.getAttribute("data-opcion");
        const tiempoMilisegundos = Date.now() - tiempoInicioPregunta;

        // Emitir respuesta al servidor
        socket.emit("enviar_respuesta", {
            opcion: opcionElegida,
            tiempo_ms: tiempoMilisegundos
        });
    });
});