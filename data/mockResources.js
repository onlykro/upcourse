// Mock resources data for UpCourse admin dashboard
export const mockResources = [
  {
    id: "RES-0001",
    title: "Introduction to Python Programming",
    type: "pdf",
    subject_code: "ICT101",
    subject_name: "Introduction to Computer Programming",
    folder: "Programming Basics",
    upload_date: "2026-01-10T08:00:00Z",
    uploader: "admin@upcourse.test",
    uploader_name: "Site Admin",
    size: "2.4 MB",
    size_bytes: 2516582,
    visibility: "public",
    downloads: 45,
    description: "Comprehensive guide to Python basics including variables, data types, and control structures."
  },
  {
    id: "RES-0002",
    title: "Financial Statements Tutorial",
    type: "video",
    subject_code: "ABM101",
    subject_name: "Fundamentals of Accountancy",
    folder: "Accounting Videos",
    upload_date: "2026-01-08T10:30:00Z",
    uploader: "superadmin@upcourse.test",
    uploader_name: "Super Admin",
    size: "156 MB",
    size_bytes: 163577856,
    visibility: "public",
    downloads: 32,
    duration: "45:30",
    description: "Video tutorial explaining the three main financial statements: Income Statement, Balance Sheet, and Cash Flow."
  },
  {
    id: "RES-0003",
    title: "Creative Writing Samples Collection",
    type: "pdf",
    subject_code: "HUMSS101",
    subject_name: "Creative Writing",
    folder: "Writing Resources",
    upload_date: "2026-01-05T14:15:00Z",
    uploader: "admin@upcourse.test",
    uploader_name: "Site Admin",
    size: "1.8 MB",
    size_bytes: 1887436,
    visibility: "public",
    downloads: 28,
    description: "Collection of award-winning short stories and poems for study and inspiration."
  },
  {
    id: "RES-0004",
    title: "Pre-Calculus Formula Sheet",
    type: "pdf",
    subject_code: "STEM101",
    subject_name: "Pre-Calculus",
    folder: "Math Resources",
    upload_date: "2026-01-03T09:00:00Z",
    uploader: "superadmin@upcourse.test",
    uploader_name: "Super Admin",
    size: "524 KB",
    size_bytes: 536576,
    visibility: "public",
    downloads: 67,
    description: "Quick reference sheet for all Pre-Calculus formulas and identities."
  },
  {
    id: "RES-0005",
    title: "DepEd K-12 Curriculum Guide",
    type: "link",
    subject_code: null,
    subject_name: "General",
    folder: "Official Documents",
    upload_date: "2025-12-28T11:45:00Z",
    uploader: "superadmin@upcourse.test",
    uploader_name: "Super Admin",
    url: "https://www.deped.gov.ph/k-to-12/",
    visibility: "public",
    downloads: 89,
    description: "Official DepEd website with K-12 curriculum information and guidelines."
  },
  {
    id: "RES-0006",
    title: "Food Safety Training Video",
    type: "video",
    subject_code: "HE101",
    subject_name: "Food and Beverage Services",
    folder: "Hospitality Training",
    upload_date: "2025-12-20T16:20:00Z",
    uploader: "admin@upcourse.test",
    uploader_name: "Site Admin",
    size: "89 MB",
    size_bytes: 93323264,
    visibility: "public",
    downloads: 21,
    duration: "28:15",
    description: "Essential food safety and sanitation practices for hospitality students."
  },
  {
    id: "RES-0007",
    title: "HTML & CSS Basics Cheatsheet",
    type: "pdf",
    subject_code: "ICT102",
    subject_name: "Web Development Fundamentals",
    folder: "Programming Basics",
    upload_date: "2025-12-15T08:30:00Z",
    uploader: "admin@upcourse.test",
    uploader_name: "Site Admin",
    size: "1.2 MB",
    size_bytes: 1258291,
    visibility: "public",
    downloads: 54,
    description: "Quick reference guide for HTML tags and CSS properties."
  },
  {
    id: "RES-0008",
    title: "Research Writing Guidelines",
    type: "pdf",
    subject_code: "GAS101",
    subject_name: "Research Methods",
    folder: "Writing Resources",
    upload_date: "2025-12-10T13:00:00Z",
    uploader: "superadmin@upcourse.test",
    uploader_name: "Super Admin",
    size: "3.1 MB",
    size_bytes: 3250585,
    visibility: "private",
    downloads: 15,
    description: "Comprehensive guide to academic research writing and citation formats."
  }
];

export const mockFolders = [
  {
    id: "FLD-001",
    name: "Programming Basics",
    parent_id: null,
    resources_count: 2,
    created_at: "2025-12-01T08:00:00Z"
  },
  {
    id: "FLD-002",
    name: "Accounting Videos",
    parent_id: null,
    resources_count: 1,
    created_at: "2025-12-01T08:00:00Z"
  },
  {
    id: "FLD-003",
    name: "Writing Resources",
    parent_id: null,
    resources_count: 2,
    created_at: "2025-12-01T08:00:00Z"
  },
  {
    id: "FLD-004",
    name: "Math Resources",
    parent_id: null,
    resources_count: 1,
    created_at: "2025-12-01T08:00:00Z"
  },
  {
    id: "FLD-005",
    name: "Official Documents",
    parent_id: null,
    resources_count: 1,
    created_at: "2025-12-01T08:00:00Z"
  },
  {
    id: "FLD-006",
    name: "Hospitality Training",
    parent_id: null,
    resources_count: 1,
    created_at: "2025-12-01T08:00:00Z"
  }
];

export const resourceTypes = [
  { id: "pdf", name: "PDF Document", icon: "file-text" },
  { id: "video", name: "Video", icon: "video" },
  { id: "link", name: "External Link", icon: "link" },
  { id: "image", name: "Image", icon: "image" }
];

export default { mockResources, mockFolders, resourceTypes };
