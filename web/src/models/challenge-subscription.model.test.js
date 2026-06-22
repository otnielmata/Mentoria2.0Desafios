import { describe, expect, it } from "vitest";

import subscriptionModel from "./challenge-subscription.model";

const { getSubscriptionActionState } = subscriptionModel;

describe("ações de inscrição em desafios", () => {
  it("mostra as duas modalidades antes da inscrição", () => {
    expect(getSubscriptionActionState(null)).toEqual({
      isSubscribed: false,
      modalidade: "normal",
      showNormal: true,
      showEnglish: true,
    });
  });

  it("oculta a inscrição em inglês depois da inscrição normal", () => {
    expect(getSubscriptionActionState({ modalidade: "normal" })).toMatchObject({
      isSubscribed: true,
      showNormal: true,
      showEnglish: false,
    });
  });

  it("oculta a inscrição normal depois da inscrição em inglês", () => {
    expect(getSubscriptionActionState({ grupo: { modalidade: "ingles" } })).toMatchObject({
      isSubscribed: true,
      modalidade: "ingles",
      showNormal: false,
      showEnglish: true,
    });
  });
});
