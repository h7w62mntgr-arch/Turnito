# Sistema de Reservas — Barbería + Cancha (con Ranking)

> Documento de especificación para desarrollo con Claude Code.
> Ponelo en la raíz del repo como `CLAUDE.md` o `docs/SPEC.md` para que Claude Code tenga el contexto siempre a mano.

---

## 1. Qué es (visión en una frase)

Un sistema de reservas online **multi-negocio** (SaaS), con **un solo motor** y **dos sabores**:

- **Sabor Barbería** (simple): reservas de turnos para barberías, peluquerías y consultorios.
- **Sabor Cancha** (con módulo extra): reservas de canchas de fútbol 5/7 **+ un módulo de liga/ranking** que gamifica a los equipos que juegan seguido, para que la cancha llene sus horarios muertos.

Se construye **una sola cosa**. Cada sabor activa o no el módulo de ranking. Mañana entran peluquería, consultorio, pádel, etc. al mismo esqueleto sin reescribir nada.

---

## 2. Contexto de negocio (para entender el dominio)

- **Mercado:** Uruguay (arranca en Minas, Lavalleja). Pagos en pesos uruguayos vía **Mercado Pago**. Comunicación por **WhatsApp** (canal dominante).
- **Quién paga:** el dueño del negocio (el barbero, el dueño de la cancha). NO el cliente final.
- **Modelo de precio:**
  - Barbería: instalación **50–80 USD** (una vez) + suscripción **20–25 USD/mes**.
  - Cancha: instalación **120–150 USD** (una vez) + suscripción **40 USD/mes** (incluye módulo ranking).
- **La ventaja competitiva NO es el software** (hay competidores: Turno.uy, ReservaSimple, Citalo, WonaSports). **Es el servicio local**: instalación, configuración y soporte en persona. El módulo de ranking casual pegado a reservas es el único diferencial de producto real, y no lo vimos ofrecido por la competencia.

### Fase 0 — Validar ANTES de construir (no saltearla)
- Confirmar con el dueño de cancha (primo) que tiene **horarios muertos** entre semana. Si la cancha ya se llena sola, el ranking no mueve la aguja y no hay negocio. Todo el valor de la cancha depende de esto.
- El sabor barbería se puede vender ya como **servicio** (instalar/mantener), no requiere que el producto esté 100% terminado.

---

## 3. Roles / usuarios

| Rol | Quién | Qué hace |
|-----|-------|----------|
| **Owner / Admin** | Dueño del negocio | Configura recursos, horarios, servicios, precios. Ve la agenda. Marca estados. (En cancha: gestiona la liga y carga resultados.) |
| **Cliente final** | Quien reserva | Entra a la página pública del negocio, reserva un turno/cancha, deja nombre + teléfono. Sin login. |
| **Super-admin** | Vos (Bruno) | Alta de negocios, gestión de suscripciones. Al principio puede ser manual. |
| **Equipo / Cuadro** *(solo cancha)* | Grupo que juega | Tiene un perfil, suma puntos en el ranking. El capitán es el contacto. |

---

## 4. Alcance por sabor

### Sabor Barbería (simple)
1. Alta y login del dueño.
2. Setup del negocio: nombre, recursos (barberos/sillas), servicios (corte, corte+barba…) con duración y precio, disponibilidad semanal.
3. **Página pública de reservas** (`/reservar/[slug]`): el cliente elige servicio → ve horarios libres → reserva con nombre + teléfono → confirmación.
4. **Dashboard del dueño**: agenda del día/semana, marcar reservas como confirmada / cancelada / completada / no-show.
5. Recordatorio por WhatsApp (ver sección 7 — arranca manual).

### Sabor Cancha (todo lo de arriba +)
6. Recurso = cada cancha. Servicio = franja horaria con precio.
7. **Seña / pago anticipado** vía Mercado Pago para bajar el no-show ("si no paga, no reserva").
8. **Módulo Ranking/Liga** (el diferencial — ver sección 5).

---

## 5. Módulo Ranking / Liga (corazón del sabor cancha)

> Regla de diseño clave: **el motor que engancha es la tabla, no el premio.** La tabla tiene que estar buenísima, pública, y actualizarse al toque después de cada partido. El premio es mensual y secundario (una frutilla que le da cierre al mes).

Funcionalidad:
- **Equipos (cuadros):** perfil con nombre, logo opcional, contacto del capitán.
- **Temporada/Liga:** los puntos se acumulan por temporada (ej. mensual). Al cerrar, se reinicia.
- **Partidos:** se registran resultados (equipo A vs equipo B, marcador, ganador/empate). Idealmente linkeados a una reserva.
- **Tabla de posiciones:** PJ, G, E, P, GF, GC, DIF, Pts. Se calcula desde los resultados. **Pública por link/QR, sin login** (para que se pueda compartir por WhatsApp/IG).
- **Premio mensual:** al equipo campeón del mes. Descripción configurable (ej. "cancha gratis + Gatorade + 3kg chorizo").

Por qué esto llena horarios muertos: los equipos vuelven cada semana para no perder posiciones → reservan recurrente → se llenan los martes/miércoles flojos → la cancha paga feliz.

---

## 6. Stack técnico recomendado

Elegido para **un dev solo + Claude Code**, moderno y con la menor fricción posible.

| Capa | Elección | Por qué |
|------|----------|---------|
| **Framework** | **Next.js (App Router) + TypeScript** | Full-stack en un solo repo, React (que ya sabés), Claude Code lo maneja muy bien. TS ayuda a que Claude Code cometa menos errores. |
| **Base de datos** | **PostgreSQL vía Supabase** | Postgres + Auth + Storage + Realtime listos. El Realtime es ideal para la tabla de ranking en vivo. Free tier para arrancar. |
| **ORM** | **Prisma** | Schema declarativo, migraciones fáciles, Claude Code lo conoce a fondo. |
| **Auth** | **Supabase Auth** | Integrado, gratis. Solo lo usa el dueño (el cliente final reserva sin login). |
| **Estilos** | **Tailwind CSS + shadcn/ui** | Rápido, componentes copy-paste, Claude Code excelente con esto. |
| **Pagos** | **Mercado Pago SDK** | Señas (Checkout Pro) + suscripciones (preapproval). Estándar en Uruguay. |
| **WhatsApp** | Ver sección 7 | Arranca manual (wa.me), después API. |
| **Hosting** | **Vercel** | Deploy nativo de Next.js, free tier, un click. |
| **Repo** | **GitHub** | Con branches por feature. |

### Multi-tenancy (importante)
Modelo simple: **una sola base de datos**, todo scopeado por `businessId`. Cada negocio tiene un `slug` para su página pública (`/reservar/[slug]`). No compliques con subdominios ni bases separadas en el MVP.

---

## 7. El problema jodido: recordatorios por WhatsApp

**Esta es la pieza más cara y frágil de todo el sistema. Leé esto antes de prometer nada.**

- ❌ **NO usar** librerías no oficiales (`whatsapp-web.js`, `baileys`, `venom`) para negocios de clientes. Te **banean** la cuenta. Sirven para jugar, no para un producto que le vendés a alguien.
- ✅ **MVP (fase 1): recordatorio manual.** El dashboard genera un botón con link `wa.me/<telefono>?text=<mensaje precargado>`. El dueño toca y manda. **Costo cero, cero API, y ya prueba el valor.** Con esto validás sin gastar.
- ✅ **Escalando (fase 2): WhatsApp Business Cloud API (Meta)** o un proveedor (360dialog, Twilio). Oficial, estable, pero:
  - Requiere verificación de negocio.
  - Los mensajes de recordatorio usan **plantillas aprobadas**.
  - **Tienen costo por mensaje.** Un barbero con 150–200 cortes/mes genera cientos de mensajes. **Sacá esta cuenta antes de fijar la suscripción** o te come el margen (si el WhatsApp te cuesta 3–4 USD por cliente, tu margen real de los 20 es 16).

**Recomendación:** arrancá manual, automatizá recién cuando tengas clientes pagando.

---

## 8. Modelo de datos (Prisma schema — punto de partida)

```prisma
// --- NÚCLEO (compartido por todos los sabores) ---

model Business {
  id           String        @id @default(cuid())
  name         String
  type         BusinessType  // BARBERIA | CANCHA
  slug         String        @unique          // para /reservar/[slug]
  phone        String?
  address      String?
  timezone     String        @default("America/Montevideo")
  subStatus    SubStatus     @default(TRIAL)  // TRIAL | ACTIVE | PAUSED
  resources    Resource[]
  services     Service[]
  schedules    Schedule[]
  bookings     Booking[]
  customers    Customer[]
  teams        Team[]        // solo cancha
  leagues      League[]      // solo cancha
  createdAt    DateTime      @default(now())
}

enum BusinessType { BARBERIA CANCHA }
enum SubStatus { TRIAL ACTIVE PAUSED }

model Owner {
  id          String   @id @default(cuid())
  authUserId  String   @unique   // id de Supabase Auth
  businessId  String
  email       String
  createdAt   DateTime @default(now())
}

// Lo reservable: barbero/silla (barbería) o cada cancha (cancha)
model Resource {
  id          String    @id @default(cuid())
  businessId  String
  business    Business  @relation(fields: [businessId], references: [id])
  name        String    // "Barbero Juan" / "Cancha 1"
  schedules   Schedule[]
  bookings    Booking[]
}

// Servicio (barbería) o tipo de franja (cancha)
model Service {
  id          String    @id @default(cuid())
  businessId  String
  business    Business  @relation(fields: [businessId], references: [id])
  name        String    // "Corte", "Corte + barba", "Fútbol 5 - 1h"
  durationMin Int
  price       Decimal
  bookings    Booking[]
}

// Disponibilidad semanal recurrente
model Schedule {
  id          String    @id @default(cuid())
  businessId  String
  business    Business  @relation(fields: [businessId], references: [id])
  resourceId  String?
  resource    Resource? @relation(fields: [resourceId], references: [id])
  dayOfWeek   Int       // 0=domingo ... 6=sábado
  startTime   String    // "09:00"
  endTime     String    // "18:00"
}

model Customer {
  id          String    @id @default(cuid())
  businessId  String
  business    Business  @relation(fields: [businessId], references: [id])
  name        String
  phone       String
  email       String?
  bookings    Booking[]
  visitsCount Int       @default(0)  // para fidelización (fase 2)
  createdAt   DateTime  @default(now())
}

model Booking {
  id            String        @id @default(cuid())
  businessId    String
  business      Business      @relation(fields: [businessId], references: [id])
  resourceId    String
  resource      Resource      @relation(fields: [resourceId], references: [id])
  serviceId     String?
  service       Service?      @relation(fields: [serviceId], references: [id])
  customerId    String?
  customer      Customer?     @relation(fields: [customerId], references: [id])
  customerName  String        // por si reserva sin registrarse
  customerPhone String
  startAt       DateTime
  endAt         DateTime
  status        BookingStatus @default(PENDING)
  depositPaid   Boolean       @default(false)
  price         Decimal?
  match         Match?        // si esta reserva es un partido de liga
  createdAt     DateTime      @default(now())
}

enum BookingStatus { PENDING CONFIRMED CANCELLED COMPLETED NO_SHOW }

// --- MÓDULO RANKING / LIGA (solo cancha) ---

model Team {
  id           String   @id @default(cuid())
  businessId   String
  business     Business @relation(fields: [businessId], references: [id])
  name         String
  logoUrl      String?
  captainName  String?
  captainPhone String?
  homeMatches  Match[]  @relation("HomeTeam")
  awayMatches  Match[]  @relation("AwayTeam")
  createdAt    DateTime @default(now())
}

model League {
  id          String    @id @default(cuid())
  businessId  String
  business    Business  @relation(fields: [businessId], references: [id])
  name        String    // "Liga Septiembre 2026"
  startDate   DateTime
  endDate     DateTime
  status      LeagueStatus @default(ACTIVE)
  matches     Match[]
  prizeDesc   String?   // "Cancha gratis + Gatorade + 3kg chorizo"
  winnerTeamId String?
}

enum LeagueStatus { ACTIVE FINISHED }

model Match {
  id          String    @id @default(cuid())
  leagueId    String
  league      League    @relation(fields: [leagueId], references: [id])
  bookingId   String?   @unique
  booking     Booking?  @relation(fields: [bookingId], references: [id])
  homeTeamId  String
  homeTeam    Team      @relation("HomeTeam", fields: [homeTeamId], references: [id])
  awayTeamId  String
  awayTeam    Team      @relation("AwayTeam", fields: [awayTeamId], references: [id])
  homeScore   Int?
  awayScore   Int?
  playedAt    DateTime?
  status      MatchStatus @default(SCHEDULED)
}

enum MatchStatus { SCHEDULED PLAYED }
```

> La **tabla de posiciones** se calcula desde los `Match` con resultado (no se guarda; se computa). Si hay muchos equipos y se pone lento, más adelante se cachea en una tabla `Standing`.

---

## 9. Estructura de carpetas sugerida (Next.js App Router)

```
/app
  /(public)
    /reservar/[slug]/page.tsx      # página pública de reservas
    /liga/[leagueId]/page.tsx      # tabla de posiciones pública
  /(dashboard)
    /dashboard/page.tsx            # agenda del dueño
    /dashboard/setup/page.tsx      # config negocio/recursos/horarios
    /dashboard/liga/page.tsx       # gestión de liga (solo cancha)
  /api
    /bookings/route.ts
    /webhooks/mercadopago/route.ts
/lib
  /prisma.ts
  /availability.ts                 # lógica de slots libres
  /standings.ts                    # cálculo de tabla
/prisma
  /schema.prisma
/components/ui                     # shadcn/ui
```

---

## 10. Orden de construcción (fases para Claude Code)

**Fase 1 — MVP barbería (meta: 1 cliente pagando)**
1. Setup del repo: Next.js + TS + Tailwind + Prisma + Supabase. Deploy vacío a Vercel.
2. Schema Prisma (sección 8) + migración. Modelos del núcleo primero.
3. Auth del dueño (Supabase) + setup del negocio (recursos, servicios, horarios).
4. Lógica de disponibilidad (`availability.ts`): dados horarios + reservas existentes, calcular slots libres.
5. Página pública `/reservar/[slug]`: elegir servicio → ver slots → reservar.
6. Dashboard: ver agenda, cambiar estados.
7. Botón de recordatorio manual por WhatsApp (`wa.me`).

**Fase 2 — Sabor cancha + ranking**
8. Múltiples recursos (canchas) + servicio = franja.
9. Seña con Mercado Pago (Checkout Pro + webhook).
10. Módulo liga: equipos, temporada, cargar resultados.
11. Tabla de posiciones pública (`/liga/[id]`) + compartir por link/QR.

**Fase 3 — Escalar**
12. Recordatorios WhatsApp automáticos (API oficial).
13. Fidelización barbería (contador de visitas → recompensa).
14. **Reporte de ocupación / horarios muertos** ← tu arma de venta: mostrarle al dueño cuánto se llenó y qué franjas siguen flojas.
15. Suscripción automática (Mercado Pago preapproval). *Al principio cobrás tus 10 clientes a mano — no construyas esto para 3 clientes.*

---

## 11. Decisiones abiertas / riesgos a tener en cuenta

- **Costo de WhatsApp** vs. precio de suscripción → mapear antes de escalar (sección 7).
- **Zona horaria y slots**: cuidar `America/Montevideo` en todo cálculo de fechas. Bug clásico.
- **Choques de reservas**: la lógica de disponibilidad tiene que evitar doble-booking del mismo recurso/horario (validar en el backend, no solo en el front).
- **No sobre-construir**: el MVP se prueba con 1 barbería y 1 cancha. Suscripción automática, multi-idioma y analytics avanzado son fase 3.

---

## 12. Cómo usar este doc con Claude Code

1. Poné este archivo como `CLAUDE.md` en la raíz del repo → Claude Code lo lee como contexto en cada sesión.
2. Al arrancar, decile el stack explícito: *"Next.js App Router + TypeScript + Prisma + Supabase + Tailwind + shadcn/ui, deploy en Vercel."*
3. Trabajá en **slices verticales chicos**, una feature a la vez, y probá cada una antes de seguir. No le pidas "hacé todo el sistema" de una.
4. Empezá por el **schema de Prisma** (sección 8), después la lógica de disponibilidad, después la página pública.
5. Una branch de Git por feature.

---

*Regla de oro del proyecto: la cancha con ranking es la apuesta de producto (hueco real, nadie lo cubre). La barbería es servicio recurrente que se vende ya, sin terminar el producto. No mezclar las dos billeteras.*
