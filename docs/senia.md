# Seña / pago anticipado

> Por qué la seña es un monto fijo y no el total, y por qué efectivo es un método
> de primera clase y no un parche.

---

## 1. El error que estábamos por cometer

El [SPEC](SPEC.md) decía *"si no paga, no reserva"*. Eso viene del mundo barbería, donde
el que reserva es el que consume y el que paga: pide un corte de $500 y paga $500.

En la cancha no funciona así. **El que reserva no es el que paga.** Una cancha de $1200 la
pagan diez entre todos, $120 cada uno, y el que reserva es el que junta a los demás.
Pedirle una seña por el total es pedirle que le financie la noche a nueve tipos que
todavía no le pusieron un peso. Nadie hace eso un martes para jugar el jueves.

**Regla:** la seña es un **monto fijo**, del orden de lo que pone un jugador. Nunca un
porcentaje del total ni el total.

---

## 2. Efectivo no es el plan B

El dinero de la cancha se mueve en efectivo en el mostrador. Un sistema que solo acepta
Mercado Pago no describe la realidad del negocio: deja al dueño sin forma de registrar la
plata que sí cobró.

Por eso el método de pago es un dato de la reserva (`Booking.paymentMethod`), y efectivo
es uno de los valores posibles desde el día uno. No necesita integrarse con nadie:

1. El cliente reserva y ve cuánto tiene que dejar de seña.
2. Elige cómo la paga. Si hay un solo método habilitado, el formulario no pregunta.
3. El dueño cobra en el mostrador y la marca desde la agenda.

**Cobrar la seña confirma la reserva.** Si estaba sin confirmar, pasa a confirmada: es lo
que el dueño quiere decir cuando toca el botón.

---

## 3. Cómo está modelado

| Dónde | Campo | Para qué |
|-------|-------|----------|
| `Business` | `depositAmount` | Cuánto pide este negocio. Vacío o 0 = no pide seña. |
| `Booking` | `depositAmount` | Monto congelado al reservar. |
| `Booking` | `paymentMethod` | `EFECTIVO` \| `MERCADO_PAGO`. |
| `Booking` | `depositPaid` + `depositPaidAt` | Si se cobró y cuándo. |

El monto se **congela en la reserva**: si el dueño sube la seña de $200 a $300, las
reservas viejas siguen debiendo los $200 que se les pidieron. Cambiar el precio no puede
cambiar retroactivamente lo que alguien acordó pagar.

Ni el monto ni el método salen nunca del formulario: se resuelven en el servidor contra la
config del negocio (`lib/payments.ts`, `lib/booking.ts`).

Dos constraints en la base sostienen las reglas que el código asume:
`depositAmount >= 0`, y `depositPaid = (depositPaidAt IS NOT NULL)` — una seña cobrada
siempre tiene fecha.

---

## 4. Dónde entra Mercado Pago

`availableMethods()` en `lib/payments.ts` es la costura. Hoy devuelve solo `EFECTIVO` y el
formulario no muestra selector. Cuando esté el Checkout Pro devuelve los dos y el selector
aparece solo; el webhook marca `depositPaid` igual que lo hace hoy el botón del dueño.

Antes de construirlo, mirar dos cosas:

- **La tarifa vigente de MP Uruguay.** Si hay mínimo fijo por operación, cobrar diez veces
  $120 cuesta mucho más que cobrar una vez $1200. Eso decide si el cobro dividido
  (un link por jugador) cierra o no.
- **La regla del pago parcial.** Si pagaron 7 de 10, ¿la cancha queda reservada? Esa
  decisión es de negocio, no técnica, y hay que tomarla antes de escribir el webhook.

---

## 5. Lo que todavía no está

- **Cobro dividido**: un link por jugador para que cada uno ponga su parte. Resuelve el
  dolor real del que arma (perseguir a nueve por WhatsApp), pero depende de las dos
  preguntas de arriba.
- **Lista de "quién puso"**: tildar quién ya pagó en efectivo, sin mover plata. Cero
  comisión y cero casos borde. Probablemente el próximo paso: le saca el quilombo de
  encima al organizador sin pelearse con nadie.
- **No-show con la liga**: un cuadro que no se presenta pierde puntos en una tabla que
  miran todos. En un grupo de f5 eso aprieta más que la seña, y el módulo ya está.
