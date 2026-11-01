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
} from '../data/seedData';
import {
  generateDynamicQrToken,
  calculateParticipationScore,
  validateAttendanceScan,
} from '../utils/academicCalculations';

interface AppContextType {
  currentUser: User;
  setCurrentUser: (user: User) => void;
  availableUsers: User[];
  
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
  resetToDefaults: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_PREFIX = 'SMART_ATTENDANCE_V1_';

function getInitialState<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(STORAGE_PREFIX + key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    return fallback;
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => getInitialState('users', SEED_USERS));
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const storedUserId = localStorage.getItem(STORAGE_PREFIX + 'currentUserId');
    const found = users.find(u => u.id === storedUserId);
    return found || users[0]; // defaults to Admin Dr. S. K. Mahajan
  });

  const [academicYears, setAcademicYears] = useState<AcademicYear[]>(() => getInitialState('academicYears', SEED_ACADEMIC_YEARS));
  const [programs, setPrograms] = useState<Program[]>(() => getInitialState('programs', SEED_PROGRAMS));
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
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }, [
    currentUser, users, academicYears, programs, semesters, sections, subjects,
    facultyAssignments, timetableSlots, attendanceSessions, attendanceRecords,
    attendanceCorrectionLogs, assignments, assignmentSubmissions, quizzes,
    quizAttempts, codingTests, codingSubmissions, classParticipationEntries,
    participationScores, interventions, notices, correctionRequests, systemSettings,
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
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        availableUsers: users,
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
