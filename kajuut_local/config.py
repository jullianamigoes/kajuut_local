import socket
import os

def obtener_ip_local():
    """
    Detecta automáticamente la IP de la PC en la red local (Wi-Fi/Ethernet)
    sin necesidad de salir a Internet.
    """
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # No realiza una conexión real hacia fuera, solo determina la interfaz activa
        s.connect(("10.255.255.255", 1))
        ip_local = s.getsockname()[0]
    except Exception:
        ip_local = "127.0.0.1"
    finally:
        s.close()
    return ip_local

# 📍 Obtenemos la ruta absoluta de la carpeta donde se encuentra este proyecto
BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY") or "kahoot_local_secret_key_12345"
    HOST_IP = obtener_ip_local()
    PORT = 5000
    
    # Directorio RUTA ABSOLUTA para almacenar imágenes subidas por el Administrador
    UPLOAD_FOLDER = os.path.join(BASE_DIR, "static", "uploads")
    ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}
    
    # Límites del juego según el informe
    MIN_JUGADORES = 1   # 2
    MAX_JUGADORES = 8   # 8
    MAX_PREGUNTAS = 10  # lo podemos modificar añadiendo o quitando o dejando en : 999