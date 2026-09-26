export type AppRole = "job_seeker" | "recruiter" | "admin";

export const APPLICATION_STATUSES = [
  "Applied",
  "Under Review",
  "Shortlisted",
  "Interview",
  "Selected",
  "Rejected",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const JOB_TYPES = [
  "Full-time",
  "Part-time",
  "Internship",
  "Contract",
  "Remote",
  "Freelance",
] as const;

export function statusClass(status: string): string {
  switch (status) {
    case "Applied":
      return "jp-status jp-status-applied";
    case "Under Review":
      return "jp-status jp-status-review";
    case "Shortlisted":
      return "jp-status jp-status-shortlisted";
    case "Interview":
      return "jp-status jp-status-interview";
    case "Selected":
      return "jp-status jp-status-selected";
    case "Rejected":
      return "jp-status jp-status-rejected";
    default:
      return "jp-status jp-status-applied";
  }
}

export function formatSalary(min: number | null, max: number | null): string {
  const fmt = (n: number) =>
    n >= 100000 ? `${(n / 100000).toFixed(1).replace(/\.0$/, "")} LPA` : `₹${n.toLocaleString("en-IN")}`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  if (max) return `Up to ${fmt(max)}`;
  return "Not disclosed";
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function timeAgo(value: string | null | undefined): string {
  if (!value) return "—";
  const diff = Date.now() - new Date(value).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function dashboardPathFor(role: AppRole | null): string {
  if (role === "admin") return "/admin";
  if (role === "recruiter") return "/recruiter/dashboard";
  return "/dashboard";
}
