import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout, RoleGuard } from "@/components/DashboardLayout";
import { Loading, EmptyState } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { APPLICATION_STATUSES, formatDate, formatSalary, statusClass } from "@/lib/portal";

export const Route = createFileRoute("/_authenticated/applications/$applicationId")({
  head: () => ({
    meta: [
      { title: "Application Details — JobPortal" },
      { name: "description", content: "See the job you applied to, your cover letter and the current status of your application." },
      { property: "og:title", content: "Application Details — JobPortal" },
      { property: "og:description", content: "Follow the progress of your job application." },
    ],
  }),
  component: ApplicationDetails,
});

const TRACK = ["Applied", "Under Review", "Shortlisted", "Interview", "Selected"] as const;

function ApplicationDetails() {
  const { applicationId } = Route.useParams();
  const { user, role } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["application", applicationId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: row, error } = await supabase
        .from("applications")
        .select(
          "id, status, applied_at, updated_at, cover_letter, resumes(file_name, file_path), jobs(id, title, location, job_type, salary_min, salary_max, experience_min, application_deadline, companies(name, location, website))",
        )
        .eq("id", applicationId)
        .eq("job_seeker_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return row;
    },
  });

  const rejected = data?.status === "Rejected";
  const currentIndex = TRACK.indexOf((data?.status ?? "Applied") as (typeof TRACK)[number]);

  return (
    <RoleGuard allow="job_seeker" role={role}>
      <DashboardLayout
        title="Application details"
        subtitle={data?.jobs?.title ?? ""}
        actions={<Link to="/applications" className="btn btn-sm btn-light border">Back to list</Link>}
      >
        {isLoading ? (
          <Loading rows={3} />
        ) : !data ? (
          <EmptyState
            title="Application not found"
            message="This application does not exist or does not belong to your account."
            action={<Link to="/applications" className="btn btn-accent">My applications</Link>}
          />
        ) : (
          <div className="row g-4">
            <div className="col-lg-7">
              <div className="jp-card p-4 mb-4">
                <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                  <div>
                    <h2 className="h5 mb-1">{data.jobs?.title}</h2>
                    <div className="jp-muted small">
                      {data.jobs?.companies?.name} · {data.jobs?.location} · {data.jobs?.job_type}
                    </div>
                  </div>
                  <span className={statusClass(data.status)}>{data.status}</span>
                </div>
                <div className="small jp-muted">
                  {formatSalary(data.jobs?.salary_min ?? null, data.jobs?.salary_max ?? null)} ·{" "}
                  {data.jobs?.experience_min ?? 0}+ yrs experience
                </div>
                <hr />
                <div className="row small">
                  <div className="col-6 mb-2"><span className="jp-muted d-block">Applied on</span>{formatDate(data.applied_at)}</div>
                  <div className="col-6 mb-2"><span className="jp-muted d-block">Last updated</span>{formatDate(data.updated_at)}</div>
                  <div className="col-6"><span className="jp-muted d-block">Deadline</span>{formatDate(data.jobs?.application_deadline)}</div>
                  <div className="col-6"><span className="jp-muted d-block">Resume sent</span>{data.resumes?.file_name ?? "None attached"}</div>
                </div>
                {data.jobs?.id && (
                  <Link to="/jobs/$jobId" params={{ jobId: data.jobs.id }} className="btn btn-sm btn-outline-navy mt-3">
                    View job posting
                  </Link>
                )}
              </div>

              <div className="jp-card p-4">
                <h3 className="h6 mb-2">Your cover letter</h3>
                <p className="small jp-muted mb-0" style={{ whiteSpace: "pre-line" }}>
                  {data.cover_letter || "No cover letter was submitted with this application."}
                </p>
              </div>
            </div>

            <div className="col-lg-5">
              <div className="jp-card p-4">
                <h3 className="h6 mb-3">Status timeline</h3>
                {rejected ? (
                  <ul className="jp-timeline">
                    <li className="done">
                      <div className="fw-semibold small">Applied</div>
                      <div className="small jp-muted">{formatDate(data.applied_at)}</div>
                    </li>
                    <li className="done">
                      <div className="fw-semibold small text-danger">Rejected</div>
                      <div className="small jp-muted">{formatDate(data.updated_at)}</div>
                    </li>
                  </ul>
                ) : (
                  <ul className="jp-timeline">
                    {TRACK.map((step, i) => (
                      <li key={step} className={i <= currentIndex ? "done" : ""}>
                        <div className={`small ${i <= currentIndex ? "fw-semibold" : "jp-muted"}`}>{step}</div>
                        {i === currentIndex && <div className="small jp-muted">Updated {formatDate(data.updated_at)}</div>}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="small jp-muted mb-0">
                  Recruiters move applications through these stages: {APPLICATION_STATUSES.join(" → ")}.
                </p>
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    </RoleGuard>
  );
}
