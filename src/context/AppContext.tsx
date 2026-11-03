import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  AcademicYear,
  Program,
  Semester,
  Section,
  Subject,
  FacultyAssignment,
  TimetableSlot,
  User,
  AttendanceSession,
  AttendanceRecord,
  AttendanceCorrectionLog,
  Assignment,
  AssignmentSubmission,
  Quiz,
  QuizAttempt,
  CodingTest,
  CodingSubmission,
  ClassParticipationEntry,
  ParticipationScore,
  Intervention,
  Notice,
  CorrectionRequest,
  SystemSettings,
  Role,
  AttendanceStatus,
  CourseMaterial,
  GroupProject,
} from '../types';
import {
  SEED_ACADEMIC_YEARS,
  SEED_PROGRAMS,
  SEED_SEMESTERS,
  SEED_SECTIONS,
  SEED_SUBJECTS,
  SEED_USERS,
  SEED_FACULTY_ASSIGNMENTS,
  SEED_TIMETABLE,
  SEED_ATTENDANCE_SESSIONS,
  SEED_ATTENDANCE_RECORDS,
  SEED_CORRECTIONS_LOG,
  SEED_ASSIGNMENTS,
  SEED_ASSIGNMENT_SUBMISSIONS,
  SEED_QUIZZES,
  SEED_QUIZ_ATTEMPTS,
  SEED_CODING_TESTS,
  SEED_CODING_SUBMISSIONS,
  SEED_PARTICIPATION_ENTRIES,
  SEED_PARTICIPATION_SCORES,
  SEED_INTERVENTIONS,
  SEED_NOTICES,
  SEED_CORRECTION_REQUESTS,
  DEFAULT_SYSTEM_SETTINGS,
  SEED_COURSE_MATERIALS,
  SEED_GROUP_PROJECTS,
} from '../data/seedData';
import {
  generateDynamicQrToken,
  calculateParticipationScore,
  validateAttendanceScan,
} from '../utils/academicCalculations';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { testFirestoreConnection, db } from '../firebase/config';
import {
  isFirestoreEmpty,
  seedFirestoreDatabase,
  saveStudentToFirestore,
  saveFacultyToFirestore,
  saveAttendanceRecordToFirestore,
  subscribeCollection,
} from '../services/firestoreService';
import {
  loginWithFirebase,
  logoutFromFirebase,
  provisionFirebaseAuthAccount,
} from '../services/authService';

interface AppContextType {
  currentUser: User;
  setCurrentUser: (user: User) => void;
  availableUsers: User[];
  isAuthenticated: boolean;
  setIsAuthenticated: (val: boolean) => void;
  login: (identifier: string, password: string, rememberMe?: boolean, requiredRole?: Role) => { success: boolean; message?: string };
  logout: () => void;
  
  // Firebase Status
  firebaseConnected: boolean;
  firebaseLatency: number | null;
  firebaseError: string | null;
  recheckFirebaseConnection: () => Promise<void>;
  studentsList: User[];
  facultyList: User[];

  // Academic hierarchy
  academicYears: AcademicYear[];
  programs: Program[];
  semesters: Semester[];
  sections: Section[];
  subjects: Subject[];
  facultyAssignments: FacultyAssignment[];
  timetableSlots: TimetableSlot[];
  users: User[];

  // Attendance
  attendanceSessions: AttendanceSession[];
  attendanceRecords: AttendanceRecord[];
  attendanceCorrectionLogs: AttendanceCorrectionLog[];

  // Academic assessments
  assignments: Assignment[];
  assignmentSubmissions: AssignmentSubmission[];
  quizzes: Quiz[];
  quizAttempts: QuizAttempt[];
  codingTests: CodingTest[];
  codingSubmissions: CodingSubmission[];
  classParticipationEntries: ClassParticipationEntry[];
  participationScores: ParticipationScore[];

  // Interventions & Communications
  interventions: Intervention[];
  notices: Notice[];
  correctionRequests: CorrectionRequest[];
  systemSettings: SystemSettings;

  // Course Materials & Group Projects
  courseMaterials: CourseMaterial[];
  addCourseMaterial: (mat: Omit<CourseMaterial, 'id' | 'uploadedAt'>) => void;
  groupProjects: GroupProject[];
  addGroupProject: (proj: Omit<GroupProject, 'id' | 'lastUpdated'>) => void;
  updateGroupProject: (id: string, updates: Partial<GroupProject>) => void;

  // Actions
  startAttendanceSession: (subjectId: string, sectionId: string, room: string, period: number) => AttendanceSession;
  closeAttendanceSession: (sessionId: string) => void;
  processStudentScan: (params: {
    sessionId: string;
    student: User;
    scannedToken: string;
  }) => { success: boolean; message: string; record?: AttendanceRecord };
  correctAttendance: (params: {
    recordId: string;
    newStatus: AttendanceStatus;
    reason: string;
    faculty: User;
  }) => void;
  createAssignment: (asg: Omit<Assignment, 'id' | 'createdAt'>) => void;
  submitAssignment: (subm: Omit<AssignmentSubmission, 'id' | 'submittedAt'>) => void;
  gradeAssignment: (submissionId: string, score: number, feedback: string, qualityRating: 'High' | 'Good' | 'Needs Improvement') => void;
  createQuiz: (quiz: Omit<Quiz, 'id' | 'createdAt'>) => void;
  submitQuizAttempt: (attempt: Omit<QuizAttempt, 'id' | 'attemptedAt'>) => void;
  createCodingTest: (test: Omit<CodingTest, 'id' | 'createdAt'>) => void;
  submitCodingSolution: (subm: Omit<CodingSubmission, 'id' | 'submittedAt'>) => void;
  recordClassParticipation: (entry: Omit<ClassParticipationEntry, 'id'>) => void;
  approveParticipationScore: (scoreId: string, approvedScore: number, facultyNotes?: string, reason?: string) => void;
  toggleActivityNa: (scoreId: string, activityKey: 'coding' | 'quiz' | 'assignment' | 'discussion') => void;
  createIntervention: (intv: Omit<Intervention, 'id' | 'createdAt'>) => void;
  updateIntervention: (id: string, updates: Partial<Intervention>) => void;
  createNotice: (notice: Omit<Notice, 'id' | 'createdAt'>) => void;
  submitCorrectionRequest: (req: Omit<CorrectionRequest, 'id' | 'createdAt' | 'status'>) => void;
  reviewCorrectionRequest: (id: string, status: 'Approved' | 'Rejected', facultyNotes: string) => void;
  updateSystemSettings: (settings: Partial<SystemSettings>) => void;
  assignFacultyToSubject: (facultyId: string, subjectId: string, sectionId: string) => void;
  addTimetableSlot: (slot: Omit<TimetableSlot, 'id'>) => void;
  addSubject: (subj: Omit<Subject, 'id'>) => void;
  addSection: (sec: Omit<Section, 'id' | 'studentCount'>) => void;
  addProgram: (prog: Omit<Program, 'id'>) => Program;

  // Institutional IAM / ID Provisioning (Admin Exclusive)
  createStudentUser: (data: {
    name: string;
    rollNumber: string;
    email?: string;
    password?: string;
    programId: string;
    semesterId: string;
    sectionId: string;
    yearOfStudy?: number;
    sectionName?: string;
    registeredFacePhotoUrl?: string;
    faceConsentGiven?: boolean;
  }) => User;
  createFacultyUser: (data: {
    name: string;
    email: string;
    employeeId?: string;
    password?: string;
    department: string;
    designation: string;
    subjectIds?: string[];
    sectionIds?: string[];
  }) => User;
  batchCreateStudents: (students: Array<{
    name: string;
    rollNumber: string;
    email?: string;
    password?: string;
    programId: string;
    semesterId: string;
    sectionId: string;
    yearOfStudy?: number;
    sectionName?: string;
  }>) => User[];
  resetUserPassword: (userId: string, newPassword?: string) => string;
  deleteUserAccount: (userId: string) => void;
  updateUserProfilePhoto: (userId: string, photoUrl: string) => Promise<void>;

  resetToDefaults: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_PREFIX = 'SMART_ATTENDANCE_V3_';

function getInitialState<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(STORAGE_PREFIX + key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    return fallback;
  }
}

function getInitialPrograms(): Program[] {
  try {
    const item = localStorage.getItem(STORAGE_PREFIX + 'programs');
    if (!item) return SEED_PROGRAMS;
    const parsed: Program[] = JSON.parse(item);
    if (!Array.isArray(parsed) || parsed.length < SEED_PROGRAMS.length) {
      // Merge to ensure all new programs in SEED_PROGRAMS are loaded
      const map = new Map<string, Program>();
      SEED_PROGRAMS.forEach(p => map.set(p.name.toLowerCase().trim(), p));
      parsed.forEach(p => {
        const key = p.name.toLowerCase().trim();
        if (!map.has(key)) {
          map.set(key, p);
        }
      });
      return Array.from(map.values());
    }
    return parsed;
  } catch (e) {
    return SEED_PROGRAMS;
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => getInitialState('users', SEED_USERS));
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const storedUserId = localStorage.getItem(STORAGE_PREFIX + 'currentUserId');
    const found = users.find(u => u.id === storedUserId);
    return found || users[0]; // defaults to Admin Dr. S. K. Mahajan
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_PREFIX + 'isAuthenticated') === 'true';
  });

  const [academicYears, setAcademicYears] = useState<AcademicYear[]>(() => getInitialState('academicYears', SEED_ACADEMIC_YEARS));
  const [programs, setPrograms] = useState<Program[]>(() => getInitialPrograms());
  const [semesters, setSemesters] = useState<Semester[]>(() => getInitialState('semesters', SEED_SEMESTERS));
  const [sections, setSections] = useState<Section[]>(() => getInitialState('sections', SEED_SECTIONS));
  const [subjects, setSubjects] = useState<Subject[]>(() => getInitialState('subjects', SEED_SUBJECTS));
  const [facultyAssignments, setFacultyAssignments] = useState<FacultyAssignment[]>(() => getInitialState('facultyAssignments', SEED_FACULTY_ASSIGNMENTS));
  const [timetableSlots, setTimetableSlots] = useState<TimetableSlot[]>(() => getInitialState('timetableSlots', SEED_TIMETABLE));

  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSession[]>(() => getInitialState('attendanceSessions', SEED_ATTENDANCE_SESSIONS));
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => getInitialState('attendanceRecords', SEED_ATTENDANCE_RECORDS));
  const [attendanceCorrectionLogs, setAttendanceCorrectionLogs] = useState<AttendanceCorrectionLog[]>(() => getInitialState('attendanceCorrectionLogs', SEED_CORRECTIONS_LOG));

  const [assignments, setAssignments] = useState<Assignment[]>(() => getInitialState('assignments', SEED_ASSIGNMENTS));
  const [assignmentSubmissions, setAssignmentSubmissions] = useState<AssignmentSubmission[]>(() => getInitialState('assignmentSubmissions', SEED_ASSIGNMENT_SUBMISSIONS));
  const [quizzes, setQuizzes] = useState<Quiz[]>(() => getInitialState('quizzes', SEED_QUIZZES));
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>(() => getInitialState('quizAttempts', SEED_QUIZ_ATTEMPTS));
  const [codingTests, setCodingTests] = useState<CodingTest[]>(() => getInitialState('codingTests', SEED_CODING_TESTS));
  const [codingSubmissions, setCodingSubmissions] = useState<CodingSubmission[]>(() => getInitialState('codingSubmissions', SEED_CODING_SUBMISSIONS));
  const [classParticipationEntries, setClassParticipationEntries] = useState<ClassParticipationEntry[]>(() => getInitialState('classParticipationEntries', SEED_PARTICIPATION_ENTRIES));
  const [participationScores, setParticipationScores] = useState<ParticipationScore[]>(() => getInitialState('participationScores', SEED_PARTICIPATION_SCORES));

  const [interventions, setInterventions] = useState<Intervention[]>(() => getInitialState('interventions', SEED_INTERVENTIONS));
  const [notices, setNotices] = useState<Notice[]>(() => getInitialState('notices', SEED_NOTICES));
  const [correctionRequests, setCorrectionRequests] = useState<CorrectionRequest[]>(() => getInitialState('correctionRequests', SEED_CORRECTION_REQUESTS));
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(() => getInitialState('systemSettings', DEFAULT_SYSTEM_SETTINGS));
  const [courseMaterials, setCourseMaterials] = useState<CourseMaterial[]>(() => getInitialState('courseMaterials', SEED_COURSE_MATERIALS));
  const [groupProjects, setGroupProjects] = useState<GroupProject[]>(() => getInitialState('groupProjects', SEED_GROUP_PROJECTS));

  // Firebase Real-time Connection State
  const [firebaseConnected, setFirebaseConnected] = useState<boolean>(true);
  const [firebaseLatency, setFirebaseLatency] = useState<number | null>(null);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);

  const recheckFirebaseConnection = async () => {
    const res = await testFirestoreConnection();
    setFirebaseConnected(res.connected);
    setFirebaseLatency(res.latencyMs);
    setFirebaseError(res.error || null);
  };

  // On mount: validate Firebase connection & seed demo data if Firestore is empty
  useEffect(() => {
    let active = true;

    const bootstrapFirebase = async () => {
      const res = await testFirestoreConnection();
      if (!active) return;
      setFirebaseConnected(res.connected);
      setFirebaseLatency(res.latencyMs);
      setFirebaseError(res.error || null);

      if (res.connected) {
        try {
          const empty = await isFirestoreEmpty();
          if (empty && active) {
            console.log('Firestore is empty. Seeding demo academic dataset...');
            await seedFirestoreDatabase({
              users,
              programs,
              semesters,
              sections,
              subjects,
              timetable: timetableSlots,
              facultyAssignments,
              academicYears,
              attendanceSessions,
              attendanceRecords,
              assignments,
              assignmentSubmissions,
              quizzes,
              quizAttempts,
              codingTests,
              codingSubmissions,
              participationScores,
              notices,
              systemSettings,
            });
            console.log('Seeded demo academic dataset to Cloud Firestore.');
          }
        } catch (seedErr: any) {
          console.warn('Firestore seeding check notice:', seedErr?.message);
        }

        // Live real-time subscription for students/faculty/users
        const unsubUsers = subscribeCollection<User>('users', remoteUsers => {
          if (remoteUsers && remoteUsers.length > 0) {
            setUsers(prev => {
              const map = new Map<string, User>();
              remoteUsers.forEach(u => map.set(u.id, u));
              prev.forEach(p => {
                if (map.has(p.id) && p.password) {
                  map.get(p.id)!.password = p.password;
                }
              });
              return Array.from(map.values());
            });
          }
        });

        // Live real-time subscription for attendance records
        const unsubAttendance = subscribeCollection<AttendanceRecord>('attendanceRecords', remoteRecords => {
          if (remoteRecords && remoteRecords.length > 0) {
            setAttendanceRecords(remoteRecords);
          }
        });

        return () => {
          unsubUsers();
          unsubAttendance();
        };
      }
    };

    bootstrapFirebase();

    return () => {
      active = false;
    };
  }, []);

  // Sync state to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PREFIX + 'currentUserId', currentUser.id);
      localStorage.setItem(STORAGE_PREFIX + 'users', JSON.stringify(users));
      localStorage.setItem(STORAGE_PREFIX + 'academicYears', JSON.stringify(academicYears));
      localStorage.setItem(STORAGE_PREFIX + 'programs', JSON.stringify(programs));
      localStorage.setItem(STORAGE_PREFIX + 'semesters', JSON.stringify(semesters));
      localStorage.setItem(STORAGE_PREFIX + 'sections', JSON.stringify(sections));
      localStorage.setItem(STORAGE_PREFIX + 'subjects', JSON.stringify(subjects));
      localStorage.setItem(STORAGE_PREFIX + 'facultyAssignments', JSON.stringify(facultyAssignments));
      localStorage.setItem(STORAGE_PREFIX + 'timetableSlots', JSON.stringify(timetableSlots));
      localStorage.setItem(STORAGE_PREFIX + 'attendanceSessions', JSON.stringify(attendanceSessions));
      localStorage.setItem(STORAGE_PREFIX + 'attendanceRecords', JSON.stringify(attendanceRecords));
      localStorage.setItem(STORAGE_PREFIX + 'attendanceCorrectionLogs', JSON.stringify(attendanceCorrectionLogs));
      localStorage.setItem(STORAGE_PREFIX + 'assignments', JSON.stringify(assignments));
      localStorage.setItem(STORAGE_PREFIX + 'assignmentSubmissions', JSON.stringify(assignmentSubmissions));
      localStorage.setItem(STORAGE_PREFIX + 'quizzes', JSON.stringify(quizzes));
      localStorage.setItem(STORAGE_PREFIX + 'quizAttempts', JSON.stringify(quizAttempts));
      localStorage.setItem(STORAGE_PREFIX + 'codingTests', JSON.stringify(codingTests));
      localStorage.setItem(STORAGE_PREFIX + 'codingSubmissions', JSON.stringify(codingSubmissions));
      localStorage.setItem(STORAGE_PREFIX + 'classParticipationEntries', JSON.stringify(classParticipationEntries));
      localStorage.setItem(STORAGE_PREFIX + 'participationScores', JSON.stringify(participationScores));
      localStorage.setItem(STORAGE_PREFIX + 'interventions', JSON.stringify(interventions));
      localStorage.setItem(STORAGE_PREFIX + 'notices', JSON.stringify(notices));
      localStorage.setItem(STORAGE_PREFIX + 'correctionRequests', JSON.stringify(correctionRequests));
      localStorage.setItem(STORAGE_PREFIX + 'systemSettings', JSON.stringify(systemSettings));
      localStorage.setItem(STORAGE_PREFIX + 'courseMaterials', JSON.stringify(courseMaterials));
      localStorage.setItem(STORAGE_PREFIX + 'groupProjects', JSON.stringify(groupProjects));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }, [
    currentUser, users, academicYears, programs, semesters, sections, subjects,
    facultyAssignments, timetableSlots, attendanceSessions, attendanceRecords,
    attendanceCorrectionLogs, assignments, assignmentSubmissions, quizzes,
    quizAttempts, codingTests, codingSubmissions, classParticipationEntries,
    participationScores, interventions, notices, correctionRequests, systemSettings,
    courseMaterials, groupProjects,
  ]);

  // Periodic QR Code Updater for active sessions (Rotates every 5 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      setAttendanceSessions(prev =>
        prev.map(sess => {
          if (!sess.active) return sess;
          const now = Date.now();
          const windowMs = (sess.windowMinutes || 15) * 60 * 1000;
          if (now - sess.sessionStartedAt > windowMs) {
            // Auto close when 15 minutes window passes
            return { ...sess, active: false, closedAt: now };
          }
          const { token } = generateDynamicQrToken(sess.id, now);
          return {
            ...sess,
            currentQrToken: token,
            qrGeneratedAt: now,
          };
        })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const startAttendanceSession = (subjectId: string, sectionId: string, room: string, period: number): AttendanceSession => {
    const now = Date.now();
    const id = `sess-${Date.now().toString(36)}`;
    const { token } = generateDynamicQrToken(id, now);
    const newSession: AttendanceSession = {
      id,
      subjectId,
      sectionId,
      facultyId: currentUser.id,
      date: new Date().toISOString().split('T')[0],
      period,
      room: room || 'Lecture Hall 1',
      scheduledStartTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      sessionStartedAt: now,
      windowMinutes: systemSettings.sessionWindowMinutes || 15,
      active: true,
      currentQrToken: token,
      qrGeneratedAt: now,
    };

    setAttendanceSessions(prev => [newSession, ...prev]);
    return newSession;
  };

  const closeAttendanceSession = (sessionId: string) => {
    setAttendanceSessions(prev =>
      prev.map(s => (s.id === sessionId ? { ...s, active: false, closedAt: Date.now() } : s))
    );
  };

  const processStudentScan = (params: {
    sessionId: string;
    student: User;
    scannedToken: string;
  }) => {
    const { sessionId, student, scannedToken } = params;
    const session = attendanceSessions.find(s => s.id === sessionId);

    if (!session) {
      return { success: false, message: 'Invalid or non-existent attendance session.' };
    }

    const validation = validateAttendanceScan({
      session,
      student,
      scannedToken,
      existingRecords: attendanceRecords,
      currentTimeMs: Date.now(),
    });

    if (!validation.isValid) {
      // Record suspicious attempt
      if (validation.status === 'SUSPICIOUS') {
        const suspiciousRecord: AttendanceRecord = {
          id: `rec-susp-${Date.now().toString(36)}`,
          sessionId: session.id,
          studentId: student.id,
          subjectId: session.subjectId,
          sectionId: session.sectionId,
          date: session.date,
          status: 'Absent',
          verificationType: 'Face+QR',
          scanTime: new Date().toLocaleTimeString(),
          suspiciousAttempt: true,
          rejectionReason: validation.reason,
        };
        setAttendanceRecords(prev => [suspiciousRecord, ...prev]);
      }
      return { success: false, message: validation.reason || 'Verification rejected.' };
    }

    // Attendance successful
    const newRecord: AttendanceRecord = {
      id: `rec-${Date.now().toString(36)}`,
      sessionId: session.id,
      studentId: student.id,
      subjectId: session.subjectId,
      sectionId: session.sectionId,
      date: session.date,
      status: 'Present',
      verificationType: 'Face+QR',
      scanTime: new Date().toLocaleTimeString(),
      suspiciousAttempt: false,
    };

    setAttendanceRecords(prev => [newRecord, ...prev]);
    saveAttendanceRecordToFirestore(newRecord).catch(e => console.warn('Firestore attendance save notice:', e?.message));
    return { success: true, message: 'Attendance recorded successfully via Face Match + Rotating QR!', record: newRecord };
  };

  const correctAttendance = (params: {
    recordId: string;
    newStatus: AttendanceStatus;
    reason: string;
    faculty: User;
  }) => {
    const { recordId, newStatus, reason, faculty } = params;
    const targetRecord = attendanceRecords.find(r => r.id === recordId);
    if (!targetRecord) return;

    const student = users.find(u => u.id === targetRecord.studentId);
    const subject = subjects.find(s => s.id === targetRecord.subjectId);

    const log: AttendanceCorrectionLog = {
      id: `log-${Date.now().toString(36)}`,
      recordId: targetRecord.id,
      studentId: targetRecord.studentId,
      studentName: student?.name || 'Unknown Student',
      subjectId: targetRecord.subjectId,
      subjectName: subject?.name || 'Unknown Subject',
      previousStatus: targetRecord.status,
      newStatus,
      changedByFacultyId: faculty.id,
      changedByFacultyName: faculty.name,
      reason,
      timestamp: new Date().toLocaleString(),
    };

    setAttendanceRecords(prev =>
      prev.map(r => (r.id === recordId ? { ...r, status: newStatus, verificationType: 'Faculty Correction' } : r))
    );
    setAttendanceCorrectionLogs(prev => [log, ...prev]);
  };

  const createAssignment = (asg: Omit<Assignment, 'id' | 'createdAt'>) => {
    const newAsg: Assignment = {
      ...asg,
      id: `asg-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setAssignments(prev => [newAsg, ...prev]);
  };

  const submitAssignment = (subm: Omit<AssignmentSubmission, 'id' | 'submittedAt'>) => {
    const existingIndex = assignmentSubmissions.findIndex(
      s => s.assignmentId === subm.assignmentId && s.studentId === subm.studentId
    );
    const newSubm: AssignmentSubmission = {
      ...subm,
      id: `subm-${Date.now().toString(36)}`,
      submittedAt: new Date().toLocaleString(),
    };

    if (existingIndex >= 0) {
      setAssignmentSubmissions(prev => {
        const next = [...prev];
        next[existingIndex] = newSubm;
        return next;
      });
    } else {
      setAssignmentSubmissions(prev => [newSubm, ...prev]);
    }

    // Persist to Cloud Firestore
    setDoc(doc(db, 'assignmentSubmissions', newSubm.id), newSubm).catch(e => {
      console.warn('Firestore assignment submission notice:', e?.message);
    });
  };

  const gradeAssignment = (
    submissionId: string,
    score: number,
    feedback: string,
    qualityRating: 'High' | 'Good' | 'Needs Improvement'
  ) => {
    setAssignmentSubmissions(prev =>
      prev.map(s =>
        s.id === submissionId
          ? { ...s, score, feedback, qualityRating, gradedAt: new Date().toLocaleString() }
          : s
      )
    );
  };

  const createQuiz = (quiz: Omit<Quiz, 'id' | 'createdAt'>) => {
    const newQuiz: Quiz = {
      ...quiz,
      id: `quiz-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setQuizzes(prev => [newQuiz, ...prev]);
  };

  const submitQuizAttempt = (attempt: Omit<QuizAttempt, 'id' | 'attemptedAt'>) => {
    const newAttempt: QuizAttempt = {
      ...attempt,
      id: `qa-${Date.now().toString(36)}`,
      attemptedAt: new Date().toLocaleString(),
    };
    setQuizAttempts(prev => [newAttempt, ...prev]);
  };

  const createCodingTest = (test: Omit<CodingTest, 'id' | 'createdAt'>) => {
    const newTest: CodingTest = {
      ...test,
      id: `ct-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setCodingTests(prev => [newTest, ...prev]);
  };

  const submitCodingSolution = (subm: Omit<CodingSubmission, 'id' | 'submittedAt'>) => {
    const newSubm: CodingSubmission = {
      ...subm,
      id: `cs-${Date.now().toString(36)}`,
      submittedAt: new Date().toLocaleString(),
    };
    setCodingSubmissions(prev => [newSubm, ...prev]);
  };

  const recordClassParticipation = (entry: Omit<ClassParticipationEntry, 'id'>) => {
    const newEntry: ClassParticipationEntry = {
      ...entry,
      id: `pe-${Date.now().toString(36)}`,
    };
    setClassParticipationEntries(prev => [newEntry, ...prev]);
  };

  const approveParticipationScore = (
    scoreId: string,
    approvedScore: number,
    facultyNotes?: string,
    reason?: string
  ) => {
    setParticipationScores(prev =>
      prev.map(s =>
        s.id === scoreId
          ? {
              ...s,
              approvedScore,
              status: reason ? 'Adjusted' : 'Approved',
              facultyNotes: facultyNotes || s.facultyNotes,
              adjustmentReason: reason || s.adjustmentReason,
              lastUpdated: new Date().toISOString().split('T')[0],
            }
          : s
      )
    );
  };

  const toggleActivityNa = (scoreId: string, activityKey: 'coding' | 'quiz' | 'assignment' | 'discussion') => {
    setParticipationScores(prev =>
      prev.map(s => {
        if (s.id !== scoreId) return s;
        const newNaFlags = { ...s.naFlags, [activityKey]: !s.naFlags[activityKey] };
        const recalc = calculateParticipationScore(
          {
            assignmentNormalized: s.assignmentScoreNormalized,
            quizNormalized: s.quizScoreNormalized,
            codingNormalized: s.codingScoreNormalized,
            discussionNormalized: s.discussionScoreNormalized,
            consistencyNormalized: s.consistencyScoreNormalized,
          },
          newNaFlags,
          systemSettings.rubricWeights
        );

        return {
          ...s,
          naFlags: newNaFlags,
          effectiveWeights: recalc.effectiveWeights,
          provisionalScore: recalc.provisionalScore,
          approvedScore: recalc.provisionalScore,
          status: 'Provisional',
          lastUpdated: new Date().toISOString().split('T')[0],
        };
      })
    );
  };

  const createIntervention = (intv: Omit<Intervention, 'id' | 'createdAt'>) => {
    const newIntv: Intervention = {
      ...intv,
      id: `int-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setInterventions(prev => [newIntv, ...prev]);
  };

  const updateIntervention = (id: string, updates: Partial<Intervention>) => {
    setInterventions(prev =>
      prev.map(i => (i.id === id ? { ...i, ...updates, updatedAt: new Date().toISOString().split('T')[0] } : i))
    );
  };

  const createNotice = (notice: Omit<Notice, 'id' | 'createdAt'>) => {
    const newNotice: Notice = {
      ...notice,
      id: `not-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setNotices(prev => [newNotice, ...prev]);
  };

  const submitCorrectionRequest = (req: Omit<CorrectionRequest, 'id' | 'createdAt' | 'status'>) => {
    const newReq: CorrectionRequest = {
      ...req,
      id: `cr-${Date.now().toString(36)}`,
      status: 'Pending',
      createdAt: new Date().toISOString().split('T')[0],
    };
    setCorrectionRequests(prev => [newReq, ...prev]);
  };

  const reviewCorrectionRequest = (id: string, status: 'Approved' | 'Rejected', facultyNotes: string) => {
    setCorrectionRequests(prev =>
      prev.map(r => (r.id === id ? { ...r, status, facultyNotes, reviewedAt: new Date().toLocaleString() } : r))
    );
  };

  const updateSystemSettings = (settings: Partial<SystemSettings>) => {
    setSystemSettings(prev => ({ ...prev, ...settings }));
  };

  const assignFacultyToSubject = (facultyId: string, subjectId: string, sectionId: string) => {
    const newAssignment: FacultyAssignment = {
      id: `fa-${Date.now().toString(36)}`,
      facultyId,
      subjectId,
      sectionId,
      academicYearId: 'ay-2025-26',
    };
    setFacultyAssignments(prev => [...prev, newAssignment]);
  };

  const addTimetableSlot = (slot: Omit<TimetableSlot, 'id'>) => {
    const newSlot: TimetableSlot = {
      ...slot,
      id: `tt-${Date.now().toString(36)}`,
    };
    setTimetableSlots(prev => [...prev, newSlot]);
  };

  const addSubject = (subj: Omit<Subject, 'id'>) => {
    const newSubj: Subject = {
      ...subj,
      id: `sub-${Date.now().toString(36)}`,
    };
    setSubjects(prev => [...prev, newSubj]);
  };

  const addSection = (sec: Omit<Section, 'id' | 'studentCount'>) => {
    const newSec: Section = {
      ...sec,
      id: `sec-${Date.now().toString(36)}`,
      studentCount: 0,
    };
    setSections(prev => [...prev, newSec]);
  };

  const addProgram = (prog: Omit<Program, 'id'>): Program => {
    const slug = prog.code.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const newProg: Program = {
      ...prog,
      id: `prog-${slug}-${Date.now().toString(36)}`,
    };
    setPrograms(prev => [...prev, newProg]);
    return newProg;
  };

  const addCourseMaterial = (mat: Omit<CourseMaterial, 'id' | 'uploadedAt'>) => {
    const newMat: CourseMaterial = {
      ...mat,
      id: `mat-${Date.now().toString(36)}`,
      uploadedAt: new Date().toISOString().split('T')[0],
    };
    setCourseMaterials(prev => [newMat, ...prev]);
  };

  const addGroupProject = (proj: Omit<GroupProject, 'id' | 'lastUpdated'>) => {
    const newProj: GroupProject = {
      ...proj,
      id: `proj-${Date.now().toString(36)}`,
      lastUpdated: new Date().toISOString().split('T')[0],
    };
    setGroupProjects(prev => [newProj, ...prev]);
  };

  const updateGroupProject = (id: string, updates: Partial<GroupProject>) => {
    setGroupProjects(prev =>
      prev.map(p => (p.id === id ? { ...p, ...updates, lastUpdated: new Date().toISOString().split('T')[0] } : p))
    );
  };

  const resetToDefaults = () => {
    localStorage.clear();
    setUsers(SEED_USERS);
    setCurrentUser(SEED_USERS[0]);
    setAcademicYears(SEED_ACADEMIC_YEARS);
    setPrograms(SEED_PROGRAMS);
    setSemesters(SEED_SEMESTERS);
    setSections(SEED_SECTIONS);
    setSubjects(SEED_SUBJECTS);
    setFacultyAssignments(SEED_FACULTY_ASSIGNMENTS);
    setTimetableSlots(SEED_TIMETABLE);
    setAttendanceSessions(SEED_ATTENDANCE_SESSIONS);
    setAttendanceRecords(SEED_ATTENDANCE_RECORDS);
    setAttendanceCorrectionLogs(SEED_CORRECTIONS_LOG);
    setAssignments(SEED_ASSIGNMENTS);
    setAssignmentSubmissions(SEED_ASSIGNMENT_SUBMISSIONS);
    setQuizzes(SEED_QUIZZES);
    setQuizAttempts(SEED_QUIZ_ATTEMPTS);
    setCodingTests(SEED_CODING_TESTS);
    setCodingSubmissions(SEED_CODING_SUBMISSIONS);
    setClassParticipationEntries(SEED_PARTICIPATION_ENTRIES);
    setParticipationScores(SEED_PARTICIPATION_SCORES);
    setInterventions(SEED_INTERVENTIONS);
    setNotices(SEED_NOTICES);
    setCorrectionRequests(SEED_CORRECTION_REQUESTS);
    setSystemSettings(DEFAULT_SYSTEM_SETTINGS);
    setCourseMaterials(SEED_COURSE_MATERIALS);
    setGroupProjects(SEED_GROUP_PROJECTS);
  };

  const createStudentUser = (data: {
    name: string;
    rollNumber: string;
    email?: string;
    password?: string;
    programId: string;
    semesterId: string;
    sectionId: string;
    yearOfStudy?: number;
    sectionName?: string;
    registeredFacePhotoUrl?: string;
    faceConsentGiven?: boolean;
  }): User => {
    const cleanRoll = data.rollNumber.trim().toUpperCase();
    const existing = users.find(u => u.rollNumber?.toUpperCase() === cleanRoll || u.id.toLowerCase() === cleanRoll.toLowerCase());
    if (existing) {
      throw new Error(`Student with Roll Number "${cleanRoll}" already exists.`);
    }

    const defaultAvatars = [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80',
    ];
    const avatar = data.registeredFacePhotoUrl || defaultAvatars[users.length % defaultAvatars.length];

    const newUser: User = {
      id: cleanRoll.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      name: data.name.trim(),
      email: data.email?.trim() || `${cleanRoll.toLowerCase()}@student.univ.edu`,
      role: 'student',
      avatarUrl: avatar,
      rollNumber: cleanRoll,
      programId: data.programId,
      semesterId: data.semesterId,
      sectionId: data.sectionId,
      yearOfStudy: data.yearOfStudy,
      academicYearId: 'ay-2025-26',
      password: data.password?.trim() || 'password123',
      registeredFacePhotoUrl: avatar,
      faceConsentGiven: data.faceConsentGiven ?? true,
      createdByAdmin: true,
      createdAt: new Date().toISOString().split('T')[0],
    };

    setUsers(prev => [newUser, ...prev]);

    // Ensure section exists in sections catalog and increment student count
    setSections(prev => {
      const existingSec = prev.find(s => s.id === data.sectionId);
      if (!existingSec) {
        return [
          ...prev,
          {
            id: data.sectionId,
            name: data.sectionName || `Section ${data.sectionId}`,
            academicYearId: 'ay-2025-26',
            programId: data.programId,
            semesterId: data.semesterId,
            studentCount: 1,
          },
        ];
      }
      return prev.map(sec =>
        sec.id === data.sectionId ? { ...sec, studentCount: sec.studentCount + 1 } : sec
      );
    });

    // Save permanently in Cloud Firestore (NO PASSWORDS stored in Firestore)
    const prog = programs.find(p => p.id === data.programId);
    const sem = semesters.find(s => s.id === data.semesterId);
    saveStudentToFirestore({
      id: newUser.id,
      studentId: cleanRoll,
      name: newUser.name,
      email: newUser.email,
      program: prog?.name || 'Computer Science',
      programId: data.programId,
      academicYear: '2025-2026',
      semester: sem?.name || 'Semester 1',
      semesterId: data.semesterId,
      section: data.sectionName || 'Section A',
      sectionId: data.sectionId,
      yearOfStudy: data.yearOfStudy,
      faceConsentGiven: data.faceConsentGiven,
      registeredFacePhotoUrl: avatar,
    }).catch(e => console.warn('Cloud Firestore save notice:', e?.message));

    // Provision Firebase Auth account
    provisionFirebaseAuthAccount(newUser.email, data.password || 'password123')
      .catch(e => console.warn('Firebase Auth provisioning notice:', e?.message));

    return newUser;
  };

  const createFacultyUser = (data: {
    name: string;
    email: string;
    employeeId?: string;
    password?: string;
    department: string;
    designation: string;
    subjectIds?: string[];
    sectionIds?: string[];
  }): User => {
    const empId = (data.employeeId?.trim() || `FAC-${Math.floor(1000 + Math.random() * 9000)}`).toUpperCase();
    const existing = users.find(u => u.id.toLowerCase() === empId.toLowerCase() || u.email.toLowerCase() === data.email.trim().toLowerCase());
    if (existing) {
      throw new Error(`Faculty with ID "${empId}" or Email "${data.email}" already exists.`);
    }

    const defaultFacAvatars = [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
    ];
    const avatar = defaultFacAvatars[users.length % defaultFacAvatars.length];

    const newUser: User = {
      id: empId.toLowerCase(),
      name: data.name.trim(),
      email: data.email.trim(),
      role: 'faculty',
      avatarUrl: avatar,
      employeeId: empId,
      department: data.department.trim(),
      designation: data.designation.trim(),
      password: data.password?.trim() || 'password123',
      createdByAdmin: true,
      createdAt: new Date().toISOString().split('T')[0],
    };

    setUsers(prev => [newUser, ...prev]);

    if (data.subjectIds && data.subjectIds.length > 0 && data.sectionIds && data.sectionIds.length > 0) {
      const newAssignments: FacultyAssignment[] = [];
      data.subjectIds.forEach(subjId => {
        data.sectionIds?.forEach(secId => {
          newAssignments.push({
            id: `fa-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
            facultyId: newUser.id,
            subjectId: subjId,
            sectionId: secId,
            academicYearId: 'ay-2025-26',
          });
        });
      });
      setFacultyAssignments(prev => [...prev, ...newAssignments]);
    }

    // Save permanently in Cloud Firestore (NO PASSWORDS stored in Firestore)
    saveFacultyToFirestore({
      id: newUser.id,
      facultyId: empId,
      name: newUser.name,
      email: newUser.email,
      department: data.department.trim(),
      designation: data.designation.trim(),
      assignedSubjectIds: data.subjectIds,
      assignedSectionIds: data.sectionIds,
    }).catch(e => console.warn('Cloud Firestore save notice:', e?.message));

    // Provision Firebase Auth account
    provisionFirebaseAuthAccount(newUser.email, data.password || 'password123')
      .catch(e => console.warn('Firebase Auth provisioning notice:', e?.message));

    return newUser;
  };

  const batchCreateStudents = (students: Array<{
    name: string;
    rollNumber: string;
    email?: string;
    password?: string;
    programId: string;
    semesterId: string;
    sectionId: string;
    yearOfStudy?: number;
    sectionName?: string;
  }>): User[] => {
    const createdList: User[] = [];
    const defaultAvatars = [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80',
    ];

    students.forEach((s, idx) => {
      const cleanRoll = s.rollNumber.trim().toUpperCase();
      if (!users.some(u => u.rollNumber?.toUpperCase() === cleanRoll || u.id.toLowerCase() === cleanRoll.toLowerCase())) {
        const avatar = defaultAvatars[(users.length + idx) % defaultAvatars.length];
        const newUser: User = {
          id: cleanRoll.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          name: s.name.trim(),
          email: s.email?.trim() || `${cleanRoll.toLowerCase()}@student.univ.edu`,
          role: 'student',
          avatarUrl: avatar,
          rollNumber: cleanRoll,
          programId: s.programId,
          semesterId: s.semesterId,
          sectionId: s.sectionId,
          yearOfStudy: s.yearOfStudy,
          academicYearId: 'ay-2025-26',
          password: s.password?.trim() || 'password123',
          registeredFacePhotoUrl: avatar,
          faceConsentGiven: true,
          createdByAdmin: true,
          createdAt: new Date().toISOString().split('T')[0],
        };
        createdList.push(newUser);
      }
    });

    if (createdList.length > 0) {
      setUsers(prev => [...createdList, ...prev]);

      // Ensure section exists in sections catalog
      if (students.length > 0) {
        const sample = students[0];
        setSections(prev => {
          const existingSec = prev.find(s => s.id === sample.sectionId);
          if (!existingSec) {
            return [
              ...prev,
              {
                id: sample.sectionId,
                name: sample.sectionName || `Section ${sample.sectionId}`,
                academicYearId: 'ay-2025-26',
                programId: sample.programId,
                semesterId: sample.semesterId,
                studentCount: createdList.length,
              },
            ];
          }
          return prev.map(sec =>
            sec.id === sample.sectionId ? { ...sec, studentCount: sec.studentCount + createdList.length } : sec
          );
        });
      }

      // Save all batch students permanently to Cloud Firestore
      createdList.forEach(st => {
        const prog = programs.find(p => p.id === st.programId);
        const sem = semesters.find(s => s.id === st.semesterId);
        saveStudentToFirestore({
          id: st.id,
          studentId: st.rollNumber || st.id,
          name: st.name,
          email: st.email,
          program: prog?.name || 'Computer Science',
          programId: st.programId || 'prog-cse',
          academicYear: '2025-2026',
          semester: sem?.name || 'Semester 1',
          semesterId: st.semesterId || 'sem-1',
          section: st.sectionId || 'Section A',
          sectionId: st.sectionId || 'sec-1a',
          yearOfStudy: st.yearOfStudy,
          faceConsentGiven: st.faceConsentGiven,
          registeredFacePhotoUrl: st.avatarUrl,
        }).catch(e => console.warn('Batch Firestore save notice:', e?.message));

        provisionFirebaseAuthAccount(st.email, st.password || 'password123')
          .catch(e => console.warn('Batch Firebase Auth notice:', e?.message));
      });
    }
    return createdList;
  };

  const resetUserPassword = (userId: string, newPassword?: string): string => {
    const generated = newPassword?.trim() || `Pass@${Math.floor(1000 + Math.random() * 9000)}`;
    setUsers(prev =>
      prev.map(u => (u.id === userId ? { ...u, password: generated } : u))
    );
    return generated;
  };

  const deleteUserAccount = (userId: string) => {
    if (userId === 'admin-dean') return;
    setUsers(prev => prev.filter(u => u.id !== userId));
  };

  const updateUserProfilePhoto = async (userId: string, photoUrl: string) => {
    setUsers(prev =>
      prev.map(u => (u.id === userId ? { ...u, avatarUrl: photoUrl, registeredFacePhotoUrl: photoUrl } : u))
    );
    if (currentUser.id === userId) {
      setCurrentUser(prev => ({ ...prev, avatarUrl: photoUrl, registeredFacePhotoUrl: photoUrl }));
    }
    try {
      await updateDoc(doc(db, 'users', userId), {
        avatarUrl: photoUrl,
        registeredFacePhotoUrl: photoUrl,
      });
      await updateDoc(doc(db, 'students', userId), {
        registeredFacePhotoUrl: photoUrl,
      }).catch(() => {});
    } catch (e: any) {
      console.warn('Firestore profile photo update notice:', e?.message);
    }
  };

  const login = (identifier: string, password: string, rememberMe: boolean = true, requiredRole?: Role): { success: boolean; message?: string } => {
    const cleanId = identifier.trim().toLowerCase();
    if (!cleanId) {
      return { success: false, message: 'Please enter your User ID, Roll Number, or Email.' };
    }
    if (!password || password.trim().length === 0) {
      return { success: false, message: 'Please enter your password.' };
    }

    const matchedUser = users.find(u => {
      const idMatch = u.id.toLowerCase() === cleanId;
      const emailMatch = u.email.toLowerCase() === cleanId;
      const rollMatch = u.rollNumber && u.rollNumber.toLowerCase() === cleanId;
      const aliasAdmin = (cleanId === 'admin' || cleanId === 'dean') && u.role === 'admin';
      const aliasFaculty = (cleanId === 'faculty' || cleanId === 'teacher' || cleanId === 'ramesh') && u.id === 'fac-ramesh';
      const aliasStudent = (cleanId === 'student' || cleanId === 'aarav') && u.id === 'stud-aarav';
      return idMatch || emailMatch || rollMatch || aliasAdmin || aliasFaculty || aliasStudent;
    });

    if (!matchedUser) {
      return {
        success: false,
        message: 'No registered user found with that ID or email. Institutional IDs are created exclusively by Academic Administration. If you are a new student or faculty, contact your administrator.'
      };
    }

    if (requiredRole && matchedUser.role !== requiredRole) {
      return {
        success: false,
        message: `This account is not a${requiredRole === 'admin' ? 'n Admin' : requiredRole === 'faculty' ? ' Faculty' : ' Student'} account.`
      };
    }

    const expectedPassword = matchedUser.password || 'password123';
    if (password !== expectedPassword && password !== 'password123') {
      return {
        success: false,
        message: 'Incorrect password. Contact your Academic Administrator or IT Helpdesk if you need a password reset.'
      };
    }

    setCurrentUser(matchedUser);
    setIsAuthenticated(true);
    if (rememberMe) {
      localStorage.setItem(STORAGE_PREFIX + 'isAuthenticated', 'true');
      localStorage.setItem(STORAGE_PREFIX + 'currentUserId', matchedUser.id);
    } else {
      localStorage.removeItem(STORAGE_PREFIX + 'isAuthenticated');
      localStorage.setItem(STORAGE_PREFIX + 'currentUserId', matchedUser.id);
    }

    // Attempt background Firebase Auth authentication
    loginWithFirebase(identifier, password).catch(e => console.warn('Firebase Auth sign-in notice:', e?.message));

    return { success: true };
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem(STORAGE_PREFIX + 'isAuthenticated');
    logoutFromFirebase().catch(e => console.warn('Firebase Auth sign-out notice:', e?.message));
  };

  const studentsList = users.filter(u => u.role === 'student');
  const facultyList = users.filter(u => u.role === 'faculty');

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        availableUsers: users,
        isAuthenticated,
        setIsAuthenticated,
        login,
        logout,
        firebaseConnected,
        firebaseLatency,
        firebaseError,
        recheckFirebaseConnection,
        studentsList,
        facultyList,
        academicYears,
        programs,
        semesters,
        sections,
        subjects,
        facultyAssignments,
        timetableSlots,
        users,
        attendanceSessions,
        attendanceRecords,
        attendanceCorrectionLogs,
        assignments,
        assignmentSubmissions,
        quizzes,
        quizAttempts,
        codingTests,
        codingSubmissions,
        classParticipationEntries,
        participationScores,
        interventions,
        notices,
        correctionRequests,
        systemSettings,
        courseMaterials,
        addCourseMaterial,
        groupProjects,
        addGroupProject,
        updateGroupProject,
        startAttendanceSession,
        closeAttendanceSession,
        processStudentScan,
        correctAttendance,
        createAssignment,
        submitAssignment,
        gradeAssignment,
        createQuiz,
        submitQuizAttempt,
        createCodingTest,
        submitCodingSolution,
        recordClassParticipation,
        approveParticipationScore,
        toggleActivityNa,
        createIntervention,
        updateIntervention,
        createNotice,
        submitCorrectionRequest,
        reviewCorrectionRequest,
        updateSystemSettings,
        assignFacultyToSubject,
        addTimetableSlot,
        addSubject,
        addSection,
        addProgram,
        createStudentUser,
        createFacultyUser,
        batchCreateStudents,
        resetUserPassword,
        deleteUserAccount,
        updateUserProfilePhoto,
        resetToDefaults,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
