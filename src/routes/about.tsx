import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell, PageHeader } from "@/components/SiteLayout";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About JobPortal — How the Recruitment System Works" },
      {
        name: "description",
        content: "JobPortal is a full-stack recruitment system with job seeker, recruiter and admin roles, built on React and a relational database.",
      },
      { property: "og:title", content: "About JobPortal" },
      { property: "og:description", content: "A full-stack recruitment system with job seeker, recruiter and admin roles." },
    ],
  }),
  component: About,
});

function About() {
  return (
    <PageShell>
      <PageHeader title="About JobPortal" subtitle="A complete job portal and recruitment system" />
      <div className="container py-5">
        <div className="row g-4">
          <div className="col-lg-7">
            <div className="jp-card p-4 p-lg-5">
              <h2 className="h4 mb-3">What this portal does</h2>
              <p className="jp-muted">
                JobPortal connects candidates with hiring companies. Job seekers build a profile with
                education, skills and experience, upload a resume and apply to live vacancies.
                Recruiters create a company profile, publish jobs, review applicants and move them
                through the hiring pipeline. Administrators oversee every user, company, job and
                application on the platform.
              </p>
              <p className="jp-muted mb-0">
                Every action is stored in a relational database — nothing on this site is mock data.
              </p>
            </div>
          </div>
          <div className="col-lg-5">
            <div className="jp-card p-4 p-lg-5 h-100">
              <h2 className="h5 mb-3">Application pipeline</h2>
              <ul className="jp-timeline">
                {["Applied", "Under Review", "Shortlisted", "Interview", "Selected / Rejected"].map((s) => (
                  <li key={s} className="done">
                    <div className="fw-semibold">{s}</div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {[
            { t: "Job Seekers", d: "Profile, education, skills, experience, resume upload, job search with filters, online applications and live status tracking." },
            { t: "Recruiters", d: "Company profile, job posting with skills and deadlines, applicant lists, resume downloads and status updates." },
            { t: "Administrators", d: "Platform dashboard, user and recruiter management, company and job moderation, and full application oversight." },
          ].map((c) => (
            <div className="col-md-4" key={c.t}>
              <div className="jp-card h-100 p-4">
                <h3 className="h6">{c.t}</h3>
                <p className="jp-muted small mb-0">{c.d}</p>
              </div>
            </div>
          ))}

          <div className="col-12">
            <div className="jp-card p-4 p-lg-5">
              <h2 className="h5 mb-3">Technology</h2>
              <div className="row g-3 small jp-muted">
                <div className="col-md-4"><strong className="d-block text-dark">Frontend</strong>React, JavaScript/TypeScript, HTML5, CSS3, Bootstrap 5, responsive design, fetch-based API calls</div>
                <div className="col-md-4"><strong className="d-block text-dark">Backend</strong>Node.js server runtime, REST API endpoints, server-side validation and authorization</div>
                <div className="col-md-4"><strong className="d-block text-dark">Database</strong>PostgreSQL with primary keys, foreign keys, constraints and row-level security</div>
              </div>
              <Link to="/register" className="btn btn-accent mt-4">Create your account</Link>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
