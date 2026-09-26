import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { DashboardLayout, RoleGuard } from "@/components/DashboardLayout";
import { Alert, Loading, EmptyState } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { APPLICATION_STATUSES, formatDate, initials, statusClass } from "@/lib/portal";

export const Route = createFileRoute("/_authenticated/recruiter/application/$applicationId")({
  head: () => ({
    meta: [
      { title: "Applicant Details — JobPortal" },
      { name: "description", content: "Full candidate profile, resume download and application status control." },
      { property: "og:title", content: "Applicant Details — JobPortal" },
      { property: "og:description", content: "Review a candidate and update their application status." },
    ],
  }),
  component: ApplicantDetails,
});

function ApplicantDetails() {
  const { applicationId } = Route.useParams();
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("Applied");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["recruiter-application", applicationId],
    queryFn: async () => {
      const { data: app } = await supabase
        .from("applications")
        .select(
          "id, status, applied_at, updated_at, cover_letter, recruiter_notes, job_seeker_id, jobs(id, title, location), resumes(file_name, file_path), profiles:job_seeker_id(full_name, email, phone), job_seekers:job_seeker_id(headline, bio, location, experience_years, expected_salary, linkedin_url)",
        )
        .eq("id", applicationId)
        .maybeSingle();
      if (!app) return null;
      const [education, experiences, skills] = await Promise.all([
        supabase.from("education").select("*").eq("job_seeker_id", app.job_seeker_id).order("end_year", { ascending: false }),
        supabase.from("experiences").select("*").eq("job_seeker_id", app.job_seeker_id).order("start_date", { ascending: false }),
        supabase.from("job_seeker_skills").select("proficiency, skills(id, name)").eq("job_seeker_id", app.job_seeker_id),
      ]);
      return { app, education: education.data ?? [], experiences: experiences.data ?? [], skills: skills.data ?? [] };
    },
  });

  useEffect(() => {
    if (!data?.app) return;
    setStatus(data.app.status);
    setNotes(data.app.recruiter_notes ?? "");
  }, [data]);

  async function save() {
    setError("");
    setMessage("");
    setSaving(true);
    const { error: upErr } = await supabase
      .from("applications")
      .update({ status, recruiter_notes: notes.trim().slice(0, 1000) || null })
      .eq("id", applicationId);
    setSaving(false);
    if (upErr) { setError(upErr.message); return; }
    setMessage("Application updated. The candidate can see the new status.");
    void queryClient.invalidateQueries({ queryKey: ["recruiter-application", applicationId] });
    void queryClient.invalidateQueries({ queryKey: ["recruiter-applicants"] });
    void queryClient.invalidateQueries({ queryKey: ["job-applicants"] });
    void queryClient.invalidateQueries({ queryKey: ["recruiter-dashboard"] });
  }

  async function downloadResume(path: string, name: string) {
    const { data: file, error: dlErr } = await supabase.storage.from("resumes").download(path);
    if (dlErr || !file) { setError(dlErr?.message ?? "Could not download the resume."); return; }
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  const app = data?.app;

  return (
    <RoleGuard allow="recruiter" role={role}>
      <DashboardLayout
        title="Applicant details"
        subtitle={app?.jobs?.title ?? ""}
        actions={<Link to="/recruiter/applicants" className="btn btn-sm btn-light border">All applicants</Link>}
      >
        {isLoading ? (
          <Loading rows={3} />
        ) : !app ? (
          <EmptyState title="Application not found" message="It may have been withdrawn or deleted." />
        ) : (
          <div className="row g-4">
            <div className="col-lg-7">
              <div className="jp-card p-4 mb-4 d-flex gap-3 align-items-center flex-wrap">
                <div className="jp-logo-square" style={{ width: 64, height: 64, fontSize: 20 }}>
                  {initials(app.profiles?.full_name)}
                </div>
                <div className="flex-grow-1">
                  <h2 className="h5 mb-1">{app.profiles?.full_name}</h2>
                  <div className="jp-muted small">{app.job_seekers?.headline ?? "—"}</div>
                  <div className="small jp-muted">
                    {app.profiles?.email}{app.profiles?.phone ? ` · ${app.profiles.phone}` : ""}
                    {app.job_seekers?.location ? ` · 📍 ${app.job_seekers.location}` : ""}
                  </div>
                  {app.job_seekers?.linkedin_url && (
                    <a className="small" href={app.job_seekers.linkedin_url} target="_blank" rel="noreferrer">Portfolio / LinkedIn</a>
                  )}
                </div>
                <span className={statusClass(app.status)}>{app.status}</span>
              </div>

              <div className="jp-card p-4 mb-4">
                <h3 className="h6">Summary</h3>
                <p className="small jp-muted mb-3" style={{ whiteSpace: "pre-line" }}>{app.job_seekers?.bio || "No summary provided."}</p>
                <div className="row small">
                  <div className="col-6"><span className="jp-muted d-block">Experience</span>{app.job_seekers?.experience_years ?? 0} years</div>
                  <div className="col-6"><span className="jp-muted d-block">Expected salary</span>{app.job_seekers?.expected_salary ? `₹${app.job_seekers.expected_salary.toLocaleString("en-IN")}` : "Not specified"}</div>
                </div>
              </div>

              <div className="jp-card p-4 mb-4">
                <h3 className="h6 mb-3">Skills</h3>
                {data.skills.length === 0 ? <p className="small jp-muted mb-0">No skills listed.</p> : (
                  <div className="d-flex flex-wrap gap-2">
                    {data.skills.map((s) => <span key={s.skills?.id} className="jp-chip">{s.skills?.name} · {s.proficiency}</span>)}
                  </div>
                )}
              </div>

              <div className="jp-card p-4 mb-4">
                <h3 className="h6 mb-3">Experience</h3>
                {data.experiences.length === 0 ? <p className="small jp-muted mb-0">No experience listed.</p> : (
                  <ul className="jp-timeline">
                    {data.experiences.map((e) => (
                      <li key={e.id} className="done">
                        <div className="fw-semibold small">{e.designation} — {e.company_name}</div>
                        <div className="small jp-muted">{formatDate(e.start_date)} – {e.is_current ? "Present" : formatDate(e.end_date)}</div>
                        {e.description && <p className="small jp-muted mb-0">{e.description}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="jp-card p-4">
                <h3 className="h6 mb-3">Education</h3>
                {data.education.length === 0 ? <p className="small jp-muted mb-0">No education listed.</p> : (
                  <ul className="jp-timeline">
                    {data.education.map((e) => (
                      <li key={e.id} className="done">
                        <div className="fw-semibold small">{e.degree} — {e.institution}</div>
                        <div className="small jp-muted">{e.start_year ?? "?"}–{e.end_year ?? "?"}{e.grade ? ` · ${e.grade}` : ""}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="col-lg-5">
              <div className="jp-card p-4 mb-4">
                <h3 className="h6 mb-3">Update status</h3>
                <Alert kind="success" message={message} />
                <Alert kind="danger" message={error} />
                <label className="form-label small" htmlFor="a-status">Application status</label>
                <select id="a-status" className="form-select mb-3" value={status} onChange={(e) => setStatus(e.target.value)}>
                  {APPLICATION_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
                <label className="form-label small" htmlFor="a-notes">Internal notes</label>
                <textarea id="a-notes" className="form-control mb-3" rows={4} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} />
                <button className="btn btn-accent w-100" onClick={() => void save()} disabled={saving}>
                  {saving ? "Saving…" : "Save update"}
                </button>
                <p className="small jp-muted mt-2 mb-0">Applied {formatDate(app.applied_at)} · last updated {formatDate(app.updated_at)}</p>
              </div>

              <div className="jp-card p-4 mb-4">
                <h3 className="h6 mb-2">Resume</h3>
                {app.resumes?.file_path ? (
                  <>
                    <p className="small mb-2">{app.resumes.file_name}</p>
                    <button className="btn btn-outline-navy btn-sm" onClick={() => void downloadResume(app.resumes!.file_path, app.resumes!.file_name)}>
                      Download resume
                    </button>
                  </>
                ) : (
                  <p className="small jp-muted mb-0">No resume attached to this application.</p>
                )}
              </div>

              <div className="jp-card p-4">
                <h3 className="h6 mb-2">Cover letter</h3>
                <p className="small jp-muted mb-0" style={{ whiteSpace: "pre-line" }}>{app.cover_letter || "No cover letter submitted."}</p>
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    </RoleGuard>
  );
}
