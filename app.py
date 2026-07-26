"""
Este archivo actúa como el Controlador principal:
Servirá las rutas HTTP (/admin, /pantalla, /jugar).
Instanciará el objeto Sala global en memoria.
Cargará por defecto el archivo preguntas_default.json.
Coordinará los eventos WebSocket en tiempo real (unirse_sala, iniciar_juego, enviar_respuesta, siguiente_pregunta, etc.).
"""

import os
import json
from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_socketio import SocketIO, emit, join_room, leave_room
from werkzeug.utils import secure_filename

from config import Config
from models import Sala, Pregunta

# Inicialización de Flask y Flask-SocketIO
app = Flask(__name__)
app.config.from_object(Config)

socketio = SocketIO(app, cors_allowed_origins="*", async_mode="eventlet")

# Instancia única del estado de la sala en RAM
sala_juego = Sala()

# Asegurar que existan los directorios de archivos subidos
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

def cargar_preguntas_por_defecto():
    """Carga las preguntas desde el JSON predeterminado al iniciar."""
    ruta_json = os.path.join(os.path.dirname(__file__), "preguntas_default.json")
    if os.path.exists(ruta_json):
        with open(ruta_json, "r", encoding="utf-8") as f:
            datos = json.load(f)
            
            # Convertir cada diccionario del JSON en una instancia de la clase Pregunta
            preguntas_instanciadas = []
            for idx, p in enumerate(datos):
                nueva_p = Pregunta(
                    id_pregunta=idx + 1,
                    texto=p["texto"],
                    opciones=p["opciones"],
                    respuesta_correcta=p["respuesta_correcta"],
                    imagen=p.get("imagen"),
                    audio=p.get("audio"),
                    tiempo_limite=p.get("tiempo_limite", 20)
                )
                preguntas_instanciadas.append(nueva_p)
            
            sala_juego.cargar_preguntas(preguntas_instanciadas)


# Cargar preguntas iniciales
cargar_preguntas_por_defecto()


import shutil

# Limpiar carpeta uploads
def limpiar_carpeta_uploads():
    """Elimina todas las imágenes subidas en static/uploads."""
    folder = app.config["UPLOAD_FOLDER"]
    print(f"\n[CLEANUP] 🧹 Limpiando directorio: {folder}")
    
    if os.path.exists(folder):
        archivos = os.listdir(folder)
        print(f"[CLEANUP] Archivos encontrados: {len(archivos)}")
        
        for filename in archivos:
            file_path = os.path.join(folder, filename)
            try:
                if os.path.isfile(file_path) or os.path.islink(file_path):
                    os.unlink(file_path)
                    print(f"[CLEANUP] 🗑️ Eliminado: {filename}")
                elif os.path.isdir(file_path):
                    shutil.rmtree(file_path)
            except Exception as e:
                print(f"[CLEANUP] ❌ No se pudo eliminar {filename}: {e}")

# ==========================================
# RUTAS HTTP (Vistas)
# ==========================================
@app.route("/admin")
def vista_admin():
    return render_template("admin.html", config=Config)

@app.route("/pantalla")
def vista_pantalla():
    return render_template("pantalla.html", config=Config)

@app.route("/jugar")
def vista_jugador():
    return render_template("jugador.html", config=Config)

@app.route("/api/subir_imagen", methods=["POST"])
def subir_imagen():
    """Endpoint HTTP para subir imágenes asociadas a preguntas desde /admin."""
    if "imagen" not in request.files:
        return jsonify({"exito": False, "mensaje": "No se envió ninguna imagen"}), 400
    
    file = request.files["imagen"]
    if file.filename == "":
        return jsonify({"exito": False, "mensaje": "Nombre de archivo vacío"}), 400

    if file:
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        file.save(filepath)
        url_relativa = f"/static/uploads/{filename}"
        return jsonify({"exito": True, "url": url_relativa})


# ==========================================
# EVENTOS WEBSOCKET (Tiempo Real)
# ==========================================
@socketio.on("connect")
def handle_connect():
    """Al conectarse un cliente, se le envía el estado actual y emojis libres."""
    emit("estado_inicial", {
        "estado": sala_juego.estado,
        "emojis_libres": sala_juego.emojis_libres,
        "jugadores": sala_juego.obtener_podio()
    })

@socketio.on("disconnect")
def handle_disconnect():
    """Maneja la desconexión de un móvil o pantalla."""
    sid = request.sid
    if sid in sala_juego.jugadores:
        alias = sala_juego.jugadores[sid].alias
        sala_juego.eliminar_jugador(sid)
        # Notificar a la Pantalla TV y Admin sobre la desconexión
        emit("actualizar_jugadores", {
            "jugadores": [j.to_dict() for j in sala_juego.jugadores.values()],
            "emojis_libres": sala_juego.emojis_libres
        }, broadcast=True)

@socketio.on("unirse_sala")
def handle_unirse_sala(data):
    """Maneja el registro de un nuevo participante desde el móvil."""
    alias = data.get("alias", "").strip()
    avatar = data.get("avatar", "")
    sid = request.sid

    exito, mensaje = sala_juego.agregar_jugador(sid, alias, avatar)

    if not exito:
        emit("registro_fallido", {"mensaje": mensaje})
        return

    # Notificar al jugador que ingresó correctamente
    emit("registro_exitoso", {
        "alias": alias,
        "avatar": avatar,
        "session_id": sid
    })

    # Transmitir a todos (especialmente a la TV) la nueva lista de jugadores
    emit("actualizar_jugadores", {
        "jugadores": [j.to_dict() for j in sala_juego.jugadores.values()],
        "emojis_libres": sala_juego.emojis_libres
    }, broadcast=True)

    # Inicio automático si se alcanza el máximo de 8 jugadores
    """
    if len(sala_juego.jugadores) == Config.MAX_JUGADORES and sala_juego.estado == Sala.ESTADO_ESPERA:
        iniciar_partida_global()
    """

@socketio.on("reiniciar_juego")
def handle_reiniciar_juego():
    """Reinicia la sala, borra las preguntas cargadas y notifica a todos los clientes."""
    sala_juego.reiniciar_juego(limpiar_jugadores=True)
    sala_juego.preguntas = [] # 🧹 Vaciar preguntas al reiniciar la partida

    # 🧹 LIMPIEZA DE IMÁGENES
    limpiar_carpeta_uploads()

    # Notificar a todos los dispositivos (Admin, TV, Móviles) del reset
    emit("juego_reiniciado", {
        "estado": sala_juego.estado,
        "emojis_libres": sala_juego.emojis_libres,
        "jugadores": []
    }, broadcast=True)

@socketio.on("vaciar_preguntas_server")
def handle_vaciar_preguntas_server():
    """Vacía la lista de preguntas en RAM y elimina las imágenes subidas."""
    sala_juego.preguntas = []
    limpiar_carpeta_uploads()
    
    # Notifica de vuelta que la lista quedó vacía
    emit("preguntas_actualizadas", {"preguntas": []})

# ==========================================
# EVENTOS DE GESTIÓN DE PREGUNTAS
# ==========================================

@socketio.on("cargar_preguntas_default")
def handle_cargar_preguntas_default():
    """Vuelve a leer el JSON predeterminado y actualiza la Sala."""
    cargar_preguntas_por_defecto()
    # Notificar a la interfaz Admin con la lista de preguntas instanciadas
    preguntas_dict = [p.to_dict(para_jugador=False) for p in sala_juego.preguntas]
    emit("preguntas_actualizadas", {"preguntas": preguntas_dict})

@socketio.on("guardar_preguntas_custom")
def handle_guardar_preguntas_custom(data):
    """Recibe la lista enviada por el formulario de /admin, las convierte a Objetos Pregunta y la guarda."""
    lista_custom = data.get("preguntas", [])
    if not lista_custom:
        emit("error_admin", {"mensaje": "La lista de preguntas enviada está vacía."})
        return

    # Convertir los diccionariosJS en instancias de la clase Pregunta
    preguntas_instanciadas = []
    for idx, p in enumerate(lista_custom):
        nueva_p = Pregunta(
            id_pregunta=idx + 1,
            texto=p["texto"],
            opciones=p["opciones"],
            respuesta_correcta=p["respuesta_correcta"],
            imagen=p.get("imagen"),
            audio=p.get("audio"),
            tiempo_limite=p.get("tiempo_limite", 20)
        )
        preguntas_instanciadas.append(nueva_p)

    # Cargamos en la instancia de Sala
    sala_juego.cargar_preguntas(preguntas_instanciadas)
    
    # Notificamos de vuelta la confirmación
    preguntas_dict = [p.to_dict(para_jugador=False) for p in sala_juego.preguntas]
    emit("preguntas_actualizadas", {"preguntas": preguntas_dict})

@socketio.on("iniciar_juego")
def handle_iniciar_juego():
    """Inicia la partida manualmente desde el panel del Administrador."""
    if len(sala_juego.jugadores) < Config.MIN_JUGADORES:
        emit("error_admin", {"mensaje": f"Se requieren mínimo {Config.MIN_JUGADORES} jugadores."})
        return

    if not sala_juego.preguntas:
        emit("error_admin", {"mensaje": "No hay preguntas cargadas en la sala."})
        return

    iniciar_partida_global()

def iniciar_partida_global():
    """Transición de estado para arrancar la primera pregunta."""
    sala_juego.estado = Sala.ESTADO_PREGUNTA
    sala_juego.indice_pregunta_actual = 0
    enviar_pregunta_activa()

def enviar_pregunta_activa():
    """Envía la pregunta actual a la TV y habilita la botonera en los móviles."""
    pregunta = sala_juego.obtener_pregunta_actual()
    if not pregunta:
        return

    # Enviar datos completos a la Pantalla TV y Admin
    emit("nueva_pregunta_tv", pregunta.to_dict(para_jugador=False), broadcast=True)
    # Enviar solo habilitación de botones (A, B, C, D) a los teléfonos
    emit("nueva_pregunta_jugador", pregunta.to_dict(para_jugador=True), broadcast=True)

@socketio.on("enviar_respuesta")
def handle_enviar_respuesta(data):
    """Maneja el clic de un jugador en una opción A, B, C o D."""
    sid = request.sid
    opcion = data.get("opcion")
    tiempo_ms = data.get("tiempo_ms", 0)

    sala_juego.procesar_respuesta(sid, opcion, tiempo_ms)

    # Feedback individual al móvil
    emit("respuesta_recibida", {"opcion": opcion})

    # Notificar a la TV para actualizar el contador de "X de Y jugadores respondieron"
    cant_respondieron = sum(1 for j in sala_juego.jugadores.values() if j.respuesta_actual is not None)
    emit("jugador_respondio", {
        "respondieron": cant_respondieron,
        "total": len(sala_juego.jugadores)
    }, broadcast=True)

    # Si ya todos respondieron, revelar inmediatamente la respuesta correcta
    if sala_juego.todos_respondieron():
        revelar_resultado_pregunta()

@socketio.on("tiempo_agotado")
def handle_tiempo_agotado():
    """Invocado por la Pantalla TV cuando el temporizador llega a 0."""
    if sala_juego.estado == Sala.ESTADO_PREGUNTA:
        revelar_resultado_pregunta()

def revelar_resultado_pregunta():
    """Cambia el estado a RESULTADO y envía gráficos y puntos acumulados."""
    sala_juego.estado = Sala.ESTADO_RESULTADO
    pregunta = sala_juego.obtener_pregunta_actual()

    if not pregunta:
        return

    # Contar frecuencia de respuestas
    conteo = {"A": 0, "B": 0, "C": 0, "D": 0}
    for j in sala_juego.jugadores.values():
        if j.respuesta_actual in conteo:
            conteo[j.respuesta_actual] += 1

    emit("fin_pregunta", {
        "respuesta_correcta": pregunta.respuesta_correcta,
        "conteo": conteo,
        "podio": sala_juego.obtener_podio()
    }, broadcast=True)

@socketio.on("siguiente_pregunta")
def handle_siguiente_pregunta():
    """Avanza a la siguiente ronda desde el panel del Administrador o TV."""
    hay_mas = sala_juego.siguiente_pregunta()
    if hay_mas:
        enviar_pregunta_activa()
    else:
        # Partida terminada
        finalizar_partida() 

def finalizar_partida():
    """Genera los resultados finales y activa la pantalla del Podio/Top 3."""
    podio = sala_juego.obtener_podio()
    max_puntaje = podio[0]["puntaje"] if podio else 0
    
    mensaje_especial = None
    if max_puntaje < 1500:
        mensaje_especial = "Aún no están preparados pequeños saltamontes"

    emit("partida_finalizada", {
        "podio": podio[:3],
        "clasificacion_completa": podio,
        "mensaje_especial": mensaje_especial
    }, broadcast=True)


if __name__ == "__main__":
    print(f"\n==================================================")
    print(f" 🚀 SERVIDOR KAJUUT LOCAL INICIADO ")
    print(f" 📱 Acceso Móvil / TV: http://{Config.HOST_IP}:{Config.PORT}")
    print(f" 🛠️ Panel Admin: http://{Config.HOST_IP}:{Config.PORT}/admin")
    print(f" 📺 Pantalla TV: http://{Config.HOST_IP}:{Config.PORT}/pantalla")
    print(f" 📲 Jugador: http://{Config.HOST_IP}:{Config.PORT}/jugar")
    print(f"==================================================\n")
    
    socketio.run(app, host="0.0.0.0", port=Config.PORT, debug=True)