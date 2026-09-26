import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { PageShell, PageHeader, Alert } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact JobPortal — Support for Seekers and Recruiters" },
      { name: "description", content: "Send a message to the JobPortal team for help with your account, job postings or applications." },
      { property: "og:title", content: "Contact JobPortal" },
      { property: "og:description", content: "Send a message to the JobPortal team." },
    ],
  }),
  component: Contact,
});

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(100),
  email: z.string().trim().email("Enter a valid email address").max(255),
  subject: z.string().trim().min(3, "Please add a subject").max(150),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(2000),
});

function Contact() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    setBusy(true);
    const { error: dbError } = await supabase.from("contact_messages").insert(parsed.data);
    setBusy(false);
    if (dbError) {
      setError("Could not send your message. Please try again.");
      return;
    }
    setSent(true);
    setForm({ name: "", email: "", subject: "", message: "" });
  }

  return (
    <PageShell>
      <PageHeader title="Contact us" subtitle="Questions about your account, a job posting or an application?" />
      <div className="container py-5">
        <div className="row g-4">
          <div className="col-lg-7">
            <form className="jp-card p-4 p-lg-5" onSubmit={submit}>
              {sent && <Alert kind="success" message="Thanks! Your message has been received." />}
              <Alert kind="danger" message={error} />

              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label" htmlFor="c-name">Full name</label>
                  <input id="c-name" className="form-control" maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="c-email">Email</label>
                  <input id="c-email" type="email" className="form-control" maxLength={255} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                </div>
                <div className="col-12">
                  <label className="form-label" htmlFor="c-subject">Subject</label>
                  <input id="c-subject" className="form-control" maxLength={150} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
                </div>
                <div className="col-12">
                  <label className="form-label" htmlFor="c-message">Message</label>
                  <textarea id="c-message" className="form-control" rows={5} maxLength={2000} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required />
                  <div className="form-text">{form.message.length}/2000</div>
                </div>
              </div>

              <button className="btn btn-accent mt-4 px-4" disabled={busy}>
                {busy ? "Sending…" : "Send message"}
              </button>
            </form>
          </div>

          <div className="col-lg-5">
            <div className="jp-card p-4 p-lg-5 h-100">
              <h2 className="h5 mb-3">Reach us</h2>
              <ul className="list-unstyled jp-muted small mb-4">
                <li className="mb-2">✉️ support@jobportal.example</li>
                <li className="mb-2">☎️ +91 90000 00000</li>
                <li>🏢 Department of Computer Applications, Campus Block A</li>
              </ul>
              <h3 className="h6">Response time</h3>
              <p className="jp-muted small mb-0">
                Messages are stored in the portal database and reviewed by administrators, usually
                within two working days.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
