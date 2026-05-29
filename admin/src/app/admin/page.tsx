import Link from "next/link";
import { redirect } from "next/navigation";
import { readLeads } from "@/lib/crm";
import { opsConfig } from "@/lib/ops-config";
import type { CrmLead } from "@/lib/schemas";
import { hasAdminSession } from "@/lib/auth";
import { fireFollowUpAction, fireReviewRequestAction, markJobCompleteAction, setStageAction } from "./actions";

export const dynamic = "force-dynamic";

function stepBadge(status: string) {
  const cls = status === "sent" ? "ok" : status === "pending" ? "pending" : "";
  return <span className={`badge ${cls}`}>{status}</span>;
}

function intentBadge(intent: string) {
  const cfg = opsConfig.intents.find((i) => i.value === intent);
  const cls = cfg?.priority === "P1" ? "p1" : "";
  return <span className={`badge ${cls}`}>{cfg?.label ?? intent}</span>;
}

function lastEvent(lead: CrmLead) {
  const e = lead.history[lead.history.length - 1];
  if (!e) return null;
  return (
    <div className="small muted">
      {e.type}
      {e.note ? ` · ${e.note}` : ""}
    </div>
  );
}

export default async function AdminPage() {
  // The CRM renders lead PII and exposes the mutating server actions — only an
  // authenticated operator may see it. No valid session → bounce to login.
  if (!(await hasAdminSession())) {
    redirect("/admin/login");
  }
  const leads = (await readLeads()).slice().reverse();
  const activeFlags = Object.entries(opsConfig.compliance.flags)
    .filter(([, on]) => on)
    .map(([flag]) => flag);

  return (
    <>
      <h1>CRM</h1>
      <p className="lede">
        {leads.length} lead{leads.length === 1 ? "" : "s"} · vertical:{" "}
        <strong>{opsConfig.label}</strong> (<code>{opsConfig.vertical}</code>). Follow-ups fire on
        intake; review requests go to {opsConfig.reviewLink.platform} when a job is marked complete.
      </p>
      {activeFlags.length > 0 ? (
        <p className="small muted">
          Compliance flags:{" "}
          {activeFlags.map((f) => (
            <span key={f} className="badge" style={{ marginRight: 4 }}>
              {f}
            </span>
          ))}
        </p>
      ) : null}

      {leads.length === 0 ? (
        <div className="card">
          <p>No leads yet.</p>
          <p>
            <Link className="btn" href="/intake">
              Submit a demo lead
            </Link>
          </p>
        </div>
      ) : (
        <div className="card" style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Lead</th>
                <th>Intent</th>
                <th>Stage</th>
                <th>Follow-up</th>
                <th>Review</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <strong>{lead.name}</strong>
                    <div className="small muted">{lead.email}</div>
                    {lead.phone ? <div className="small muted">{lead.phone}</div> : null}
                    {lastEvent(lead)}
                  </td>
                  <td>{intentBadge(lead.intent)}</td>
                  <td>
                    <form action={setStageAction} className="row-actions">
                      <input type="hidden" name="id" value={lead.id} />
                      <select name="stage" defaultValue={lead.stage} aria-label="Stage">
                        {opsConfig.stages.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                      <button type="submit" className="secondary">
                        Set
                      </button>
                    </form>
                  </td>
                  <td>
                    {stepBadge(lead.followUp.status)}
                    <form action={fireFollowUpAction} className="row-actions" style={{ marginTop: 6 }}>
                      <input type="hidden" name="id" value={lead.id} />
                      <button type="submit" className="secondary">
                        Send
                      </button>
                    </form>
                  </td>
                  <td>
                    {stepBadge(lead.reviewRequest.status)}
                    <form action={fireReviewRequestAction} className="row-actions" style={{ marginTop: 6 }}>
                      <input type="hidden" name="id" value={lead.id} />
                      <button type="submit" className="secondary">
                        Send
                      </button>
                    </form>
                  </td>
                  <td>
                    <form action={markJobCompleteAction} className="row-actions">
                      <input type="hidden" name="id" value={lead.id} />
                      <button type="submit">Mark job complete</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
