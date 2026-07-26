import math
from .jugador import Jugador
from .pregunta import Pregunta

# Lista de emojis HTML predefinidos (garantizamos que no se repitan)
EMOJIS_DISPONIBLES = [
    "🐶", "🐱", "🦊", "🐼", "🦁", "🐯", "🐸", "🐵",
    "🦄", "🤖", "🚀", "🍕", "🎮", "🐙", "🔥", "⚡"
]

class Sala:
    ESTADO_ESPERA = "ESPERA"        # En el lobby esperando jugadores
    ESTADO_PREGUNTA = "PREGUNTA"    # Pregunta activa corriendo el tiempo
    ESTADO_RESULTADO = "RESULTADO"  # Mostrando la respuesta correcta y puntos de ronda
    ESTADO_FINAL = "FINAL"          # Partida terminada, muestra Top 3

    def __init__(self):
        self.jugadores = {}          # Dict {session_id: Objeto Jugador}
        self.preguntas = []          # Lista de Objetos Pregunta
        self.indice_pregunta_actual = 0
        self.estado = self.ESTADO_ESPERA
        self.emojis_libres = list(EMOJIS_DISPONIBLES)

    def agregar_jugador(self, session_id: str, alias: str, emoji_elegido: str) -> tuple[bool, str]:
        """Agrega un jugador verificando límite y que el alias/emoji no estén repetidos."""
        if len(self.jugadores) >= 8: # 8
            return False, "La sala ya alcanzó el máximo de 8 jugadores."

        if any(j.alias.lower() == alias.lower() for j in self.jugadores.values()):
            return False, "El alias ya está en uso por otro participante."

        if emoji_elegido not in self.emojis_libres:
            return False, "Ese avatar ya fue seleccionado por otro jugador."

        # Crear y registrar jugador
        nuevo_jugador = Jugador(session_id, alias, emoji_elegido)
        self.jugadores[session_id] = nuevo_jugador
        self.emojis_libres.remove(emoji_elegido)
        return True, "Jugador registrado exitosamente."

    def eliminar_jugador(self, session_id: str):
        """Libera el avatar y elimina al jugador si se desconecta."""
        if session_id in self.jugadores:
            jugador = self.jugadores.pop(session_id)
            if jugador.avatar not in self.emojis_libres:
                self.emojis_libres.append(jugador.avatar)

    def cargar_preguntas(self, lista_preguntas):
        """
        Carga y asegura que las preguntas sean objetos de la clase Pregunta.
        """
        self.preguntas = []
        for p in lista_preguntas:
            if isinstance(p, Pregunta):
                self.preguntas.append(p)
            elif isinstance(p, dict):
                # Si por algún motivo llegara un diccionario puro
                nueva_p = Pregunta(
                    id_pregunta=len(self.preguntas) + 1,
                    texto=p["texto"],
                    opciones=p["opciones"],
                    respuesta_correcta=p.get("respuesta_correcta") or p.get("correcta"),
                    imagen=p.get("imagen"),
                    audio=p.get("audio"),
                    tiempo_limite=p.get("tiempo_limite", 20)
                )
                self.preguntas.append(nueva_p)
                
        self.indice_pregunta_actual = 0

    def obtener_pregunta_actual(self) -> Pregunta:
        if 0 <= self.indice_pregunta_actual < len(self.preguntas):
            return self.preguntas[self.indice_pregunta_actual]
        return None

    def procesar_respuesta(self, session_id: str, opcion: str, tiempo_milisegundos: int):
        """Registra la respuesta de un jugador y calcula su puntaje dinámico."""
        jugador = self.jugadores.get(session_id)
        pregunta = self.obtener_pregunta_actual()

        if not jugador or not pregunta or jugador.respuesta_actual is not None:
            return  # Ya respondió o no existe

        jugador.respuesta_actual = opcion
        jugador.tiempo_respuesta = tiempo_milisegundos

        # Cálculo de puntos dinámico (Max 1000 pts a menor tiempo de respuesta)
        if pregunta.es_correcta(opcion):
            tiempo_segundos = tiempo_milisegundos / 1000.0
            tiempo_max = pregunta.tiempo_limite
            
            # Puntuación proporcional al tiempo restante
            factor_tiempo = max(0.0, (tiempo_max - tiempo_segundos) / tiempo_max)
            puntos_ganados = int(500 + (500 * factor_tiempo))  # Base 500 + hasta 500 por rapidez
            jugador.sumar_puntos(puntos_ganados)

    def todos_respondieron(self) -> bool:
        """Verifica si todos los jugadores activos enviaron su respuesta."""
        if not self.jugadores:
            return False
        return all(j.respuesta_actual is not None for j in self.jugadores.values())

    def siguiente_pregunta(self) -> bool:
        """Avanza al siguiente índice de pregunta. Retorna True si hay más preguntas."""
        # Limpiar respuestas de la ronda anterior
        for jugador in self.jugadores.values():
            jugador.reiniciar_respuesta_ronda()

        self.indice_pregunta_actual += 1
        if self.indice_pregunta_actual < len(self.preguntas):
            self.estado = self.ESTADO_PREGUNTA
            return True
        else:
            self.estado = self.ESTADO_FINAL
            return False

    def obtener_podio(self) -> list:
        """Retorna la lista de jugadores ordenados por puntaje (Top 3)."""
        jugadores_ordenados = sorted(
            self.jugadores.values(),
            key=lambda j: j.puntaje,
            reverse=True
        )
        return [j.to_dict() for j in jugadores_ordenados]
    
    def reiniciar_juego(self, limpiar_jugadores: bool = True):
        """
        Devuelve la sala al estado inicial de ESPERA.
        - resetear índice de preguntas.
        - opcionalmente elimina los jugadores o reinicia sus puntos a 0.
        - restablece la lista de emojis libres.
        """
        self.estado = self.ESTADO_ESPERA
        self.indice_pregunta_actual = 0

        if limpiar_jugadores:
            # Opción A: Desconectar/vaciar lista de jugadores
            self.jugadores = {}
            self.emojis_libres = list(EMOJIS_DISPONIBLES)
        else:
            # Opción B: Mantener los jugadores en la sala pero reseteando sus puntos
            for jugador in self.jugadores.values():
                jugador.puntaje = 0
                jugador.reiniciar_respuesta_ronda()