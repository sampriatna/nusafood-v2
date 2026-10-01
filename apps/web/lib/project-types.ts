export type ProjectStatus = "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";
export type ProjectHealth = "ON_TRACK" | "NEED_ATTENTION" | "BLOCKED" | "COMPLETED";
export type MilestoneStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "WAITING_VALIDATION"
  | "REVISION"
  | "DONE"
  | "BLOCKED";

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
};

export type ProjectDetailDto = ProjectSummaryDto & {
  workstreams: ProjectWorkstreamDto[];
};


export type ProjectPicViewDto = {
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
    next_action: string | null;
    progress: number;
  };
  link: ProjectPicLinkDto;
  workstreams: ProjectWorkstreamDto[];
};
