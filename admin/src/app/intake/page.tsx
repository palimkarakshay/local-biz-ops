import { LeadForm } from "@/components/forms/lead-form";

export const metadata = { title: "Intake demo — local-biz-ops" };

export default function IntakePage() {
  return (
    <>
      <h1>Intake demo</h1>
      <p className="lede">
        This is the same lead payload the marketing site&rsquo;s contact form posts to{" "}
        <code>/api/leads</code>. Submitting it lands the lead in the CRM and fires the templated
        follow-up.
      </p>
      <LeadForm />
    </>
  );
}
