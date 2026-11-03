import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  limit,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  User,
  Program,
  Semester,
  Section,
  Subject,
  TimetableSlot,
  FacultyAssignment,
  AttendanceSession,
  AttendanceRecord,
  Assignment,
  AssignmentSubmission,
  Quiz,
  QuizAttempt,
  CodingTest,
  CodingSubmission,
  ParticipationScore,
  Notice,
  AcademicYear,
  SystemSettings,
  CourseMaterial,
  GroupProject,
} from '../types';

/**
 * Checks if the Firestore database is currently empty
 */
export async function isFirestoreEmpty(): Promise<boolean> {
  try {
    const studentsSnap = await getDocs(query(collection(db, 'students'), limit(1)));
    if (!studentsSnap.empty) return false;

    const usersSnap = await getDocs(query(collection(db, 'users'), limit(1)));
    if (!usersSnap.empty) return false;

    return true;
  } catch (error) {
    console.error('Error checking if Firestore is empty:', error);
    return false;
  }
}

/**
 * Seeds demo data into Firestore only when database is empty
 */
export async function seedFirestoreDatabase(seedData: {
  users: User[];
  programs: Program[];
  semesters: Semester[];
  sections: Section[];
  subjects: Subject[];
  timetable: TimetableSlot[];
  facultyAssignments: FacultyAssignment[];
  academicYears: AcademicYear[];
  attendanceSessions: AttendanceSession[];
  attendanceRecords: AttendanceRecord[];
  assignments: Assignment[];
  assignmentSubmissions: AssignmentSubmission[];
  quizzes: Quiz[];
  quizAttempts: QuizAttempt[];
  codingTests: CodingTest[];
  codingSubmissions: CodingSubmission[];
  participationScores: ParticipationScore[];
  notices: Notice[];
  systemSettings: SystemSettings;
}): Promise<void> {
  // Helper to commit batches within Firestore's 500 operation limit
  class ChunkedBatch {
    private current = writeBatch(db);
    private opCount = 0;

    async set(docRef: any, data: any) {
      this.current.set(docRef, data);
      this.opCount++;
      if (this.opCount >= 200) {
        await this.current.commit();
        this.current = writeBatch(db);
        this.opCount = 0;
      }
    }

    async commit() {
      if (this.opCount > 0) {
        await this.current.commit();
        this.opCount = 0;
      }
    }
  }

  const batch = new ChunkedBatch();

  // 1. Users & Admins (Passwords are NOT stored in Firestore)
  for (const user of seedData.users) {
    // Strip passwords before writing to Firestore
    const { password, ...safeUser } = user;
    await batch.set(doc(db, 'users', user.id), safeUser);

    if (user.role === 'admin') {
      await batch.set(doc(db, 'admins', user.id), {
        id: user.id,
        name: user.name,
        email: user.email,
        role: 'admin',
        createdAt: new Date().toISOString(),
      });
    } else if (user.role === 'faculty') {
      await batch.set(doc(db, 'faculty', user.id), {
        facultyId: user.employeeId || user.id,
        id: user.id,
        name: user.name,
        email: user.email,
        department: user.department || 'Computer Science & Engineering',
        designation: user.designation || 'Associate Professor',
        assignedSubjectIds: seedData.facultyAssignments
          .filter(fa => fa.facultyId === user.id)
          .map(fa => fa.subjectId),
        assignedSectionIds: seedData.facultyAssignments
          .filter(fa => fa.facultyId === user.id)
          .map(fa => fa.sectionId),
        createdAt: new Date().toISOString(),
      });
    } else if (user.role === 'student') {
      const prog = seedData.programs.find(p => p.id === user.programId);
      const sec = seedData.sections.find(s => s.id === user.sectionId);
      const sem = seedData.semesters.find(s => s.id === user.semesterId);

      await batch.set(doc(db, 'students', user.id), {
        studentId: user.rollNumber || user.id,
        id: user.id,
        name: user.name,
        email: user.email,
        program: prog?.name || 'Computer Science',
        programId: user.programId || 'prog-cse',
        academicYear: '2025-2026',
        semester: sem?.name || 'Semester 3',
        semesterId: user.semesterId || 'sem-3',
        section: sec?.name || 'Section A',
        sectionId: user.sectionId || 'sec-1a',
        yearOfStudy: user.yearOfStudy || 1,
        faceConsentGiven: user.faceConsentGiven ?? true,
        registeredFacePhotoUrl: user.avatarUrl || '',
        createdAt: new Date().toISOString(),
      });
    }
  }

  // 2. Academic Years
  for (const ay of seedData.academicYears) {
    await batch.set(doc(db, 'academicYears', ay.id), ay);
  }

  // 3. Programs (Key institutional catalog)
  for (const prog of seedData.programs.slice(0, 50)) {
    await batch.set(doc(db, 'programs', prog.id), prog);
  }

  // 4. Semesters
  for (const sem of seedData.semesters) {
    await batch.set(doc(db, 'semesters', sem.id), sem);
  }

  // 5. Sections
  for (const sec of seedData.sections) {
    await batch.set(doc(db, 'sections', sec.id), sec);
  }

  // 6. Subjects
  for (const sub of seedData.subjects) {
    const asg = seedData.facultyAssignments.find(fa => fa.subjectId === sub.id);
    const sec = seedData.sections.find(s => s.id === asg?.sectionId);
    await batch.set(doc(db, 'subjects', sub.id), {
      ...sub,
      subjectId: sub.code,
      subjectName: sub.name,
      facultyId: asg?.facultyId || '',
      section: sec?.name || '',
      academicYear: '2025-2026',
      semester: 'Semester 3',
    });
  }

  // 7. Timetable
  for (const slot of seedData.timetable) {
    const sec = seedData.sections.find(s => s.id === slot.sectionId);
    await batch.set(doc(db, 'timetable', slot.id), {
      ...slot,
      section: sec?.name || slot.sectionId,
      academicYear: '2025-2026',
    });
  }

  // 8. Faculty Assignments
  for (const fa of seedData.facultyAssignments) {
    await batch.set(doc(db, 'facultyAssignments', fa.id), fa);
  }

  // 9. Attendance Sessions & Records
  for (const sess of seedData.attendanceSessions) {
    await batch.set(doc(db, 'attendanceSessions', sess.id), sess);
  }
  for (const rec of seedData.attendanceRecords) {
    await batch.set(doc(db, 'attendanceRecords', rec.id), rec);
  }

  // 10. Assignments & Submissions
  for (const asg of seedData.assignments) {
    await batch.set(doc(db, 'assignments', asg.id), asg);
  }
  for (const sub of seedData.assignmentSubmissions) {
    await batch.set(doc(db, 'assignmentSubmissions', sub.id), sub);
  }

  // 11. Quizzes & Attempts
  for (const q of seedData.quizzes) {
    await batch.set(doc(db, 'quizzes', q.id), q);
  }
  for (const att of seedData.quizAttempts) {
    await batch.set(doc(db, 'quizAttempts', att.id), att);
  }

  // 12. Coding Tests & Submissions
  for (const ct of seedData.codingTests) {
    await batch.set(doc(db, 'codingTests', ct.id), ct);
  }
  for (const cs of seedData.codingSubmissions) {
    await batch.set(doc(db, 'codingSubmissions', cs.id), cs);
  }

  // 13. Participation Marks
  for (const pm of seedData.participationScores) {
    await batch.set(doc(db, 'participationMarks', pm.id), pm);
  }

  // 14. Notifications
  for (const n of seedData.notices) {
    await batch.set(doc(db, 'notifications', n.id), n);
  }

  // 15. Settings
  await batch.set(doc(db, 'systemSettings', 'general'), seedData.systemSettings);

  await batch.commit();
}

/**
 * Save a newly enrolled student permanently to Cloud Firestore
 */
export async function saveStudentToFirestore(studentData: {
  id: string;
  studentId: string;
  name: string;
  email: string;
  program: string;
  programId: string;
  academicYear: string;
  semester: string;
  semesterId: string;
  section: string;
  sectionId: string;
  yearOfStudy?: number;
  faceConsentGiven?: boolean;
  registeredFacePhotoUrl?: string;
}): Promise<void> {
  const batch = writeBatch(db);

  // 1. Save to students collection
  batch.set(doc(db, 'students', studentData.id), {
    ...studentData,
    createdAt: new Date().toISOString(),
  });

  // 2. Save to unified users collection (NO PASSWORDS)
  batch.set(doc(db, 'users', studentData.id), {
    id: studentData.id,
    name: studentData.name,
    email: studentData.email,
    role: 'student',
    rollNumber: studentData.studentId,
    programId: studentData.programId,
    semesterId: studentData.semesterId,
    sectionId: studentData.sectionId,
    yearOfStudy: studentData.yearOfStudy || 1,
    avatarUrl: studentData.registeredFacePhotoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    faceConsentGiven: studentData.faceConsentGiven ?? true,
    createdByAdmin: true,
    createdAt: new Date().toISOString(),
  });

  await batch.commit();
}

/**
 * Save a newly appointed faculty permanently to Cloud Firestore
 */
export async function saveFacultyToFirestore(facultyData: {
  id: string;
  facultyId: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  assignedSubjectIds?: string[];
  assignedSectionIds?: string[];
}): Promise<void> {
  const batch = writeBatch(db);

  // 1. Save to faculty collection
  batch.set(doc(db, 'faculty', facultyData.id), {
    ...facultyData,
    assignedSubjectIds: facultyData.assignedSubjectIds || [],
    assignedSectionIds: facultyData.assignedSectionIds || [],
    createdAt: new Date().toISOString(),
  });

  // 2. Save to unified users collection (NO PASSWORDS)
  batch.set(doc(db, 'users', facultyData.id), {
    id: facultyData.id,
    name: facultyData.name,
    email: facultyData.email,
    role: 'faculty',
    employeeId: facultyData.facultyId,
    department: facultyData.department,
    designation: facultyData.designation,
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    createdByAdmin: true,
    createdAt: new Date().toISOString(),
  });

  await batch.commit();
}

/**
 * Save attendance record permanently to Cloud Firestore
 */
export async function saveAttendanceRecordToFirestore(record: AttendanceRecord): Promise<void> {
  await setDoc(doc(db, 'attendanceRecords', record.id), record);
}

/**
 * Subscribe to real-time updates for any collection
 */
export function subscribeCollection<T>(
  collectionName: string,
  callback: (items: T[]) => void
): Unsubscribe {
  return onSnapshot(collection(db, collectionName), snapshot => {
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
    callback(items);
  }, error => {
    console.warn(`Firestore subscription notice for ${collectionName}:`, error.message);
  });
}
