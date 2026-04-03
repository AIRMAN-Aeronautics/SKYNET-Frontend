import { apiClient } from './client';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  roleLabel: string;
  avatarUrl: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  roles: { id: string; name: string; slug: string }[];
}

export interface AdminUserDetail extends AdminUser {
  permissions: string[];
}

export interface Role {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isSystem: boolean;
  permissionCount: number;
}

export interface RoleDetail extends Omit<Role, 'permissionCount'> {
  permissions: { key: string; resource: string; action: string }[];
}

export interface PermissionGroup {
  [resource: string]: { id: string; key: string; action: string; description: string }[];
}

export interface TenantInfo {
  id: string;
  name: string;
  slug: string | null;
  regulatoryFrameworkCode: string;
  timezone: string;
  logoUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  isActive: boolean;
  settings: Record<string, unknown>;
  staffCount: number;
  createdAt: string | null;
}

// ── Tenant ────────────────────────────────────────────────────────────────────

export const getTenant = async () => {
  const { data } = await apiClient.get('/admin/tenant');
  return data as TenantInfo;
};

export const updateTenant = async (body: Partial<{
  timezone: string;
  regulatory_framework_code: string;
  contact_email: string;
  contact_phone: string;
  settings: Record<string, unknown>;
}>) => {
  const { data } = await apiClient.patch('/admin/tenant', body);
  return data;
};

// ── Users ─────────────────────────────────────────────────────────────────────

export const getUsers = async (params?: {
  page?: number; limit?: number; search?: string; is_active?: boolean;
}) => {
  const { data } = await apiClient.get('/admin/users', { params });
  return data as { data: AdminUser[]; meta: { total: number; page: number; limit: number } };
};

export const getUser = async (id: string) => {
  const { data } = await apiClient.get(`/admin/users/${id}`);
  return data as AdminUserDetail;
};

export const inviteUser = async (body: {
  email: string; full_name: string; password: string; role_slugs: string[];
}) => {
  const { data } = await apiClient.post('/admin/users/invite', body);
  return data;
};

export const assignRoles = async (userId: string, role_slugs: string[]) => {
  const { data } = await apiClient.put(`/admin/users/${userId}/roles`, { role_slugs });
  return data;
};

export const deactivateUser = async (id: string) => {
  const { data } = await apiClient.patch(`/admin/users/${id}/deactivate`);
  return data;
};

export const activateUser = async (id: string) => {
  const { data } = await apiClient.patch(`/admin/users/${id}/activate`);
  return data;
};

// ── Roles ─────────────────────────────────────────────────────────────────────

export const getRoles = async () => {
  const { data } = await apiClient.get('/admin/roles');
  return data.roles as Role[];
};

export const getRole = async (id: string) => {
  const { data } = await apiClient.get(`/admin/roles/${id}`);
  return data as RoleDetail;
};

export const createRole = async (body: {
  name: string; slug: string; description?: string; permission_keys?: string[];
}) => {
  const { data } = await apiClient.post('/admin/roles', body);
  return data;
};

export const updateRolePermissions = async (id: string, permission_keys: string[]) => {
  const { data } = await apiClient.put(`/admin/roles/${id}/permissions`, { permission_keys });
  return data;
};

export const deleteRole = async (id: string) => {
  const { data } = await apiClient.delete(`/admin/roles/${id}`);
  return data;
};

export const getPermissions = async () => {
  const { data } = await apiClient.get('/admin/permissions');
  return data.permissions as PermissionGroup;
};

// ── Students ──────────────────────────────────────────────────────────────────

export interface StudentRecord {
  id: string;             // skynet_student_profiles.id
  userId: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  studentId: string | null;
  program: string;
  batchDate: string | null;
  notes: string | null;
  status: 'active' | 'inactive';
  createdSource: 1 | 2 | 3;
  instructorUserId: string | null;
  instructorName: string | null;
  enrolledAt: string | null;
}

export const getStudents = async (params?: {
  page?: number; limit?: number; search?: string;
  status?: string; program?: string; created_source?: number;
  unmapped_only?: boolean;
}) => {
  const { data } = await apiClient.get('/admin/students', { params });
  return data as { data: StudentRecord[]; meta: { total: number; page: number; limit: number } };
};

export const createStudent = async (body: {
  full_name: string; email: string; phone: string; student_id?: string;
  program: string; batch_date?: string; notes?: string;
}) => {
  const { data } = await apiClient.post('/admin/students', body);
  return data as StudentRecord;
};

export const bulkCreateStudents = async (students: {
  full_name: string; email: string; phone: string; student_id?: string;
  program: string; batch_date?: string; notes?: string;
}[]) => {
  const { data } = await apiClient.post('/admin/students/bulk', { students });
  return data as { created: number; students: StudentRecord[] };
};

export const activateStudent = async (id: string) => {
  const { data } = await apiClient.patch(`/admin/students/${id}/activate`);
  return data;
};

export const deactivateStudent = async (id: string) => {
  const { data } = await apiClient.patch(`/admin/students/${id}/deactivate`);
  return data;
};

// ── Instructors ───────────────────────────────────────────────────────────────

export interface InstructorRecord {
  id: string;             // skynet_instructors.id
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  instructorCode: string | null;
  specializations: string[];
  licenseNumber: string | null;
  licenseExpiry: string | null;
  notes: string | null;
  status: 'active' | 'inactive';
  createdAt: string | null;
}

export const getInstructors = async (params?: { search?: string; status?: string }) => {
  const { data } = await apiClient.get('/admin/instructors', { params });
  return data.data as InstructorRecord[];
};

export const createInstructor = async (body: {
  full_name: string; email: string; password?: string;
  phone?: string; instructor_code?: string; specializations?: string[];
  license_number?: string; license_expiry?: string; notes?: string;
}) => {
  const { data } = await apiClient.post('/admin/instructors', body);
  return data as InstructorRecord;
};

export const activateInstructor = async (id: string) => {
  const { data } = await apiClient.patch(`/admin/instructors/${id}/activate`);
  return data;
};

export const deactivateInstructor = async (id: string) => {
  const { data } = await apiClient.patch(`/admin/instructors/${id}/deactivate`);
  return data;
};

// ── Instructor-Student Mapping ────────────────────────────────────────────────

export const getMapping = async () => {
  const { data } = await apiClient.get('/admin/mapping');
  return data as Record<string, string>;
};

export const saveMapping = async (mappings: Record<string, string>) => {
  const { data } = await apiClient.put('/admin/mapping', { mappings });
  return data;
};
