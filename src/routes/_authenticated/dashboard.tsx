import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout, StatCard, RoleGuard } from "@/components/DashboardLayout";
import { Loading, EmptyState } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDate, statusClass } from "@/lib/portal";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Job Seeker Dashboard — JobPortal" },
      { name: "description", content: "Your application summary, profile completeness and recent activity." },
      { property: "og:title", content: "Job Seeker Dashboard — JobPortal" },
      { property: "og:description", content: "Your application summary and recent activity." },
    ],
  }),
  component: SeekerDashboard,
});

function SeekerDashboard() {
  const { user, role, profile } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["seeker-dashboard", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [apps, resumes, skills, education] = await Promise.all([
        supabase
          .from("applications")
          .select("id, status, applied_at, jobs(id, title, location, companies(name))")
          .eq("job_seeker_id", user!.id)
          .order("applied_at", { ascending: false }),
        supabase.from("resumes").select("id", { count: "exact", head: true }).eq("job_seeker_id", user!.id),
        supabase.from("job_seeker_skills").select("skill_id", { count: "exact", head: true }).eq("job_seeker_id", user!.id),
        supabase.from("education").select("id", { count: "exact", head: true }).eq("job_seeker_id", user!.id),
      ]);
      return {
        applications: apps.data ?? [],
        resumeCount: resumes.count ?? 0,
        skillCount: skills.count ?? 0,
        educationCount: education.count ?? 0,
      };
    },
  });

  const apps = data?.applications ?? [];
  const active = apps.filter((a) => !["Rejected", "Selected"].includes(a.status)).length;
  const shortlisted = apps.filter((a) => ["Shortlisted", "Interview", "Selected"].includes(a.status)).length;

  return (
    <RoleGuard allow="job_seeker" role={role}>
      <DashboardLayout
        title={`Welcome, ${profile?.full_name?.split(" ")[0] || "there"} 👋`}
        subtitle="Here's how your job hunt is going"
        actions={<Link to="/jobs" className="btn btn-accent btn-sm">Find jobs</Link>}
      >
        <div className="row g-3 mb-4">
          <div className="col-6 col-lg-3"><StatCard label="Applications" value={apps.length} /></div>
          <div className="col-6 col-lg-3"><StatCard label="In progress" value={active} /></div>
          <div className="col-6 col-lg-3"><StatCard label="Shortlisted+" value={shortlisted} /></div>
          <div className="col-6 col-lg-3"><StatCard label="Resumes" value={data?.resumeCount ?? 0} /></div>
        </div>

        {(data?.resumeCount === 0 || data?.skillCount === 0 || data?.educationCount === 0) && (
          <div className="jp-card p-4 mb-4">
            <h2 className="h6 mb-2">Complete your profile</h2>
            <p className="jp-muted small mb-3">Profiles with skills, education and a resume get noticed faster.</p>
            <div className="d-flex flex-wrap gap-2">
              {data?.educationCount === 0 && <Link to="/profile/edit" className="btn btn-sm btn-outline-navy">Add education</Link>}
              {data?.skillCount === 0 && <Link to="/profile/edit" className="btn btn-sm btn-outline-navy">Add skills</Link>}
              {data?.resumeCount === 0 && <Link to="/resume" className="btn btn-sm btn-outline-navy">Upload resume</Link>}
            </div>
          </div>
        )}

        <div className="jp-card p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="h6 mb-0">Recent applications</h2>
            <Link to="/applications" className="small">View all</Link>
          </div>

          {isLoading ? (
            <Loading rows={2} />
          ) : apps.length === 0 ? (
            <EmptyState
              title="No applications yet"
              message="Browse open jobs and send your first application."
              action={<Link to="/jobs" className="btn btn-accent">Browse jobs</Link>}
            />
          ) : (
            <div className="table-responsive">
              <table className="table jp-table align-middle mb-0">
                <thead>
                  <tr><th>Job</th><th>Company</th><th>Applied</th><th>Status</th><th /></tr>
                </thead>
                <tbody>
                  {apps.slice(0, 5).map((a) => (
                    <tr key={a.id}>
                      <td className="fw-semibold">{a.jobs?.title}</td>
                      <td className="jp-muted">{a.jobs?.companies?.name}</td>
                      <td className="jp-muted small">{formatDate(a.applied_at)}</td>
                      <td><span className={statusClass(a.status)}>{a.status}</span></td>
                      <td className="text-end">
                        <Link to="/applications/$applicationId" params={{ applicationId: a.id }} className="btn btn-sm btn-light border">
                          Details
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
