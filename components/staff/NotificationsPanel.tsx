import type { StaffNotification } from "@/lib/admin-kiosko/repositories/staff-notifications.repository";

export function NotificationsPanel({ notifications, action }: { notifications: StaffNotification[]; action?: (formData: FormData) => Promise<void> }) {
  const unread = notifications.filter((item) => !item.read).length;
  return (
    <section className="grid gap-3">
      <div className="rounded-[1.4rem] border border-white/10 bg-[#151515] p-5">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-[#f2c6bb]">Notificaciones</p>
        <p className="mt-2 text-3xl font-black text-white">{unread} sin leer</p>
        {action ? <form action={action} className="mt-3"><input type="hidden" name="intent" value="read_all" /><button className="rounded-full border border-white/10 bg-white/8 px-4 py-2 text-xs font-black uppercase text-white">Marcar todas como leídas</button></form> : null}
      </div>
      {notifications.map((notification) => (
        <article key={notification.id} className="rounded-2xl border border-white/10 bg-[#151515] p-4">
          <p className="font-black text-white">{notification.title} · {notification.priority}</p>
          <p className="mt-1 text-sm text-stone-300">{notification.message}</p>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[#f2c6bb]">{notification.notification_type} · {notification.read ? "leída" : "pendiente"}</p>
          {action && !notification.read ? (
            <form action={action} className="mt-3">
              <input type="hidden" name="intent" value="read_one" />
              <input type="hidden" name="notificationId" value={notification.id} />
              <button className="rounded-full border border-[#d94b2b] bg-[#d94b2b] px-4 py-2 text-xs font-black uppercase text-white">Marcar leída</button>
            </form>
          ) : null}
        </article>
      ))}
      {!notifications.length ? <p className="rounded-2xl border border-white/10 bg-[#151515] p-5 text-stone-300">No hay notificaciones.</p> : null}
    </section>
  );
}
