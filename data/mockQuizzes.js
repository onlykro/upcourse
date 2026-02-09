// Mock quizzes data for UpCourse admin dashboard
export const mockQuizzes = [
  {
    id: "Q-0001",
    title: "Introduction to Programming Quiz",
    subject_code: "ICT101",
    subject_name: "Introduction to Computer Programming",
    grade_level: 11,
    section: "TVL-ICT-11A",
    track: "Technical-Vocational Track",
    created_by: "admin@upcourse.test",
    created_at: "2026-01-15T08:00:00Z",
    visibility: "public",
    status: "open",
    due_date: "2026-01-25T23:59:00Z",
    total_points: 50,
    time_limit: 30,
    questions_count: 10,
    submissions_count: 8,
    questions: [
      {
        id: "Q1-001",
        type: "multiple_choice",
        text: "What is a variable in programming?",
        options: [
          { id: "a", text: "A fixed value that cannot change" },
          { id: "b", text: "A container for storing data values" },
          { id: "c", text: "A type of loop" },
          { id: "d", text: "A function name" }
        ],
        correct_answer: "b",
        difficulty: "Easy",
        required: true,
        points: 5
      },
      {
        id: "Q1-002",
        type: "multiple_choice",
        text: "Which of the following is NOT a programming language?",
        options: [
          { id: "a", text: "Python" },
          { id: "b", text: "HTML" },
          { id: "c", text: "Java" },
          { id: "d", text: "C++" }
        ],
        correct_answer: "b",
        difficulty: "Medium",
        required: true,
        points: 5
      },
      {
        id: "Q1-003",
        type: "short_text",
        text: "Define what an algorithm is in your own words.",
        difficulty: "Medium",
        required: true,
        points: 10
      }
    ],
    submissions: [
      { student_id: "STU-0005", score: 45, submitted_at: "2026-01-18T14:30:00Z", duration: 25 },
      { student_id: "STU-0001", score: 40, submitted_at: "2026-01-19T10:15:00Z", duration: 28 }
    ]
  },
  {
    id: "Q-0002",
    title: "Basic Accounting Principles",
    subject_code: "ABM101",
    subject_name: "Fundamentals of Accountancy",
    grade_level: 12,
    section: "ABM-12B",
    track: "Academic Track",
    created_by: "superadmin@upcourse.test",
    created_at: "2026-01-12T10:00:00Z",
    visibility: "public",
    status: "open",
    due_date: "2026-01-28T23:59:00Z",
    total_points: 100,
    time_limit: 60,
    questions_count: 20,
    submissions_count: 12,
    questions: [],
    submissions: [
      { student_id: "STU-0002", score: 85, submitted_at: "2026-01-20T09:00:00Z", duration: 45 },
      { student_id: "STU-0008", score: 92, submitted_at: "2026-01-20T11:30:00Z", duration: 52 }
    ]
  },
  {
    id: "Q-0003",
    title: "Creative Writing Assessment",
    subject_code: "HUMSS101",
    subject_name: "Creative Writing",
    grade_level: 11,
    section: "HUMSS-11C",
    track: "Academic Track",
    created_by: "admin@upcourse.test",
    created_at: "2026-01-10T14:00:00Z",
    visibility: "public",
    status: "closed",
    due_date: "2026-01-18T23:59:00Z",
    total_points: 75,
    time_limit: 45,
    questions_count: 8,
    submissions_count: 15,
    questions: [
      {
        id: "Q3-001",
        type: "likert",
        text: "Rate your confidence in writing poetry:",
        scale: { min: 1, max: 5, labels: ["Not confident", "Very confident"] },
        difficulty: "Easy",
        required: true,
        points: 5
      },
      {
        id: "Q3-002",
        type: "file_upload",
        text: "Upload your short story draft (PDF or DOCX):",
        allowed_types: [".pdf", ".docx"],
        difficulty: "Hard",
        required: true,
        points: 30
      }
    ],
    submissions: [
      { student_id: "STU-0003", score: 68, submitted_at: "2026-01-17T16:00:00Z", duration: 40 },
      { student_id: "STU-0010", score: 72, submitted_at: "2026-01-18T20:30:00Z", duration: 44 }
    ]
  },
  {
    id: "Q-0004",
    title: "Pre-Calculus Mid-Term Exam",
    subject_code: "STEM101",
    subject_name: "Pre-Calculus",
    grade_level: 11,
    section: "STEM-11A",
    track: "Academic Track",
    created_by: "superadmin@upcourse.test",
    created_at: "2026-01-08T08:00:00Z",
    visibility: "private",
    status: "draft",
    due_date: null,
    total_points: 150,
    time_limit: 90,
    questions_count: 25,
    submissions_count: 0,
    questions: [
      {
        id: "Q4-001",
        type: "numeric",
        text: "Solve: If f(x) = 2x + 3, what is f(5)?",
        correct_answer: 13,
        allow_fractions: false,
        difficulty: "Easy",
        required: true,
        points: 5,
        is_math: true
      },
      {
        id: "Q4-002",
        type: "star_rating",
        text: "Rate the difficulty of the practice problems provided:",
        max_stars: 5,
        difficulty: "Easy",
        required: false,
        points: 2
      }
    ],
    submissions: []
  },
  {
    id: "Q-0005",
    title: "Food Safety and Sanitation Quiz",
    subject_code: "HE101",
    subject_name: "Food and Beverage Services",
    grade_level: 12,
    section: "TVL-HE-12A",
    track: "Technical-Vocational Track",
    created_by: "admin@upcourse.test",
    created_at: "2026-01-05T09:00:00Z",
    visibility: "public",
    status: "open",
    due_date: "2026-01-30T23:59:00Z",
    total_points: 40,
    time_limit: 20,
    questions_count: 8,
    submissions_count: 5,
    questions: [],
    submissions: [
      { student_id: "STU-0006", score: 35, submitted_at: "2026-01-15T13:00:00Z", duration: 18 }
    ]
  }
];

// Test bank for reusable questions
export const mockTestBank = [
  {
    id: "TB-001",
    type: "multiple_choice",
    text: "What does HTML stand for?",
    options: [
      { id: "a", text: "Hyper Text Markup Language" },
      { id: "b", text: "High Tech Modern Language" },
      { id: "c", text: "Home Tool Markup Language" },
      { id: "d", text: "Hyperlink Text Management Language" }
    ],
    correct_answer: "a",
    category: "ICT Support & Computer Programming",
    difficulty: "Easy",
    created_by: "admin@upcourse.test",
    created_at: "2025-12-01T10:00:00Z",
    used_count: 5
  },
  {
    id: "TB-002",
    type: "multiple_choice",
    text: "Which accounting equation is correct?",
    options: [
      { id: "a", text: "Assets = Liabilities + Equity" },
      { id: "b", text: "Assets = Liabilities - Equity" },
      { id: "c", text: "Assets + Liabilities = Equity" },
      { id: "d", text: "Equity = Assets + Liabilities" }
    ],
    correct_answer: "a",
    category: "Business & Entrepreneurship",
    difficulty: "Easy",
    created_by: "superadmin@upcourse.test",
    created_at: "2025-12-05T14:00:00Z",
    used_count: 8
  },
  {
    id: "TB-003",
    type: "short_text",
    text: "Explain the difference between a for loop and a while loop.",
    category: "ICT Support & Computer Programming",
    difficulty: "Medium",
    created_by: "admin@upcourse.test",
    created_at: "2025-12-10T09:00:00Z",
    used_count: 3
  },
  {
    id: "TB-004",
    type: "likert",
    text: "Rate your understanding of basic financial statements:",
    scale: { min: 1, max: 5, labels: ["No understanding", "Expert level"] },
    category: "Business & Entrepreneurship",
    difficulty: "Easy",
    created_by: "superadmin@upcourse.test",
    created_at: "2025-12-15T11:00:00Z",
    used_count: 6
  },
  {
    id: "TB-005",
    type: "numeric",
    text: "Calculate: What is 15% of 240?",
    correct_answer: 36,
    allow_fractions: false,
    category: "STEM",
    difficulty: "Easy",
    created_by: "admin@upcourse.test",
    created_at: "2025-12-20T08:00:00Z",
    used_count: 10,
    is_math: true
  }
];

export const questionTypes = [
  { id: "multiple_choice", name: "Multiple Choice", description: "Single or multi-select options" },
  { id: "short_text", name: "Short Text", description: "Open-ended text response" },
  { id: "likert", name: "Likert/Matrix Scale", description: "Rating scale questions" },
  { id: "file_upload", name: "File Upload", description: "Students upload files" },
  { id: "star_rating", name: "Star Rating", description: "1-5 star rating" },
  { id: "numeric", name: "Numeric/Math", description: "Number or fraction input" }
];

export const difficultyLevels = ["Easy", "Medium", "Hard"];

export default { mockQuizzes, mockTestBank, questionTypes, difficultyLevels };
