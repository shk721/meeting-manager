import { apiFetch } from "./client";

export interface User {
  id: number;
  username: string;
  fullName: string;
  email: string;
  role: string;
  department: string | null;
}

export interface Representative {
  id: number;
  committeeId: number;
  role: "head" | "member" | "alternate";
  userId: number | null;
  user: User | null;
  externalName: string | null;
  externalEmail: string | null;
  createdAt: string;
}

export interface CommitteeSession {
  id: number;
  committeeId: number;
  title: string;
  date: string;
  location: string | null;
  status: "scheduled" | "completed" | "cancelled";
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CommitteeDecision {
  id: number;
  committeeId: number;
  sessionId: number | null;
  content: string;
  notes: string | null;
  dueDate: string | null;
  createdAt: string;
}

export interface CommitteeOutgoing {
  id: number;
  committeeId: number;
  sessionId: number | null;
  subject: string;
  content: string | null;
  sentDate: string | null;
  sentById: number | null;
  createdAt: string;
}

export interface CommitteeTask {
  id: number;
  title: string;
  status: string;
  priority: string;
  completionPercent: number;
  dueDate: string | null;
  committeeId: number;
}

export interface Committee {
  id: number;
  name: string;
  type: "external" | "internal";
  organization: string | null;
  description: string | null;
  frequency: string | null;
  status: "active" | "inactive" | "archived";
  createdAt: string;
  updatedAt: string;
}

export interface CommitteeFull extends Committee {
  representatives: Representative[];
  sessions: CommitteeSession[];
  decisions: CommitteeDecision[];
  outgoing: CommitteeOutgoing[];
  tasks: CommitteeTask[];
}

// ─── Committees ───────────────────────────────────────────────────────────────

export function listCommittees(): Promise<Committee[]> {
  return apiFetch("/api/committees");
}

export function getCommittee(id: number): Promise<CommitteeFull> {
  return apiFetch(`/api/committees/${id}`);
}

export function createCommittee(data: {
  name: string; type?: "external" | "internal"; organization?: string;
  description?: string; frequency?: string; status?: "active" | "inactive" | "archived";
}): Promise<Committee> {
  return apiFetch("/api/committees", { method: "POST", body: JSON.stringify(data) });
}

export function updateCommittee(id: number, data: Partial<{
  name: string; type: "external" | "internal"; organization: string;
  description: string; frequency: string; status: "active" | "inactive" | "archived";
}>): Promise<Committee> {
  return apiFetch(`/api/committees/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export function deleteCommittee(id: number): Promise<void> {
  return apiFetch(`/api/committees/${id}`, { method: "DELETE" });
}

// ─── Representatives ─────────────────────────────────────────────────────────

export function addRepresentative(committeeId: number, data: {
  userId?: number; externalName?: string; externalEmail?: string; role?: "head" | "member" | "alternate";
}): Promise<Representative> {
  return apiFetch(`/api/committees/${committeeId}/representatives`, { method: "POST", body: JSON.stringify(data) });
}

export function deleteRepresentative(id: number): Promise<void> {
  return apiFetch(`/api/committee-representatives/${id}`, { method: "DELETE" });
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export function addSession(committeeId: number, data: {
  title: string; date: string; location?: string; status?: "scheduled" | "completed" | "cancelled"; notes?: string;
}): Promise<CommitteeSession> {
  return apiFetch(`/api/committees/${committeeId}/sessions`, { method: "POST", body: JSON.stringify(data) });
}

export function updateSession(id: number, data: Partial<{
  title: string; date: string; location: string; status: "scheduled" | "completed" | "cancelled"; notes: string;
}>): Promise<CommitteeSession> {
  return apiFetch(`/api/committee-sessions/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export function deleteSession(id: number): Promise<void> {
  return apiFetch(`/api/committee-sessions/${id}`, { method: "DELETE" });
}

// ─── Decisions ────────────────────────────────────────────────────────────────

export function addDecision(committeeId: number, data: {
  sessionId?: number; content: string; notes?: string; dueDate?: string; assigneeId?: number;
}): Promise<CommitteeDecision & { task: CommitteeTask }> {
  return apiFetch(`/api/committees/${committeeId}/decisions`, { method: "POST", body: JSON.stringify(data) });
}

export function deleteDecision(id: number): Promise<void> {
  return apiFetch(`/api/committee-decisions/${id}`, { method: "DELETE" });
}

// ─── Outgoing ─────────────────────────────────────────────────────────────────

export function addOutgoing(committeeId: number, data: {
  sessionId?: number; subject: string; content?: string; sentDate?: string;
}): Promise<CommitteeOutgoing> {
  return apiFetch(`/api/committees/${committeeId}/outgoing`, { method: "POST", body: JSON.stringify(data) });
}

export function deleteOutgoing(id: number): Promise<void> {
  return apiFetch(`/api/committee-outgoing/${id}`, { method: "DELETE" });
}
