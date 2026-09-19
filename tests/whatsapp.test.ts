import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseDate } from "@/lib/time";
import { reminderMessage, toWhatsappNumber, whatsappLink } from "@/lib/whatsapp";

describe("whatsapp", () => {
  it("convierte celulares uruguayos al formato internacional", () => {
    assert.equal(toWhatsappNumber("099 123 456"), "59899123456");
    assert.equal(toWhatsappNumber("099123456"), "59899123456");
    assert.equal(toWhatsappNumber("+598 99 123 456"), "59899123456");
    assert.equal(toWhatsappNumber("59899123456"), "59899123456");
    assert.equal(toWhatsappNumber("(099) 123-456"), "59899123456");
  });

  it("respeta un número extranjero con +", () => {
    assert.equal(toWhatsappNumber("+54 9 11 2345 6789"), "5491123456789");
  });

  it("descarta teléfonos que no sirven", () => {
    assert.equal(toWhatsappNumber("123"), null);
    assert.equal(whatsappLink("123", "hola"), null);
  });

  it("arma el link con el mensaje codificado", () => {
    const link = whatsappLink("099123456", "Hola Juan! ¿Confirmás?");
    assert.ok(link?.startsWith("https://wa.me/59899123456?text="));
    assert.equal(decodeURIComponent(link!.split("text=")[1]), "Hola Juan! ¿Confirmás?");
  });

  it("escribe el recordatorio con el primer nombre", () => {
    const message = reminderMessage({
      customerName: "Juan Pérez",
      businessName: "Barbería Don Juan",
      date: parseDate("2026-09-22")!,
      time: "10:30",
      serviceName: "Corte",
    });
    assert.match(message, /^Hola Juan!/);
    assert.match(message, /Barbería Don Juan/);
    assert.match(message, /martes 22 de setiembre a las 10:30/);
    assert.match(message, /para Corte/);
    // Sin seña pendiente no se menciona el tema.
    assert.ok(!message.includes("seña"));
  });

  it("le recuerda la seña que quedó sin pagar", () => {
    const message = reminderMessage({
      customerName: "Juan Pérez",
      businessName: "Cancha El Bajo",
      date: parseDate("2026-09-22")!,
      time: "20:00",
      serviceName: "Fútbol 5",
      deposit: "$ 200",
    });
    assert.match(message, /Te queda pendiente la seña de \$ 200\./);
    assert.match(message, /¿Confirmás que venís\?$/);
  });
});
