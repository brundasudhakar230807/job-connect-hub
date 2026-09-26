import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageShell, Loading, Modal, Alert, EmptyState } from "@/components/SiteLayout";
import { fetchJob } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDate, formatSalary, initials, statusClass, timeAgo } from "@/lib/portal";

export const Route = createFileRoute("/jobs/$jobId")({
  head: () => ({
    meta: [
      { title: "Job Details — JobPortal" },
      { name: "description", content: "Full job description, required skills, salary, experience and application deadline." },
      { property: "og:title", content: "Job Details — JobPortal" },
      { property: "og:description", content: "Full job description, required skills, salary and deadline." },
    ],
  }),
  component: JobDetails,
});

function JobDetails() {
  const { jobId } = Route.useParams();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showApply, setShowApply] = useState(false);

  const { data: job, isLoading } = useQuery({ queryKey: ["job", jobId], queryFn: () => fetchJob(jobId) });

  const { data: application } = useQuery({
    queryKey: ["my-application", jobId, user?.id],
    enabled: !!user && role === "job_seeker",
    queryFn: async () => {
      const { data } = await supabase
        .from("applications")
        .select("id, status, applied_at")
        .eq("job_id", jobId)
        .eq("job_seeker_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  if (isLoading) {
    return (
      <PageShell>
        <div className="container py-5"><Loading rows={3} /></div>
      </PageShell>
    );
  }

  if (!job) {
    return (
      <PageShell>
        <div className="container py-5">
          <EmptyState title="Job not found" message="This vacancy may have been removed." action={<Link to="/jobs" className="btn btn-primary">Browse jobs</Link>} />
        </div>
      </PageShell>
    );
  }

  const skills = job.job_skills?.map((s) => s.skills?.name).filter(Boolean) as string[];
  const expired = job.deadline ? new Date(job.deadline) < new Date(new Date().toDateString()) : false;
  const closed = job.status !== "open" || expired;

  return (
    <PageShell>
      <div className="jp-hero py-4">
        <div className="container py-3">
          <div className="d-flex flex-wrap gap-3 align-items-start">
            <div className="jp-logo-square" style={{ width: 62, height: 62, fontSize: 20 }}>
              {initials(job.companies?.name)}
            </div>
            <div className="flex-grow-1">
              <h1 className="h2 mb-1">{job.title}</h1>
              <div className="lead mb-2">{job.companies?.name}</div>
              <div className="d-flex flex-wrap gap-2">
                <span className="jp-chip" style={{ background: "rgba(255,255,255,.12)", color: "#fff", borderColor: "rgba(255,255,255,.2)" }}>📍 {job.location}</span>
                <span className="jp-chip" style={{ background: "rgba(255,255,255,.12)", color: "#fff", borderColor: "rgba(255,255,255,.2)" }}>💼 {job.job_type}</span>
                <span className="jp-chip" style={{ background: "rgba(255,255,255,.12)", color: "#fff", borderColor: "rgba(255,255,255,.2)" }}>💰 {formatSalary(job.salary_min, job.salary_max)}</span>
                <span className="jp-chip" style={{ background: "rgba(255,255,255,.12)", color: "#fff", borderColor: "rgba(255,255,255,.2)" }}>🕒 {timeAgo(job.posted_date)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-4 py-lg-5">
        <div className="row g-4">
          <div className="col-lg-8">
            <div className="jp-card p-4 p-lg-5">
              <h2 className="h5">Job description</h2>
              <p className="jp-muted" style={{ whiteSpace: "pre-line" }}>{job.description}</p>

              {job.responsibilities && (
                <>
                  <h2 className="h5 mt-4">Responsibilities</h2>
                  <p className="jp-muted" style={{ whiteSpace: "pre-line" }}>{job.responsibilities}</p>
                </>
              )}

              {job.qualifications && (
                <>
                  <h2 className="h5 mt-4">Qualifications</h2>
                  <p className="jp-muted" style={{ whiteSpace: "pre-line" }}>{job.qualifications}</p>
                </>
              )}

              {skills.length > 0 && (
                <>
                  <h2 className="h5 mt-4">Skills required</h2>
                  <div className="d-flex flex-wrap gap-2">
                    {skills.map((s) => <span key={s} className="jp-chip">{s}</span>)}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="col-lg-4">
            <div className="jp-card p-4 mb-4">
              <h2 className="h6 mb-3">Job overview</h2>
              <ul className="list-unstyled small mb-4">
                {[
                  ["Experience", `${job.experience_min}${job.experience_max ? `–${job.experience_max}` : "+"} years`],
                  ["Job type", job.job_type],
                  ["Openings", String(job.openings)],
                  ["Posted on", formatDate(job.posted_date)],
                  ["Deadline", formatDate(job.deadline)],
                  ["Status", closed ? "Closed" : "Open"],
                ].map(([k, v]) => (
                  <li key={k} className="d-flex justify-content-between border-bottom py-2">
                    <span className="jp-muted">{k}</span>
                    <span className="fw-semibold text-end">{v}</span>
                  </li>
                ))}
              </ul>

              {application ? (
                <div className="text-center">
                  <div className="mb-2 small jp-muted">You applied {timeAgo(application.applied_at)}</div>
                  <span className={statusClass(application.status)}>{application.status}</span>
                  <Link to="/applications" className="btn btn-outline-navy w-100 mt-3">Track application</Link>
                </div>
              ) : closed ? (
                <button className="btn btn-secondary w-100" disabled>Applications closed</button>
              ) : !user ? (
                <button className="btn btn-accent w-100" onClick={() => void navigate({ to: "/login" })}>
                  Login to apply
                </button>
              ) : role === "job_seeker" ? (
                <button className="btn btn-accent w-100" onClick={() => setShowApply(true)}>Apply now</button>
              ) : (
                <div className="small jp-muted text-center">Only job seeker accounts can apply.</div>
              )}
            </div>

            <div className="jp-card p-4">
              <h2 className="h6 mb-2">About {job.companies?.name}</h2>
              <p className="small jp-muted mb-2">{job.companies?.description || "No company description provided yet."}</p>
              <ul className="list-unstyled small jp-muted mb-0">
                {job.companies?.industry && <li>🏭 {job.companies.industry}</li>}
                {job.companies?.location && <li>📍 {job.companies.location}</li>}
                {job.companies?.website && (
                  <li>
                    🔗 <a href={job.companies.website} target="_blank" rel="noopener noreferrer">Website</a>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {showApply && user && (
        <ApplyModal
          jobId={job.id}
          jobTitle={job.title}
          userId={user.id}
          onClose={() => setShowApply(false)}
          onDone={() => {
            setShowApply(false);
            void queryClient.invalidateQueries({ queryKey: ["my-application", jobId] });
          }}
        />
      )}
    </PageShell>
  );
}

function ApplyModal({
  jobId,
  jobTitle,
  userId,
  onClose,
  onDone,
}: {
  jobId: string;
  jobTitle: string;
  userId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [coverLetter, setCoverLetter] = useState("");
  const [resumeId, setResumeId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: resumes } = useQuery({
    queryKey: ["resumes", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("resumes")
        .select("id, file_name, uploaded_at")
        .eq("job_seeker_id", userId)
        .order("uploaded_at", { ascending: false });
      return data ?? [];
    },
  });

  async function apply() {
    setError("");
    if (coverLetter.length > 2000) {
      setError("Cover letter is too long (max 2000 characters).");
      return;
    }
    setBusy(true);
    const { error: dbError } = await supabase.from("applications").insert({
      job_id: jobId,
      job_seeker_id: userId,
      resume_id: resumeId || (resumes?.[0]?.id ?? null),
      cover_letter: coverLetter.trim() || null,
    });
    setBusy(false);
    if (dbError) {
      setError(dbError.message.includes("duplicate") ? "You have already applied to this job." : dbError.message);
      return;
    }
    onDone();
  }

  return (
    <Modal
      title={`Apply — ${jobTitle}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-light" onClick={onClose}>Cancel</button>
          <button className="btn btn-accent" onClick={apply} disabled={busy}>
            {busy ? "Submitting…" : "Submit application"}
          </button>
        </>
      }
    >
      <Alert kind="danger" message={error} />
      {resumes && resumes.length === 0 && (
        <Alert kind="warning" message="You haven't uploaded a resume yet. You can still apply, but recruiters prefer a resume." />
      )}

      {resumes && resumes.length > 0 && (
        <div className="mb-3">
          <label className="form-label" htmlFor="a-resume">Resume</label>
          <select id="a-resume" className="form-select" value={resumeId} onChange={(e) => setResumeId(e.target.value)}>
            {resumes.map((r) => <option key={r.id} value={r.id}>{r.file_name}</option>)}
          </select>
        </div>
      )}

      <div>
        <label className="form-label" htmlFor="a-cover">Cover letter (optional)</label>
        <textarea
          id="a-cover"
          className="form-control"
          rows={5}
          maxLength={2000}
          placeholder="Tell the recruiter why you are a good fit…"
          value={coverLetter}
          onChange={(e) => setCoverLetter(e.target.value)}
        />
        <div className="form-text">{coverLetter.length}/2000</div>
      </div>
    </Modal>
  );
}
