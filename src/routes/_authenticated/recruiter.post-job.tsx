import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { DashboardLayout, RoleGuard } from "@/components/DashboardLayout";
import { Alert, Loading, EmptyState } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { JOB_TYPES } from "@/lib/portal";

interface PostJobSearch {
  jobId?: string | undefined;
}

export const Route = createFileRoute("/_authenticated/recruiter/post-job")({
  validateSearch: (search: Record<string, unknown>): PostJobSearch => ({
    jobId: typeof search['jobId'] === "string" ? search['jobId'] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Post a Job — JobPortal" },
      { name: "description", content: "Publish a new vacancy with salary, skills, responsibilities and deadline." },
      { property: "og:title", content: "Post a Job — JobPortal" },
      { property: "og:description", content: "Publish a new vacancy on JobPortal." },
    ],
  }),
  component: PostJobPage,
});

const schema = z.object({
  title: z.string().trim().min(3, "Job title is required").max(120),
  location: z.string().trim().min(2, "Location is required").max(100),
  job_type: z.string().trim().min(2).max(40),
  description: z.string().trim().min(20, "Describe the role in at least 20 characters").max(5000),
  responsibilities: z.string().trim().max(3000).optional().or(z.literal("")),
  qualifications: z.string().trim().max(3000).optional().or(z.literal("")),
  experience_min: z.coerce.number().min(0).max(50),
  experience_max: z.coerce.number().min(0).max(60).optional(),
  salary_min: z.coerce.number().min(0).max(100000000).optional(),
  salary_max: z.coerce.number().min(0).max(100000000).optional(),
  openings: z.coerce.number().min(1).max(999),
  deadline: z.string().optional().or(z.literal("")),
  status: z.string().min(2).max(20),
});

const empty = {
  title: "", location: "", job_type: "Full-time", description: "", responsibilities: "", qualifications: "",
  experience_min: "0", experience_max: "", salary_min: "", salary_max: "", openings: "1", deadline: "", status: "Open",
};

function PostJobPage() {
  const { jobId } = Route.useSearch();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(empty);
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: recruiter, isLoading } = useQuery({
    queryKey: ["recruiter-company-id", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("recruiters").select("company_id, companies(name)").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: existing } = useQuery({
    queryKey: ["edit-job", jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const [job, jobSkills] = await Promise.all([
        supabase.from("jobs").select("*").eq("id", jobId!).maybeSingle(),
        supabase.from("job_skills").select("skills(name)").eq("job_id", jobId!),
      ]);
      return { job: job.data, skills: (jobSkills.data ?? []).map((s) => s.skills?.name).filter(Boolean) as string[] };
    },
  });

  useEffect(() => {
    if (!existing?.job) return;
    const j = existing.job;
    setForm({
      title: j.title,
      location: j.location,
      job_type: j.job_type,
      description: j.description,
      responsibilities: j.responsibilities ?? "",
      qualifications: j.qualifications ?? "",
      experience_min: String(j.experience_min ?? 0),
      experience_max: j.experience_max != null ? String(j.experience_max) : "",
      salary_min: j.salary_min != null ? String(j.salary_min) : "",
      salary_max: j.salary_max != null ? String(j.salary_max) : "",
      openings: String(j.openings ?? 1),
      deadline: j.deadline ?? "",
      status: j.status,
    });
    setSkills(existing.skills);
  }, [existing]);

  function addSkill() {
    const name = skillInput.trim().slice(0, 50);
    if (!name || skills.some((s) => s.toLowerCase() === name.toLowerCase())) return;
    setSkills([...skills, name]);
    setSkillInput("");
  }

  async function syncSkills(targetJobId: string) {
    const ids: string[] = [];
    for (const name of skills) {
      const { data: found } = await supabase.from("skills").select("id").ilike("name", name).maybeSingle();
      if (found) ids.push(found.id);
      else {
        const { data: created } = await supabase.from("skills").insert({ name }).select("id").single();
        if (created) ids.push(created.id);
      }
    }
    await supabase.from("job_skills").delete().eq("job_id", targetJobId);
    if (ids.length) {
      await supabase.from("job_skills").insert(ids.map((skill_id) => ({ job_id: targetJobId, skill_id })));
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    const parsed = schema.safeParse({
      ...form,
      experience_max: form.experience_max === "" ? undefined : form.experience_max,
      salary_min: form.salary_min === "" ? undefined : form.salary_min,
      salary_max: form.salary_max === "" ? undefined : form.salary_max,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    const v = parsed.data;
    if (v.salary_min != null && v.salary_max != null && v.salary_max < v.salary_min) {
      setError("Maximum salary must be greater than the minimum.");
      return;
    }

    const payload = {
      title: v.title,
      location: v.location,
      job_type: v.job_type,
      description: v.description,
      responsibilities: v.responsibilities || null,
      qualifications: v.qualifications || null,
      experience_min: v.experience_min,
      experience_max: v.experience_max ?? null,
      salary_min: v.salary_min ?? null,
      salary_max: v.salary_max ?? null,
      openings: v.openings,
      deadline: v.deadline || null,
      status: v.status,
    };

    setSaving(true);
    if (jobId) {
      const { error: upErr } = await supabase.from("jobs").update(payload).eq("id", jobId);
      if (upErr) { setSaving(false); setError(upErr.message); return; }
      await syncSkills(jobId);
      setSaving(false);
      setMessage("Job updated.");
    } else {
      const { data: created, error: insErr } = await supabase
        .from("jobs")
        .insert({ ...payload, company_id: recruiter!.company_id!, posted_by: user!.id })
        .select("id")
        .single();
      if (insErr) { setSaving(false); setError(insErr.message); return; }
      await syncSkills(created.id);
      setSaving(false);
      void queryClient.invalidateQueries({ queryKey: ["recruiter-jobs"] });
      void navigate({ to: "/recruiter/jobs" });
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ["recruiter-jobs"] });
    void queryClient.invalidateQueries({ queryKey: ["edit-job", jobId] });
  }

  return (
    <RoleGuard allow="recruiter" role={role}>
      <DashboardLayout
        title={jobId ? "Edit job" : "Post a job"}
        subtitle={recruiter?.companies?.name ?? ""}
        actions={<Link to="/recruiter/jobs" className="btn btn-sm btn-light border">Manage jobs</Link>}
      >
        {isLoading ? (
          <Loading rows={3} />
        ) : !recruiter?.company_id ? (
          <EmptyState
            title="Company profile required"
            message="Add your company details before posting a job."
            action={<Link to="/recruiter/company" className="btn btn-accent">Add company profile</Link>}
          />
        ) : (
          <form className="jp-card p-4" onSubmit={onSubmit}>
            <Alert kind="success" message={message} />
            <Alert kind="danger" message={error} />

            <div className="row g-3">
              <div className="col-md-8">
                <label className="form-label" htmlFor="j-title">Job title *</label>
                <input id="j-title" className="form-control" maxLength={120} required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="col-md-4">
                <label className="form-label" htmlFor="j-type">Job type *</label>
                <select id="j-type" className="form-select" value={form.job_type} onChange={(e) => setForm({ ...form, job_type: e.target.value })}>
                  {JOB_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label" htmlFor="j-loc">Location *</label>
                <input id="j-loc" className="form-control" maxLength={100} required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <div className="col-md-4">
                <label className="form-label" htmlFor="j-expmin">Experience min (yrs)</label>
                <input id="j-expmin" type="number" min={0} className="form-control" value={form.experience_min} onChange={(e) => setForm({ ...form, experience_min: e.target.value })} />
              </div>
              <div className="col-md-4">
                <label className="form-label" htmlFor="j-expmax">Experience max (yrs)</label>
                <input id="j-expmax" type="number" min={0} className="form-control" value={form.experience_max} onChange={(e) => setForm({ ...form, experience_max: e.target.value })} />
              </div>
              <div className="col-md-4">
                <label className="form-label" htmlFor="j-salmin">Salary min (₹/year)</label>
                <input id="j-salmin" type="number" min={0} className="form-control" value={form.salary_min} onChange={(e) => setForm({ ...form, salary_min: e.target.value })} />
              </div>
              <div className="col-md-4">
                <label className="form-label" htmlFor="j-salmax">Salary max (₹/year)</label>
                <input id="j-salmax" type="number" min={0} className="form-control" value={form.salary_max} onChange={(e) => setForm({ ...form, salary_max: e.target.value })} />
              </div>
              <div className="col-md-2">
                <label className="form-label" htmlFor="j-open">Openings</label>
                <input id="j-open" type="number" min={1} className="form-control" value={form.openings} onChange={(e) => setForm({ ...form, openings: e.target.value })} />
              </div>
              <div className="col-md-4">
                <label className="form-label" htmlFor="j-dead">Application deadline</label>
                <input id="j-dead" type="date" className="form-control" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
              </div>
              <div className="col-md-2">
                <label className="form-label" htmlFor="j-status">Status</label>
                <select id="j-status" className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {["Open", "Closed", "Draft"].map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>

              <div className="col-12">
                <label className="form-label" htmlFor="j-skills">Skills required</label>
                <div className="d-flex gap-2">
                  <input
                    id="j-skills"
                    className="form-control"
                    maxLength={50}
                    placeholder="Type a skill and press Add"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                  />
                  <button type="button" className="btn btn-outline-navy" onClick={addSkill}>Add</button>
                </div>
                <div className="d-flex flex-wrap gap-2 mt-2">
                  {skills.map((s) => (
                    <span key={s} className="jp-chip">
                      {s}
                      <button type="button" className="btn btn-sm p-0 ms-1 text-danger" style={{ lineHeight: 1 }} onClick={() => setSkills(skills.filter((x) => x !== s))} aria-label={`Remove ${s}`}>×</button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="col-12">
                <label className="form-label" htmlFor="j-desc">Job description *</label>
                <textarea id="j-desc" className="form-control" rows={5} maxLength={5000} required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="j-resp">Responsibilities</label>
                <textarea id="j-resp" className="form-control" rows={5} maxLength={3000} placeholder="One per line" value={form.responsibilities} onChange={(e) => setForm({ ...form, responsibilities: e.target.value })} />
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="j-qual">Qualifications</label>
                <textarea id="j-qual" className="form-control" rows={5} maxLength={3000} placeholder="One per line" value={form.qualifications} onChange={(e) => setForm({ ...form, qualifications: e.target.value })} />
              </div>
            </div>

            <button className="btn btn-accent mt-3 px-4" disabled={saving}>
              {saving ? "Saving…" : jobId ? "Save changes" : "Publish job"}
            </button>
          </form>
        )}
      </DashboardLayout>
    </RoleGuard>
  );
}
