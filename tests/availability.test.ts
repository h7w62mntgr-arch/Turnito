import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeSlots, type ComputeSlotsInput } from "@/lib/availability";
import { formatTime, parseDate, zonedToUtc } from "@/lib/time";

const TZ = "America/Montevideo";
const date = parseDate("2026-09-22")!; // martes
const juan = { id: "juan", name: "Juan" };
const pedro = { id: "pedro", name: "Pedro" };

// Horario del martes de 9 a 12 para todos, salvo que se indique otra cosa.
function slots(overrides: Partial<ComputeSlotsInput> = {}) {
  return computeSlots({
    date,
    timeZone: TZ,
    durationMin: 30,
    resources: [juan],
    schedules: [{ dayOfWeek: 2, startTime: "09:00", endTime: "12:00", resourceId: null }],
    bookings: [],
    now: new Date("2026-09-01T00:00:00Z"),
    ...overrides,
  });
}

const at = (time: string) => zonedToUtc(date, time, TZ);
const booking = (resourceId: string, from: string, to: string) => ({
  resourceId,
  startAt: at(from),
  endAt: at(to),
});
const times = (list: { time: string }[]) => list.map((s) => s.time);

describe("computeSlots", () => {
  it("parte la franja en horarios del largo del servicio", () => {
    assert.deepEqual(times(slots()), ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"]);
  });

  it("guarda el instante en UTC y lo muestra en hora del negocio", () => {
    const [first] = slots();
    assert.equal(first.startAt.toISOString(), "2026-09-22T12:00:00.000Z"); // 09:00 en Uruguay
    assert.equal(first.endAt.toISOString(), "2026-09-22T12:30:00.000Z");
    assert.equal(formatTime(first.startAt, TZ), "09:00");
  });

  it("no ofrece un horario que no entra completo antes del cierre", () => {
    assert.deepEqual(times(slots({ durationMin: 45 })), ["09:00", "09:45", "10:30", "11:15"]);
    assert.deepEqual(slots({ durationMin: 240 }), []);
  });

  it("descarta los horarios ocupados por una reserva", () => {
    assert.deepEqual(times(slots({ bookings: [booking("juan", "10:00", "10:30")] })), [
      "09:00",
      "09:30",
      "10:30",
      "11:00",
      "11:30",
    ]);
  });

  it("una reserva que empieza en el medio tapa el horario que la contiene", () => {
    assert.deepEqual(times(slots({ bookings: [booking("juan", "10:15", "10:45")] })), [
      "09:00",
      "09:30",
      "11:00",
      "11:30",
    ]);
  });

  it("una reserva pegada no bloquea el horario siguiente", () => {
    const result = slots({ bookings: [booking("juan", "09:30", "10:00")] });
    assert.ok(times(result).includes("10:00"));
    assert.ok(!times(result).includes("09:30"));
  });

  it("el horario sigue libre si al menos un recurso lo tiene libre", () => {
    const result = slots({
      resources: [juan, pedro],
      bookings: [booking("juan", "09:00", "09:30")],
    });
    assert.deepEqual(result[0].resourceIds, ["pedro"]);
    assert.deepEqual(result[1].resourceIds, ["juan", "pedro"]);
  });

  it("desaparece el horario cuando todos los recursos están ocupados", () => {
    const result = slots({
      resources: [juan, pedro],
      bookings: [booking("juan", "09:00", "09:30"), booking("pedro", "09:00", "09:30")],
    });
    assert.ok(!times(result).includes("09:00"));
  });

  it("una reserva de un recurso no afecta al otro", () => {
    const result = slots({ resources: [juan, pedro], bookings: [booking("pedro", "09:00", "12:00")] });
    assert.ok(result.every((s) => s.resourceIds.length === 1 && s.resourceIds[0] === "juan"));
  });

  it("un horario propio de un recurso solo aplica a ese recurso", () => {
    const result = slots({
      resources: [juan, pedro],
      schedules: [{ dayOfWeek: 2, startTime: "09:00", endTime: "10:00", resourceId: "pedro" }],
    });
    assert.deepEqual(times(result), ["09:00", "09:30"]);
    assert.ok(result.every((s) => s.resourceIds.length === 1 && s.resourceIds[0] === "pedro"));
  });

  it("suma las franjas del día sin repetir horarios", () => {
    const result = slots({
      schedules: [
        { dayOfWeek: 2, startTime: "09:00", endTime: "10:00", resourceId: null },
        { dayOfWeek: 2, startTime: "15:00", endTime: "16:00", resourceId: null },
        { dayOfWeek: 2, startTime: "09:00", endTime: "10:00", resourceId: "juan" },
      ],
    });
    assert.deepEqual(times(result), ["09:00", "09:30", "15:00", "15:30"]);
  });

  it("ignora los horarios de otros días de la semana", () => {
    assert.deepEqual(
      slots({ schedules: [{ dayOfWeek: 3, startTime: "09:00", endTime: "12:00", resourceId: null }] }),
      [],
    );
  });

  it("no ofrece horarios que ya pasaron", () => {
    const result = slots({ now: at("10:10") });
    assert.deepEqual(times(result), ["10:30", "11:00", "11:30"]);
  });

  it("respeta la anticipación mínima", () => {
    const result = slots({ now: at("09:50"), minNoticeMin: 60 });
    assert.deepEqual(times(result), ["11:00", "11:30"]);
  });

  it("sin recursos activos no hay horarios", () => {
    assert.deepEqual(slots({ resources: [] }), []);
  });

  it("usa el paso configurado en vez de la duración", () => {
    const result = slots({ durationMin: 60, stepMin: 30 });
    assert.deepEqual(times(result), ["09:00", "09:30", "10:00", "10:30", "11:00"]);
  });

  it("maneja franjas nocturnas de cancha", () => {
    const result = slots({
      durationMin: 60,
      schedules: [{ dayOfWeek: 2, startTime: "18:00", endTime: "23:00", resourceId: null }],
      bookings: [booking("juan", "20:00", "21:00")],
    });
    assert.deepEqual(times(result), ["18:00", "19:00", "21:00", "22:00"]);
    assert.equal(result.at(-1)!.endAt.toISOString(), "2026-09-23T02:00:00.000Z");
  });
});

describe("zonas horarias", () => {
  it("convierte ida y vuelta en una zona con horario de verano", () => {
    // Chile cambia la hora en setiembre; Uruguay no, así que sirve de control.
    const CL = "America/Santiago";
    for (const day of ["2026-09-05", "2026-09-06", "2026-09-07", "2026-12-15"]) {
      const d = parseDate(day)!;
      for (const time of ["09:00", "23:30"]) {
        assert.equal(formatTime(zonedToUtc(d, time, CL), CL), time, `${day} ${time}`);
      }
    }
  });

  it("una hora que no existe por el cambio de horario se corre hacia adelante", () => {
    // El 6/9/2026 en Chile el reloj salta de 00:00 a 01:00: las 00:30 no existen.
    const CL = "America/Santiago";
    const instant = zonedToUtc(parseDate("2026-09-06")!, "00:30", CL);
    assert.equal(formatTime(instant, CL), "01:30");
  });

  it("en Uruguay la hora local es siempre UTC-3", () => {
    for (const day of ["2026-01-15", "2026-07-15", "2026-09-22"]) {
      const instant = zonedToUtc(parseDate(day)!, "09:00", TZ);
      assert.equal(instant.toISOString(), `${day}T12:00:00.000Z`);
    }
  });

  it("rechaza fechas inválidas", () => {
    assert.equal(parseDate("2026-02-31"), null);
    assert.equal(parseDate("22/09/2026"), null);
    assert.ok(parseDate("2026-02-28"));
  });
});
