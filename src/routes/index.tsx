import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PageShell, Loading, EmptyState } from "@/components/SiteLayout";
import { JobCard } from "@/components/JobCard";
import { fetchJobs, fetchPortalStats } from "@/lib/queries";
import { JOB_TYPES } from "@/lib/portal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JobPortal — Find Your Next Job or Hire Great Talent" },
      {
        name: "description",
        content:
          "Search thousands of verified openings, apply with your resume and track every application. Recruiters can post jobs and manage applicants in one place.",
      },
      { property: "og:title", content: "JobPortal — Find Your Next Job or Hire Great Talent" },
      {
        property: "og:description",
        content: "Search jobs, apply online and track your applications. Recruiters post jobs and manage applicants.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [location, setLocation] = useState("");

  const { data: jobs, isLoading } = useQuery({
    queryKey: ["jobs", "featured"],
    queryFn: () => fetchJobs({}, 6),
  });
  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: fetchPortalStats });

  return (
    <PageShell>
      {/* Hero */}
      <section className="jp-hero py-5">
        <div className="container py-4 py-lg-5">
          <div className="row align-items-center g-5">
            <div className="col-lg-7">
              <span className="jp-chip mb-3" style={{ background: "rgba(255,255,255,.12)", color: "#fff", borderColor: "rgba(255,255,255,.2)" }}>
                Job Portal &amp; Recruitment System
              </span>
              <h1 className="display-5 fw-bold mb-3">
                Find the job that fits your <span style={{ color: "#ffb199" }}>ambition</span>
              </h1>
              <p className="lead mb-4">
                Browse live vacancies from real companies, apply with one click and follow every
                application from <em>Applied</em> to <em>Selected</em>.
              </p>

              <form
                className="bg-white rounded-4 p-2 p-sm-3 shadow-lg"
                onSubmit={(e) => {
                  e.preventDefault();
                  void navigate({ to: "/jobs", search: { q: q || undefined, location: location || undefined } });
                }}
              >
                <div className="row g-2">
                  <div className="col-12 col-md-5">
                    <input
                      className="form-control border-0 bg-light"
                      placeholder="Job title or keyword"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      maxLength={80}
                    />
                  </div>
                  <div className="col-12 col-md-4">
                    <input
                      className="form-control border-0 bg-light"
                      placeholder="Location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      maxLength={80}
                    />
                  </div>
                  <div className="col-12 col-md-3 d-grid">
                    <button className="btn btn-accent" type="submit">Search Jobs</button>
                  </div>
                </div>
              </form>

              <div className="d-flex flex-wrap gap-2 mt-3">
                {JOB_TYPES.slice(0, 4).map((t) => (
                  <Link key={t} to="/jobs" search={{ type: t }} className="jp-chip text-decoration-none" style={{ background: "rgba(255,255,255,.12)", color: "#fff", borderColor: "rgba(255,255,255,.2)" }}>
                    {t}
                  </Link>
                ))}
              </div>
            </div>

            <div className="col-lg-5">
              <div className="row g-3">
                {[
                  { label: "Open positions", value: stats?.openJobs ?? 0 },
                  { label: "Companies hiring", value: stats?.companies ?? 0 },
                  { label: "Jobs posted", value: stats?.totalJobs ?? 0 },
                  { label: "Skills tracked", value: stats?.skills ?? 0 },
                ].map((s) => (
                  <div className="col-6" key={s.label}>
                    <div className="rounded-4 p-3 h-100" style={{ background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.18)" }}>
                      <div className="fs-3 fw-bold text-white">{s.value}</div>
                      <div className="small" style={{ color: "rgba(255,255,255,.75)" }}>{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured jobs */}
      <section className="container py-5">
        <div className="d-flex justify-content-between align-items-end mb-4">
          <div>
            <h2 className="h3 mb-1">Latest openings</h2>
            <p className="jp-muted mb-0">Fresh vacancies posted by recruiters on the portal.</p>
          </div>
          <Link to="/jobs" className="btn btn-outline-navy btn-sm">View all</Link>
        </div>

        {isLoading ? (
          <Loading rows={3} />
        ) : jobs && jobs.length > 0 ? (
          <div className="row g-4">
            {jobs.map((job) => (
              <div className="col-12 col-md-6 col-xl-4" key={job.id}>
                <JobCard job={job} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No jobs posted yet"
            message="Recruiters haven't published any vacancies. Register as a recruiter to post the first one."
            action={<Link to="/register" className="btn btn-accent">Register as recruiter</Link>}
          />
        )}
      </section>

      {/* How it works */}
      <section className="bg-white border-top border-bottom py-5">
        <div className="container">
          <h2 className="h3 text-center mb-2">How it works</h2>
          <p className="jp-muted text-center mb-5">Three steps for job seekers, three for recruiters.</p>
          <div className="row g-4">
            {[
              { n: "01", t: "Create your profile", d: "Add education, skills, work experience and upload your resume." },
              { n: "02", t: "Search &amp; apply", d: "Filter by role, location, job type, experience and salary, then apply online." },
              { n: "03", t: "Track your status", d: "Follow each application through review, shortlist, interview and selection." },
            ].map((s) => (
              <div className="col-md-4" key={s.n}>
                <div className="jp-card h-100 p-4">
                  <div className="fs-4 fw-bold" style={{ color: "var(--jp-accent)" }}>{s.n}</div>
                  <h3 className="h5 mt-2 mb-2" dangerouslySetInnerHTML={{ __html: s.t }} />
                  <p className="jp-muted mb-0 small" dangerouslySetInnerHTML={{ __html: s.d }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-5">
        <div className="jp-card p-4 p-lg-5 d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-4">
          <div>
            <h2 className="h4 mb-2">Hiring for your company?</h2>
            <p className="jp-muted mb-0">
              Create a company profile, post vacancies, review applicants and update their status in real time.
            </p>
          </div>
          <div className="d-flex gap-2">
            <Link to="/register" className="btn btn-accent px-4">Post a job</Link>
            <Link to="/about" className="btn btn-outline-navy px-4">Learn more</Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
