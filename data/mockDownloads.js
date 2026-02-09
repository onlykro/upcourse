// Mock app downloads data for UpCourse public pages
export const mockDownloads = [
  {
    id: "APK-001",
    version: "0.2.5",
    version_code: 21,
    file_name: "UpCourse-v1.0.0-stable.apk",
    size: "226 MB",
    size_bytes: 50855936,
    release_type: "stable",
    release_date: "2026-01-15T10:00:00Z",
    release_notes: [
      "New personalized career assessment algorithm",
      "Improved user interface with dark mode support",
      "Fixed crash on older Android devices",
      "Performance improvements for quiz loading"
    ],
    min_android_version: "8.0",
    download_count: 1250,
    checksum: "a1b2c3d4e5f6g7h8i9j0"
  },
  {
    id: "APK-002",
    version: "1.1.1-beta",
    version_code: 22,
    file_name: "UpCourse-v1.1.1-beta.apk",
    size: "XX.X MB",
    size_bytes: 51589530,
    release_type: "beta",
    release_date: "2026-01-20T14:00:00Z",
    release_notes: [
      "Testing new offline mode feature",
      "Experimental push notification improvements",
      "Beta testers: Please report any issues"
    ],
    min_android_version: "8.0",
    download_count: 89,
    checksum: "k1l2m3n4o5p6q7r8s9t0"
  },
  {
    id: "APK-003",
    version: "2.0.0",
    version_code: 20,
    file_name: "UpCourse-v2.0.0-stable.apk",
    size: "45.8 MB",
    size_bytes: 48019251,
    release_type: "stable",
    release_date: "2025-12-01T10:00:00Z",
    release_notes: [
      "Major UI redesign with Material You support",
      "New career tracks and programs database",
      "Improved assessment accuracy",
      "Added support for multiple languages"
    ],
    min_android_version: "7.0",
    download_count: 3420,
    checksum: "u1v2w3x4y5z6a7b8c9d0"
  },
  {
    id: "APK-004",
    version: "1.9.5",
    version_code: 19,
    file_name: "UpCourse-v1.9.5-stable.apk",
    size: "42.1 MB",
    size_bytes: 44149350,
    release_type: "stable",
    release_date: "2025-10-15T10:00:00Z",
    release_notes: [
      "Bug fixes and stability improvements",
      "Updated track information for 2025-2026",
      "Fixed sync issues with cloud backup"
    ],
    min_android_version: "7.0",
    download_count: 2890,
    checksum: "e1f2g3h4i5j6k7l8m9n0"
  },
  {
    id: "APK-005",
    version: "1.9.0",
    version_code: 18,
    file_name: "UpCourse-v1.9.0-stable.apk",
    size: "41.5 MB",
    size_bytes: 43520410,
    release_type: "stable",
    release_date: "2025-08-20T10:00:00Z",
    release_notes: [
      "Added career roadmap visualization",
      "New scholarship finder feature",
      "Performance optimizations"
    ],
    min_android_version: "6.0",
    download_count: 4150,
    checksum: "o1p2q3r4s5t6u7v8w9x0"
  }
];

export const releaseTypes = [
  { id: "stable", name: "Stable", description: "Recommended for all users" },
  { id: "beta", name: "Beta", description: "Early access to new features" }
];

export default { mockDownloads, releaseTypes };
