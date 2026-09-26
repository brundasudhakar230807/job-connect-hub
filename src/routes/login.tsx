import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { PageShell, Alert } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { dashboardPathFor } from "@/lib/portal";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login — JobPortal" },
      { name: "description", content: "Sign in to your JobPortal account as a job seeker, recruiter or administrator." },
      { property: "og:title", content: "Login — JobPortal" },
      { property: "og:description", content: "Sign in to your JobPortal account." },
    ],
  }),
  component: LoginPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
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
      setError(parsed.error.issues[0]?.message ?? "Please check your details");
      return;
    }
    setBusy(true);
    const { error: authError } = await supabase.auth.signInWithPassword(parsed.data);
    setBusy(false);
    if (authError) {
      setError(
        authError.message.toLowerCase().includes("invalid")
          ? "Incorrect email or password."
          : authError.message,
      );
    }
  }

  return (
    <PageShell>
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-md-8 col-lg-5">
            <div className="jp-card p-4 p-lg-5">
              <h1 className="h3 mb-1">Welcome back</h1>
              <p className="jp-muted mb-4">Sign in to continue to your dashboard.</p>

              <Alert kind="danger" message={error} />

              <form onSubmit={submit} noValidate>
                <div className="mb-3">
                  <label className="form-label" htmlFor="l-email">Email address</label>
                  <input
                    id="l-email"
                    type="email"
                    className="form-control"
                    autoComplete="email"
                    maxLength={255}
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="form-label" htmlFor="l-pass">Password</label>
                  <input
                    id="l-pass"
                    type="password"
                    className="form-control"
                    autoComplete="current-password"
                    maxLength={72}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                  />
                </div>
                <button className="btn btn-primary w-100 py-2" disabled={busy}>
                  {busy ? "Signing in…" : "Login"}
                </button>
              </form>

              <p className="text-center jp-muted small mt-4 mb-0">
                New here? <Link to="/register">Create an account</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
