import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { availableMethods, depositFor, isPaymentMethod } from "@/lib/payments";

describe("payments", () => {
  it("toma el monto de la seña configurada", () => {
    assert.equal(depositFor({ depositAmount: 200 }), 200);
    assert.equal(depositFor({ depositAmount: "200.50" }), 200.5);
  });

  it("trata el vacío y el cero como 'no pide seña'", () => {
    assert.equal(depositFor({ depositAmount: null }), null);
    assert.equal(depositFor({ depositAmount: 0 }), null);
    assert.equal(depositFor({ depositAmount: "0.00" }), null);
    assert.equal(depositFor({ depositAmount: undefined }), null);
  });

  it("ignora un monto que no es número", () => {
    assert.equal(depositFor({ depositAmount: "gratis" }), null);
  });

  it("acepta solo los métodos habilitados", () => {
    // Mercado Pago todavía no está construido: no se puede elegir.
    assert.ok(isPaymentMethod("EFECTIVO"));
    assert.ok(!isPaymentMethod("MERCADO_PAGO"));
    assert.ok(!isPaymentMethod("transferencia"));
    assert.deepEqual(availableMethods(), ["EFECTIVO"]);
  });
});
