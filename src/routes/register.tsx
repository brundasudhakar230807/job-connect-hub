import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { PageShell, Alert } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { dashboardPathFor } from "@/lib/portal";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Register — Join JobPortal as a Seeker or Recruiter" },
      { name: "description", content: "Create a free JobPortal account to apply for jobs or to post vacancies for your company." },
      { property: "og:title", content: "Register — JobPortal" },
      { property: "og:description", content: "Create a free account to apply for jobs or post vacancies." },
    ],
  }),
  component: RegisterPage,
});

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(100),
  email: z.string().trim().email("Enter a valid email address").max(255),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{7,15}$/, "Enter a valid phone number")
    .optional()
    .or(z.literal("")),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

function RegisterPage() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const [accountType, setAccountType] = useState<"job_seeker" | "recruiter">("job_seeker");
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user && role) void navigate({ to: dashboardPathFor(role), replace: true });
  }, [user, role, loading, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords do not match");
      return;
    }
    setBusy(true);
    const { error: authError } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: parsed.data.full_name,
          phone: parsed.data.phone || null,
          role: accountType,
        },
      },
    });
    setBusy(false);
    if (authError) {
      setError(
        authError.message.toLowerCase().includes("already registered")
          ? "An account with this email already exists. Please log in."
          : authError.message,
      );
    }
  }

  return (
    <PageShell>
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-md-9 col-lg-6">
            <div className="jp-card p-4 p-lg-5">
              <h1 className="h3 mb-1">Create your account</h1>
              <p className="jp-muted mb-4">Choose how you want to use JobPortal.</p>

              <div className="row g-2 mb-4">
                {([
                  { key: "job_seeker", title: "Job Seeker", desc: "Apply for jobs" },
                  { key: "recruiter", title: "Recruiter", desc: "Post vacancies" },
                ] as const).map((opt) => (
                  <div className="col-6" key={opt.key}>
                    <button
                      type="button"
                      onClick={() => setAccountType(opt.key)}
                      className={`w-100 text-start p-3 rounded-3 border ${accountType === opt.key ? "border-2 bg-white" : "bg-light"}`}
                      style={accountType === opt.key ? { borderColor: "var(--jp-accent)" } : undefined}
                    >
                      <div className="fw-semibold">{opt.title}</div>
                      <div className="small jp-muted">{opt.desc}</div>
                    </button>
                  </div>
                ))}
              </div>

              <Alert kind="danger" message={error} />

              <form onSubmit={submit} noValidate>
                <div className="mb-3">
                  <label className="form-label" htmlFor="r-name">Full name</label>
                  <input id="r-name" className="form-control" maxLength={100} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
                </div>
                <div className="mb-3">
                  <label className="form-label" htmlFor="r-email">Email address</label>
                  <input id="r-email" type="email" className="form-control" autoComplete="email" maxLength={255} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                </div>
                <div className="mb-3">
                  <label className="form-label" htmlFor="r-phone">Phone (optional)</label>
                  <input id="r-phone" className="form-control" maxLength={15} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <label className="form-label" htmlFor="r-pass">Password</label>
                    <input id="r-pass" type="password" className="form-control" autoComplete="new-password" maxLength={72} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label" htmlFor="r-confirm">Confirm password</label>
                    <input id="r-confirm" type="password" className="form-control" autoComplete="new-password" maxLength={72} value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required />
                  </div>
                </div>
                <button className="btn btn-accent w-100 py-2" disabled={busy}>
                  {busy ? "Creating account…" : `Register as ${accountType === "recruiter" ? "recruiter" : "job seeker"}`}
                </button>
              </form>

              <p className="text-center jp-muted small mt-4 mb-0">
                Already registered? <Link to="/login">Login here</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
