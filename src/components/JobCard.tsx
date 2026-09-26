import { Link } from "@tanstack/react-router";
import type { JobRow } from "@/lib/queries";
import { formatSalary, initials, timeAgo } from "@/lib/portal";

export function JobCard({ job }: { job: JobRow }) {
  const skills = job.job_skills?.map((s) => s.skills?.name).filter(Boolean).slice(0, 4) as string[];
  return (
    <div className="jp-card jp-card-hover h-100 p-4 d-flex flex-column">
      <div className="d-flex gap-3 mb-3">
        <div className="jp-logo-square">{initials(job.companies?.name)}</div>
        <div className="flex-grow-1 min-w-0">
          <h3 className="h6 mb-1 text-truncate">{job.title}</h3>
          <div className="small jp-muted text-truncate">{job.companies?.name ?? "Company"}</div>
        </div>
      </div>

      <div className="d-flex flex-wrap gap-2 mb-3">
        <span className="jp-chip">📍 {job.location}</span>
        <span className="jp-chip">💼 {job.job_type}</span>
        <span className="jp-chip">
          ⏳ {job.experience_min}
          {job.experience_max ? `–${job.experience_max}` : "+"} yrs
        </span>
      </div>

      <p className="small jp-muted mb-3" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {job.description}
      </p>

      {skills?.length > 0 && (
        <div className="d-flex flex-wrap gap-1 mb-3">
          {skills.map((s) => (
            <span key={s} className="badge text-bg-light border fw-normal">{s}</span>
          ))}
        </div>
      )}

      <div className="mt-auto d-flex justify-content-between align-items-center pt-2 border-top">
        <div>
          <div className="fw-semibold small">{formatSalary(job.salary_min, job.salary_max)}</div>
          <div className="jp-muted" style={{ fontSize: 12 }}>{timeAgo(job.posted_date)}</div>
        </div>
        <Link to="/jobs/$jobId" params={{ jobId: job.id }} className="btn btn-sm btn-primary px-3">
          View
        </Link>
      </div>
    </div>
  );
}
