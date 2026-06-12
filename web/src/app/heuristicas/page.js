"use client";

import { useEffect, useState } from "react";
import {
  createHeuristic,
  listHeuristics,
} from "@/controllers/heuristic.controller";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

const initialForm = {
  titulo: "",
  descricao: "",
};

export default function HeuristicsPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isLoading, setLoading] = useState(true);
  const [isSubmitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadItems() {
      setLoading(true);
      const result = await listHeuristics();
      setLoading(false);

      if (!result.ok) {
        setStatus({ type: "error", message: result.message });
        return;
      }

      setItems(result.data);
    }

    loadItems();
  }, []);

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setStatus({ type: "", message: "" });

    const result = await createHeuristic(form);
    setSubmitting(false);

    if (!result.ok) {
      setStatus({ type: "error", message: result.message });
      return;
    }

    setItems((current) => [result.data, ...current]);
    setForm(initialForm);
    setStatus({ type: "success", message: "Heuristica cadastrada com sucesso." });
  }

  return (
    <main className="content-layout">
      <section className="section-header">
        <p className="eyebrow">Heuristicas</p>
        <h1>Cadastrar e apresentar heuristicas</h1>
        <p>Fluxo inicial para manter a funcionalidade conectada a API REST.</p>
      </section>

      <section className="two-column">
        <form className="form-panel form-stack" onSubmit={handleSubmit}>
          <h2>Nova heuristica</h2>
          <Input
            label="Titulo"
            name="titulo"
            value={form.titulo}
            onChange={updateField}
            required
          />
          <label className="field-group">
            <span>Descricao</span>
            <textarea
              name="descricao"
              value={form.descricao}
              onChange={updateField}
              rows={5}
              required
            />
          </label>
          <Alert type={status.type}>{status.message}</Alert>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar heuristica"}
          </Button>
        </form>

        <section className="list-panel" aria-live="polite">
          <h2>Heuristicas cadastradas</h2>
          {isLoading ? (
            <p className="empty-state">Carregando heuristicas...</p>
          ) : items.length === 0 ? (
            <p className="empty-state">Nenhuma heuristica encontrada.</p>
          ) : (
            <div className="heuristic-list">
              {items.map((item) => (
                <article className="heuristic-item" key={item.id || item._id || item.titulo}>
                  <h3>{item.titulo || item.title}</h3>
                  <p>{item.descricao || item.description}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
