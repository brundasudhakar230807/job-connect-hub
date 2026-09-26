import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { DashboardLayout, RoleGuard } from "@/components/DashboardLayout";
import { Loading, EmptyState } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { APPLICATION_STATUSES, formatDate, statusClass } from "@/lib/portal";

export const Route = createFileRoute("/_authenticated/recruiter/applicants/")({
  head: () => ({
    meta: [
      { title: "All Applicants — JobPortal" },
      { name: "description", content: "Every candidate who applied to your company's jobs, with status filters." },
      { property: "og:title", content: "All Applicants — JobPortal" },
      { property: "og:description", content: "Review every candidate who applied to your jobs." },
    ],
  }),
  component: AllApplicants,
});

function AllApplicants() {
  const { user, role } = useAuth();
  const [status, setStatus] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["recruiter-applicants", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: recruiter } = await supabase.from("recruiters").select("company_id").eq("id", user!.id).maybeSingle();
      if (!recruiter?.company_id) return [];
      const { data: jobs } = await supabase.from("jobs").select("id").eq("company_id", recruiter.company_id);
      const ids = (jobs ?? []).map((j) => j.id);
      if (!ids.length) return [];
      const { data: apps } = await supabase
        .from("applications")
        .select("id, status, applied_at, jobs(id, title), job_seekers:job_seeker_id(profiles(full_name, email))")
        .in("job_id", ids)
        .order("applied_at", { ascending: false });
      return apps ?? [];
    },
  });

  const rows = (data ?? []).filter((a) => status === "all" || a.status === status);

  return (
    <RoleGuard allow="recruiter" role={role}>
      <DashboardLayout
        title="Applicants"
        subtitle="Candidates across all your job postings"
        actions={
          <select className="form-select form-select-sm w-auto" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
            <option value="all">All statuses</option>
            {APPLICATION_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        }
      >
        <div className="jp-card p-4">
          {isLoading ? (
            <Loading rows={3} />
          ) : rows.length === 0 ? (
            <EmptyState
              title="No applicants yet"
              message="Once candidates apply to your jobs they will appear here."
              action={<Link to="/recruiter/post-job" className="btn btn-accent">Post a job</Link>}
            />
          ) : (
            <div className="table-responsive">
              <table className="table jp-table align-middle mb-0">
                <thead><tr><th>Candidate</th><th>Email</th><th>Job</th><th>Applied</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {rows.map((a) => (
                    <tr key={a.id}>
                      <td className="fw-semibold">{a.job_seekers?.profiles?.full_name ?? "Candidate"}</td>
                      <td className="small jp-muted">{a.job_seekers?.profiles?.email}</td>
                      <td className="small jp-muted">{a.jobs?.title}</td>
                      <td className="small jp-muted">{formatDate(a.applied_at)}</td>
                      <td><span className={statusClass(a.status)}>{a.status}</span></td>
                      <td className="text-end">
                        <Link to="/recruiter/application/$applicationId" params={{ applicationId: a.id }} className="btn btn-sm btn-light border">
                          Review
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
