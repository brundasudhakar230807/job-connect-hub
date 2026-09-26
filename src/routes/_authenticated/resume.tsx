import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { DashboardLayout, RoleGuard } from "@/components/DashboardLayout";
import { Alert, Loading } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/lib/portal";

export const Route = createFileRoute("/_authenticated/resume")({
  head: () => ({
    meta: [
      { title: "My Resume — JobPortal" },
      { name: "description", content: "Upload, replace and download the resume recruiters receive with your applications." },
      { property: "og:title", content: "My Resume — JobPortal" },
      { property: "og:description", content: "Manage the resume attached to your applications." },
    ],
  }),
  component: ResumePage,
});

const ALLOWED = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_BYTES = 5 * 1024 * 1024;

function ResumePage() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: resumes, isLoading } = useQuery({
    queryKey: ["resumes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error: dbError } = await supabase
        .from("resumes")
        .select("*")
        .eq("job_seeker_id", user!.id)
        .order("uploaded_at", { ascending: false });
      if (dbError) throw dbError;
      return data;
    },
  });

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["resumes"] });
    void queryClient.invalidateQueries({ queryKey: ["seeker-dashboard"] });
    void queryClient.invalidateQueries({ queryKey: ["seeker-profile"] });
  }

  async function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");
    const input = (e.currentTarget.elements.namedItem("resume") as HTMLInputElement) || null;
    const file = input?.files?.[0];
    if (!file) {
      setError("Choose a file first.");
      return;
    }
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED.includes(file.type) || !["pdf", "doc", "docx"].includes(ext)) {
      setError("Only PDF, DOC or DOCX files are allowed.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("File is too large. Maximum size is 5 MB.");
      return;
    }

    setBusy(true);
    const path = `${user!.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error: upErr } = await supabase.storage.from("resumes").upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (upErr) {
      setBusy(false);
      setError(upErr.message);
      return;
    }

    const makePrimary = (resumes?.length ?? 0) === 0;
    const { error: dbErr } = await supabase.from("resumes").insert({
      job_seeker_id: user!.id,
      file_name: file.name,
      file_path: path,
      file_size: file.size,
      mime_type: file.type,
      is_primary: makePrimary,
    });
    setBusy(false);
    if (dbErr) {
      await supabase.storage.from("resumes").remove([path]);
      setError(dbErr.message);
      return;
    }
    input.value = "";
    setMessage("Resume uploaded successfully.");
    refresh();
  }

  async function download(path: string, name: string) {
    const { data, error: dlErr } = await supabase.storage.from("resumes").download(path);
    if (dlErr || !data) {
      setError(dlErr?.message ?? "Could not download the file.");
      return;
    }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function makePrimary(id: string) {
    await supabase.from("resumes").update({ is_primary: false }).eq("job_seeker_id", user!.id);
    await supabase.from("resumes").update({ is_primary: true }).eq("id", id);
    setMessage("Default resume updated.");
    refresh();
  }

  async function remove(id: string, path: string) {
    setError("");
    const { error: dbErr } = await supabase.from("resumes").delete().eq("id", id);
    if (dbErr) {
      setError(dbErr.message);
      return;
    }
    await supabase.storage.from("resumes").remove([path]);
    setMessage("Resume deleted.");
    refresh();
  }

  return (
    <RoleGuard allow="job_seeker" role={role}>
      <DashboardLayout title="Resume" subtitle="PDF, DOC or DOCX · up to 5 MB">
        <Alert kind="success" message={message} />
        <Alert kind="danger" message={error} />

        <form className="jp-card p-4 mb-4" onSubmit={onUpload}>
          <label className="form-label" htmlFor="resume">Upload a new resume</label>
          <div className="row g-2">
            <div className="col-md-8">
              <input id="resume" name="resume" type="file" className="form-control" accept=".pdf,.doc,.docx" required />
            </div>
            <div className="col-md-4 d-grid">
              <button className="btn btn-accent" disabled={busy}>{busy ? "Uploading…" : "Upload resume"}</button>
            </div>
          </div>
          <p className="small jp-muted mt-2 mb-0">
            Your file is stored privately. Only you, and recruiters you have applied to, can open it.
          </p>
        </form>

        <div className="jp-card p-4">
          <h2 className="h6 mb-3">My files</h2>
          {isLoading ? (
            <Loading rows={2} />
          ) : (resumes?.length ?? 0) === 0 ? (
            <p className="jp-muted small mb-0">No resume uploaded yet.</p>
          ) : (
            <div className="table-responsive">
              <table className="table jp-table align-middle mb-0">
                <thead><tr><th>File</th><th>Size</th><th>Uploaded</th><th /></tr></thead>
                <tbody>
                  {resumes?.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <span className="fw-semibold">{r.file_name}</span>
                        {r.is_primary && <span className="badge text-bg-success ms-2">Default</span>}
                      </td>
                      <td className="jp-muted small">{(r.file_size / 1024).toFixed(0)} KB</td>
                      <td className="jp-muted small">{formatDate(r.uploaded_at)}</td>
                      <td className="text-end">
                        <div className="d-inline-flex gap-2 flex-wrap">
                          <button className="btn btn-sm btn-light border" onClick={() => void download(r.file_path, r.file_name)}>Download</button>
                          {!r.is_primary && <button className="btn btn-sm btn-outline-navy" onClick={() => void makePrimary(r.id)}>Set default</button>}
                          <button className="btn btn-sm btn-outline-danger" onClick={() => void remove(r.id, r.file_path)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DashboardLayout>
    </RoleGuard>
  );
}
