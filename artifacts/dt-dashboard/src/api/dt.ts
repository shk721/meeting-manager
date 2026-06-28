import { apiFetch } from "./client";

// ─── Types (mirror DB shape returned by API) ────────────────────────────────

export interface DtTaskUpdate {
  id: number;
  taskId: number;
  note: string;
  auto?: string | null;
  by?: string | null;
  createdAt: string;
}

export interface DtTask {
  id: number;
  componentId: number;
  title: string;
  status: string;
  assignee: string;
  createdAt: string;
  updatedAt: string;
  updates: DtTaskUpdate[];
}

export interface DtComponent {
  id: number;
  subplanId: number;
  driver: string;
  title: string;
  desc: string;
  priority: string;
  refYear: number;
  createdAt: string;
  updatedAt: string;
  tasks: DtTask[];
}

export interface DtResource {
  id: number;
  subplanId: number;
  name: string;
  role: string;
  allocation: number;
}

export interface DtSubplan {
  id: number;
  projectId: number;
  title: string;
  status: string;
  progress: number;
  deadline: string;
  createdAt: string;
  updatedAt: string;
  resources: DtResource[];
  components: DtComponent[];
}

export interface DtProject {
  id: number;
  title: string;
  deadline: string;
  createdAt: string;
  updatedAt: string;
  subplans: DtSubplan[];
}

export interface DtSnapshot {
  id: number;
  projectId: number;
  label: string;
  period: string;
  metrics: Record<string, unknown>;
  createdAt: string;
}

// ─── Projects ────────────────────────────────────────────────────────────────

export function listProjects(): Promise<Omit<DtProject, "subplans">[]> {
  return apiFetch("/api/dt-projects");
}

export function getProject(id: number): Promise<DtProject> {
  return apiFetch(`/api/dt-projects/${id}`);
}

export function createProject(data: { title: string; deadline: string }): Promise<DtProject> {
  return apiFetch("/api/dt-projects", { method: "POST", body: JSON.stringify(data) });
}

export function updateProject(id: number, data: Partial<{ title: string; deadline: string }>): Promise<DtProject> {
  return apiFetch(`/api/dt-projects/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export function deleteProject(id: number): Promise<void> {
  return apiFetch(`/api/dt-projects/${id}`, { method: "DELETE" });
}

// ─── Sub-plans ───────────────────────────────────────────────────────────────

export function createSubplan(projectId: number, data: { title: string; deadline: string; status?: string; progress?: number }): Promise<DtSubplan> {
  return apiFetch(`/api/dt-projects/${projectId}/subplans`, { method: "POST", body: JSON.stringify(data) });
}

export function updateSubplan(id: number, data: Partial<{ title: string; status: string; progress: number; deadline: string }>): Promise<DtSubplan> {
  return apiFetch(`/api/dt-subplans/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export function deleteSubplan(id: number): Promise<void> {
  return apiFetch(`/api/dt-subplans/${id}`, { method: "DELETE" });
}

// ─── Resources ───────────────────────────────────────────────────────────────

export function createResource(subplanId: number, data: { name: string; role: string; allocation?: number }): Promise<DtResource> {
  return apiFetch(`/api/dt-subplans/${subplanId}/resources`, { method: "POST", body: JSON.stringify(data) });
}

export function updateResource(id: number, data: Partial<{ name: string; role: string; allocation: number }>): Promise<DtResource> {
  return apiFetch(`/api/dt-resources/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export function deleteResource(id: number): Promise<void> {
  return apiFetch(`/api/dt-resources/${id}`, { method: "DELETE" });
}

// ─── Components ──────────────────────────────────────────────────────────────

export function createComponent(subplanId: number, data: { driver: string; title: string; desc?: string; priority?: string; refYear?: number }): Promise<DtComponent> {
  return apiFetch(`/api/dt-subplans/${subplanId}/components`, { method: "POST", body: JSON.stringify(data) });
}

export function updateComponent(id: number, data: Partial<{ driver: string; title: string; desc: string; priority: string; refYear: number }>): Promise<DtComponent> {
  return apiFetch(`/api/dt-components/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export function deleteComponent(id: number): Promise<void> {
  return apiFetch(`/api/dt-components/${id}`, { method: "DELETE" });
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

export function createTask(componentId: number, data: { title: string; status?: string; assignee?: string }): Promise<DtTask> {
  return apiFetch(`/api/dt-components/${componentId}/tasks`, { method: "POST", body: JSON.stringify(data) });
}

export function updateTask(id: number, data: Partial<{ title: string; status: string; assignee: string }>): Promise<DtTask> {
  return apiFetch(`/api/dt-tasks/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export function deleteTask(id: number): Promise<void> {
  return apiFetch(`/api/dt-tasks/${id}`, { method: "DELETE" });
}

export function addTaskUpdate(taskId: number, data: { note: string; auto?: string; by?: string }): Promise<DtTaskUpdate> {
  return apiFetch(`/api/dt-tasks/${taskId}/updates`, { method: "POST", body: JSON.stringify(data) });
}

// ─── Snapshots ───────────────────────────────────────────────────────────────

export function listSnapshots(projectId: number): Promise<DtSnapshot[]> {
  return apiFetch(`/api/dt-projects/${projectId}/snapshots`);
}

export function createSnapshot(projectId: number, data: { label: string; period?: string; metrics: Record<string, unknown> }): Promise<DtSnapshot> {
  return apiFetch(`/api/dt-projects/${projectId}/snapshots`, { method: "POST", body: JSON.stringify(data) });
}

export function deleteSnapshot(id: number): Promise<void> {
  return apiFetch(`/api/dt-snapshots/${id}`, { method: "DELETE" });
}
