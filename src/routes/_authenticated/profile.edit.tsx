import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { DashboardLayout, RoleGuard } from "@/components/DashboardLayout";
import { Alert, Loading } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/profile/edit")({
  head: () => ({
    meta: [
      { title: "Edit Profile — JobPortal" },
      { name: "description", content: "Update your headline, summary, education, skills and work experience." },
      { property: "og:title", content: "Edit Profile — JobPortal" },
      { property: "og:description", content: "Update your career details on JobPortal." },
    ],
  }),
  component: EditProfilePage,
});

const basicsSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(100),
  phone: z.string().trim().max(15).optional().or(z.literal("")),
  headline: z.string().trim().max(150).optional().or(z.literal("")),
  location: z.string().trim().max(100).optional().or(z.literal("")),
  bio: z.string().trim().max(1500).optional().or(z.literal("")),
  experience_years: z.coerce.number().min(0).max(60),
  expected_salary: z.coerce.number().min(0).max(100000000).optional(),
  linkedin_url: z.string().trim().url("Enter a valid URL").max(255).optional().or(z.literal("")),
});

function EditProfilePage() {
  const { user, role, refresh } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["profile-edit", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [profile, seeker, education, experiences, mySkills, allSkills] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle(),
        supabase.from("job_seekers").select("*").eq("id", user!.id).maybeSingle(),
        supabase.from("education").select("*").eq("job_seeker_id", user!.id).order("end_year", { ascending: false }),
        supabase.from("experiences").select("*").eq("job_seeker_id", user!.id).order("start_date", { ascending: false }),
        supabase.from("job_seeker_skills").select("skill_id, proficiency, skills(id, name)").eq("job_seeker_id", user!.id),
        supabase.from("skills").select("id, name").order("name"),
      ]);
      return {
        profile: profile.data,
        seeker: seeker.data,
        education: education.data ?? [],
        experiences: experiences.data ?? [],
        mySkills: mySkills.data ?? [],
        allSkills: allSkills.data ?? [],
      };
    },
  });

  const [basics, setBasics] = useState({
    full_name: "",
    phone: "",
    headline: "",
    location: "",
    bio: "",
    experience_years: "0",
    expected_salary: "",
    linkedin_url: "",
  });

  useEffect(() => {
    if (!data) return;
    setBasics({
      full_name: data.profile?.full_name ?? "",
      phone: data.profile?.phone ?? "",
      headline: data.seeker?.headline ?? "",
      location: data.seeker?.location ?? "",
      bio: data.seeker?.bio ?? "",
      experience_years: String(data.seeker?.experience_years ?? 0),
      expected_salary: data.seeker?.expected_salary ? String(data.seeker.expected_salary) : "",
      linkedin_url: data.seeker?.linkedin_url ?? "",
    });
  }, [data]);

  function reload() {
    void queryClient.invalidateQueries({ queryKey: ["profile-edit"] });
    void queryClient.invalidateQueries({ queryKey: ["seeker-profile"] });
    void queryClient.invalidateQueries({ queryKey: ["seeker-dashboard"] });
  }

  async function saveBasics(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    const parsed = basicsSchema.safeParse({
      ...basics,
      expected_salary: basics.expected_salary === "" ? undefined : basics.expected_salary,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    const v = parsed.data;
    const [p, s] = await Promise.all([
      supabase.from("profiles").update({ full_name: v.full_name, phone: v.phone || null }).eq("id", user!.id),
      supabase
        .from("job_seekers")
        .update({
          headline: v.headline || null,
          location: v.location || null,
          bio: v.bio || null,
          experience_years: v.experience_years,
          expected_salary: v.expected_salary ?? null,
          linkedin_url: v.linkedin_url || null,
        })
        .eq("id", user!.id),
    ]);
    if (p.error || s.error) {
      setError(p.error?.message ?? s.error?.message ?? "Could not save");
      return;
    }
    setMessage("Profile saved successfully.");
    await refresh();
    reload();
  }

  return (
    <RoleGuard allow="job_seeker" role={role}>
      <DashboardLayout title="Edit Profile" subtitle="Keep your details current so recruiters can find you">
        {isLoading ? (
          <Loading rows={3} />
        ) : (
          <>
            <Alert kind="success" message={message} />
            <Alert kind="danger" message={error} />

            <form className="jp-card p-4 mb-4" onSubmit={saveBasics}>
              <h2 className="h6 mb-3">Basic details</h2>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label" htmlFor="p-name">Full name</label>
                  <input id="p-name" className="form-control" maxLength={100} value={basics.full_name} onChange={(e) => setBasics({ ...basics, full_name: e.target.value })} required />
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="p-phone">Phone</label>
                  <input id="p-phone" className="form-control" maxLength={15} value={basics.phone} onChange={(e) => setBasics({ ...basics, phone: e.target.value })} />
                </div>
                <div className="col-12">
                  <label className="form-label" htmlFor="p-headline">Headline</label>
                  <input id="p-headline" className="form-control" maxLength={150} placeholder="e.g. BCA graduate · Full-stack developer" value={basics.headline} onChange={(e) => setBasics({ ...basics, headline: e.target.value })} />
                </div>
                <div className="col-md-4">
                  <label className="form-label" htmlFor="p-loc">Location</label>
                  <input id="p-loc" className="form-control" maxLength={100} value={basics.location} onChange={(e) => setBasics({ ...basics, location: e.target.value })} />
                </div>
                <div className="col-md-4">
                  <label className="form-label" htmlFor="p-exp">Experience (years)</label>
                  <input id="p-exp" type="number" min={0} max={60} step="0.5" className="form-control" value={basics.experience_years} onChange={(e) => setBasics({ ...basics, experience_years: e.target.value })} />
                </div>
                <div className="col-md-4">
                  <label className="form-label" htmlFor="p-sal">Expected salary (₹/year)</label>
                  <input id="p-sal" type="number" min={0} className="form-control" value={basics.expected_salary} onChange={(e) => setBasics({ ...basics, expected_salary: e.target.value })} />
                </div>
                <div className="col-12">
                  <label className="form-label" htmlFor="p-link">LinkedIn / portfolio URL</label>
                  <input id="p-link" className="form-control" maxLength={255} placeholder="https://" value={basics.linkedin_url} onChange={(e) => setBasics({ ...basics, linkedin_url: e.target.value })} />
                </div>
                <div className="col-12">
                  <label className="form-label" htmlFor="p-bio">Professional summary</label>
                  <textarea id="p-bio" className="form-control" rows={4} maxLength={1500} value={basics.bio} onChange={(e) => setBasics({ ...basics, bio: e.target.value })} />
                </div>
              </div>
              <button className="btn btn-primary mt-3 px-4">Save details</button>
            </form>

            <EducationSection items={data?.education ?? []} userId={user!.id} onChange={reload} />
            <ExperienceSection items={data?.experiences ?? []} userId={user!.id} onChange={reload} />
            <SkillsSection
              mine={data?.mySkills ?? []}
              all={data?.allSkills ?? []}
              userId={user!.id}
              onChange={reload}
            />
          </>
        )}
      </DashboardLayout>
    </RoleGuard>
  );
}

/* ------------------------- education ------------------------- */
function EducationSection({
  items,
  userId,
  onChange,
}: {
  items: { id: string; degree: string; institution: string; field_of_study: string | null; start_year: number | null; end_year: number | null; grade: string | null }[];
  userId: string;
  onChange: () => void;
}) {
  const empty = { degree: "", institution: "", field_of_study: "", start_year: "", end_year: "", grade: "" };
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.degree.trim().length < 2 || form.institution.trim().length < 2) {
      setError("Degree and institution are required.");
      return;
    }
    const { error: dbError } = await supabase.from("education").insert({
      job_seeker_id: userId,
      degree: form.degree.trim(),
      institution: form.institution.trim(),
      field_of_study: form.field_of_study.trim() || null,
      start_year: form.start_year ? Number(form.start_year) : null,
      end_year: form.end_year ? Number(form.end_year) : null,
      grade: form.grade.trim() || null,
    });
    if (dbError) {
      setError(dbError.message);
      return;
    }
    setForm(empty);
    onChange();
  }

  async function remove(id: string) {
    await supabase.from("education").delete().eq("id", id);
    onChange();
  }

  return (
    <div className="jp-card p-4 mb-4">
      <h2 className="h6 mb-3">Education</h2>
      <Alert kind="danger" message={error} />

      {items.length > 0 && (
        <ul className="list-group list-group-flush mb-3">
          {items.map((e) => (
            <li key={e.id} className="list-group-item d-flex justify-content-between align-items-center px-0">
              <div>
                <div className="fw-semibold small">{e.degree} — {e.institution}</div>
                <div className="small jp-muted">
                  {e.field_of_study ?? "—"} · {e.start_year ?? "?"}–{e.end_year ?? "?"} {e.grade ? `· ${e.grade}` : ""}
                </div>
              </div>
              <button className="btn btn-sm btn-outline-danger" onClick={() => void remove(e.id)}>Remove</button>
            </li>
          ))}
        </ul>
      )}

      <form className="row g-2" onSubmit={add}>
        <div className="col-md-4"><input className="form-control" placeholder="Degree (e.g. BCA)" maxLength={100} value={form.degree} onChange={(e) => setForm({ ...form, degree: e.target.value })} /></div>
        <div className="col-md-4"><input className="form-control" placeholder="Institution" maxLength={150} value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} /></div>
        <div className="col-md-4"><input className="form-control" placeholder="Field of study" maxLength={100} value={form.field_of_study} onChange={(e) => setForm({ ...form, field_of_study: e.target.value })} /></div>
        <div className="col-4 col-md-3"><input className="form-control" type="number" placeholder="Start year" value={form.start_year} onChange={(e) => setForm({ ...form, start_year: e.target.value })} /></div>
        <div className="col-4 col-md-3"><input className="form-control" type="number" placeholder="End year" value={form.end_year} onChange={(e) => setForm({ ...form, end_year: e.target.value })} /></div>
        <div className="col-4 col-md-3"><input className="form-control" placeholder="Grade" maxLength={30} value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} /></div>
        <div className="col-md-3 d-grid"><button className="btn btn-outline-navy">Add education</button></div>
      </form>
    </div>
  );
}

/* ------------------------- experience ------------------------- */
function ExperienceSection({
  items,
  userId,
  onChange,
}: {
  items: { id: string; company_name: string; designation: string; location: string | null; start_date: string | null; end_date: string | null; is_current: boolean; description: string | null }[];
  userId: string;
  onChange: () => void;
}) {
  const empty = { company_name: "", designation: "", location: "", start_date: "", end_date: "", is_current: false, description: "" };
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.company_name.trim().length < 2 || form.designation.trim().length < 2) {
      setError("Company and designation are required.");
      return;
    }
    const { error: dbError } = await supabase.from("experiences").insert({
      job_seeker_id: userId,
      company_name: form.company_name.trim(),
      designation: form.designation.trim(),
      location: form.location.trim() || null,
      start_date: form.start_date || null,
      end_date: form.is_current ? null : form.end_date || null,
      is_current: form.is_current,
      description: form.description.trim() || null,
    });
    if (dbError) {
      setError(dbError.message);
      return;
    }
    setForm(empty);
    onChange();
  }

  async function remove(id: string) {
    await supabase.from("experiences").delete().eq("id", id);
    onChange();
  }

  return (
    <div className="jp-card p-4 mb-4">
      <h2 className="h6 mb-3">Work experience</h2>
      <Alert kind="danger" message={error} />

      {items.length > 0 && (
        <ul className="list-group list-group-flush mb-3">
          {items.map((e) => (
            <li key={e.id} className="list-group-item d-flex justify-content-between align-items-center px-0">
              <div>
                <div className="fw-semibold small">{e.designation} — {e.company_name}</div>
                <div className="small jp-muted">{e.start_date ?? "?"} → {e.is_current ? "Present" : e.end_date ?? "?"}</div>
              </div>
              <button className="btn btn-sm btn-outline-danger" onClick={() => void remove(e.id)}>Remove</button>
            </li>
          ))}
        </ul>
      )}

      <form className="row g-2" onSubmit={add}>
        <div className="col-md-4"><input className="form-control" placeholder="Designation" maxLength={100} value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} /></div>
        <div className="col-md-4"><input className="form-control" placeholder="Company" maxLength={120} value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></div>
        <div className="col-md-4"><input className="form-control" placeholder="Location" maxLength={100} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
        <div className="col-6 col-md-3"><input className="form-control" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
        <div className="col-6 col-md-3"><input className="form-control" type="date" disabled={form.is_current} value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
        <div className="col-md-3 d-flex align-items-center">
          <div className="form-check">
            <input className="form-check-input" type="checkbox" id="x-current" checked={form.is_current} onChange={(e) => setForm({ ...form, is_current: e.target.checked })} />
            <label className="form-check-label small" htmlFor="x-current">I currently work here</label>
          </div>
        </div>
        <div className="col-12"><textarea className="form-control" rows={2} maxLength={800} placeholder="What did you do in this role?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div className="col-md-3 d-grid"><button className="btn btn-outline-navy">Add experience</button></div>
      </form>
    </div>
  );
}

/* ------------------------- skills ------------------------- */
function SkillsSection({
  mine,
  all,
  userId,
  onChange,
}: {
  mine: { skill_id: string; proficiency: string; skills: { id: string; name: string } | null }[];
  all: { id: string; name: string }[];
  userId: string;
  onChange: () => void;
}) {
  const [skillId, setSkillId] = useState("");
  const [custom, setCustom] = useState("");
  const [proficiency, setProficiency] = useState("Intermediate");
  const [error, setError] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    let id = skillId;
    if (!id && custom.trim().length > 1) {
      const name = custom.trim().slice(0, 50);
      const existing = all.find((s) => s.name.toLowerCase() === name.toLowerCase());
      if (existing) id = existing.id;
      else {
        const { data, error: insertError } = await supabase.from("skills").insert({ name }).select("id").single();
        if (insertError) {
          setError(insertError.message);
          return;
        }
        id = data.id;
      }
    }
    if (!id) {
      setError("Pick a skill or type a new one.");
      return;
    }
    const { error: dbError } = await supabase
      .from("job_seeker_skills")
      .upsert({ job_seeker_id: userId, skill_id: id, proficiency });
    if (dbError) {
      setError(dbError.message);
      return;
    }
    setSkillId("");
    setCustom("");
    onChange();
  }

  async function remove(id: string) {
    await supabase.from("job_seeker_skills").delete().eq("job_seeker_id", userId).eq("skill_id", id);
    onChange();
  }

  return (
    <div className="jp-card p-4">
      <h2 className="h6 mb-3">Skills</h2>
      <Alert kind="danger" message={error} />

      <div className="d-flex flex-wrap gap-2 mb-3">
        {mine.length === 0 && <span className="small jp-muted">No skills added yet.</span>}
        {mine.map((s) => (
          <span key={s.skill_id} className="jp-chip">
            {s.skills?.name} · {s.proficiency}
            <button className="btn btn-sm p-0 ms-1 text-danger" style={{ lineHeight: 1 }} onClick={() => void remove(s.skill_id)} aria-label="Remove skill">×</button>
          </span>
        ))}
      </div>

      <form className="row g-2" onSubmit={add}>
        <div className="col-md-4">
          <select className="form-select" value={skillId} onChange={(e) => setSkillId(e.target.value)}>
            <option value="">Choose a skill…</option>
            {all.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="col-md-3"><input className="form-control" placeholder="…or add new" maxLength={50} value={custom} onChange={(e) => setCustom(e.target.value)} /></div>
        <div className="col-md-3">
          <select className="form-select" value={proficiency} onChange={(e) => setProficiency(e.target.value)}>
            {["Beginner", "Intermediate", "Advanced", "Expert"].map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div className="col-md-2 d-grid"><button className="btn btn-outline-navy">Add</button></div>
      </form>
    </div>
  );
}
