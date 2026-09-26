import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { DashboardLayout, RoleGuard } from "@/components/DashboardLayout";
import { Loading, EmptyState } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { APPLICATION_STATUSES, formatDate, statusClass } from "@/lib/portal";

export const Route = createFileRoute("/_authenticated/applications/")({
  head: () => ({
    meta: [
      { title: "My Applications — JobPortal" },
      { name: "description", content: "Track every job you applied to and its current recruiter status." },
      { property: "og:title", content: "My Applications — JobPortal" },
      { property: "og:description", content: "Track your job applications and their status." },
    ],
  }),
  component: ApplicationsPage,
});

function ApplicationsPage() {
  const { user, role } = useAuth();
  const [filter, setFilter] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["my-applications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("applications")
        .select("id, status, applied_at, updated_at, jobs(id, title, location, job_type, companies(name))")
        .eq("job_seeker_id", user!.id)
        .order("applied_at", { ascending: false });
      if (error) throw error;
      return rows;
    },
  });

  const apps = (data ?? []).filter((a) => filter === "all" || a.status === filter);

  return (
    <RoleGuard allow="job_seeker" role={role}>
      <DashboardLayout
        title="My Applications"
        subtitle="Every application you have submitted"
        actions={
          <select className="form-select form-select-sm w-auto" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by status">
            <option value="all">All statuses</option>
            {APPLICATION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        }
      >
        <div className="jp-card p-4">
          {isLoading ? (
            <Loading rows={3} />
          ) : apps.length === 0 ? (
            <EmptyState
              title="Nothing here yet"
              message="You have no applications matching this filter."
              action={<Link to="/jobs" className="btn btn-accent">Browse jobs</Link>}
            />
          ) : (
            <div className="table-responsive">
              <table className="table jp-table align-middle mb-0">
                <thead><tr><th>Job</th><th>Company</th><th>Location</th><th>Applied</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {apps.map((a) => (
                    <tr key={a.id}>
                      <td className="fw-semibold">{a.jobs?.title}</td>
                      <td className="jp-muted">{a.jobs?.companies?.name}</td>
                      <td className="jp-muted small">{a.jobs?.location}</td>
                      <td className="jp-muted small">{formatDate(a.applied_at)}</td>
                      <td><span className={statusClass(a.status)}>{a.status}</span></td>
                      <td className="text-end">
                        <Link to="/applications/$applicationId" params={{ applicationId: a.id }} className="btn btn-sm btn-light border">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DashboardLayout>
    </RoleGuard>
  );
}
