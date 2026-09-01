import { requireUser } from "@/lib/session";
import { withTenantContext } from "@/lib/tenant";

export default async function DashboardPage() {
  const user = await requireUser();

  const todayAppointments = await withTenantContext(user.companyId, (tx) => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    return tx.appointment.findMany({
      where: { scheduledAt: { gte: start, lte: end } },
      include: { customer: true, service: true, barber: true },
      orderBy: { scheduledAt: "asc" },
    });
  });

  return (
    <main className="p-6 font-sans">
      <h1 className="font-display text-xl font-semibold mb-1">Olá, {user.name}</h1>
      <p className="text-sm text-muted mb-6">{todayAppointments.length} agendamento(s) hoje</p>

      <div className="space-y-2">
        {todayAppointments.map((a) => (
          <div key={a.id} className="bg-ink-soft border border-ink-line rounded-xl p-3">
            <div className="text-sm font-semibold">{a.customer.name}</div>
            <div className="text-xs text-muted">
              {a.service.name} · {a.barber.name} · {a.status}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
