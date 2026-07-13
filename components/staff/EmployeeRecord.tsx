import type { ReactNode } from "react";
import type { StaffContract, StaffEmployee, StaffLocation, StaffShift, StaffWorkEntry } from "@/lib/admin-kiosko/repositories/staff.repository";
import type {
  StaffAbsence,
  StaffDisciplinaryCase,
  StaffDocument,
  StaffPrivateProfile,
  StaffSignature,
  StaffTimelineEvent,
  StaffTrainingAssignment,
  StaffTrainingCatalogItem,
} from "@/lib/admin-kiosko/repositories/staff-records.repository";
import { getTrainingAlert } from "@/lib/admin-kiosko/staff/training.service";
import { isExpired, isCertificateExpiring } from "@/lib/admin-kiosko/staff/record-rules";
import { maskDni, maskIban, maskSocialSecurity } from "@/lib/admin-kiosko/staff/sensitive";

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#f2c6bb]">{label}</p>
      <p className="mt-2 text-sm font-bold text-white">{value || "Sin dato"}</p>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6 rounded-[1.6rem] border border-white/10 bg-[#151515] p-5">
      <h2 className="text-2xl font-black uppercase tracking-[-0.04em] text-white">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function EmployeeRecordDashboard({
  employee,
  profile,
  contracts,
  locations,
  documents,
  training,
  absences,
  incidentsCount,
  disciplinary,
  signatures,
  timeline,
  nextShift,
  openEntry,
  canReadSensitive,
}: {
  employee: StaffEmployee;
  profile: StaffPrivateProfile | null;
  contracts: StaffContract[];
  locations: StaffLocation[];
  documents: StaffDocument[];
  training: StaffTrainingAssignment[];
  absences: StaffAbsence[];
  incidentsCount: number;
  disciplinary: StaffDisciplinaryCase[];
  signatures: StaffSignature[];
  timeline: StaffTimelineEvent[];
  nextShift: StaffShift | null;
  openEntry: StaffWorkEntry | null;
  canReadSensitive: boolean;
}) {
  const activeContract = contracts.find((contract) => contract.active) || null;
  const primaryLocation = locations.find((location) => location.id === employee.primary_location_id) || null;
  const alerts = [
    activeContract?.end_date && isCertificateExpiring(activeContract.end_date, 30) ? "Contrato próximo a finalizar" : null,
    profile?.probation_ends_at && isCertificateExpiring(profile.probation_ends_at, 15) ? "Periodo de prueba próximo a finalizar" : null,
    documents.some((document) => isExpired(document.expires_at)) ? "Documentación caducada" : null,
    training.some((item) => getTrainingAlert(item.status, item.expires_at, false)) ? "Formación pendiente o caducada" : null,
    absences.some((absence) => absence.status === "approved" && new Date(absence.starts_at) <= new Date() && new Date(absence.ends_at) >= new Date()) ? "Ausencia activa" : null,
    incidentsCount ? "Incidencias pendientes" : null,
    documents.some((document) => document.signature_status === "pending") ? "Firma pendiente" : null,
  ].filter(Boolean);

  return (
    <div className="grid gap-6">
      <section className="rounded-[1.8rem] border border-white/10 bg-[#fffaf4] p-5 text-stone-950">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#d94b2b]">Expediente laboral</p>
        <div className="mt-4 grid gap-4 md:grid-cols-[1.5fr_1fr]">
          <div>
            <h2 className="text-4xl font-black uppercase tracking-[-0.05em]">{employee.display_name}</h2>
            <p className="mt-2 text-sm font-bold text-stone-700">{employee.employee_code} · {employee.status} · {primaryLocation?.name || "sin centro"}</p>
          </div>
          <div className="grid gap-2 text-sm font-bold text-stone-700">
            <p>Contrato: {activeContract?.contract_type || "sin contrato activo"}</p>
            <p>Próximo turno: {nextShift ? new Date(nextShift.starts_at).toLocaleString("es-ES", { timeZone: "Europe/Madrid" }) : "sin turno publicado"}</p>
            <p>Fichaje actual: {openEntry ? "abierto" : "sin fichaje abierto"}</p>
          </div>
        </div>
        {alerts.length ? <div className="mt-4 flex flex-wrap gap-2">{alerts.map((alert) => <span key={alert} className="rounded-full border border-[#d94b2b]/30 bg-[#d94b2b]/12 px-3 py-2 text-xs font-black uppercase tracking-[0.08em] text-[#d94b2b]">{alert}</span>)}</div> : null}
      </section>

      <nav className="flex gap-2 overflow-x-auto pb-1 text-xs font-black uppercase tracking-[0.1em]">
        {["resumen", "personales", "laborales", "contratos", "documentos", "formacion", "ausencias", "incidencias", "disciplina", "firmas", "historial", "auditoria"].map((item) => (
          <a key={item} href={`#${item}`} className="whitespace-nowrap rounded-full border border-white/10 bg-white/8 px-4 py-2 text-white">{item}</a>
        ))}
      </nav>

      <Section id="resumen" title="Resumen">
        <div className="grid gap-3 md:grid-cols-4">
          <Field label="Centro" value={primaryLocation?.name} />
          <Field label="Puesto" value={activeContract?.job_title || profile?.professional_category} />
          <Field label="Horas semanales" value={activeContract?.weekly_minutes ? `${activeContract.weekly_minutes} min` : null} />
          <Field label="Firma pendiente" value={documents.filter((doc) => doc.signature_status === "pending").length} />
        </div>
      </Section>

      <Section id="personales" title="Datos personales">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Nombre" value={employee.first_name} />
          <Field label="Apellidos" value={employee.last_name} />
          <Field label="Nombre preferido" value={profile?.preferred_name} />
          <Field label="DNI/NIE" value={canReadSensitive ? profile?.dni_nie : maskDni(profile?.dni_nie)} />
          <Field label="NSS" value={canReadSensitive ? profile?.social_security_number : maskSocialSecurity(profile?.social_security_number)} />
          <Field label="Nacimiento" value={canReadSensitive ? profile?.birth_date : profile?.birth_date ? "[restringido]" : null} />
          <Field label="Teléfono" value={employee.phone} />
          <Field label="Email" value={employee.email} />
          <Field label="Dirección" value={canReadSensitive ? profile?.address : profile?.address ? "[restringido]" : null} />
          <Field label="IBAN" value={canReadSensitive ? profile?.iban : maskIban(profile?.iban)} />
          <Field label="Emergencia" value={canReadSensitive ? profile?.emergency_contact_name : profile?.emergency_contact_name ? "[restringido]" : null} />
          <Field label="Tallas" value={[profile?.shirt_size, profile?.shoe_size].filter(Boolean).join(" / ")} />
        </div>
      </Section>

      <Section id="laborales" title="Datos laborales">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Organización" value={employee.organization_id || "Kiosko Alfresko"} />
          <Field label="Alta" value={employee.hire_date} />
          <Field label="Antigüedad" value={profile?.seniority_date} />
          <Field label="Baja" value={employee.termination_date} />
          <Field label="Motivo baja" value={profile?.termination_reason} />
          <Field label="Departamento" value={profile?.department} />
          <Field label="Grupo profesional" value={profile?.professional_group} />
          <Field label="Categoría" value={profile?.professional_category} />
          <Field label="Jornada" value={profile?.workday_type} />
          <Field label="Salario bruto" value={canReadSensitive ? profile?.salary_gross : profile?.salary_gross ? "[restringido]" : null} />
          <Field label="Coste empresa" value={canReadSensitive ? profile?.estimated_company_cost : profile?.estimated_company_cost ? "[restringido]" : null} />
          <Field label="Prueba hasta" value={profile?.probation_ends_at} />
        </div>
      </Section>

      <Section id="contratos" title="Contratos">
        <RecordList items={contracts.map((contract) => `${contract.contract_type} · ${contract.start_date} · ${contract.weekly_minutes} min/semana · ${contract.active ? "activo" : "inactivo"}`)} empty="Sin contratos." />
      </Section>

      <Section id="documentos" title="Documentos">
        <RecordList items={documents.map((document) => `${document.visible_name} · ${document.category} · v${document.version} · ${document.status} · firma ${document.signature_status}`)} empty="Sin documentos." />
      </Section>

      <Section id="formacion" title="Formación">
        <RecordList items={training.map((item) => `${item.status} · ${item.provider || "sin proveedor"} · caduca ${item.expires_at || "no aplica"}${getTrainingAlert(item.status, item.expires_at, false) ? " · alerta" : ""}`)} empty="Sin formación asignada." />
      </Section>

      <Section id="ausencias" title="Vacaciones y ausencias">
        <RecordList items={absences.map((absence) => `${absence.absence_type} · ${absence.status} · ${new Date(absence.starts_at).toLocaleDateString("es-ES")} - ${new Date(absence.ends_at).toLocaleDateString("es-ES")}`)} empty="Sin ausencias." />
      </Section>

      <Section id="incidencias" title="Incidencias">
        <p className="text-sm text-stone-300">{incidentsCount ? `${incidentsCount} incidencias registradas o pendientes.` : "Sin incidencias pendientes."}</p>
      </Section>

      <Section id="disciplina" title="Régimen disciplinario">
        <RecordList items={disciplinary.map((item) => `${item.title} · ${item.case_type} · ${item.status}`)} empty="Sin expedientes disciplinarios." />
      </Section>

      <Section id="firmas" title="Firmas">
        <RecordList items={signatures.map((signature) => `${signature.signed_entity_type} · v${signature.document_version} · ${signature.status} · ${new Date(signature.signed_at).toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}`)} empty="Sin firmas." />
      </Section>

      <Section id="historial" title="Historial">
        <RecordList items={timeline.map((event) => `${new Date(event.effective_at).toLocaleDateString("es-ES")} · ${event.title} · ${event.severity}`)} empty="Sin eventos de historial." />
      </Section>

      <Section id="auditoria" title="Auditoría">
        <p className="text-sm leading-6 text-stone-300">La auditoría detallada filtrable está disponible en Informes RRHH. Los cambios sensibles registran campos afectados, no valores completos.</p>
      </Section>
    </div>
  );
}

function RecordList({ items, empty }: { items: string[]; empty: string }) {
  return (
    <div className="grid gap-2">
      {items.length ? items.map((item) => <p key={item} className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-stone-300">{item}</p>) : <p className="text-sm text-stone-300">{empty}</p>}
    </div>
  );
}

export function EmployeeRecordForms({
  employee,
  trainings,
  actions,
}: {
  employee: StaffEmployee;
  trainings: StaffTrainingCatalogItem[];
  actions: {
    updateProfile: (formData: FormData) => Promise<void>;
    uploadDocument: (formData: FormData) => Promise<void>;
    assignTraining: (formData: FormData) => Promise<void>;
    createAbsence: (formData: FormData) => Promise<void>;
    createDisciplinary: (formData: FormData) => Promise<void>;
  };
}) {
  return (
    <section className="grid gap-5">
      <form action={actions.updateProfile} className="grid gap-3 rounded-[1.6rem] border border-white/10 bg-[#151515] p-5 md:grid-cols-3">
        <input type="hidden" name="employeeId" value={employee.id} />
        <h2 className="text-2xl font-black uppercase tracking-[-0.04em] text-white md:col-span-3">Editar expediente</h2>
        {["preferredName", "dniNie", "socialSecurityNumber", "birthDate", "address", "postalCode", "municipality", "province", "country", "emergencyContactName", "emergencyContactPhone", "emergencyContactRelationship", "iban", "shirtSize", "shoeSize", "seniorityDate", "terminationReason", "professionalGroup", "professionalCategory", "department", "workdayType", "salaryGross", "salaryPeriodicity", "estimatedCompanyCost", "probationPeriod", "probationEndsAt"].map((name) => (
          <input key={name} name={name} type={name.toLowerCase().includes("date") || name.endsWith("At") ? "date" : "text"} placeholder={name} className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
        ))}
        <textarea name="internalNotes" placeholder="Observaciones internas" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950 md:col-span-3" />
        <textarea name="laborNotes" placeholder="Observaciones laborales" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950 md:col-span-3" />
        <button className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white md:col-span-3">Guardar expediente</button>
      </form>

      <form action={actions.uploadDocument} className="grid gap-3 rounded-[1.6rem] border border-white/10 bg-[#151515] p-5 md:grid-cols-2">
        <input type="hidden" name="employeeId" value={employee.id} />
        <h2 className="text-2xl font-black uppercase tracking-[-0.04em] text-white md:col-span-2">Subir documento</h2>
        <input name="visibleName" required placeholder="Nombre visible" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
        <select name="category" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950">
          {["dni_nie", "contract", "extension", "payroll", "model_145", "social_security", "prl", "appcc", "training_certificate", "medical_check", "medical_leave", "medical_return", "vacation", "sanction", "internal_communication", "other"].map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <input name="documentDate" type="date" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
        <input name="expiresAt" type="date" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
        <input name="file" type="file" required className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950 md:col-span-2" />
        <label className="text-sm font-bold text-stone-200"><input name="visibleToEmployee" type="checkbox" className="mr-2" /> Visible para empleado</label>
        <label className="text-sm font-bold text-stone-200"><input name="requiresSignature" type="checkbox" className="mr-2" /> Requiere firma</label>
        <textarea name="notes" placeholder="Notas" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950 md:col-span-2" />
        <button className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white md:col-span-2">Subir documento</button>
      </form>

      <form action={actions.assignTraining} className="grid gap-3 rounded-[1.6rem] border border-white/10 bg-[#151515] p-5 md:grid-cols-2">
        <input type="hidden" name="employeeId" value={employee.id} />
        <h2 className="text-2xl font-black uppercase tracking-[-0.04em] text-white md:col-span-2">Asignar formación</h2>
        <select name="trainingId" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950">
          <option value="">Formación sin catálogo</option>
          {trainings.map((training) => <option key={training.id} value={training.id}>{training.name}</option>)}
        </select>
        <select name="status" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950">
          {["pending", "in_progress", "completed", "expired", "cancelled"].map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <input name="provider" placeholder="Proveedor" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
        <input name="completedAt" type="date" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
        <input name="expiresAt" type="date" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
        <input name="notes" placeholder="Observaciones" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
        <button className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white md:col-span-2">Asignar formación</button>
      </form>

      <form action={actions.createAbsence} className="grid gap-3 rounded-[1.6rem] border border-white/10 bg-[#151515] p-5 md:grid-cols-2">
        <input type="hidden" name="employeeId" value={employee.id} />
        <h2 className="text-2xl font-black uppercase tracking-[-0.04em] text-white md:col-span-2">Registrar ausencia</h2>
        <select name="absenceType" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950">
          {["vacation", "temporary_disability", "paid_leave", "unpaid_leave", "unjustified_absence", "personal_days", "maternity_paternity", "work_accident", "other"].map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <input name="startsAt" type="datetime-local" required className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
        <input name="endsAt" type="datetime-local" required className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
        <input name="reason" placeholder="Motivo" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
        <label className="text-sm font-bold text-stone-200"><input name="visibleToEmployee" type="checkbox" className="mr-2" defaultChecked /> Visible para empleado</label>
        <textarea name="notes" placeholder="Notas" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950 md:col-span-2" />
        <button className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white md:col-span-2">Registrar ausencia</button>
      </form>

      <form action={actions.createDisciplinary} className="grid gap-3 rounded-[1.6rem] border border-white/10 bg-[#151515] p-5 md:grid-cols-2">
        <input type="hidden" name="employeeId" value={employee.id} />
        <h2 className="text-2xl font-black uppercase tracking-[-0.04em] text-white md:col-span-2">Régimen disciplinario</h2>
        <select name="caseType" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950">
          {["information_request", "investigation_opening", "allegations", "warning", "reprimand", "sanction", "closed_without_sanction", "other_communication"].map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <input name="title" required placeholder="Título" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
        <input name="factsDate" type="date" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
        <input name="instructor" placeholder="Instructor/a" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950" />
        <textarea name="facts" required placeholder="Hechos" className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-stone-950 md:col-span-2" />
        <label className="text-sm font-bold text-stone-200"><input name="visibleToEmployee" type="checkbox" className="mr-2" /> Visible para empleado</label>
        <label className="text-sm font-bold text-stone-200"><input name="signatureRequired" type="checkbox" className="mr-2" /> Requiere firma</label>
        <button className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white md:col-span-2">Crear comunicación</button>
      </form>
    </section>
  );
}
