import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { PageShell, PageHeader, Loading, EmptyState } from "@/components/SiteLayout";
import { JobCard } from "@/components/JobCard";
import { fetchJobs } from "@/lib/queries";
import { JOB_TYPES } from "@/lib/portal";

interface JobSearch {
  q?: string;
  location?: string;
  type?: string;
  exp?: string;
  salary?: string;
}

export const Route = createFileRoute("/jobs/")({
  validateSearch: (search: Record<string, unknown>): JobSearch => ({
    q: typeof search['q'] === "string" ? search['q'] : undefined,
    location: typeof search['location'] === "string" ? search['location'] : undefined,
    type: typeof search['type'] === "string" ? search['type'] : undefined,
    exp: typeof search['exp'] === "string" ? search['exp'] : undefined,
    salary: typeof search['salary'] === "string" ? search['salary'] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Browse Jobs — JobPortal" },
      { name: "description", content: "Search and filter live job openings by keyword, location, job type, experience and salary." },
      { property: "og:title", content: "Browse Jobs — JobPortal" },
      { property: "og:description", content: "Search and filter live job openings on JobPortal." },
    ],
  }),
  component: BrowseJobs,
});

function BrowseJobs() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [form, setForm] = useState<JobSearch>(search);

  useEffect(() => setForm(search), [search]);

  const { data: jobs, isLoading } = useQuery({
    queryKey: ["jobs", search],
    queryFn: () => fetchJobs(search),
  });

  function apply(next: JobSearch) {
    const clean: JobSearch = {};
    (Object.keys(next) as (keyof JobSearch)[]).forEach((k) => {
      if (next[k]) clean[k] = next[k];
    });
    void navigate({ to: "/jobs", search: clean });
  }

  return (
    <PageShell>
      <PageHeader title="Browse Jobs" subtitle="Find openings that match your skills and experience" />

      <div className="container py-4">
        <div className="row g-4">
          {/* Filters */}
          <aside className="col-lg-3">
            <form
              className="jp-card p-3 p-lg-4"
              onSubmit={(e) => {
                e.preventDefault();
                apply(form);
              }}
            >
              <h2 className="h6 mb-3">Filters</h2>

              <div className="mb-3">
                <label className="form-label" htmlFor="f-q">Keyword</label>
                <input id="f-q" className="form-control" maxLength={80} value={form.q ?? ""} onChange={(e) => setForm({ ...form, q: e.target.value })} placeholder="e.g. developer" />
              </div>

              <div className="mb-3">
                <label className="form-label" htmlFor="f-loc">Location</label>
                <input id="f-loc" className="form-control" maxLength={80} value={form.location ?? ""} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Bengaluru" />
              </div>

              <div className="mb-3">
                <label className="form-label" htmlFor="f-type">Job type</label>
                <select id="f-type" className="form-select" value={form.type ?? ""} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="">All types</option>
                  {JOB_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label" htmlFor="f-exp">Your experience (years)</label>
                <select id="f-exp" className="form-select" value={form.exp ?? ""} onChange={(e) => setForm({ ...form, exp: e.target.value })}>
                  <option value="">Any</option>
                  {["0", "1", "2", "3", "5", "8", "10"].map((v) => <option key={v} value={v}>{v}+ years</option>)}
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label" htmlFor="f-sal">Minimum salary (₹ / year)</label>
                <select id="f-sal" className="form-select" value={form.salary ?? ""} onChange={(e) => setForm({ ...form, salary: e.target.value })}>
                  <option value="">Any</option>
                  {["200000", "400000", "600000", "1000000", "1500000"].map((v) => (
                    <option key={v} value={v}>{Number(v) / 100000} LPA+</option>
                  ))}
                </select>
              </div>

              <div className="d-grid gap-2">
                <button className="btn btn-primary" type="submit">Apply filters</button>
                <button className="btn btn-link btn-sm text-decoration-none" type="button" onClick={() => apply({})}>
                  Clear all
                </button>
              </div>
            </form>
          </aside>

          {/* Results */}
          <div className="col-lg-9">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <p className="jp-muted mb-0 small">
                {isLoading ? "Searching…" : `${jobs?.length ?? 0} job${jobs?.length === 1 ? "" : "s"} found`}
              </p>
            </div>

            {isLoading ? (
              <Loading rows={4} />
            ) : jobs && jobs.length > 0 ? (
              <div className="row g-4">
                {jobs.map((job) => (
                  <div className="col-12 col-md-6" key={job.id}>
                    <JobCard job={job} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No matching jobs" message="Try removing a filter or searching a different keyword." />
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
