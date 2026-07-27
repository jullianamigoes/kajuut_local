// Conexión WebSocket al servidor KAJUUT
const socket = io();

// Referencias a Audio
const audioTicTac = document.getElementById("audio-tictac");
const audioTiempoAgotado = document.getElementById("audio-tiempo-agotado");
const audioFanfarria = document.getElementById("audio-fanfarria");
const audioSaltamontes = document.getElementById("audio-saltamontes");
const audioPregunta = document.getElementById("audio-pregunta");

// Secciones DOM
const seccionLobby = document.getElementById("seccion-lobby");
const seccionPregunta = document.getElementById("seccion-pregunta");
const seccionPodio = document.getElementById("seccion-podio");

const gridJugadores = document.getElementById("grid-jugadores");
const cantConectados = document.getElementById("cant-conectados");

const textoPregunta = document.getElementById("texto-pregunta-tv");
const temporizadorElem = document.getElementById("temporizador");
const numRespuestasElem = document.getElementById("num-respuestas");
const imagenPregunta = document.getElementById("imagen-pregunta");

const txtOpA = document.getElementById("txt-opcion-a");
const txtOpB = document.getElementById("txt-opcion-b");
const txtOpC = document.getElementById("txt-opcion-c");
const txtOpD = document.getElementById("txt-opcion-d");

let timerInterval = null;

// ==========================================
// EVENTOS WEBSOCKET
// ==========================================

socket.on("connect", () => {
    console.log("🟢 Pantalla TV conectada a KAJUUT.");
});

socket.on("estado_inicial", (data) => {
    if (data.jugadores) renderizarLobby(data.jugadores);
});

socket.on("actualizar_jugadores", (data) => {
    renderizarLobby(data.jugadores);
});

socket.on("nueva_pregunta_tv", (data) => {
    // Mostrar vista de pregunta y ocultar lobby/podio
    seccionLobby.style.display = "none";
    seccionPodio.style.display = "none";
    seccionPregunta.style.display = "flex";

    // Cargar datos
    textoPregunta.textContent = data.texto;
    txtOpA.textContent = data.opciones.A;
    txtOpB.textContent = data.opciones.B;
    txtOpC.textContent = data.opciones.C;
    txtOpD.textContent = data.opciones.D;
    numRespuestasElem.textContent = "0";

    // Manejo de imagen
    if (data.imagen) {
        imagenPregunta.src = data.imagen;
        imagenPregunta.style.display = "block";
    } else {
        imagenPregunta.style.display = "none";
    }

    // Resetear estilos de opciones
    document.querySelectorAll(".opcion-tv").forEach(el => {
        el.classList.remove("correcta", "incorrecta");
    });

    // Reproducir audio personalizado si existe
    if (data.audio) {
        audioPregunta.src = data.audio;
        audioPregunta.play().catch(() => {});
    }

    // Iniciar temporizador regresivo y Tic-Tac
    iniciarTemporizador(data.tiempo_limite);
});

socket.on("jugador_respondio", (data) => {
    //numRespuestasElem.textContent = data.respuestas_recibidas; 
    numRespuestasElem.textContent = data.respondieron;
}); 

socket.on("fin_pregunta", (data) => {
    detenerAudio(audioTicTac);
    audioTiempoAgotado.play().catch(() => {});

    clearInterval(timerInterval);
    temporizadorElem.textContent = "0";

    // Resaltar opción correcta y opacar las incorrectas
    const opcionCorrecta = data.respuesta_correcta.toLowerCase();
    document.querySelectorAll(".opcion-tv").forEach(el => {
        if (el.classList.contains(opcionCorrecta)) {
            el.classList.add("correcta");
        } else {
            el.classList.add("incorrecta");
        }
    });
});

socket.on("partida_finalizada", (data) => {
    seccionLobby.style.display = "none";
    seccionPregunta.style.display = "none";
    seccionPodio.style.display = "flex";

    renderizarPodio(data.podio);
});

// Escuchar cuando el Administrador reinicia la partida
socket.on("juego_reiniciado", () => {
    console.log("🔄 Partida reiniciada desde el Admin. Recargando Pantalla TV...");
    window.location.reload(); 
});
/*socket.on("juego_reiniciado", (data) => {
    console.log("🔄 El juego fue reiniciado desde el Admin.");
    
    // Regresar la TV al estado inicial (Lobby/Espera)
    actualizarEstadoUI("ESPERA");
    
    // Vaciar lista de jugadores en la TV
    if (typeof renderizarJugadores === "function") {
        renderizarJugadores(data.jugadores || []);
    }
}); */

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

function renderizarLobby(jugadores) {
    cantConectados.textContent = jugadores.length;
    gridJugadores.innerHTML = "";

    jugadores.forEach(j => {
        const div = document.createElement("div");
        div.className = "tarjeta-jugador-tv";
        div.innerHTML = `
            <span class="emoji-tv">${j.avatar}</span>
            <span class="alias-tv">${j.alias}</span>
        `;
        gridJugadores.appendChild(div);
    });
}

function iniciarTemporizador(segundos) {
    let tiempoRestante = segundos;
    temporizadorElem.textContent = tiempoRestante;

    detenerAudio(audioTicTac);
    audioTicTac.currentTime = 0;
    audioTicTac.play().catch(() => {});

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        tiempoRestante--;
        temporizadorElem.textContent = tiempoRestante;

        if (tiempoRestante <= 0) {
            clearInterval(timerInterval);
        }
    }, 1000);
}

function renderizarPodio(podio) {
    const podioContainer = document.getElementById("podio-items");
    const mensajeEspecial = document.getElementById("mensaje-especial");
    podioContainer.innerHTML = "";
    mensajeEspecial.style.display = "none";

    // Verificar si el puntaje máximo es muy bajo (< 500 pts) para reproducir grilos/saltamontes
    const maxPuntaje = podio.length > 0 ? podio[0].puntaje : 0;

    if (maxPuntaje < 500) {
        audioSaltamontes.play().catch(() => {});
        mensajeEspecial.textContent = "🦗 ¡Un poco flojos hoy! Parece que faltó estudiar un poquito... 😅";
        mensajeEspecial.style.display = "block";
    } else {
        audioFanfarria.play().catch(() => {});
    }

    // Organizar posiciones visuales: 2do lugar (izq), 1er lugar (centro), 3er lugar (der)
    const ordenVisual = [podio[1], podio[0], podio[2]];

    ordenVisual.forEach((j, index) => {
        if (!j) return;

        let claseLugar = "lugar-2";
        let medalla = "🥈";
        if (j === podio[0]) { claseLugar = "lugar-1"; medalla = "🥇"; }
        if (j === podio[2]) { claseLugar = "lugar-3"; medalla = "🥉"; }

        const div = document.createElement("div");
        div.className = `lugar-podio ${claseLugar}`;
        div.innerHTML = `
            <div style="font-size: 2.5rem;">${medalla}${j.avatar}</div>
            <h3 style="font-family: var(--font-title); font-size: 1.5rem; margin: 10px 0;">${j.alias}</h3>
            <p style="font-weight: 800; color: var(--color-a); font-size: 1.2rem;">${j.puntaje} pts</p>
        `;
        podioContainer.appendChild(div);
    });
}

function detenerAudio(audio) {
    audio.pause();
    audio.currentTime = 0;
}
