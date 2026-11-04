export type Role = 'admin' | 'faculty' | 'student';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl: string;
  department?: string;
  designation?: string;
  employeeId?: string;
  password?: string;
  createdByAdmin?: boolean;
  createdAt?: string;
  lastLogin?: string;
  // Student specific
  rollNumber?: string;
  programId?: string;
  semesterId?: string;
  sectionId?: string;
  academicYearId?: string;
  yearOfStudy?: number;
  registeredFacePhotoUrl?: string;
  faceConsentGiven?: boolean;
  hasRegisteredPhoto?: boolean;
  registeredAt?: string;
  attendanceRefPath?: string;
  attendanceRefURL?: string;
  attendanceRefAt?: string;
  attendanceRefLocked?: boolean;
  attendanceRefConsent?: boolean;
}

export interface AcademicYear {
  id: string;
  name: string; // e.g. "2025-2026"
  isCurrent: boolean;
  startDate: string;
  endDate: string;
}

export interface Program {
  id: string;
  name: string; // e.g. "B.Tech Computer Science & Engineering"
  code: string;
  durationYears: number;
  department?: string;
  category?: string;
  degree?: string;
}

export interface Semester {
  id: string;
  programId: string;
  number: number; // 1, 2, 3, etc.
  name: string; // "Semester 3"
}

export interface Section {
  id: string;
  name: string; // "1st Year – A", "1st Year – B", "2nd Year – A"
  academicYearId: string;
  programId: string;
  semesterId: string;
  studentCount: number;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  programId: string;
  semesterId: string;
  credits: number;
  type: 'Theory' | 'Practical/Lab' | 'Theory+Lab' | 'Skill Development';
  hasCodingComponent: boolean;
  hasLiveQuiz: boolean;
}

export interface FacultyAssignment {
  id: string;
  facultyId: string;
  subjectId: string;
  sectionId: string;
  academicYearId: string;
}

export interface TimetableSlot {
  id: string;
  subjectId: string;
  sectionId: string;
  facultyId: string;
  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  startTime: string; // "09:00"
  endTime: string;   // "10:00"
  room: string;      // "Room 304", "Lab 2"
  periodNumber: number;
}

export interface AttendanceSession {
  id: string;
  subjectId: string;
  sectionId: string;
  facultyId: string;
  date: string; // "YYYY-MM-DD"
  period: number;
  room: string;
  scheduledStartTime: string; // "09:00"
  sessionStartedAt: number;   // Timestamp ms
  windowMinutes: number;      // 15 minutes window
  active: boolean;
  closedAt?: number;
  currentQrToken: string;
  qrGeneratedAt: number;
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Excused';

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  subjectId: string;
  sectionId: string;
  date: string;
  status: AttendanceStatus;
  verificationType: 'Face+QR' | 'Faculty Correction' | 'Manual Override';
  scanTime?: string;
  suspiciousAttempt?: boolean;
  rejectionReason?: string;
}

export interface AttendanceCorrectionLog {
  id: string;
  recordId: string;
  studentId: string;
  studentName: string;
  subjectId: string;
  subjectName: string;
  previousStatus: AttendanceStatus;
  newStatus: AttendanceStatus;
  changedByFacultyId: string;
  changedByFacultyName: string;
  reason: string;
  timestamp: string;
}

export interface Assignment {
  id: string;
  subjectId: string;
  sectionId: string;
  facultyId: string;
  title: string;
  description: string;
  dueDate: string;
  totalMarks: number;
  weightage: number;
  createdAt: string;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  submittedAt: string;
  fileUrl?: string;
  fileName?: string;
  textSolution?: string;
  score?: number;
  feedback?: string;
  qualityRating?: 'High' | 'Good' | 'Needs Improvement';
  gradedAt?: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
}

export interface Quiz {
  id: string;
  subjectId: string;
  sectionId: string;
  facultyId: string;
  title: string;
  isLive: boolean;
  durationMinutes: number;
  questions: QuizQuestion[];
  dueDate: string;
  totalMarks: number;
  createdAt: string;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  studentId: string;
  score: number;
  maxScore: number;
  attemptedAt: string;
  selectedAnswers: number[];
  isLiveParticipation: boolean;
}

export interface TestCase {
  input: string;
  expectedOutput: string;
  description: string;
}

export interface CodingTest {
  id: string;
  subjectId: string;
  sectionId: string;
  facultyId: string;
  title: string;
  problemStatement: string;
  starterCode: string;
  testCases: TestCase[];
  deadline: string;
  totalMarks: number;
  createdAt: string;
}

export interface CodingSubmission {
  id: string;
  testId: string;
  studentId: string;
  submittedCode: string;
  passedTests: number;
  totalTests: number;
  score: number;
  submittedAt: string;
  feedback?: string;
}

export interface ClassParticipationEntry {
  id: string;
  subjectId: string;
  sectionId: string;
  studentId: string;
  date: string;
  category: 'Question' | 'Answer' | 'Discussion' | 'Activity' | 'Poll';
  points: number; // 1 to 5
  facultyNotes: string;
}

export type EngagementLevel = 'High' | 'Medium' | 'Low' | 'Insufficient evidence';
export type EngagementTrend = 'Improving' | 'Stable' | 'Declining';
export type ConfidenceLevel = 'High' | 'Medium' | 'Low';

export interface EngagementAnalytics {
  studentId: string;
  subjectId: string;
  level: EngagementLevel;
  trend: EngagementTrend;
  confidence: ConfidenceLevel;
  reasons: string[];
  evidenceCount: number;
  attendanceRate: number;
  assignmentRate: number;
  quizRate: number;
  codingRate: number;
  participationPoints: number;
}

export interface CourseMaterial {
  id: string;
  subjectId: string;
  sectionId: string;
  facultyId: string;
  title: string;
  type: 'Lecture Notes' | 'Slides' | 'Lab Manual' | 'Dataset' | 'Reference Paper';
  fileUrl: string;
  fileSize: string;
  uploadedAt: string;
}

export interface GroupProject {
  id: string;
  subjectId: string;
  sectionId: string;
  facultyId: string;
  teamName: string;
  projectTitle: string;
  members: string[];
  status: 'In Progress' | 'Review Ready' | 'Evaluated';
  githubUrl?: string;
  score?: number;
  maxScore: number;
  feedback?: string;
  lastUpdated: string;
}

export interface ParticipationScoreRubric {
  assignmentWeight: number; // default 1.0
  quizWeight: number;       // default 1.0
  codingWeight: number;     // default 1.5
  discussionWeight: number; // default 1.0
  consistencyWeight: number;// default 0.5
}

export interface ParticipationScore {
  id: string;
  studentId: string;
  subjectId: string;
  sectionId: string;
  // Raw scores normalized (0.0 to 1.0)
  assignmentScoreNormalized: number;
  quizScoreNormalized: number;
  codingScoreNormalized: number;
  discussionScoreNormalized: number;
  consistencyScoreNormalized: number;
  // Not Applicable flags
  naFlags: {
    coding?: boolean;
    quiz?: boolean;
    assignment?: boolean;
    discussion?: boolean;
  };
  // Effective weights (after redistribution)
  effectiveWeights: ParticipationScoreRubric;
  // Calculated provisional score out of 5
  provisionalScore: number;
  // Final score approved by faculty
  approvedScore: number;
  status: 'Provisional' | 'Approved' | 'Adjusted';
  facultyNotes?: string;
  adjustmentReason?: string;
  lastUpdated: string;
}

export interface Intervention {
  id: string;
  studentId: string;
  studentName: string;
  facultyId: string;
  subjectId: string;
  sectionId: string;
  type: 'Mentoring' | 'Remedial Resource' | 'Recovery Plan' | 'Parent Notification';
  status: 'Suggested' | 'In Progress' | 'Completed';
  notes: string;
  suggestedAction: string;
  outcomeNotes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ParticipationAlertAction {
  title: string;
  description: string;
  potentialGain: string;
  actionTab: 'assignments' | 'quizzes' | 'coding_tests' | 'participation_marks';
}

export interface ParticipationAlert {
  id: string;
  studentId: string;
  studentName: string;
  subjectId?: string;
  subjectName?: string;
  currentScore: number;
  scorePercentage: number;
  thresholdPercent: number;
  pointsNeeded: number;
  urgency: 'critical' | 'warning';
  title: string;
  message: string;
  recommendations: ParticipationAlertAction[];
  generatedAt: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  type: 'announcement' | 'deadline' | 'attendance_warning' | 'quiz_reminder' | 'coding_reminder' | 'notice' | 'participation_alert';
  authorId: string;
  authorName: string;
  authorRole: 'admin' | 'faculty' | 'system';
  targetSubjectId?: string; // Optional if class-specific
  targetSectionId?: string; // Must target specific section for faculty notices
  targetStudentId?: string; // Target specific individual student for personalized notifications
  urgency?: 'critical' | 'warning' | 'info';
  currentScore?: number;
  thresholdPercent?: number;
  actionRecommendations?: ParticipationAlertAction[];
  isRead?: boolean;
  isDismissed?: boolean;
  scheduledFor?: string;
  createdAt: string;
}

export interface CorrectionRequest {
  id: string;
  studentId: string;
  studentName: string;
  subjectId: string;
  subjectName: string;
  type: 'attendance' | 'assignment' | 'participation';
  targetRecordId?: string;
  date: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  facultyNotes?: string;
  createdAt: string;
  reviewedAt?: string;
}

export interface SystemSettings {
  attendanceThresholdPercent: number; // Default 75
  honorRollThresholdPercent: number;  // Default 85
  sessionWindowMinutes: number;       // Default 15
  qrRefreshSeconds: number;           // Default 5
  livenessStrictness: 'Standard' | 'Strict' | 'Relaxed';
  dataRetentionDays: number;
  rubricWeights: ParticipationScoreRubric;
  lowParticipationThresholdPercent: number; // Default 60 (%)
}

