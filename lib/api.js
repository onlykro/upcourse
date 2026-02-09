// Mock API functions for UpCourse admin dashboard
// Some modules still use mock data. Tracks now use REAL DB via /api/tracks.
// Replace other modules with real endpoints when ready.

import { mockStudents } from "@/data/mockStudents";
import { mockTracks, mockPrograms, mockSubjects } from "@/data/mockTracks";
import { mockQuizzes, mockTestBank } from "@/data/mockQuizzes";
import { mockResources, mockFolders } from "@/data/mockResources";
import {
  mockAdmins,
  mockNotifications,
  mockActivityLogs,
  mockSessions,
} from "@/data/mockAdmins";
import { mockDownloads } from "@/data/mockDownloads";

// Simulated network delay (ms)
const MOCK_DELAY = 300;
const MOCK_ERROR_RATE = 0; // Set to 0.1 for 10% error rate in dev

// Normalize params (SWR sometimes passes key, null, etc.)
const normalizeParams = (params) =>
  params && typeof params === "object" && !Array.isArray(params) ? params : {};

// Helper to simulate API response
const mockResponse = (data, delay = MOCK_DELAY) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < MOCK_ERROR_RATE) {
        reject(new Error("Simulated network error"));
        return;
      }
      resolve({ data, success: true });
    }, delay);
  });
};

// Helper for paginated responses
const paginateData = (data, page = 1, limit = 10) => {
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginatedData = data.slice(start, end);

  return {
    data: paginatedData,
    pagination: {
      page,
      limit,
      total: data.length,
      totalPages: Math.ceil(data.length / limit),
      hasNext: end < data.length,
      hasPrev: page > 1,
    },
  };
};

// ===================== REAL TRACKS API (Supabase DB) =====================

async function request(url, options) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    throw new Error(data?.error || "Request failed");
  }
  return data;
}

// DB Tracks (NOT mockTracks)
export const getTracks = async (params = {}) => {
  const p = normalizeParams(params);
  const search = String(p.search ?? "").trim();

  const qs = search ? `?search=${encodeURIComponent(search)}` : "";
  const data = await request(`/api/tracks${qs}`, { method: "GET" });
  return data.tracks || [];
};

export const getTrackById = async (id) => {
  const data = await request(`/api/tracks/${id}`, { method: "GET" });
  return data.track;
};

export const createTrack = async (payload) => {
  const data = await request("/api/tracks", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data.track;
};

export const updateTrack = async (id, payload) => {
  const data = await request(`/api/tracks/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return data.track;
};

export const deleteTrack = async (id) => {
  const data = await request(`/api/tracks/${id}`, { method: "DELETE" });
  return data.success === true;
};

// ===================== STUDENTS API (MOCK) =====================

export const getStudents = async (params = {}) => {
  const p = normalizeParams(params);

  const page = Number(p.page ?? 1);
  const limit = Number(p.limit ?? 10);
  const search = String(p.search ?? "");
  const grade_level = p.grade_level;
  const status = p.status;
  const track = p.track;

  let filtered = [...mockStudents];

  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter((s) => {
      const fn = String(s.first_name ?? "").toLowerCase();
      const ln = String(s.last_name ?? "").toLowerCase();
      const em = String(s.email ?? "").toLowerCase();
      const id = String(s.id ?? "").toLowerCase();
      return (
        fn.includes(searchLower) ||
        ln.includes(searchLower) ||
        em.includes(searchLower) ||
        id.includes(searchLower)
      );
    });
  }

  if (grade_level) {
    filtered = filtered.filter((s) => s.grade_level === Number(grade_level));
  }

  if (status) {
    const st = String(status).toLowerCase();
    filtered = filtered.filter((s) => String(s.status ?? "").toLowerCase() === st);
  }

  if (track) {
    filtered = filtered.filter((s) => s.track === track);
  }

  const result = paginateData(filtered, page, limit);
  return mockResponse(result);
};

export const getStudentById = async (id) => {
  const student = mockStudents.find((s) => s.id === id);
  if (!student) return Promise.reject(new Error("Student not found"));
  return mockResponse(student);
};

export const toggleStudentStatus = async (id) => {
  const student = mockStudents.find((s) => s.id === id);
  if (!student) return Promise.reject(new Error("Student not found"));
  const newStatus = student.status === "Active" ? "Inactive" : "Active";
  return mockResponse({ ...student, status: newStatus });
};

export const createStudent = async (data) => {
  const newStudent = {
    id: `STU${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    ...data,
    created_at: new Date().toISOString(),
    status: "Active",
  };
  mockStudents.push(newStudent);
  return mockResponse(newStudent);
};

export const updateStudent = async (id, data) => {
  const index = mockStudents.findIndex((s) => s.id === id);
  if (index === -1) return Promise.reject(new Error("Student not found"));
  const updatedStudent = { ...mockStudents[index], ...data };
  mockStudents[index] = updatedStudent;
  return mockResponse(updatedStudent);
};

export const deleteStudent = async (id) => {
  const index = mockStudents.findIndex((s) => s.id === id);
  if (index === -1) return Promise.reject(new Error("Student not found"));
  const deletedStudent = mockStudents[index];
  mockStudents.splice(index, 1);
  return mockResponse({ success: true, deleted: deletedStudent });
};

// ===================== PROGRAMS API (MOCK) =====================

export const getPrograms = async (params = {}) => {
  const p = normalizeParams(params);

  const search = String(p.search ?? "");
  const track_id = p.track_id;
  const available = p.available;

  let filtered = [...mockPrograms];

  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter((pr) => {
      const nm = String(pr.name ?? "").toLowerCase();
      const cd = String(pr.code ?? "").toLowerCase();
      return nm.includes(searchLower) || cd.includes(searchLower);
    });
  }

  if (track_id) filtered = filtered.filter((pr) => pr.track_id === track_id);
  if (available !== undefined) filtered = filtered.filter((pr) => pr.available === available);

  return mockResponse(filtered);
};

// ===================== SUBJECTS API (MOCK) =====================

export const getSubjects = async (params = {}) => {
  const p = normalizeParams(params);

  const search = String(p.search ?? "");
  const track_id = p.track_id;
  const category = p.category;
  const status = p.status;
  const type = p.type;

  let filtered = [...mockSubjects];

  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter((s) => {
      const nm = String(s.name ?? "").toLowerCase();
      const cd = String(s.code ?? "").toLowerCase();
      return nm.includes(searchLower) || cd.includes(searchLower);
    });
  }

  if (track_id) filtered = filtered.filter((s) => s.track_id === track_id);
  if (category) filtered = filtered.filter((s) => s.category === category);
  if (status) filtered = filtered.filter((s) => s.status === status);
  if (type) filtered = filtered.filter((s) => s.type === type);

  return mockResponse(filtered);
};

export const getSubjectById = async (id) => {
  const subject = mockSubjects.find((s) => s.id === id);
  if (!subject) return Promise.reject(new Error("Subject not found"));
  return mockResponse(subject);
};

export const createSubject = async (data) => {
  const newSubject = {
    id: `SUB-NEW-${Date.now()}`,
    ...data,
    quizzes_count: 0,
    resources_count: 0,
  };
  return mockResponse(newSubject);
};

export const updateSubject = async (id, data) => {
  const subject = mockSubjects.find((s) => s.id === id);
  if (!subject) return Promise.reject(new Error("Subject not found"));
  return mockResponse({ ...subject, ...data });
};

export const deleteSubject = async (id) => {
  const subject = mockSubjects.find((s) => s.id === id);
  if (!subject) return Promise.reject(new Error("Subject not found"));
  return mockResponse({ success: true, deleted: id });
};

// ===================== QUIZZES API (MOCK) =====================

export const getQuizzes = async (params = {}) => {
  const p = normalizeParams(params);

  const search = String(p.search ?? "");
  const status = p.status;
  const grade_level = p.grade_level;
  const subject_code = p.subject_code;

  let filtered = [...mockQuizzes];

  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter((q) => {
      const t = String(q.title ?? "").toLowerCase();
      const sc = String(q.subject_code ?? "").toLowerCase();
      return t.includes(searchLower) || sc.includes(searchLower);
    });
  }

  if (status) filtered = filtered.filter((q) => q.status === status);
  if (grade_level) filtered = filtered.filter((q) => q.grade_level === Number(grade_level));
  if (subject_code) filtered = filtered.filter((q) => q.subject_code === subject_code);

  return mockResponse(filtered);
};

export const getQuizById = async (id) => {
  const quiz = mockQuizzes.find((q) => q.id === id);
  if (!quiz) return Promise.reject(new Error("Quiz not found"));
  return mockResponse(quiz);
};

export const createQuiz = async (data) => {
  const newQuiz = {
    id: `Q-NEW-${Date.now()}`,
    ...data,
    created_at: new Date().toISOString(),
    submissions_count: 0,
    submissions: [],
    responses: 0,
    completionRate: 0,
    avgScore: 0,
  };
  mockQuizzes.push(newQuiz);
  return mockResponse(newQuiz);
};

export const updateQuiz = async (id, data) => {
  const quiz = mockQuizzes.find((q) => q.id === id);
  if (!quiz) return Promise.reject(new Error("Quiz not found"));
  return mockResponse({ ...quiz, ...data });
};

export const deleteQuiz = async (id) => {
  const index = mockQuizzes.findIndex((q) => q.id === id);
  if (index === -1) return Promise.reject(new Error("Quiz not found"));
  const deletedQuiz = mockQuizzes[index];
  mockQuizzes.splice(index, 1);
  return mockResponse({ success: true, deleted: deletedQuiz });
};

export const publishQuiz = async (id) => {
  const quiz = mockQuizzes.find((q) => q.id === id);
  if (!quiz) return Promise.reject(new Error("Quiz not found"));
  return mockResponse({ ...quiz, status: "open", visibility: "public" });
};

export const closeQuiz = async (id) => {
  const quiz = mockQuizzes.find((q) => q.id === id);
  if (!quiz) return Promise.reject(new Error("Quiz not found"));
  return mockResponse({ ...quiz, status: "closed" });
};

// ===================== TEST BANK API (MOCK) =====================

export const getTestBank = async (params = {}) => {
  const p = normalizeParams(params);

  const search = String(p.search ?? "");
  const category = p.category;
  const difficulty = p.difficulty;

  let filtered = [...mockTestBank];

  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter((q) => String(q.text ?? "").toLowerCase().includes(searchLower));
  }

  if (category) filtered = filtered.filter((q) => q.category === category);
  if (difficulty) filtered = filtered.filter((q) => q.difficulty === difficulty);

  return mockResponse(filtered);
};

export const addToTestBank = async (question) => {
  const newQuestion = {
    id: `TB-NEW-${Date.now()}`,
    ...question,
    created_at: new Date().toISOString(),
    used_count: 0,
  };
  return mockResponse(newQuestion);
};

// ===================== RESOURCES API (MOCK) =====================

export const getResources = async (params = {}) => {
  const p = normalizeParams(params);

  const search = String(p.search ?? "");
  const type = p.type;
  const subject_code = p.subject_code;
  const folder = p.folder;
  const visibility = p.visibility;

  let filtered = [...mockResources];

  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter((r) => {
      const t = String(r.title ?? "").toLowerCase();
      const d = String(r.description ?? "").toLowerCase();
      return t.includes(searchLower) || d.includes(searchLower);
    });
  }

  if (type) filtered = filtered.filter((r) => r.type === type);
  if (subject_code) filtered = filtered.filter((r) => r.subject_code === subject_code);
  if (folder) filtered = filtered.filter((r) => r.folder === folder);
  if (visibility) filtered = filtered.filter((r) => r.visibility === visibility);

  return mockResponse(filtered);
};

export const getResourceById = async (id) => {
  const resource = mockResources.find((r) => r.id === id);
  if (!resource) return Promise.reject(new Error("Resource not found"));
  return mockResponse(resource);
};

export const getFolders = async () => {
  return mockResponse(mockFolders);
};

export const createResource = async (data) => {
  const newResource = {
    id: `RES-NEW-${Date.now()}`,
    ...data,
    upload_date: new Date().toISOString(),
    downloads: 0,
  };
  return mockResponse(newResource);
};

export const updateResource = async (id, data) => {
  const resource = mockResources.find((r) => r.id === id);
  if (!resource) return Promise.reject(new Error("Resource not found"));
  return mockResponse({ ...resource, ...data });
};

export const deleteResource = async (id) => {
  const resource = mockResources.find((r) => r.id === id);
  if (!resource) return Promise.reject(new Error("Resource not found"));
  return mockResponse({ success: true, deleted: id });
};

export const bulkDeleteResources = async (ids) => {
  return mockResponse({ success: true, deleted: ids });
};

// ===================== ADMIN API (MOCK) =====================

export const getAdmins = async (params = {}) => {
  const p = normalizeParams(params);

  const search = String(p.search ?? "");
  const role = p.role;
  const status = p.status;

  let filtered = [...mockAdmins];

  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter((a) => {
      const fn = String(a.first_name ?? "").toLowerCase();
      const ln = String(a.last_name ?? "").toLowerCase();
      const em = String(a.email ?? "").toLowerCase();
      return fn.includes(searchLower) || ln.includes(searchLower) || em.includes(searchLower);
    });
  }

  if (role) filtered = filtered.filter((a) => a.role === role);
  if (status) filtered = filtered.filter((a) => a.status === status);

  return mockResponse(filtered);
};

export const getAdminById = async (id) => {
  const admin = mockAdmins.find((a) => a.id === id);
  if (!admin) return Promise.reject(new Error("Admin not found"));
  return mockResponse(admin);
};

export const createAdmin = async (data) => {
  const newAdmin = {
    id: `ADM-NEW-${Date.now()}`,
    ...data,
    created_at: new Date().toISOString(),
    last_login: null,
  };
  return mockResponse(newAdmin);
};

export const updateAdmin = async (id, data) => {
  const admin = mockAdmins.find((a) => a.id === id);
  if (!admin) return Promise.reject(new Error("Admin not found"));
  return mockResponse({ ...admin, ...data });
};

export const updateAdminPermissions = async (id, permissions) => {
  const admin = mockAdmins.find((a) => a.id === id);
  if (!admin) return Promise.reject(new Error("Admin not found"));
  return mockResponse({ ...admin, permissions });
};

export const deleteAdmin = async (id) => {
  const index = mockAdmins.findIndex((a) => a.id === id);
  if (index === -1) return Promise.reject(new Error("Admin not found"));
  const deletedAdmin = mockAdmins[index];
  mockAdmins.splice(index, 1);
  return mockResponse({ success: true, deleted: deletedAdmin });
};

// ===================== NOTIFICATIONS (MOCK) =====================

export const getNotifications = async () => {
  return mockResponse(mockNotifications);
};

export const markNotificationRead = async (id) => {
  const notification = mockNotifications.find((n) => n.id === id);
  if (!notification) return Promise.reject(new Error("Notification not found"));
  return mockResponse({ ...notification, read: true });
};

export const clearAllNotifications = async () => {
  return mockResponse({ success: true });
};

// ===================== ACTIVITY LOGS (MOCK) =====================

export const getActivityLogs = async (params = {}) => {
  const p = normalizeParams(params);

  const admin_id = p.admin_id;
  const action = p.action;
  const target_type = p.target_type;
  const limit = Number(p.limit ?? 50);

  let filtered = [...mockActivityLogs];

  if (admin_id) filtered = filtered.filter((l) => l.admin_id === admin_id);
  if (action) filtered = filtered.filter((l) => l.action === action);
  if (target_type) filtered = filtered.filter((l) => l.target_type === target_type);

  filtered = filtered.slice(0, limit);
  return mockResponse(filtered);
};

// ===================== SESSIONS (MOCK) =====================

export const getSessions = async (adminId) => {
  const sessions = mockSessions.filter((s) => s.admin_id === adminId);
  return mockResponse(sessions);
};

export const terminateSession = async (sessionId) => {
  return mockResponse({ success: true, terminated: sessionId });
};

// ===================== DOWNLOADS (MOCK) =====================

export const getDownloads = async (params = {}) => {
  const p = normalizeParams(params);
  const release_type = p.release_type;

  let filtered = [...mockDownloads];
  if (release_type) filtered = filtered.filter((d) => d.release_type === release_type);

  return mockResponse(filtered);
};

export const getLatestDownload = async (releaseType = "stable") => {
  const downloads = mockDownloads
    .filter((d) => d.release_type === releaseType)
    .sort((a, b) => new Date(b.release_date) - new Date(a.release_date));

  return mockResponse(downloads[0] || null);
};

// ===================== DASHBOARD STATS (MOCK) =====================

export const getDashboardStats = async () => {
  const stats = {
    total_students: mockStudents.length,
    active_students: mockStudents.filter((s) => s.status === "Active").length,
    new_accounts_7d: 3,
    total_tracks: mockTracks.length, // still mock for now
    active_quizzes: mockQuizzes.filter((q) => q.status === "open").length,
    published_resources: mockResources.filter((r) => r.visibility === "public").length,
    total_submissions: mockQuizzes.reduce((acc, q) => acc + (q.submissions_count || 0), 0),
  };

  return mockResponse(stats);
};

export const getChartData = async (type) => {
  const chartData = {
    students_by_track: [
      { name: "Academic", value: 8 },
      { name: "TVL", value: 3 },
      { name: "Sports", value: 1 },
    ],
    students_by_grade: [
      { name: "Grade 11", value: 6 },
      { name: "Grade 12", value: 6 },
    ],
    quiz_completion: [
      { name: "Completed", value: 40 },
      { name: "Pending", value: 15 },
      { name: "Overdue", value: 5 },
    ],
    registrations_weekly: [
      { day: "Mon", count: 2 },
      { day: "Tue", count: 1 },
      { day: "Wed", count: 3 },
      { day: "Thu", count: 0 },
      { day: "Fri", count: 2 },
      { day: "Sat", count: 1 },
      { day: "Sun", count: 0 },
    ],
  };

  return mockResponse(chartData[type] || []);
};

// ===================== EXPORTS (MOCK) =====================

export const exportToCSV = async (type) => {
  return mockResponse({
    success: true,
    message: `${type} data exported successfully`,
    filename: `${type}_export_${Date.now()}.csv`,
  });
};

export const exportToPDF = async (type) => {
  return mockResponse({
    success: true,
    message: `${type} data exported successfully`,
    filename: `${type}_export_${Date.now()}.pdf`,
  });
};

// ===================== FETCH ALIASES (COMPAT) =====================

// Students
export const fetchStudents = async (params) => (await getStudents(params)).data;
export const fetchStudentById = async (id) => (await getStudentById(id)).data;

// Tracks (DB) - return direct values
export const fetchTracks = async (params) => getTracks(params);
export const fetchTrackById = async (id) => getTrackById(id);

// Programs/Subjects/Quizzes/etc.
export const fetchPrograms = async (params) => (await getPrograms(params)).data;

export const fetchSubjects = async (params) => (await getSubjects(params)).data;
export const fetchSubjectById = async (id) => (await getSubjectById(id)).data;

export const fetchQuizzes = async (params) => (await getQuizzes(params)).data;
export const fetchQuizById = async (id) => (await getQuizById(id)).data;

export const fetchTestBank = async (params) => (await getTestBank(params)).data;

export const fetchResources = async (params) => (await getResources(params)).data;
export const fetchResourceById = async (id) => (await getResourceById(id)).data;
export const fetchFolders = async () => (await getFolders()).data;

export const fetchAdmins = async (params) => (await getAdmins(params)).data;
export const fetchAdminById = async (id) => (await getAdminById(id)).data;

export const fetchNotifications = async () => (await getNotifications()).data;

export const fetchActivityLogs = async (params) => (await getActivityLogs(params)).data;

export const fetchSessions = async (adminId) => (await getSessions(adminId)).data;

export const fetchDownloads = async (params) => (await getDownloads(params)).data;
export const fetchLatestDownload = async (releaseType) => (await getLatestDownload(releaseType)).data;

export const fetchDashboardStats = async () => (await getDashboardStats()).data;
export const fetchChartData = async (type) => (await getChartData(type)).data;

export const fetchRecentActivity = async (params = { limit: 10 }) => (await getActivityLogs(params)).data;

// Default export (optional convenience)
export default {
  // Tracks (DB)
  getTracks,
  getTrackById,
  createTrack,
  updateTrack,
  deleteTrack,
  fetchTracks,
  fetchTrackById,

  // Students (mock)
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  fetchStudents,
  fetchStudentById,
};