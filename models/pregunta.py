class Pregunta:
    def __init__(self, id_pregunta: int, texto: str, opciones: dict, respuesta_correcta: str, imagen: str = None, audio: str = None, tiempo_limite: int = 20):
        self.id_pregunta = id_pregunta
        self.texto = texto                      # Texto de la pregunta
        self.opciones = opciones                # Dict: {"A": "Opción 1", "B": "Opción 2", ...}
        self.respuesta_correcta = respuesta_correcta  # "A", "B", "C" o "D"
        self.imagen = imagen                    # Ruta relativa a la imagen en /static/uploads/ (opcional)
        self.audio = audio                      # Ruta relativa al audio en /static/audio/preguntas/ (opcional)
        self.tiempo_limite = tiempo_limite      # Tiempo en segundos (por defecto 20s)

    def es_correcta(self, opcion_seleccionada: str) -> bool:
        """Verifica si la opción elegida coincide con la correcta."""
        return self.respuesta_correcta.upper() == opcion_seleccionada.upper() if opcion_seleccionada else False

    def to_dict(self, para_jugador: bool = False):
        """
        Convierte la pregunta a diccionario JSON.
        Si 'para_jugador' es True, oculta la respuesta correcta y el texto completo si no es necesario.
        """
        if para_jugador:
            # Los móviles solo necesitan saber que hay opciones A, B, C, D activas
            return {
                "id_pregunta": self.id_pregunta,
                "opciones_disponibles": list(self.opciones.keys())
            }
        
        # Estructura completa para el Administrador y la Pantalla Principal (TV)
        return {
            "id_pregunta": self.id_pregunta,
            "texto": self.texto,
            "opciones": self.opciones,
            "respuesta_correcta": self.respuesta_correcta, # 👈 AGREGADO: Ya no dará undefined
            "imagen": self.imagen,
            "audio": self.audio,
            "tiempo_limite": self.tiempo_limite
        }