export type ProjectStatus = "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";
export type ProjectHealth = "ON_TRACK" | "NEED_ATTENTION" | "BLOCKED" | "COMPLETED";
export type MilestoneStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "WAITING_VALIDATION"
  | "REVISION"
  | "DONE"
  | "BLOCKED";

export type SetupStatus = "DRAFT" | "READY" | "PUBLISHED";

export type ProjectStaffOption = {
  staff_id: string;
  name: string;
  position: string;
};

export type ProjectMilestoneStepDto = {
  id: string;
  milestone_id: string;
  item_text: string;
  is_required: boolean;
  requires_evidence: boolean;
  is_checked: boolean;
  note: string;
  evidence_url: string | null;
  completed_by_staff_id: string | null;
  completed_at: string | null;
  sort_order: number;
};

export type ProjectMilestoneReviewDto = {
  id: string;
  milestone_id: string;
  submitted_by_staff_id: string;
  submitted_by_name: string;
  submitted_at: string;
  status: "PENDING" | "APPROVED" | "REVISION";
  reviewed_by: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  review_note: string;
  /** Kondisi checklist saat diajukan (riwayat, tidak ditimpa). */
  snapshot: {
    item_text: string;
    is_required: boolean;
    is_checked: boolean;
    note: string;
    evidence_url: string | null;
  }[];
};

export type ProjectPicLinkDto = {
  id: string;
  project_id: string;
  staff_id: string;
  staff_name: string;
  short_code: string;
  path: string;
  is_active: boolean;
};

export type ProjectMilestoneDto = {
  id: string;
  workstream_id: string;
  title: string;
  description: string;
  weight: number;
  status: MilestoneStatus;
  deadline: string | null;
  evidence_url: string | null;
  completed_at: string | null;
  sort_order: number;
  steps: ProjectMilestoneStepDto[];
  latest_review: ProjectMilestoneReviewDto | null;
  /** Semua pengajuan, terbaru dulu (riwayat submission/revisi). */
  reviews: ProjectMilestoneReviewDto[];
  active_blockers: number;
};

export type ProjectBlockerDto = {
  id: string;
  project_id: string;
  workstream_id: string | null;
  milestone_id: string | null;
  milestone_title: string | null;
  workstream_name: string | null;
  reported_by_name: string;
  text: string;
  created_at: string;
};

export type ProjectActivityDto = {
  id: string;
  action: string;
  actor_type: "PIC" | "OWNER" | "SYSTEM";
  actor_name: string | null;
  message: string;
  milestone_id: string | null;
  created_at: string;
};

export type ProjectReadinessDto = {
  ready: boolean;
  missing: string[];
  details: string[];
};

export type ProjectWorkstreamDto = {
  id: string;
  project_id: string;
  name: string;
  owner_staff_id: string | null;
  owner_name: string | null;
  weight: number;
  status: ProjectStatus;
  health: ProjectHealth;
  next_action: string | null;
  blocker: string | null;
  deadline: string | null;
  sort_order: number;
  progress: number;
  milestones: ProjectMilestoneDto[];
};

export type ProjectPendingValidationDto = {
  project_id: string;
  project_name: string;
  workstream_id: string;
  workstream_name: string;
  milestone_id: string;
  milestone_title: string;
  pic_name: string;
  submitted_at: string;
  steps_done: number;
  steps_total: number;
  evidence_count: number;
  deadline: string | null;
};

export type ProjectSummaryDto = {
  id: string;
  project_key: string;
  name: string;
  goal: string | null;
  lead_staff_id: string | null;
  lead_name: string | null;
  status: ProjectStatus;
  health: ProjectHealth;
  start_date: string | null;
  deadline: string | null;
  next_action: string | null;
  blocker: string | null;
  progress: number;
  workstream_count: number;
  created_by: string | null;
  setup_status: SetupStatus;
  published_at: string | null;
  /** Health hasil hitung otomatis (atau override owner). */
  health_derived: ProjectHealth;
  health_override: ProjectHealth | null;
  milestone_total: number;
  milestone_done: number;
  waiting_validation: number;
  revision: number;
  active_blockers: number;
  overdue: number;
  pic_names: string[];
  /** Fokus berikutnya: pinned next_action, atau langkah wajib pertama yang belum selesai. */
  focus_text: string | null;
};

export type ProjectDetailDto = ProjectSummaryDto & {
  workstreams: ProjectWorkstreamDto[];
  readiness: ProjectReadinessDto;
  blockers: ProjectBlockerDto[];
  activity: ProjectActivityDto[];
  weight_warning: boolean;
};

export type ProjectPicWorkloadDto = {
  staff_id: string;
  name: string;
  projects: {
    project_id: string;
    project_name: string;
    role: "PIC_UTAMA" | "BAGIAN";
    workstream_names: string[];
    progress: number;
    waiting_validation: number;
    overdue: number;
  }[];
};


export type ProjectPicViewDto = {
  /** PREPARING = struktur belum dipublish / belum ada pekerjaan untuk PIC ini. */
  state: "READY" | "PREPARING";
  staff: {
    staff_id: string;
    name: string;
    position: string;
  };
  project: {
    id: string;
    name: string;
    goal: string | null;
    deadline: string | null;
    /** Progress tanggung jawab PIC ini (bukan seluruh project) bila PIC bagian. */
    progress: number;
    milestone_done: number;
    milestone_total: number;
  };
  scope: "ALL" | "OWN";
  link: ProjectPicLinkDto;
  workstreams: ProjectWorkstreamDto[];
  focus: {
    milestone_id: string;
    milestone_title: string;
    step_id: string | null;
    step_text: string | null;
    status: string;
  } | null;
  blockers: ProjectBlockerDto[];
};
