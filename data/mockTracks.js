// Mock tracks and programs data for UpCourse admin dashboard
export const mockTracks = [
  {
    id: "T-ACAD-001",
    name: "Academic Track",
    type: "Academic",
    description: "Focus on academic subjects for higher education paths. Prepares students for college degrees in various fields including science, business, humanities, and general academics.",
    available: true,
    electives_count: 24,
    icon: "academic-cap",
    strands: ["STEM", "ABM", "HUMSS", "GAS"]
  },
  {
    id: "T-TVL-001",
    name: "Technical-Vocational-Livelihood Track",
    type: "Technical-Vocational",
    description: "Provides students with job-ready skills for employment or entrepreneurship. Includes hands-on training in various industries.",
    available: true,
    electives_count: 32,
    icon: "wrench",
    strands: ["ICT", "Home Economics", "Industrial Arts", "Agri-Fishery Arts"]
  },
  {
    id: "T-SPORTS-001",
    name: "Sports Track",
    type: "Sports",
    description: "For students who intend to pursue careers in athletics, sports sciences, or related fields. Combines academic requirements with intensive sports training.",
    available: true,
    electives_count: 8,
    icon: "trophy",
    strands: []
  },
  {
    id: "T-ARTS-001",
    name: "Arts and Design Track",
    type: "Arts",
    description: "For students who want to pursue careers in creative industries including visual arts, music, theater, and design.",
    available: false,
    electives_count: 12,
    icon: "palette",
    strands: []
  }
];

export const mockPrograms = [
  {
    id: "P-BSIT-001",
    name: "Bachelor of Science in Information Technology",
    code: "BSIT",
    description: "A program that prepares students for careers in software development, IT management, and computer systems.",
    track_id: "T-ACAD-001",
    strand: "STEM",
    available: true,
    subjects_count: 45,
    electives: ["Programming", "Database Management", "Web Development", "Networking"]
  },
  {
    id: "P-BSHM-001",
    name: "Bachelor of Science in Hospitality Management",
    code: "BSHM",
    description: "Prepares students for careers in hotels, restaurants, tourism, and event management.",
    track_id: "T-TVL-001",
    strand: "Home Economics",
    available: true,
    subjects_count: 42,
    electives: ["Food & Beverage", "Front Office", "Housekeeping", "Tourism"]
  },
  {
    id: "P-BSED-ENG-001",
    name: "Bachelor of Secondary Education - Major in English",
    code: "BSED-English",
    description: "Prepares students to become licensed English teachers in secondary education.",
    track_id: "T-ACAD-001",
    strand: "HUMSS",
    available: true,
    subjects_count: 48,
    electives: ["Literature", "Linguistics", "Creative Writing", "Speech Communication"]
  },
  {
    id: "P-BEED-001",
    name: "Bachelor of Elementary Education",
    code: "BEED",
    description: "Prepares students to become licensed elementary school teachers with generalist training.",
    track_id: "T-ACAD-001",
    strand: "GAS",
    available: true,
    subjects_count: 46,
    electives: ["Child Development", "Educational Psychology", "Curriculum Design"]
  },
  {
    id: "P-BSBA-FM-001",
    name: "Bachelor of Science in Business Administration - Major in Financial Management",
    code: "BSBA-FM",
    description: "Prepares students for careers in banking, investments, and corporate finance.",
    track_id: "T-ACAD-001",
    strand: "ABM",
    available: true,
    subjects_count: 44,
    electives: ["Financial Analysis", "Investment Management", "Banking Operations"]
  },
  {
    id: "P-BSBA-HRM-001",
    name: "Bachelor of Science in Business Administration - Major in Human Resource Management",
    code: "BSBA-HRM",
    description: "Prepares students for careers in human resources, talent management, and organizational development.",
    track_id: "T-ACAD-001",
    strand: "ABM",
    available: true,
    subjects_count: 44,
    electives: ["Recruitment", "Compensation & Benefits", "Labor Relations"]
  }
];

export const mockSubjects = [
  {
    id: "SUB-ICT101",
    code: "ICT101",
    name: "Introduction to Computer Programming",
    type: "subject",
    category: "ICT Support & Computer Programming",
    track_id: "T-TVL-001",
    program_id: "P-BSIT-001",
    status: "available",
    description: "Fundamental concepts of programming logic and problem-solving.",
    quizzes_count: 3,
    resources_count: 8
  },
  {
    id: "SUB-ICT102",
    code: "ICT102",
    name: "Web Development Fundamentals",
    type: "subject",
    category: "ICT Support & Computer Programming",
    track_id: "T-TVL-001",
    program_id: "P-BSIT-001",
    status: "available",
    description: "Introduction to HTML, CSS, and basic JavaScript.",
    quizzes_count: 4,
    resources_count: 12
  },
  {
    id: "SUB-ABM101",
    code: "ABM101",
    name: "Fundamentals of Accountancy",
    type: "subject",
    category: "Business & Entrepreneurship",
    track_id: "T-ACAD-001",
    program_id: "P-BSBA-FM-001",
    status: "available",
    description: "Basic accounting principles and financial statements.",
    quizzes_count: 2,
    resources_count: 6
  },
  {
    id: "SUB-HUMSS101",
    code: "HUMSS101",
    name: "Creative Writing",
    type: "elective",
    category: "Arts & Humanities",
    track_id: "T-ACAD-001",
    program_id: "P-BSED-ENG-001",
    status: "available",
    description: "Techniques in writing fiction, poetry, and creative non-fiction.",
    quizzes_count: 2,
    resources_count: 5
  },
  {
    id: "SUB-STEM101",
    code: "STEM101",
    name: "Pre-Calculus",
    type: "subject",
    category: "STEM",
    track_id: "T-ACAD-001",
    program_id: "P-BSIT-001",
    status: "available",
    description: "Advanced algebra, trigonometry, and introduction to calculus.",
    quizzes_count: 5,
    resources_count: 10
  },
  {
    id: "SUB-HE101",
    code: "HE101",
    name: "Food and Beverage Services",
    type: "subject",
    category: "Hospitality & Tourism",
    track_id: "T-TVL-001",
    program_id: "P-BSHM-001",
    status: "available",
    description: "Restaurant service procedures and customer handling.",
    quizzes_count: 2,
    resources_count: 4
  },
  {
    id: "SUB-GAS101",
    code: "GAS101",
    name: "Research Methods",
    type: "subject",
    category: "Arts & Humanities",
    track_id: "T-ACAD-001",
    program_id: "P-BEED-001",
    status: "not_available",
    description: "Introduction to research methodologies and academic writing.",
    quizzes_count: 1,
    resources_count: 3
  },
  {
    id: "SUB-SPORTS101",
    code: "SPORTS101",
    name: "Physical Fitness and Wellness",
    type: "elective",
    category: "Sports & Wellness",
    track_id: "T-SPORTS-001",
    program_id: null,
    status: "available",
    description: "Principles of physical fitness, nutrition, and wellness.",
    quizzes_count: 1,
    resources_count: 2
  }
];

export const subjectCategories = {
  academic: [
    "Arts & Humanities",
    "Business & Entrepreneurship",
    "STEM",
    "Sports & Wellness"
  ],
  technical: [
    "Aesthetic & Wellness",
    "Agri-Fishery & Food",
    "Artisanry & Creative Enterprise",
    "Automotive",
    "Construction",
    "Creative Arts & Design",
    "Hospitality & Tourism",
    "ICT Support & Computer Programming",
    "Industrial Technologies",
    "Maritime"
  ]
};

export default { mockTracks, mockPrograms, mockSubjects, subjectCategories };
