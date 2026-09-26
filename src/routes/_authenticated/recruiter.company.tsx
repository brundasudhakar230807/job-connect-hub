import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { DashboardLayout, RoleGuard } from "@/components/DashboardLayout";
import { Alert, Loading } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/recruiter/company")({
  head: () => ({
    meta: [
      { title: "Company Profile — JobPortal" },
      { name: "description", content: "Create or update the company profile shown on every job you post." },
      { property: "og:title", content: "Company Profile — JobPortal" },
      { property: "og:description", content: "Manage your company details on JobPortal." },
    ],
  }),
  component: CompanyPage,
});

const schema = z.object({
  name: z.string().trim().min(2, "Company name is required").max(120),
  industry: z.string().trim().max(80).optional().or(z.literal("")),
  company_size: z.string().trim().max(40).optional().or(z.literal("")),
  location: z.string().trim().max(100).optional().or(z.literal("")),
  website: z.string().trim().url("Enter a valid website URL").max(255).optional().or(z.literal("")),
  logo_url: z.string().trim().url("Enter a valid logo URL").max(255).optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  designation: z.string().trim().max(80).optional().or(z.literal("")),
});

const SIZES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];

function CompanyPage() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["recruiter-company", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: recruiter } = await supabase
        .from("recruiters")
        .select("company_id, designation, companies(*)")
        .eq("id", user!.id)
        .maybeSingle();
      return recruiter;
    },
  });

  const [form, setForm] = useState({
    name: "", industry: "", company_size: "", location: "", website: "", logo_url: "", description: "", designation: "",
  });

  useEffect(() => {
    if (!data) return;
    const c = data.companies;
    setForm({
      name: c?.name ?? "",
      industry: c?.industry ?? "",
      company_size: c?.company_size ?? "",
      location: c?.location ?? "",
      website: c?.website ?? "",
      logo_url: c?.logo_url ?? "",
      description: c?.description ?? "",
      designation: data.designation ?? "",
    });
  }, [data]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    const v = parsed.data;
    const payload = {
      name: v.name,
      industry: v.industry || null,
      company_size: v.company_size || null,
      location: v.location || null,
      website: v.website || null,
      logo_url: v.logo_url || null,
      description: v.description || null,
    };

    setSaving(true);
    let companyId = data?.company_id ?? null;
    if (companyId) {
      const { error: upErr } = await supabase.from("companies").update(payload).eq("id", companyId);
      if (upErr) { setSaving(false); setError(upErr.message); return; }
    } else {
      const { data: created, error: insErr } = await supabase
        .from("companies")
        .insert({ ...payload, created_by: user!.id })
        .select("id")
        .single();
      if (insErr) { setSaving(false); setError(insErr.message); return; }
      companyId = created.id;
    }

    const { error: recErr } = await supabase
      .from("recruiters")
      .update({ company_id: companyId, designation: v.designation || null })
      .eq("id", user!.id);
    setSaving(false);
    if (recErr) { setError(recErr.message); return; }

    setMessage("Company profile saved.");
    void queryClient.invalidateQueries({ queryKey: ["recruiter-company"] });
    void queryClient.invalidateQueries({ queryKey: ["recruiter-dashboard"] });
  }

  return (
    <RoleGuard allow="recruiter" role={role}>
      <DashboardLayout title="Company Profile" subtitle="This information appears on every job you post">
        {isLoading ? (
          <Loading rows={3} />
        ) : (
          <form className="jp-card p-4" onSubmit={onSubmit}>
            <Alert kind="success" message={message} />
            <Alert kind="danger" message={error} />

            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label" htmlFor="c-name">Company name *</label>
                <input id="c-name" className="form-control" maxLength={120} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="c-ind">Industry</label>
                <input id="c-ind" className="form-control" maxLength={80} placeholder="e.g. Information Technology" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
              </div>
              <div className="col-md-4">
                <label className="form-label" htmlFor="c-size">Company size</label>
                <select id="c-size" className="form-select" value={form.company_size} onChange={(e) => setForm({ ...form, company_size: e.target.value })}>
                  <option value="">Select…</option>
                  {SIZES.map((s) => <option key={s} value={s}>{s} employees</option>)}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label" htmlFor="c-loc">Headquarters</label>
                <input id="c-loc" className="form-control" maxLength={100} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <div className="col-md-4">
                <label className="form-label" htmlFor="c-desig">Your designation</label>
                <input id="c-desig" className="form-control" maxLength={80} placeholder="e.g. HR Manager" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="c-web">Website</label>
                <input id="c-web" className="form-control" maxLength={255} placeholder="https://" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="c-logo">Logo URL</label>
                <input id="c-logo" className="form-control" maxLength={255} placeholder="https://" value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} />
              </div>
              <div className="col-12">
                <label className="form-label" htmlFor="c-desc">About the company</label>
                <textarea id="c-desc" className="form-control" rows={5} maxLength={2000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>

            <button className="btn btn-primary mt-3 px-4" disabled={saving}>
              {saving ? "Saving…" : data?.company_id ? "Save changes" : "Create company"}
            </button>
          </form>
        )}
      </DashboardLayout>
    </RoleGuard>
  );
}
