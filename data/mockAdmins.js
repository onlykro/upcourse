// Mock admin accounts and auth data for UpCourse admin dashboard
export const mockAdmins = [
  {
    id: "ADM-0001",
    email: "superadmin@upcourse.test",
    password: "SuperAdmin!23",
    first_name: "Super",
    middle_name: "",
    last_name: "Admin",
    suffix: "",
    username: "superadmin",
    role: "super_admin",
    role_type: "staff",
    status: "active",
    avatar: null,
    created_at: "2025-01-01T00:00:00Z",
    last_login: "2026-01-22T08:00:00Z",
    permissions: {
      grade_level_access: [11, 12],
      quizzes: { create: true, edit: true, delete: true, publish: true },
      subjects: { view: true, create: true, edit: true, delete: true },
      tracks: { manage: true },
      students: { manage: true },
      activity_logs: { view: true },
      admin_management: { manage: true }
    }
  },
  {
    id: "ADM-0002",
    email: "admin@upcourse.test",
    password: "Admin!23",
    first_name: "Site",
    middle_name: "A",
    last_name: "Admin",
    suffix: "",
    username: "siteadmin",
    role: "admin",
    role_type: "faculty",
    status: "active",
    avatar: null,
    created_at: "2025-06-15T10:00:00Z",
    last_login: "2026-01-21T14:30:00Z",
    permissions: {
      grade_level_access: [11],
      quizzes: { create: true, edit: true, delete: false, publish: true },
      subjects: { view: true, create: true, edit: true, delete: false },
      tracks: { manage: false },
      students: { manage: true },
      activity_logs: { view: false },
      admin_management: { manage: false }
    }
  },
  {
    id: "ADM-0003",
    email: "faculty.user@upcourse.test",
    password: "Faculty!23",
    first_name: "Maria",
    middle_name: "B",
    last_name: "Teacher",
    suffix: "",
    username: "mteacher",
    role: "admin",
    role_type: "faculty",
    status: "active",
    avatar: null,
    created_at: "2025-09-01T08:00:00Z",
    last_login: "2026-01-20T10:15:00Z",
    permissions: {
      grade_level_access: [11, 12],
      quizzes: { create: true, edit: true, delete: false, publish: false },
      subjects: { view: true, create: false, edit: false, delete: false },
      tracks: { manage: false },
      students: { manage: false },
      activity_logs: { view: false },
      admin_management: { manage: false }
    }
  },
  {
    id: "ADM-0004",
    email: "inactive.admin@upcourse.test",
    password: "Inactive!23",
    first_name: "John",
    middle_name: "C",
    last_name: "Doe",
    suffix: "",
    username: "jdoe",
    role: "admin",
    role_type: "staff",
    status: "inactive",
    avatar: null,
    created_at: "2025-03-20T12:00:00Z",
    last_login: "2025-10-15T09:00:00Z",
    permissions: {
      grade_level_access: [],
      quizzes: { create: false, edit: false, delete: false, publish: false },
      subjects: { view: false, create: false, edit: false, delete: false },
      tracks: { manage: false },
      students: { manage: false },
      activity_logs: { view: false },
      admin_management: { manage: false }
    }
  }
];

export const mockNotifications = [
  {
    id: "NOTIF-001",
    type: "info",
    title: "New Student Registration",
    message: "5 new students registered today",
    read: false,
    created_at: "2026-01-22T08:30:00Z"
  },
  {
    id: "NOTIF-002",
    type: "warning",
    title: "Quiz Due Soon",
    message: "Programming Quiz closes in 3 days",
    read: false,
    created_at: "2026-01-22T07:00:00Z"
  },
  {
    id: "NOTIF-003",
    type: "success",
    title: "Resource Uploaded",
    message: "Python Tutorial PDF uploaded successfully",
    read: true,
    created_at: "2026-01-21T15:45:00Z"
  },
  {
    id: "NOTIF-004",
    type: "info",
    title: "System Update",
    message: "Dashboard analytics updated",
    read: true,
    created_at: "2026-01-20T10:00:00Z"
  }
];

export const mockActivityLogs = [
  {
    id: "LOG-001",
    admin_id: "ADM-0001",
    admin_name: "Super Admin",
    action: "create",
    target_type: "quiz",
    target_name: "Pre-Calculus Mid-Term Exam",
    target_id: "Q-0004",
    timestamp: "2026-01-22T09:15:00Z",
    ip_address: "192.168.1.100"
  },
  {
    id: "LOG-002",
    admin_id: "ADM-0002",
    admin_name: "Site Admin",
    action: "update",
    target_type: "student",
    target_name: "Juan Dela Cruz",
    target_id: "STU-0001",
    timestamp: "2026-01-22T08:45:00Z",
    ip_address: "192.168.1.101"
  },
  {
    id: "LOG-003",
    admin_id: "ADM-0001",
    admin_name: "Super Admin",
    action: "publish",
    target_type: "resource",
    target_name: "Introduction to Python Programming",
    target_id: "RES-0001",
    timestamp: "2026-01-21T16:30:00Z",
    ip_address: "192.168.1.100"
  },
  {
    id: "LOG-004",
    admin_id: "ADM-0003",
    admin_name: "Maria Teacher",
    action: "create",
    target_type: "quiz",
    target_name: "Creative Writing Assessment",
    target_id: "Q-0003",
    timestamp: "2026-01-21T14:00:00Z",
    ip_address: "192.168.1.102"
  },
  {
    id: "LOG-005",
    admin_id: "ADM-0002",
    admin_name: "Site Admin",
    action: "delete",
    target_type: "resource",
    target_name: "Outdated Curriculum Guide",
    target_id: "RES-0099",
    timestamp: "2026-01-20T11:20:00Z",
    ip_address: "192.168.1.101"
  },
  {
    id: "LOG-006",
    admin_id: "ADM-0001",
    admin_name: "Super Admin",
    action: "update",
    target_type: "admin",
    target_name: "John Doe",
    target_id: "ADM-0004",
    details: "Status changed to inactive",
    timestamp: "2026-01-19T09:00:00Z",
    ip_address: "192.168.1.100"
  }
];

export const mockSessions = [
  {
    id: "SES-001",
    admin_id: "ADM-0001",
    device: "Chrome on Windows",
    ip_address: "192.168.1.100",
    location: "Manila, Philippines",
    started_at: "2026-01-22T08:00:00Z",
    last_active: "2026-01-22T09:30:00Z",
    current: true
  },
  {
    id: "SES-002",
    admin_id: "ADM-0001",
    device: "Safari on iPhone",
    ip_address: "192.168.1.150",
    location: "Manila, Philippines",
    started_at: "2026-01-21T18:00:00Z",
    last_active: "2026-01-21T19:15:00Z",
    current: false
  }
];

export const roleTypes = ["faculty", "staff", "other"];

export const permissionScopes = [
  { key: "grade_level_access", label: "Grade Level Access", type: "multi_select", options: [11, 12] },
  { key: "quizzes.create", label: "Create Quizzes", type: "boolean" },
  { key: "quizzes.edit", label: "Edit Quizzes", type: "boolean" },
  { key: "quizzes.delete", label: "Delete Quizzes", type: "boolean" },
  { key: "quizzes.publish", label: "Publish Quizzes", type: "boolean" },
  { key: "subjects.view", label: "View Subjects", type: "boolean" },
  { key: "subjects.create", label: "Create Subjects", type: "boolean" },
  { key: "subjects.edit", label: "Edit Subjects", type: "boolean" },
  { key: "subjects.delete", label: "Delete Subjects", type: "boolean" },
  { key: "tracks.manage", label: "Manage Tracks/Programs", type: "boolean" },
  { key: "students.manage", label: "Manage Students", type: "boolean" },
  { key: "activity_logs.view", label: "View Activity Logs", type: "boolean" },
  { key: "admin_management.manage", label: "Manage Admins", type: "boolean" }
];

export default { mockAdmins, mockNotifications, mockActivityLogs, mockSessions, roleTypes, permissionScopes };
