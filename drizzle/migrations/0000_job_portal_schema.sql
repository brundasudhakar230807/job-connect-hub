-- =========================================================
-- JOB PORTAL & RECRUITMENT SYSTEM - relational schema
-- =========================================================

CREATE TYPE public.app_role AS ENUM ('job_seeker', 'recruiter', 'admin');

-- ---------- profiles ----------
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ---------- roles ----------
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin');
$$;

-- ---------- companies ----------
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  industry TEXT,
  website TEXT,
  location TEXT,
  company_size TEXT,
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.companies TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- ---------- recruiters ----------
CREATE TABLE public.recruiters (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  designation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT recruiters_profile_fk FOREIGN KEY (id) REFERENCES public.profiles(id) ON DELETE CASCADE
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recruiters TO authenticated;
GRANT ALL ON public.recruiters TO service_role;
ALTER TABLE public.recruiters ENABLE ROW LEVEL SECURITY;

-- ---------- job seekers ----------
CREATE TABLE public.job_seekers (
  id UUID PRIMARY KEY,
  headline TEXT,
  bio TEXT,
  location TEXT,
  experience_years NUMERIC(4,1) NOT NULL DEFAULT 0 CHECK (experience_years >= 0),
  expected_salary INTEGER CHECK (expected_salary IS NULL OR expected_salary >= 0),
  linkedin_url TEXT,
  portfolio_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT job_seekers_profile_fk FOREIGN KEY (id) REFERENCES public.profiles(id) ON DELETE CASCADE
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_seekers TO authenticated;
GRANT ALL ON public.job_seekers TO service_role;
ALTER TABLE public.job_seekers ENABLE ROW LEVEL SECURITY;

-- helper: company of the current recruiter
CREATE OR REPLACE FUNCTION public.my_company_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT company_id FROM public.recruiters WHERE id = auth.uid();
$$;

-- ---------- jobs ----------
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  posted_by UUID NOT NULL,
  title TEXT NOT NULL,
  location TEXT NOT NULL,
  job_type TEXT NOT NULL DEFAULT 'Full-time'
    CHECK (job_type IN ('Full-time','Part-time','Internship','Contract','Remote','Freelance')),
  salary_min INTEGER CHECK (salary_min IS NULL OR salary_min >= 0),
  salary_max INTEGER CHECK (salary_max IS NULL OR salary_max >= 0),
  experience_min NUMERIC(4,1) NOT NULL DEFAULT 0 CHECK (experience_min >= 0),
  experience_max NUMERIC(4,1),
  description TEXT NOT NULL,
  responsibilities TEXT,
  qualifications TEXT,
  openings INTEGER NOT NULL DEFAULT 1 CHECK (openings > 0),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','removed')),
  posted_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  deadline DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT jobs_salary_range CHECK (salary_max IS NULL OR salary_min IS NULL OR salary_max >= salary_min)
);
CREATE INDEX jobs_company_idx ON public.jobs(company_id);
CREATE INDEX jobs_status_idx ON public.jobs(status);
GRANT SELECT ON public.jobs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- helper: does the current user recruit for the company owning this job?
CREATE OR REPLACE FUNCTION public.owns_job(_job_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.jobs j
    JOIN public.recruiters r ON r.company_id = j.company_id
    WHERE j.id = _job_id AND r.id = auth.uid()
  );
$$;

-- ---------- skills ----------
CREATE TABLE public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.skills TO anon;
GRANT SELECT, INSERT ON public.skills TO authenticated;
GRANT ALL ON public.skills TO service_role;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.job_skills (
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  PRIMARY KEY (job_id, skill_id)
);
GRANT SELECT ON public.job_skills TO anon;
GRANT SELECT, INSERT, DELETE ON public.job_skills TO authenticated;
GRANT ALL ON public.job_skills TO service_role;
ALTER TABLE public.job_skills ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.job_seeker_skills (
  job_seeker_id UUID NOT NULL REFERENCES public.job_seekers(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  proficiency TEXT NOT NULL DEFAULT 'Intermediate'
    CHECK (proficiency IN ('Beginner','Intermediate','Advanced','Expert')),
  PRIMARY KEY (job_seeker_id, skill_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_seeker_skills TO authenticated;
GRANT ALL ON public.job_seeker_skills TO service_role;
ALTER TABLE public.job_seeker_skills ENABLE ROW LEVEL SECURITY;

-- ---------- education / experience ----------
CREATE TABLE public.education (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_seeker_id UUID NOT NULL REFERENCES public.job_seekers(id) ON DELETE CASCADE,
  degree TEXT NOT NULL,
  institution TEXT NOT NULL,
  field_of_study TEXT,
  start_year INTEGER CHECK (start_year IS NULL OR (start_year > 1950 AND start_year < 2100)),
  end_year INTEGER CHECK (end_year IS NULL OR (end_year > 1950 AND end_year < 2100)),
  grade TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.education TO authenticated;
GRANT ALL ON public.education TO service_role;
ALTER TABLE public.education ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_seeker_id UUID NOT NULL REFERENCES public.job_seekers(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  designation TEXT NOT NULL,
  location TEXT,
  start_date DATE,
  end_date DATE,
  is_current BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.experiences TO authenticated;
GRANT ALL ON public.experiences TO service_role;
ALTER TABLE public.experiences ENABLE ROW LEVEL SECURITY;

-- ---------- resumes ----------
CREATE TABLE public.resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_seeker_id UUID NOT NULL REFERENCES public.job_seekers(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL CHECK (file_size > 0 AND file_size <= 5242880),
  mime_type TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT true,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resumes TO authenticated;
GRANT ALL ON public.resumes TO service_role;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;

-- ---------- applications ----------
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  job_seeker_id UUID NOT NULL REFERENCES public.job_seekers(id) ON DELETE CASCADE,
  resume_id UUID REFERENCES public.resumes(id) ON DELETE SET NULL,
  cover_letter TEXT,
  status TEXT NOT NULL DEFAULT 'Applied'
    CHECK (status IN ('Applied','Under Review','Shortlisted','Interview','Selected','Rejected')),
  recruiter_notes TEXT,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, job_seeker_id)
);
CREATE INDEX applications_job_idx ON public.applications(job_id);
CREATE INDEX applications_seeker_idx ON public.applications(job_seeker_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- helper: can the current user view this seeker's profile data?
CREATE OR REPLACE FUNCTION public.can_view_seeker(_seeker_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() = _seeker_id
      OR public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.applications a
        JOIN public.jobs j ON j.id = a.job_id
        JOIN public.recruiters r ON r.company_id = j.company_id
        WHERE a.job_seeker_id = _seeker_id AND r.id = auth.uid()
      );
$$;

-- =========================================================
-- POLICIES
-- =========================================================

-- profiles
CREATE POLICY "profiles select" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin() OR public.can_view_seeker(id));
CREATE POLICY "profiles insert own" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "profiles update own" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin()) WITH CHECK (id = auth.uid() OR public.is_admin());
CREATE POLICY "profiles admin delete" ON public.profiles FOR DELETE TO authenticated
  USING (public.is_admin());

-- user_roles (read only from the client; writes happen server-side)
CREATE POLICY "roles select" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- companies
CREATE POLICY "companies public read" ON public.companies FOR SELECT TO anon, authenticated
  USING (is_active OR public.is_admin());
CREATE POLICY "companies recruiter insert" ON public.companies FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND public.has_role(auth.uid(), 'recruiter'));
CREATE POLICY "companies update" ON public.companies FOR UPDATE TO authenticated
  USING (id = public.my_company_id() OR public.is_admin())
  WITH CHECK (id = public.my_company_id() OR public.is_admin());
CREATE POLICY "companies admin delete" ON public.companies FOR DELETE TO authenticated
  USING (public.is_admin());

-- recruiters
CREATE POLICY "recruiters select" ON public.recruiters FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "recruiters insert own" ON public.recruiters FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() AND public.has_role(auth.uid(), 'recruiter'));
CREATE POLICY "recruiters update own" ON public.recruiters FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin()) WITH CHECK (id = auth.uid() OR public.is_admin());
CREATE POLICY "recruiters admin delete" ON public.recruiters FOR DELETE TO authenticated
  USING (public.is_admin());

-- job seekers
CREATE POLICY "seekers select" ON public.job_seekers FOR SELECT TO authenticated
  USING (public.can_view_seeker(id));
CREATE POLICY "seekers insert own" ON public.job_seekers FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "seekers update own" ON public.job_seekers FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin()) WITH CHECK (id = auth.uid() OR public.is_admin());
CREATE POLICY "seekers admin delete" ON public.job_seekers FOR DELETE TO authenticated
  USING (public.is_admin());

-- jobs
CREATE POLICY "jobs public read" ON public.jobs FOR SELECT TO anon, authenticated
  USING (status <> 'removed');
CREATE POLICY "jobs owner read" ON public.jobs FOR SELECT TO authenticated
  USING (company_id = public.my_company_id() OR public.is_admin());
CREATE POLICY "jobs recruiter insert" ON public.jobs FOR INSERT TO authenticated
  WITH CHECK (posted_by = auth.uid() AND company_id = public.my_company_id());
CREATE POLICY "jobs update" ON public.jobs FOR UPDATE TO authenticated
  USING (company_id = public.my_company_id() OR public.is_admin())
  WITH CHECK (company_id = public.my_company_id() OR public.is_admin());
CREATE POLICY "jobs delete" ON public.jobs FOR DELETE TO authenticated
  USING (company_id = public.my_company_id() OR public.is_admin());

-- skills
CREATE POLICY "skills read" ON public.skills FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "skills insert" ON public.skills FOR INSERT TO authenticated WITH CHECK (true);

-- job_skills
CREATE POLICY "job skills read" ON public.job_skills FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "job skills insert" ON public.job_skills FOR INSERT TO authenticated
  WITH CHECK (public.owns_job(job_id) OR public.is_admin());
CREATE POLICY "job skills delete" ON public.job_skills FOR DELETE TO authenticated
  USING (public.owns_job(job_id) OR public.is_admin());

-- job_seeker_skills
CREATE POLICY "seeker skills read" ON public.job_seeker_skills FOR SELECT TO authenticated
  USING (public.can_view_seeker(job_seeker_id));
CREATE POLICY "seeker skills write" ON public.job_seeker_skills FOR INSERT TO authenticated
  WITH CHECK (job_seeker_id = auth.uid());
CREATE POLICY "seeker skills update" ON public.job_seeker_skills FOR UPDATE TO authenticated
  USING (job_seeker_id = auth.uid()) WITH CHECK (job_seeker_id = auth.uid());
CREATE POLICY "seeker skills delete" ON public.job_seeker_skills FOR DELETE TO authenticated
  USING (job_seeker_id = auth.uid() OR public.is_admin());

-- education
CREATE POLICY "education read" ON public.education FOR SELECT TO authenticated
  USING (public.can_view_seeker(job_seeker_id));
CREATE POLICY "education insert" ON public.education FOR INSERT TO authenticated
  WITH CHECK (job_seeker_id = auth.uid());
CREATE POLICY "education update" ON public.education FOR UPDATE TO authenticated
  USING (job_seeker_id = auth.uid()) WITH CHECK (job_seeker_id = auth.uid());
CREATE POLICY "education delete" ON public.education FOR DELETE TO authenticated
  USING (job_seeker_id = auth.uid() OR public.is_admin());

-- experiences
CREATE POLICY "experiences read" ON public.experiences FOR SELECT TO authenticated
  USING (public.can_view_seeker(job_seeker_id));
CREATE POLICY "experiences insert" ON public.experiences FOR INSERT TO authenticated
  WITH CHECK (job_seeker_id = auth.uid());
CREATE POLICY "experiences update" ON public.experiences FOR UPDATE TO authenticated
  USING (job_seeker_id = auth.uid()) WITH CHECK (job_seeker_id = auth.uid());
CREATE POLICY "experiences delete" ON public.experiences FOR DELETE TO authenticated
  USING (job_seeker_id = auth.uid() OR public.is_admin());

-- resumes
CREATE POLICY "resumes read" ON public.resumes FOR SELECT TO authenticated
  USING (public.can_view_seeker(job_seeker_id));
CREATE POLICY "resumes insert" ON public.resumes FOR INSERT TO authenticated
  WITH CHECK (job_seeker_id = auth.uid());
CREATE POLICY "resumes update" ON public.resumes FOR UPDATE TO authenticated
  USING (job_seeker_id = auth.uid()) WITH CHECK (job_seeker_id = auth.uid());
CREATE POLICY "resumes delete" ON public.resumes FOR DELETE TO authenticated
  USING (job_seeker_id = auth.uid() OR public.is_admin());

-- applications
CREATE POLICY "applications read" ON public.applications FOR SELECT TO authenticated
  USING (job_seeker_id = auth.uid() OR public.owns_job(job_id) OR public.is_admin());
CREATE POLICY "applications insert" ON public.applications FOR INSERT TO authenticated
  WITH CHECK (job_seeker_id = auth.uid() AND public.has_role(auth.uid(), 'job_seeker'));
CREATE POLICY "applications update" ON public.applications FOR UPDATE TO authenticated
  USING (public.owns_job(job_id) OR public.is_admin())
  WITH CHECK (public.owns_job(job_id) OR public.is_admin());
CREATE POLICY "applications delete" ON public.applications FOR DELETE TO authenticated
  USING (job_seeker_id = auth.uid() OR public.is_admin());

-- =========================================================
-- TRIGGERS
-- =========================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER companies_touch BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER jobs_touch BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER seekers_touch BEFORE UPDATE ON public.job_seekers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER applications_touch BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- new auth user -> profile + role (role comes from signup metadata)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  chosen_role public.app_role;
BEGIN
  chosen_role := CASE
    WHEN NEW.raw_user_meta_data ->> 'role' = 'recruiter' THEN 'recruiter'::public.app_role
    ELSE 'job_seeker'::public.app_role
  END;

  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.email, ''),
    NEW.raw_user_meta_data ->> 'phone'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, chosen_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  IF chosen_role = 'job_seeker' THEN
    INSERT INTO public.job_seekers (id) VALUES (NEW.id) ON CONFLICT (id) DO NOTHING;
  ELSE
    INSERT INTO public.recruiters (id) VALUES (NEW.id) ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- seed skills
INSERT INTO public.skills (name) VALUES
  ('JavaScript'),('TypeScript'),('React'),('Node.js'),('Express.js'),('Python'),('Java'),('C++'),
  ('SQL'),('PostgreSQL'),('MongoDB'),('HTML5'),('CSS3'),('Bootstrap'),('Git'),('Docker'),
  ('AWS'),('Machine Learning'),('Data Analysis'),('Communication'),('Teamwork'),('Problem Solving'),
  ('Digital Marketing'),('UI/UX Design'),('Android'),('Flutter'),('PHP'),('Excel'),('Accounting'),('Sales')
ON CONFLICT (name) DO NOTHING;