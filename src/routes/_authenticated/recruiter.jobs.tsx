import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { DashboardLayout, RoleGuard } from "@/components/DashboardLayout";
import { Alert, Loading, EmptyState, Modal } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDate, formatSalary } from "@/lib/portal";

export const Route = createFileRoute("/_authenticated/recruiter/jobs")({
  head: () => ({
    meta: [
      { title: "Manage Jobs — JobPortal" },
      { name: "description", content: "Edit, close or delete the vacancies your company has posted." },
      { property: "og:title", content: "Manage Jobs — JobPortal" },
      { property: "og:description", content: "Edit, close or delete your company's job postings." },
    ],
  }),
  component: ManageJobsPage,
});

function ManageJobsPage() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirm, setConfirm] = useState<{ id: string; title: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["recruiter-jobs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: recruiter } = await supabase.from("recruiters").select("company_id").eq("id", user!.id).maybeSingle();
      if (!recruiter?.company_id) return { companyId: null, jobs: [] };
      const { data: jobs } = await supabase
        .from("jobs")
        .select("id, title, location, job_type, status, posted_date, deadline, salary_min, salary_max, applications(count)")
        .eq("company_id", recruiter.company_id)
        .order("posted_date", { ascending: false });
      return { companyId: recruiter.company_id, jobs: jobs ?? [] };
    },
  });

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["recruiter-jobs"] });
    void queryClient.invalidateQueries({ queryKey: ["recruiter-dashboard"] });
  }

  async function setStatus(id: string, status: string) {
    setError("");
    const { error: upErr } = await supabase.from("jobs").update({ status }).eq("id", id);
    if (upErr) { setError(upErr.message); return; }
    setMessage(`Job marked as ${status}.`);
    refresh();
  }

  async function remove(id: string) {
    setError("");
    const { error: delErr } = await supabase.from("jobs").delete().eq("id", id);
    setConfirm(null);
    if (delErr) { setError(delErr.message); return; }
    setMessage("Job deleted.");
    refresh();
  }

  const jobs = data?.jobs ?? [];

  return (
    <RoleGuard allow="recruiter" role={role}>
      <DashboardLayout
        title="Manage Jobs"
        subtitle="Everything your company has posted"
        actions={<Link to="/recruiter/post-job" className="btn btn-accent btn-sm">Post a job</Link>}
      >
        <Alert kind="success" message={message} />
        <Alert kind="danger" message={error} />

        <div className="jp-card p-4">
          {isLoading ? (
            <Loading rows={3} />
          ) : !data?.companyId ? (
            <EmptyState
              title="Company profile required"
              message="Add your company details before posting jobs."
              action={<Link to="/recruiter/company" className="btn btn-accent">Add company profile</Link>}
            />
          ) : jobs.length === 0 ? (
            <EmptyState
              title="No jobs posted"
              message="Publish your first vacancy and start receiving applications."
              action={<Link to="/recruiter/post-job" className="btn btn-accent">Post a job</Link>}
            />
          ) : (
            <div className="table-responsive">
              <table className="table jp-table align-middle mb-0">
                <thead>
                  <tr><th>Job</th><th>Salary</th><th>Posted</th><th>Deadline</th><th>Applicants</th><th>Status</th><th /></tr>
                </thead>
                <tbody>
                  {jobs.map((j) => (
                    <tr key={j.id}>
                      <td>
                        <div className="fw-semibold">{j.title}</div>
                        <div className="small jp-muted">{j.location} · {j.job_type}</div>
                      </td>
                      <td className="small jp-muted">{formatSalary(j.salary_min, j.salary_max)}</td>
                      <td className="small jp-muted">{formatDate(j.posted_date)}</td>
                      <td className="small jp-muted">{formatDate(j.deadline)}</td>
                      <td>
                        <Link to="/recruiter/applicants/$jobId" params={{ jobId: j.id }} className="badge text-bg-light border text-decoration-none">
                          {j.applications?.[0]?.count ?? 0} applicants
                        </Link>
                      </td>
                      <td><span className="badge text-bg-light border">{j.status}</span></td>
                      <td className="text-end">
                        <div className="d-inline-flex flex-wrap gap-2">
                          <Link to="/recruiter/post-job" search={{ jobId: j.id }} className="btn btn-sm btn-light border">Edit</Link>
                          {j.status === "Open" ? (
                            <button className="btn btn-sm btn-outline-navy" onClick={() => void setStatus(j.id, "Closed")}>Close</button>
                          ) : (
                            <button className="btn btn-sm btn-outline-navy" onClick={() => void setStatus(j.id, "Open")}>Reopen</button>
                          )}
                          <button className="btn btn-sm btn-outline-danger" onClick={() => setConfirm({ id: j.id, title: j.title })}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {confirm && (
          <Modal title="Delete job posting" onClose={() => setConfirm(null)}>
            <p className="small">
              Delete <strong>{confirm.title}</strong>? All applications for this job will be removed too. This cannot be undone.
            </p>
            <div className="d-flex justify-content-end gap-2">
              <button className="btn btn-light border" onClick={() => setConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => void remove(confirm.id)}>Delete job</button>
            </div>
          </Modal>
        )}
      </DashboardLayout>
    </RoleGuard>
  );
}
