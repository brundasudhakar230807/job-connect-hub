import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { PageShell } from "@/components/SiteLayout";
import { useAuth } from "@/hooks/useAuth";
import type { AppRole } from "@/lib/portal";

const MENUS: Record<AppRole, { to: string; label: string; icon: string }[]> = {
  job_seeker: [
    { to: "/dashboard", label: "Dashboard", icon: "🏠" },
    { to: "/profile", label: "My Profile", icon: "👤" },
    { to: "/profile/edit", label: "Edit Profile", icon: "✏️" },
    { to: "/resume", label: "Resume", icon: "📄" },
    { to: "/applications", label: "Applications", icon: "📋" },
    { to: "/jobs", label: "Browse Jobs", icon: "🔎" },
  ],
  recruiter: [
    { to: "/recruiter/dashboard", label: "Dashboard", icon: "🏠" },
    { to: "/recruiter/company", label: "Company Profile", icon: "🏢" },
    { to: "/recruiter/post-job", label: "Post a Job", icon: "➕" },
    { to: "/recruiter/jobs", label: "Manage Jobs", icon: "🗂️" },
    { to: "/recruiter/applicants", label: "All Applicants", icon: "👥" },
  ],
  admin: [
    { to: "/admin", label: "Dashboard", icon: "🏠" },
    { to: "/jobs", label: "Browse Jobs", icon: "🔎" },
  ],
};

export function DashboardLayout({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { role, profile } = useAuth();
  const menu = MENUS[role ?? "job_seeker"];

  return (
    <PageShell>
      <div className="container py-4">
        <div className="row g-4">
          <aside className="col-lg-3">
            <div className="jp-card p-3 mb-3">
              <div className="small jp-muted text-capitalize">{role?.replace("_", " ")}</div>
              <div className="fw-bold text-truncate">{profile?.full_name || "My account"}</div>
              <div className="small jp-muted text-truncate">{profile?.email}</div>
            </div>
            <div className="jp-card p-2 jp-sidebar">
              <div className="list-group list-group-flush gap-1">
                {menu.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="list-group-item"
                    activeProps={{ className: "list-group-item active" }}
                    activeOptions={{ exact: true }}
                  >
                    <span className="me-2">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </aside>

          <section className="col-lg-9">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
              <div>
                <h1 className="h4 mb-1">{title}</h1>
                {subtitle && <p className="jp-muted mb-0 small">{subtitle}</p>}
              </div>
              {actions}
            </div>
            {children}
          </section>
        </div>
      </div>
    </PageShell>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="jp-stat p-3 h-100">
      <div className="jp-stat-value">{value}</div>
      <div className="small fw-semibold">{label}</div>
      {hint && <div className="small jp-muted">{hint}</div>}
    </div>
  );
}

export function RoleGuard({ allow, role, children }: { allow: AppRole; role: AppRole | null; children: ReactNode }) {
  if (role && role !== allow) {
    return (
      <PageShell>
        <div className="container py-5">
          <div className="jp-card p-5 text-center">
            <h1 className="h4">Access denied</h1>
            <p className="jp-muted">This area is only available to {allow.replace("_", " ")} accounts.</p>
            <Link to="/" className="btn btn-primary">Go home</Link>
          </div>
        </div>
      </PageShell>
    );
  }
  return <>{children}</>;
}
