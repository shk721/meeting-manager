import { apiFetch } from "./client";
import type { Committee, CommitteeDecision } from "./committees";

export interface PortalTask {
  id: number;
  title: string;
  status: string;
  priority: string;
  completionPercent: number;
  dueDate: string | null;
  meetingId: number | null;
  decisionId: number | null;
  componentId: number | null;
  committeeId: number | null;
}

export interface PortalCommittee extends Committee {
  myRole: "head" | "member" | "alternate";
}

export interface PortalDtComponent {
  id: number;
  subplanId: number;
  driver: string;
  title: string;
  priority: string;
}

export interface PortalMeeting {
  id: number;
  title: string;
  date: string | null;
  time: string | null;
  location: string | null;
  status: string;
}

export interface PortalSummary {
  user: {
    id: number; username: string; fullName: string; email: string;
    role: string; department: string | null;
  };
  tasks: PortalTask[];
  committees: PortalCommittee[];
  committeeDecisions: CommitteeDecision[];
  dtComponents: PortalDtComponent[];
  upcomingMeetings: PortalMeeting[];
}

export function getPortalSummary(username: string): Promise<PortalSummary> {
  return apiFetch(`/api/portal/${encodeURIComponent(username)}`);
}
