import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout, StatCard, RoleGuard } from "@/components/DashboardLayout";
import { Loading, EmptyState } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDate, statusClass } from "@/lib/portal";

export const Route = createFileRoute("/_authenticated/recruiter/dashboard")({
  head: () => ({
    meta: [
      { title: "Recruiter Dashboard — JobPortal" },
      { name: "description", content: "Track your open roles, incoming applications and hiring pipeline." },
      { property: "og:title", content: "Recruiter Dashboard — JobPortal" },
      { property: "og:description", content: "Your open roles and hiring pipeline at a glance." },
    ],
  }),
  component: RecruiterDashboard,
});

function RecruiterDashboard() {
  const { user, role, profile } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["recruiter-dashboard", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: recruiter } = await supabase
        .from("recruiters")
        .select("company_id, designation, companies(name)")
        .eq("id", user!.id)
        .maybeSingle();

      if (!recruiter?.company_id) return { recruiter, jobs: [], applications: [] };

      const { data: jobs } = await supabase
        .from("jobs")
        .select("id, title, status, posted_date, location")
        .eq("company_id", recruiter.company_id)
        .order("posted_date", { ascending: false });

      const jobIds = (jobs ?? []).map((j) => j.id);
      const { data: applications } = jobIds.length
        ? await supabase
            .from("applications")
            .select("id, status, applied_at, job_id, jobs(title), job_seekers:job_seeker_id(profiles(full_name))")
            .in("job_id", jobIds)
            .order("applied_at", { ascending: false })
        : { data: [] };

      return { recruiter, jobs: jobs ?? [], applications: applications ?? [] };
    },
  });

  const jobs = data?.jobs ?? [];
  const apps = data?.applications ?? [];
  const openJobs = jobs.filter((j) => j.status === "Open").length;
  const newApps = apps.filter((a) => a.status === "Applied").length;
  const shortlisted = apps.filter((a) => ["Shortlisted", "Interview", "Selected"].includes(a.status)).length;

  return (
    <RoleGuard allow="recruiter" role={role}>
      <DashboardLayout
        title={`Hi, ${profile?.full_name?.split(" ")[0] || "recruiter"} 👋`}
        subtitle={data?.recruiter?.companies?.name ?? "Set up your company profile to start posting jobs"}
        actions={<Link to="/recruiter/post-job" className="btn btn-accent btn-sm">Post a job</Link>}
      >
        {isLoading ? (
          <Loading rows={3} />
        ) : !data?.recruiter?.company_id ? (
          <EmptyState
            title="Create your company profile"
            message="Jobs are posted under a company. Add yours to get started."
            action={<Link to="/recruiter/company" className="btn btn-accent">Add company profile</Link>}
          />
        ) : (
          <>
            <div className="row g-3 mb-4">
              <div className="col-6 col-lg-3"><StatCard label="Total jobs" value={jobs.length} /></div>
              <div className="col-6 col-lg-3"><StatCard label="Open roles" value={openJobs} /></div>
              <div className="col-6 col-lg-3"><StatCard label="Applications" value={apps.length} /></div>
              <div className="col-6 col-lg-3"><StatCard label="New" value={newApps} hint="awaiting review" /></div>
            </div>

            <div className="jp-card p-4 mb-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h2 className="h6 mb-0">Latest applications</h2>
                <Link to="/recruiter/applicants" className="small">View all</Link>
              </div>
              {apps.length === 0 ? (
                <p className="jp-muted small mb-0">No applications yet.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table jp-table align-middle mb-0">
                    <thead><tr><th>Candidate</th><th>Job</th><th>Applied</th><th>Status</th><th /></tr></thead>
                    <tbody>
                      {apps.slice(0, 6).map((a) => (
                        <tr key={a.id}>
                          <td className="fw-semibold">{a.job_seekers?.profiles?.full_name ?? "Candidate"}</td>
                          <td className="jp-muted">{a.jobs?.title}</td>
                          <td className="jp-muted small">{formatDate(a.applied_at)}</td>
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

            <div className="jp-card p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h2 className="h6 mb-0">Your job postings</h2>
                <Link to="/recruiter/jobs" className="small">Manage jobs</Link>
              </div>
              {jobs.length === 0 ? (
                <p className="jp-muted small mb-0">You haven't posted a job yet.</p>
              ) : (
                <ul className="list-group list-group-flush">
                  {jobs.slice(0, 5).map((j) => (
                    <li key={j.id} className="list-group-item px-0 d-flex justify-content-between align-items-center">
                      <div>
                        <div className="fw-semibold small">{j.title}</div>
                        <div className="small jp-muted">{j.location} · posted {formatDate(j.posted_date)}</div>
                      </div>
                      <div className="d-flex gap-2 align-items-center">
                        <span className="badge text-bg-light border">{j.status}</span>
                        <Link to="/recruiter/applicants/$jobId" params={{ jobId: j.id }} className="btn btn-sm btn-outline-navy">
                          Applicants
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </DashboardLayout>
    </RoleGuard>
  );
}
