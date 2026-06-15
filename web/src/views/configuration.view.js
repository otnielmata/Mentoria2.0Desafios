function createConfigurationReadOnlyView(viewModel = {}) {
  return {
    title: viewModel.title || "Configurações",
    mode: viewModel.readOnly ? "readonly" : "editable",
    highlights: [
      {
        label: "Ranking geral para alunos",
        value: viewModel.rankingGeralAlunos || "Inativo",
      },
      {
        label: "Bônus por liderança",
        value: viewModel.bonusLideranca || "Inativo",
      },
      {
        label: "Conquistas",
        value: viewModel.conquistas || "Inativo",
      },
    ],
    parameters: viewModel.parameters || [],
    futureFeatures: viewModel.futureFeatures || [],
  };
}

module.exports = {
  createConfigurationReadOnlyView,
};
