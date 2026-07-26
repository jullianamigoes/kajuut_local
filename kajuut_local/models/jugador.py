"""
    Esta clase representará a cada participante que entra desde su móvil
"""

class Jugador:
    def __init__(self, session_id: str, alias: str, avatar: str):
        self.session_id = session_id  # ID único de la conexión WebSocket
        self.alias = alias            # Nombre elegido por el usuario
        self.avatar = avatar          # Emoji HTML asignado
        self.puntaje = 0              # Puntos acumulados
        self.respuesta_actual = None  # Opción seleccionada en la ronda actual (A, B, C, D)
        self.tiempo_respuesta = None  # Milisegundos que tardó en responder

    def reiniciar_respuesta_ronda(self):
        """Limpia la respuesta para prepararlo para la siguiente pregunta."""
        self.respuesta_actual = None
        self.tiempo_respuesta = None

    def sumar_puntos(self, puntos: int):
        """Suma puntos calculados en la ronda actual."""
        self.puntaje += puntos

    def to_dict(self):
        """Convierte el objeto a diccionario para enviarlo por WebSocket en JSON."""
        return {
            "session_id": self.session_id,
            "alias": self.alias,
            "avatar": self.avatar,
            "puntaje": self.puntaje,
            "respondio": self.respuesta_actual is not None
        }