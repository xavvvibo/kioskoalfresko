import { AdminHeader } from "./AdminHeader";
import { InitialPhaseNotice } from "./InitialPhaseNotice";

export function RecordPageShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white">
      <AdminHeader title={title} description={description} />
      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 md:py-12">
        <div className="rounded-[2rem] border border-white/10 bg-[#151515] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.18)] sm:p-6">
          <InitialPhaseNotice />
          <div className="mt-6">{children}</div>
        </div>
      </section>
    </main>
  );
}
