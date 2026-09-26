import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { DashboardLayout, StatCard, RoleGuard } from "@/components/DashboardLayout";
import { Alert, Loading } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDate, statusClass } from "@/lib/portal";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — JobPortal" },
      { name: "description", content: "Platform overview: users, companies, job postings and applications." },
      { property: "og:title", content: "Admin Dashboard — JobPortal" },
      { property: "og:description", content: "Manage users, companies, jobs and applications." },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const [users, companies, jobs, applications, recentJobs, recentApps] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("companies").select("id", { count: "exact", head: true }),
        supabase.from("jobs").select("id", { count: "exact", head: true }),
        supabase.from("applications").select("id", { count: "exact", head: true }),
        supabase.from("jobs").select("id, title, status, posted_date, location, companies(name)").order("posted_date", { ascending: false }).limit(10),
        supabase.from("applications").select("id, status, applied_at, jobs(title)").order("applied_at", { ascending: false }).limit(10),
      ]);
      return {
        users: users.count ?? 0,
        companies: companies.count ?? 0,
        jobs: jobs.count ?? 0,
        applications: applications.count ?? 0,
        recentJobs: recentJobs.data ?? [],
        recentApps: recentApps.data ?? [],
      };
    },
  });

  async function setJobStatus(id: string, status: string) {
    setError("");
    const { error: upErr } = await supabase.from("jobs").update({ status }).eq("id", id);
    if (upErr) { setError(upErr.message); return; }
    setMessage(`Job marked as ${status}.`);
    void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
  }

  return (
    <RoleGuard allow="admin" role={role}>
      <DashboardLayout title="Admin Dashboard" subtitle="Platform-wide overview and moderation">
        <Alert kind="success" message={message} />
        <Alert kind="danger" message={error} />

        {isLoading ? (
          <Loading rows={3} />
        ) : (
          <>
            <div className="row g-3 mb-4">
              <div className="col-6 col-lg-3"><StatCard label="Users" value={data?.users ?? 0} /></div>
              <div className="col-6 col-lg-3"><StatCard label="Companies" value={data?.companies ?? 0} /></div>
              <div className="col-6 col-lg-3"><StatCard label="Jobs" value={data?.jobs ?? 0} /></div>
              <div className="col-6 col-lg-3"><StatCard label="Applications" value={data?.applications ?? 0} /></div>
            </div>

            <div className="jp-card p-4 mb-4">
              <h2 className="h6 mb-3">Latest job postings</h2>
              <div className="table-responsive">
                <table className="table jp-table align-middle mb-0">
                  <thead><tr><th>Job</th><th>Company</th><th>Posted</th><th>Status</th><th /></tr></thead>
                  <tbody>
                    {data?.recentJobs.map((j) => (
                      <tr key={j.id}>
                        <td className="fw-semibold">{j.title}</td>
                        <td className="jp-muted small">{j.companies?.name}</td>
                        <td className="jp-muted small">{formatDate(j.posted_date)}</td>
                        <td><span className="badge text-bg-light border">{j.status}</span></td>
                        <td className="text-end">
                          <div className="d-inline-flex gap-2">
                            <Link to="/jobs/$jobId" params={{ jobId: j.id }} className="btn btn-sm btn-light border">View</Link>
                            {j.status === "Open" ? (
                              <button className="btn btn-sm btn-outline-danger" onClick={() => void setJobStatus(j.id, "Closed")}>Deactivate</button>
                            ) : (
                              <button className="btn btn-sm btn-outline-navy" onClick={() => void setJobStatus(j.id, "Open")}>Reactivate</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="jp-card p-4">
              <h2 className="h6 mb-3">Latest applications</h2>
              <div className="table-responsive">
                <table className="table jp-table align-middle mb-0">
                  <thead><tr><th>Job</th><th>Applied</th><th>Status</th></tr></thead>
                  <tbody>
                    {data?.recentApps.map((a) => (
                      <tr key={a.id}>
                        <td className="fw-semibold">{a.jobs?.title}</td>
                        <td className="jp-muted small">{formatDate(a.applied_at)}</td>
                        <td><span className={statusClass(a.status)}>{a.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </DashboardLayout>
    </RoleGuard>
  );
}
