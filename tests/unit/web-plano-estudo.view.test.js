const {
  buildAgendaQuery,
  buildCalendarViewModel,
  buildChecklistSummaryViewModel,
  buildWeeklyStudyQuery,
  buildWeeklyStudySessions,
  canToggleChecklistItem,
  formatDateTimeInputValue,
  getDateKeyFromDateTimeInput,
  getCurrentMonthRef,
  getChecklistPointsForCompletedDays,
  shiftMonth,
  toDateKey,
  toIsoFromDateTimeInput,
} = require("../../web/src/views/plano-estudo.view");

describe("plano-estudo.view", () => {
  it("monta grade mensal com eventos agrupados por dia", () => {
    const viewModel = buildCalendarViewModel({
      year: 2026,
      month: 6,
      events: [
        {
          id: "1",
          title: "Lógica e Programação",
          startAt: "2026-06-23T19:00:00.000Z",
          endAt: "2026-06-23T21:00:00.000Z",
          type: "ao_vivo",
          source: "mentoria",
          readOnly: true,
          editable: false,
        },
        {
          id: "2",
          title: "Revisar conteúdo",
          startAt: "2026-06-23T10:00:00.000Z",
          endAt: "2026-06-23T11:00:00.000Z",
          source: "pessoal",
          editable: true,
          readOnly: false,
        },
      ],
    });

    expect(viewModel.weeks.length).toBeGreaterThan(0);
    expect(viewModel.eventsByDay["2026-06-23"]).toHaveLength(2);
    expect(viewModel.eventsByDay["2026-06-23"][0].readOnly).toBe(true);
    expect(viewModel.eventsByDay["2026-06-23"][1].editable).toBe(true);
  });

  it("calcula navegação de mês", () => {
    expect(shiftMonth(2026, 6, 1)).toEqual({ year: 2026, month: 7 });
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
  });

  it("gera chave de data e query da agenda", () => {
    expect(toDateKey("2026-06-23T19:00:00.000Z")).toBe("2026-06-23");
    expect(buildAgendaQuery({ year: 2026, month: 6 })).toEqual({
      month: 6,
      year: 2026,
      limit: 500,
      startDate: new Date(2026, 5, 1, 0, 0, 0, 0).toISOString(),
      endDate: new Date(2026, 5, 30, 23, 59, 59, 999).toISOString(),
    });
    expect(getCurrentMonthRef(new Date("2026-06-23T12:00:00.000Z"))).toEqual({ year: 2026, month: 6 });
  });

  it("preserva a data e horário local ao salvar e reabrir o formulário", () => {
    const inputValue = "2026-06-23T19:00";
    const isoValue = toIsoFromDateTimeInput(inputValue);

    expect(isoValue).toBeTruthy();
    expect(formatDateTimeInputValue(isoValue)).toBe(inputValue);
    expect(toDateKey(isoValue)).toBe("2026-06-23");
    expect(getDateKeyFromDateTimeInput(inputValue)).toBe("2026-06-23");
  });

  it("monta a janela da semana a partir da data informada", () => {
    const result = buildWeeklyStudyQuery("2026-06-23T19:00:00.000Z");

    expect(result).toEqual({
      startDate: new Date(2026, 5, 23, 0, 0, 0, 0).toISOString(),
      endDate: new Date(2026, 5, 29, 23, 59, 59, 999).toISOString(),
      limit: 500,
    });
  });

  it("replica a semana pulando os dias com evento ao vivo", () => {
    const sessions = buildWeeklyStudySessions({
      startAt: "2026-06-23T19:00:00.000Z",
      endAt: "2026-06-23T20:00:00.000Z",
      liveEvents: [
        {
          id: "live-1",
          startAt: "2026-06-24T12:00:00.000Z",
          type: "ao_vivo",
          source: "mentoria",
        },
        {
          id: "recorded-1",
          startAt: "2026-06-25T12:00:00.000Z",
          type: "modulo_gravado",
          source: "mentoria",
        },
      ],
    });

    expect(sessions).toHaveLength(6);
    expect(sessions.map((session) => session.dateKey)).not.toContain("2026-06-24");
    expect(sessions.map((session) => session.dateKey)).toContain("2026-06-25");
    expect(sessions.every((session) => session.scoreWindowStartKey === "2026-06-23")).toBe(true);
    expect(new Date(sessions[0].endAt).getTime() - new Date(sessions[0].startAt).getTime()).toBe(90 * 60000);
  });

  it("resume o checklist por janela de 7 dias e conta só um check por dia", () => {
    const result = buildChecklistSummaryViewModel([
      {
        id: "1",
        title: "Aula 1",
        startAt: "2026-06-23T19:00:00.000Z",
        plannedDateKey: "2026-06-23",
        scoreWindowStartKey: "2026-06-23",
        completed: true,
      },
      {
        id: "2",
        title: "Aula 2",
        startAt: "2026-06-23T20:00:00.000Z",
        plannedDateKey: "2026-06-23",
        scoreWindowStartKey: "2026-06-23",
        completed: true,
      },
      {
        id: "3",
        title: "Aula 3",
        startAt: "2026-06-24T19:00:00.000Z",
        plannedDateKey: "2026-06-24",
        scoreWindowStartKey: "2026-06-23",
        completed: true,
      },
    ]);

    expect(getChecklistPointsForCompletedDays(2)).toBe(1);
    expect(result.totalTarefas).toBe(3);
    expect(result.tarefasConcluidas).toBe(3);
    expect(result.diasComCheck).toBe(2);
    expect(result.totalPontos).toBe(1);
    expect(result.semanas[0]).toMatchObject({
      inicio: "2026-06-23",
      fim: "2026-06-29",
      diasComCheck: 2,
      pontos: 1,
    });
  });

  it("só libera marcar tarefas de hoje ou datas anteriores", () => {
    const referenceDate = new Date("2026-06-24T12:00:00.000Z");

    expect(canToggleChecklistItem({ plannedDateKey: "2026-06-23", completed: false }, referenceDate)).toBe(true);
    expect(canToggleChecklistItem({ plannedDateKey: "2026-06-24", completed: false }, referenceDate)).toBe(true);
    expect(canToggleChecklistItem({ plannedDateKey: "2026-06-25", completed: false }, referenceDate)).toBe(false);
    expect(canToggleChecklistItem({ plannedDateKey: "2026-06-25", completed: true }, referenceDate)).toBe(true);
  });
});
