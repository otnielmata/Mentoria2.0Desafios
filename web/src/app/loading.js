import { LoadingState } from "@/components/ui/Feedback";

export default function Loading() {
  return (
    <main className="async-route-screen">
      <LoadingState message="Carregando area..." />
    </main>
  );
}
