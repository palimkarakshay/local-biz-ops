import Link from "next/link";
import { opsConfig } from "@/lib/ops-config";
import { siteConfig } from "@/lib/site-config";

export default function Home() {
  return (
    <>
      <h1>Ops console</h1>
      <p className="lede">
        The operations kit that sits next to {siteConfig.business.name}&rsquo;s marketing site. It
        covers what happens <em>after</em> the website: lead intake → CRM → follow-up → review
        request → invoicing. Configured for the <code>{opsConfig.vertical}</code> vertical.
      </p>

      <div className="grid-2">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Submit a lead</h2>
          <p className="small muted">
            The same payload the marketing site&rsquo;s contact form (or n8n workflow a) POSTs to{" "}
            <code>/api/leads</code>. It lands in the CRM and fires the follow-up.
          </p>
          <Link className="btn" href="/intake">
            Open intake demo
          </Link>
        </div>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Work the pipeline</h2>
          <p className="small muted">
            View leads, advance stages, resend a follow-up, and mark a job complete — which fires
            the review request.
          </p>
          <Link className="btn" href="/admin">
            Open CRM
          </Link>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>v0.1 path</h2>
        <ol className="small">
          <li>
            A lead is submitted (intake demo, the marketing site, or n8n workflow a) → lands in the
            CRM at stage <code>{opsConfig.stages[0].id}</code>.
          </li>
          <li>The templated follow-up fires immediately (Resend, or simulated with no API key).</li>
          <li>
            The review-request step is queued; marking the job complete fires it (n8n workflow b
            does this from the field).
          </li>
        </ol>
      </div>
    </>
  );
}
