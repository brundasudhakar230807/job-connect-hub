import { supabase } from "@/integrations/supabase/client";

export interface JobRow {
  id: string;
  title: string;
  location: string;
  job_type: string;
  salary_min: number | null;
  salary_max: number | null;
  experience_min: number;
  experience_max: number | null;
  description: string;
  responsibilities: string | null;
  qualifications: string | null;
  openings: number;
  status: string;
  posted_date: string;
  deadline: string | null;
  company_id: string;
  posted_by: string;
  companies: { id: string; name: string; logo_url: string | null; location: string | null; industry: string | null; description: string | null; website: string | null } | null;
  job_skills: { skills: { id: string; name: string } | null }[];
}

export const JOB_SELECT =
  "id, title, location, job_type, salary_min, salary_max, experience_min, experience_max, description, responsibilities, qualifications, openings, status, posted_date, deadline, company_id, posted_by, companies(id, name, logo_url, location, industry, description, website), job_skills(skills(id, name))";

export interface JobFilters {
  q?: string;
  location?: string;
  type?: string;
  exp?: string;
  salary?: string;
}

export async function fetchJobs(filters: JobFilters = {}, limit = 60): Promise<JobRow[]> {
  let query = supabase
    .from("jobs")
    .select(JOB_SELECT)
    .eq("status", "open")
    .order("posted_date", { ascending: false })
    .limit(limit);

  if (filters.q) query = query.ilike("title", `%${filters.q}%`);
  if (filters.location) query = query.ilike("location", `%${filters.location}%`);
  if (filters.type) query = query.eq("job_type", filters.type);
  if (filters.exp) query = query.lte("experience_min", Number(filters.exp));
  if (filters.salary) query = query.gte("salary_max", Number(filters.salary));

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as JobRow[];
}

export async function fetchJob(id: string): Promise<JobRow | null> {
  const { data, error } = await supabase.from("jobs").select(JOB_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as unknown as JobRow) ?? null;
}

export async function fetchPortalStats() {
  const [jobs, companies, seekers, applications] = await Promise.all([
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("companies").select("id", { count: "exact", head: true }),
    supabase.from("skills").select("id", { count: "exact", head: true }),
    supabase.from("jobs").select("id", { count: "exact", head: true }),
  ]);
  return {
    openJobs: jobs.count ?? 0,
    companies: companies.count ?? 0,
    skills: seekers.count ?? 0,
    totalJobs: applications.count ?? 0,
  };
}
