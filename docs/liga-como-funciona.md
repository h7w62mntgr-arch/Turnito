# Liga y ranking: cómo funciona

> Diseño del módulo de liga para el sabor cancha (ver [SPEC.md](SPEC.md) sección 5 y 10).
> **Ya construido:** liga con tabla, carga de resultados por el dueño, puntos extra por
> horario flojo, inscripción de cuadros por el capitán, tabla pública y cartel con QR.
> Lo que sigue pendiente está marcado en el orden de construcción, al final.

La regla que ordena todo: **nadie se baja una app ni se crea una cuenta.** Los jugadores
entran por el link de la cancha y siguen coordinando por WhatsApp, que es donde ya están.
El único login del sistema es el del dueño.

---

## 0. Cómo entra un cuadro a la liga

**Se anota el capitán, no el dueño.** En la tabla pública (`/liga/<cancha>`) hay un botón
**"Anotar mi cuadro"**: nombre del cuadro, nombre del capitán y celular. Sin cuenta.

- El cuadro **aparece al toque en la tabla**, sin aprobación. Ver su nombre ahí es lo que
  engancha. Si alguien se anota en joda, el dueño lo borra desde su panel.
- Al anotarse, el capitán ve un botón para **mandar el link al grupo de su cuadro**.
- El celular es obligatorio (el dueño necesita el contacto) y **no aparece en la tabla**.
- Protecciones: máximo 2 cuadros por celular, nombres sin repetir (sin importar
  mayúsculas), tope de 20 inscripciones por día por cancha y un campo trampa para bots.
- El dueño puede **cerrar las inscripciones** con un botón (por ejemplo, cuando arranca la
  liga) y **siempre puede anotar cuadros a mano**, para el que no se maneja con el celular.
- En el panel, los cuadros que se anotaron solos tienen la marca "Se anotó solo".

---

## 1. Cómo se arma un partido

**Flujo "reservo y busco rival":**

1. El capitán entra al link de la cancha y reserva, como cualquier reserva.
2. En el formulario marca **"Este partido es por la liga"** y elige su cuadro.
3. Elige una de dos:
   - **Ya tengo rival** → elige el cuadro de la lista, o escribe uno nuevo.
   - **Busco rival** → la reserva queda como desafío abierto.
4. Los desafíos abiertos aparecen arriba de la tabla pública:
   *"Los Pibes buscan rival — martes 20:00"*, con un botón **Aceptar el desafío**.
5. Quien acepta deja su cuadro y su teléfono. A los dos les aparece un botón de WhatsApp
   con el mensaje ya escrito, y arreglan entre ellos como siempre.

**El sistema hace lo único que hoy no existe: que los cuadros se vean entre ellos.**
La conversación sigue donde ya la tienen.

### Cómo arrancar sin construir esto

Los primeros partidos los arma el dueño a mano desde su panel: ya sabe quién juega con
quién y tiene los teléfonos de todos. El tablero de desafíos recién sirve con 6 u 8 cuadros
dando vueltas. **No construirlo hasta que la liga esté andando.**

---

## 2. Cómo entra el resultado

Este es el verdadero riesgo del producto: **si la tabla no se actualiza, la liga se muere
en tres semanas.** Que el resultado entre rápido importa más que el premio.

Tres formas, en orden de construcción:

**a) Lo carga el dueño — con esto se arranca.**
Termina el partido, lo ve desde la cancha, entra al panel y en 20 segundos pone 4–3.
Es lo más confiable y nadie discute lo que carga el dueño. Con 10 partidos por semana
son 3 minutos.

**b) Cartel con QR en la cancha — el que hace que se sienta vivo.**
*"¿Cómo salió? Cargá el resultado acá"*. El capitán escanea y carga el marcador desde
la cancha, caliente. Convierte a los jugadores en participantes.

**c) El rival confirma — solo si aparece el primer vivo.**
El resultado que carga un capitán queda **provisorio** hasta que el otro cuadro lo confirma
con un toque; si nadie lo discute en 24 horas, queda firme. El dueño tiene la última
palabra: él estuvo ahí.

### Los partidos sin resultado no se pierden

Como el partido está atado a la reserva (`Match.bookingId`), el sistema sabe cuáles se
jugaron y cuáles quedaron sin cargar. La agenda del dueño le muestra
*"Falta cargar: Los Pibes vs Fondo Verde, martes 20:00"* con un botón. No tiene que
acordarse de nada.

---

## 3. Puntos extra por horario flojo ← el truco que resuelve el negocio

La tabla sola llena cualquier horario, no necesariamente los muertos, que son los que
le duelen al dueño. Por eso:

- Partido ganado: **3 puntos**. Empate: **1**. Perdido: **0**.
- **Jugar en un horario flojo: +1 punto**, gane o pierda.

Los cuadros que pelean el campeonato se mueven solos a los días vacíos. El dueño
configura qué días y horas dan el punto extra: si los martes se llenan, lo pasa a los
jueves. Es el ajuste que conecta el juego con la plata que hoy no está haciendo.

Implica dos cosas en el modelo de datos, para cuando se construya:
- La liga guarda su tabla de puntos (victoria, empate, bonus).
- La liga guarda qué franjas dan bonus (día de la semana + rango horario).

---

## 4. Premio mensual

Secundario, pero le da cierre al mes: el campeón se lleva algo que al dueño le sale poco
y a los jugadores les gusta (cancha gratis, bebidas, chorizo). Lo describe el dueño en
texto libre; el sistema no maneja el premio, solo lo muestra.

**El motor que engancha es la tabla, no el premio.**

---

## 5. Cómo se lo explica el dueño a sus clientes

> "Los cuadros que vienen siempre juegan entre ellos y listo. Ahora hay una tabla de
> posiciones de la cancha, pública, que se comparte por WhatsApp. Cada partido suma
> puntos y el campeón del mes se lleva un premio. Los que juegan martes o miércoles
> suman un punto extra."

Mostrar la tabla en el celular vende más que cualquier explicación.

---

## Orden de construcción sugerido

1. ✅ Equipos, liga y carga de resultados por el dueño (panel).
2. ✅ Tabla de posiciones pública en `/liga/<cancha>` (link fijo por cancha), con cartel y QR.
3. ✅ Puntos por horario flojo, configurables.
4. ✅ Inscripción de cuadros por el capitán desde la tabla pública.
5. QR en la cancha para que el capitán cargue el resultado.
6. Tablero de desafíos ("busco rival") en la página pública.
7. Confirmación del rival y resultados provisorios.
