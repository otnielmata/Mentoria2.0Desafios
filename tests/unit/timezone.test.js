const {
  getDateKeyInSaoPaulo,
  getEndOfDayInSaoPaulo,
  getStartOfDayInSaoPaulo,
  parseDateInSaoPaulo,
} = require("../../src/config/timezone");

describe("timezone America/Sao_Paulo", () => {
  it("interpreta campos locais como UTC-03:00", () => {
    expect(parseDateInSaoPaulo("2026-06-23T19:00").toISOString()).toBe("2026-06-23T22:00:00.000Z");
  });

  it("mantém a mesma data até a virada de dia em São Paulo", () => {
    expect(getDateKeyInSaoPaulo("2026-06-24T02:59:59.999Z")).toBe("2026-06-23");
    expect(getDateKeyInSaoPaulo("2026-06-24T03:00:00.000Z")).toBe("2026-06-24");
  });

  it("calcula início e fim do dia no fuso configurado", () => {
    expect(getStartOfDayInSaoPaulo("2026-06-23").toISOString()).toBe("2026-06-23T03:00:00.000Z");
    expect(getEndOfDayInSaoPaulo("2026-06-23").toISOString()).toBe("2026-06-24T02:59:59.999Z");
  });
});
