import { describe, expect, it } from "vitest";

import subscriptionModel from "./challenge-subscription.model";

const { getSubscriptionActionState, isChallengeActive } = subscriptionModel;

describe("ações de inscrição em desafios", () => {
  it("mostra as duas modalidades antes da inscrição", () => {
    expect(getSubscriptionActionState(null)).toEqual({
      isSubscribed: false,
      actionDisabled: false,
      modalidade: "normal",
      showNormal: true,
      showEnglish: true,
    });
  });

  it("oculta a inscrição em inglês depois da inscrição normal", () => {
    expect(getSubscriptionActionState({ modalidade: "normal" })).toMatchObject({
      isSubscribed: true,
      actionDisabled: true,
      showNormal: true,
      showEnglish: false,
    });
  });

  it("oculta a inscrição normal depois da inscrição em inglês", () => {
    expect(getSubscriptionActionState({ grupo: { modalidade: "ingles" } })).toMatchObject({
      isSubscribed: true,
      actionDisabled: true,
      modalidade: "ingles",
      showNormal: false,
      showEnglish: true,
    });
  });
});

describe("disponibilidade de desafios inscritos", () => {
  it("mantém disponível desafio ativo dentro do prazo", () => {
    expect(
      isChallengeActive(
        { status: "ativo", deliveryDate: "2026-06-22T00:00:00.000Z" },
        new Date("2026-06-22T23:59:59.999Z")
      )
    ).toBe(true);
  });

  it("bloqueia desafio inativo ou com prazo encerrado", () => {
    expect(isChallengeActive({ status: "inativo" }, new Date("2026-06-22T12:00:00.000Z"))).toBe(false);
    expect(
      isChallengeActive(
        { status: "ativo", deliveryDate: "2026-06-21T00:00:00.000Z" },
        new Date("2026-06-22T00:00:00.000Z")
      )
    ).toBe(false);
  });
});
