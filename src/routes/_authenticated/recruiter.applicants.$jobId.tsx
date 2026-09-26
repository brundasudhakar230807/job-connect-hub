import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout, StatCard, RoleGuard } from "@/components/DashboardLayout";
import { Loading, EmptyState } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDate, statusClass } from "@/lib/portal";

export const Route = createFileRoute("/_authenticated/recruiter/applicants/$jobId")({
  head: () => ({
    meta: [
      { title: "Job Applicants — JobPortal" },
      { name: "description", content: "Candidates who applied to this specific vacancy." },
      { property: "og:title", content: "Job Applicants — JobPortal" },
      { property: "og:description", content: "Candidates who applied to this vacancy." },
    ],
  }),
  component: JobApplicants,
});

function JobApplicants() {
  const { jobId } = Route.useParams();
  const { role } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["job-applicants", jobId],
    queryFn: async () => {
      const [job, apps] = await Promise.all([
        supabase.from("jobs").select("id, title, location, status, openings").eq("id", jobId).maybeSingle(),
        supabase
          .from("applications")
          .select("id, status, applied_at, profiles:job_seeker_id(full_name, email, phone), job_seekers:job_seeker_id(headline, experience_years, location)")
          .eq("job_id", jobId)
          .order("applied_at", { ascending: false }),
      ]);
      return { job: job.data, apps: apps.data ?? [] };
    },
  });

  const apps = data?.apps ?? [];
  const shortlisted = apps.filter((a) => ["Shortlisted", "Interview", "Selected"].includes(a.status)).length;

  return (
    <RoleGuard allow="recruiter" role={role}>
      <DashboardLayout
        title={data?.job?.title ?? "Applicants"}
        subtitle={data?.job ? `${data.job.location} · ${data.job.status} · ${data.job.openings} opening(s)` : ""}
        actions={<Link to="/recruiter/jobs" className="btn btn-sm btn-light border">Back to jobs</Link>}
      >
        {isLoading ? (
          <Loading rows={3} />
        ) : (
          <>
            <div className="row g-3 mb-4">
              <div className="col-6 col-lg-4"><StatCard label="Applicants" value={apps.length} /></div>
              <div className="col-6 col-lg-4"><StatCard label="Shortlisted+" value={shortlisted} /></div>
              <div className="col-6 col-lg-4"><StatCard label="New" value={apps.filter((a) => a.status === "Applied").length} /></div>
            </div>

            <div className="jp-card p-4">
              {apps.length === 0 ? (
                <EmptyState title="No applicants yet" message="Share the job link to attract candidates." />
              ) : (
                <div className="table-responsive">
                  <table className="table jp-table align-middle mb-0">
                    <thead><tr><th>Candidate</th><th>Headline</th><th>Experience</th><th>Applied</th><th>Status</th><th /></tr></thead>
                    <tbody>
                      {apps.map((a) => (
                        <tr key={a.id}>
                          <td>
                            <div className="fw-semibold">{a.profiles?.full_name ?? "Candidate"}</div>
                            <div className="small jp-muted">{a.profiles?.email}</div>
                          </td>
                          <td className="small jp-muted">{a.job_seekers?.headline ?? "—"}</td>
                          <td className="small jp-muted">{a.job_seekers?.experience_years ?? 0} yrs</td>
                          <td className="small jp-muted">{formatDate(a.applied_at)}</td>
                          <td><span className={statusClass(a.status)}>{a.status}</span></td>
                          <td className="text-end">
                            <Link to="/recruiter/application/$applicationId" params={{ applicationId: a.id }} className="btn btn-sm btn-outline-navy">
                              View profile
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </DashboardLayout>
    </RoleGuard>
  );
}
