# Kajuut Local


Kajuut_local es una Web App pensado para usar en local y que simula la conocida web app Kahoot! para crear presentaciones y juegos de trivia.
Aquí podrás crear tus propias trivias en la vista de administrador. También tienes las opciones de subir las trivias en formato JSON y también, 
podrás definir un JSON que se cargue por defecto al momento de ejecutar el servidor. Además, podrán participar hasta 8 personas.
Cuenta con 3 vistas:

  * **Vista Administrador**: Permite crear, cargar y guardar cambios de JSON/trivias; limpiar listas de preguntas y reiniciar o iniciar "***juego***"; cambiar de pregunta una vez que responden los participantes.

![](https://github.com/jullianamigoes/assets_proj/blob/main/assets/kajuut_img/5_img.png)


  * **Vista Jugar**: Permite al participante agregar un alias y avatar e ingresar a la sala para participar. Además, podrá seleccionar las opciones de las preguntas de la trivia.

![](https://github.com/jullianamigoes/assets_proj/blob/main/assets/kajuut_img/2_img.png)


  * **Vista Pantalla**: Permite ver la lista de participantes que se van incorporando a la sala y es la vista principal para ejecutar la trivia.

![](https://github.com/jullianamigoes/assets_proj/blob/main/assets/kajuut_img/3_img.png)


***En la siguiente imagen vemos a un participante que se unió a la sala:***

![](https://github.com/jullianamigoes/assets_proj/blob/main/assets/kajuut_img/4_img.png)


---


## Requisitos


  1. Windows 10/11
  2. Python 3.9.* o superior
  3. Pip 26.* 


---


## Configuración inicial


  1. Ingresar a la carpeta raíz ***kajuut_local*** desde la consola de CMD o PowerShell y ejecutamos el siguiente comando:

```text
   pip install -r requirements.txt
```


  2. Luego en la misma ubicación ejecutamos el comando:

```text
  python app.py
```


  ***Esto permitirá levantar el servidor y listará los enlaces para las diferentes vistas:***

![](https://github.com/jullianamigoes/assets_proj/blob/main/assets/kajuut_img/1_img.png)


---


## Alcance y Reglas de Negocio del Juego


**Modo de Operación:** Aplicación Web Local operada en red local (Wi-Fi de casa) usando la PC como servidor sin dependencia de Internet externa.

**Módulos de Usuario y Capacidad:**
  * ***Administrador:*** Carga de hasta 10 preguntas (4 opciones, 1 correcta, 1 imagen opcional/obligatoria). Apertura y cierre de sala.
  * ***Jugadores:*** Mínimo 2, Máximo 8 participantes.
    
**Acceso y Registro:**
  - Ingreso vía dirección IP local en el navegador del dispositivo móvil.
  - Captura de Alias único.
  - Selección de Avatar Emoji HTML único (sin repetición entre participantes).

**Inicio de Partida:**
  - Automático al completar los 8 jugadores.
  - Manual por el Administrador si hay entre 2 y 7 jugadores.
    
**Dinámica de Juego y Puntuación:**
  - Puntuación dinámica basada en tiempo de respuesta (máximo 1000 puntos por pregunta correcta; a menor tiempo, mayor puntaje).
  - Opciones A, B, C y D mostradas como botones táctiles en los móviles.
  - Sin respuesta o fuera de tiempo se contabiliza automáticamente como respuesta incorrecta (0 pts).
  - Avance de ronda controlado mediante el botón "Siguiente Pregunta" desde el panel del Administrador.

**Finalización y Resultados:**
  - Muestra de Top 3 con soporte para empates en la pantalla principal.
  - Mensaje personalizado en pantalla si los puntajes son demasiado bajos ("Aun no están preparados pequeños saltamontes").
