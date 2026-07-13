import type { StaffTrainingModule } from "@/lib/admin-kiosko/repositories/staff-compliance.repository";

export function TrainingQuiz({ module, action }: { module: StaffTrainingModule; action: (formData: FormData) => Promise<void> }) {
  return (
    <form action={action} className="grid gap-3 rounded-[1.4rem] border border-white/10 bg-[#151515] p-5">
      <input type="hidden" name="moduleId" value={module.id} />
      <h2 className="text-2xl font-black uppercase tracking-[-0.04em] text-white">{module.title}</h2>
      {module.questions.map((question, index) => (
        <label key={String(question.id || index)} className="grid gap-2 text-sm font-bold text-stone-200">
          {String(question.text || `Pregunta ${index + 1}`)}
          <input name={`answer_${String(question.id || index)}`} className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
        </label>
      ))}
      <button className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">Enviar evaluación</button>
    </form>
  );
}
