import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout, RoleGuard } from "@/components/DashboardLayout";
import { Loading } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDate, initials } from "@/lib/portal";

export const Route = createFileRoute("/_authenticated/profile/")({
  head: () => ({
    meta: [
      { title: "My Profile — JobPortal" },
      { name: "description", content: "Your job seeker profile: headline, skills, education, experience and contact details." },
      { property: "og:title", content: "My Profile — JobPortal" },
      { property: "og:description", content: "Your job seeker profile and career details." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, role, profile } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["seeker-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [seeker, education, experiences, skills, resumes] = await Promise.all([
        supabase.from("job_seekers").select("*").eq("id", user!.id).maybeSingle(),
        supabase.from("education").select("*").eq("job_seeker_id", user!.id).order("end_year", { ascending: false }),
        supabase.from("experiences").select("*").eq("job_seeker_id", user!.id).order("start_date", { ascending: false }),
        supabase.from("job_seeker_skills").select("proficiency, skills(id, name)").eq("job_seeker_id", user!.id),
        supabase.from("resumes").select("*").eq("job_seeker_id", user!.id).order("uploaded_at", { ascending: false }),
      ]);
      return {
        seeker: seeker.data,
        education: education.data ?? [],
        experiences: experiences.data ?? [],
        skills: skills.data ?? [],
        resumes: resumes.data ?? [],
      };
    },
  });

  return (
    <RoleGuard allow="job_seeker" role={role}>
      <DashboardLayout
        title="My Profile"
        subtitle="What recruiters see when you apply"
        actions={<Link to="/profile/edit" className="btn btn-primary btn-sm">Edit profile</Link>}
      >
        {isLoading ? (
          <Loading rows={3} />
        ) : (
          <>
            <div className="jp-card p-4 mb-4 d-flex flex-wrap gap-3 align-items-center">
              <div className="jp-logo-square" style={{ width: 68, height: 68, fontSize: 22 }}>
                {initials(profile?.full_name)}
              </div>
              <div className="flex-grow-1">
                <h2 className="h5 mb-1">{profile?.full_name}</h2>
                <div className="jp-muted">{data?.seeker?.headline || "Add a headline to introduce yourself"}</div>
                <div className="small jp-muted mt-1">
                  {profile?.email}
                  {profile?.phone ? ` · ${profile.phone}` : ""}
                  {data?.seeker?.location ? ` · 📍 ${data.seeker.location}` : ""}
                </div>
              </div>
              <div className="text-end">
                <div className="fw-bold fs-5">{data?.seeker?.experience_years ?? 0} yrs</div>
                <div className="small jp-muted">experience</div>
              </div>
            </div>

            <div className="row g-4">
              <div className="col-lg-7">
                <div className="jp-card p-4 mb-4">
                  <h3 className="h6">About</h3>
                  <p className="jp-muted small mb-0" style={{ whiteSpace: "pre-line" }}>
                    {data?.seeker?.bio || "No summary added yet."}
                  </p>
                </div>

                <div className="jp-card p-4 mb-4">
                  <h3 className="h6 mb-3">Work experience</h3>
                  {data?.experiences.length === 0 ? (
                    <p className="jp-muted small mb-0">No experience added.</p>
                  ) : (
                    <ul className="jp-timeline">
                      {data?.experiences.map((e) => (
                        <li key={e.id} className="done">
                          <div className="fw-semibold">{e.designation}</div>
                          <div className="small">{e.company_name}{e.location ? ` · ${e.location}` : ""}</div>
                          <div className="small jp-muted">
                            {formatDate(e.start_date)} – {e.is_current ? "Present" : formatDate(e.end_date)}
                          </div>
                          {e.description && <p className="small jp-muted mt-1 mb-0">{e.description}</p>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="jp-card p-4">
                  <h3 className="h6 mb-3">Education</h3>
                  {data?.education.length === 0 ? (
                    <p className="jp-muted small mb-0">No education added.</p>
                  ) : (
                    <ul className="jp-timeline">
                      {data?.education.map((e) => (
                        <li key={e.id} className="done">
                          <div className="fw-semibold">{e.degree}</div>
                          <div className="small">{e.institution}{e.field_of_study ? ` · ${e.field_of_study}` : ""}</div>
                          <div className="small jp-muted">
                            {e.start_year ?? "—"} – {e.end_year ?? "—"}{e.grade ? ` · ${e.grade}` : ""}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="col-lg-5">
                <div className="jp-card p-4 mb-4">
                  <h3 className="h6 mb-3">Skills</h3>
                  {data?.skills.length === 0 ? (
                    <p className="jp-muted small mb-0">No skills added.</p>
                  ) : (
                    <div className="d-flex flex-wrap gap-2">
                      {data?.skills.map((s) => (
                        <span key={s.skills?.id} className="jp-chip">
                          {s.skills?.name} · {s.proficiency}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="jp-card p-4">
                  <h3 className="h6 mb-3">Resume</h3>
                  {data?.resumes.length === 0 ? (
                    <>
                      <p className="jp-muted small">No resume uploaded.</p>
                      <Link to="/resume" className="btn btn-sm btn-accent">Upload resume</Link>
                    </>
                  ) : (
                    <>
                      <p className="small mb-1 fw-semibold">{data?.resumes[0]?.file_name}</p>
                      <p className="small jp-muted">Uploaded {formatDate(data?.resumes[0]?.uploaded_at)}</p>
                      <Link to="/resume" className="btn btn-sm btn-outline-navy">Manage resume</Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </DashboardLayout>
    </RoleGuard>
  );
}
