import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { dashboardPathFor, initials } from "@/lib/portal";

const publicLinks = [
  { to: "/", label: "Home" },
  { to: "/jobs", label: "Browse Jobs" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteNavbar() {
  const { user, profile, role, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    setOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOut();
    void navigate({ to: "/", replace: true });
  }

  return (
    <nav className="navbar navbar-expand-lg jp-navbar sticky-top py-2">
      <div className="container">
        <Link to="/" className="navbar-brand jp-brand d-flex align-items-center">
          <span className="jp-brand-mark">JP</span>
          JobPortal
        </Link>

        <button
          className="navbar-toggler border-0"
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="navbar-toggler-icon" />
        </button>

        <div className={`collapse navbar-collapse${open ? " show" : ""}`}>
          <ul className="navbar-nav mx-lg-auto mb-2 mb-lg-0">
            {publicLinks.map((link) => (
              <li className="nav-item" key={link.to}>
                <Link to={link.to} className="nav-link" activeProps={{ className: "nav-link active" }} activeOptions={{ exact: link.to === "/" }}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          {user ? (
            <div className="d-flex align-items-center gap-2 position-relative">
              <Link to={dashboardPathFor(role)} className="btn btn-outline-navy btn-sm">
                Dashboard
              </Link>
              <button
                className="btn btn-light btn-sm d-flex align-items-center gap-2 border"
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
              >
                <span
                  className="rounded-circle bg-primary text-white d-inline-grid"
                  style={{ width: 28, height: 28, placeItems: "center", fontSize: 12, fontWeight: 700 }}
                >
                  {initials(profile?.full_name)}
                </span>
                <span className="d-none d-sm-inline text-truncate" style={{ maxWidth: 120 }}>
                  {profile?.full_name || "Account"}
                </span>
              </button>
              {menuOpen && (
                <div
                  className="position-absolute end-0 top-100 mt-2 bg-white border rounded-3 shadow p-2"
                  style={{ minWidth: 200, zIndex: 1040 }}
                >
                  <div className="px-2 py-1 small jp-muted text-capitalize">
                    {role?.replace("_", " ") ?? "member"}
                  </div>
                  {role === "job_seeker" && (
                    <>
                      <Link to="/profile" className="dropdown-item rounded py-2">My Profile</Link>
                      <Link to="/applications" className="dropdown-item rounded py-2">My Applications</Link>
                      <Link to="/resume" className="dropdown-item rounded py-2">Resume</Link>
                    </>
                  )}
                  {role === "recruiter" && (
                    <>
                      <Link to="/recruiter/company" className="dropdown-item rounded py-2">Company Profile</Link>
                      <Link to="/recruiter/jobs" className="dropdown-item rounded py-2">Manage Jobs</Link>
                    </>
                  )}
                  {role === "admin" && (
                    <Link to="/admin" className="dropdown-item rounded py-2">Admin Dashboard</Link>
                  )}
                  <hr className="my-1" />
                  <button className="dropdown-item rounded py-2 text-danger" onClick={handleSignOut}>
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="d-flex gap-2">
              <Link to="/login" className="btn btn-outline-navy btn-sm px-3">Login</Link>
              <Link to="/register" className="btn btn-accent btn-sm px-3">Register</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer className="jp-footer mt-5 py-4">
      <div className="container">
        <div className="row g-4">
          <div className="col-lg-4">
            <div className="d-flex align-items-center text-white fw-bold fs-5 mb-2">
              <span className="jp-brand-mark">JP</span> JobPortal
            </div>
            <p className="small mb-0">
              A full-stack job portal &amp; recruitment system connecting job seekers with recruiters.
            </p>
          </div>
          <div className="col-6 col-lg-2">
            <h6 className="text-white">Explore</h6>
            <ul className="list-unstyled small mb-0">
              <li><Link to="/jobs">Browse Jobs</Link></li>
              <li><Link to="/about">About</Link></li>
              <li><Link to="/contact">Contact</Link></li>
            </ul>
          </div>
          <div className="col-6 col-lg-2">
            <h6 className="text-white">Account</h6>
            <ul className="list-unstyled small mb-0">
              <li><Link to="/login">Login</Link></li>
              <li><Link to="/register">Register</Link></li>
            </ul>
          </div>
          <div className="col-lg-4">
            <h6 className="text-white">Project</h6>
            <p className="small mb-0">
              BCA final-year project — React, Node server runtime, REST APIs and a relational
              PostgreSQL database with role-based authentication.
            </p>
          </div>
        </div>
        <hr className="border-secondary my-3" />
        <div className="small text-center">© {new Date().getFullYear()} JobPortal. All rights reserved.</div>
      </div>
    </footer>
  );
}

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="d-flex flex-column min-vh-100">
      <SiteNavbar />
      <main className="flex-grow-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="bg-white border-bottom">
      <div className="container py-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div>
            <h1 className="h3 mb-1">{title}</h1>
            {subtitle && <p className="jp-muted mb-0">{subtitle}</p>}
          </div>
          {actions}
        </div>
      </div>
    </div>
  );
}

export function Alert({ kind, message }: { kind: "success" | "danger" | "info" | "warning"; message: string }) {
  if (!message) return null;
  return <div className={`alert alert-${kind} py-2 small mb-3`}>{message}</div>;
}

export function Modal({
  title,
  children,
  onClose,
  footer,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
}) {
  return (
    <div className="jp-modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div
        className="bg-white rounded-4 shadow-lg w-100"
        style={{ maxWidth: 520 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="d-flex justify-content-between align-items-center px-4 py-3 border-bottom">
          <h5 className="mb-0">{title}</h5>
          <button className="btn-close" aria-label="Close" onClick={onClose} />
        </div>
        <div className="px-4 py-3">{children}</div>
        {footer && <div className="px-4 py-3 border-top d-flex justify-content-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function Loading({ rows = 3 }: { rows?: number }) {
  return (
    <div className="d-grid gap-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="jp-skeleton" style={{ height: 88 }} />
      ))}
    </div>
  );
}

export function EmptyState({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return (
    <div className="jp-card text-center p-5">
      <h5 className="mb-2">{title}</h5>
      <p className="jp-muted mb-3">{message}</p>
      {action}
    </div>
  );
}
