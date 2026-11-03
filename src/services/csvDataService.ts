import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { triggerCsvDownload, escapeCsvCell } from '../utils/csvExporter';

export interface CsvValidationRow<T> {
  rowIndex: number;
  data: T;
  raw: string[];
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface CsvValidationResult<T> {
  totalRows: number;
  validRows: CsvValidationRow<T>[];
  invalidRows: CsvValidationRow<T>[];
  duplicateIds: string[];
  duplicateEmails: string[];
  missingFacultyIds: string[];
  headers: string[];
}

export interface StudentCsvRow {
  studentId: string;
  name: string;
  email: string;
  program: string;
  academicYear: string;
  semester: string;
  section: string;
}

export interface FacultyCsvRow {
  facultyId: string;
  name: string;
  email: string;
  department: string;
}

export interface SubjectCsvRow {
  subjectId: string;
  subjectName: string;
  semester: string;
  academicYear: string;
  section: string;
  facultyId: string;
}

export interface TimetableCsvRow {
  subjectId: string;
  facultyId: string;
  academicYear: string;
  section: string;
  day: string;
  startTime: string;
  endTime: string;
  room: string;
}

/**
 * Standard RFC-4180 CSV line parser supporting quoted cells and commas
 */
export function parseCsvText(csvText: string): string[][] {
  const lines = csvText.trim().split(/\r\n|\n|\r/);
  const rows: string[][] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    const cells: string[] = [];
    let currentCell = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentCell += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        cells.push(currentCell.trim());
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    cells.push(currentCell.trim());
    rows.push(cells);
  }

  return rows;
}

/**
 * Validates students.csv:
 * studentId, name, email, program, academicYear, semester, section
 */
export function validateStudentsCsv(
  csvText: string,
  existingStudentIds: Set<string> = new Set(),
  existingEmails: Set<string> = new Set()
): CsvValidationResult<StudentCsvRow> {
  const rows = parseCsvText(csvText);
  if (rows.length === 0) {
    return {
      totalRows: 0,
      validRows: [],
      invalidRows: [],
      duplicateIds: [],
      duplicateEmails: [],
      missingFacultyIds: [],
      headers: [],
    };
  }

  const headers = rows[0].map(h => h.trim().toLowerCase());
  const validRows: CsvValidationRow<StudentCsvRow>[] = [];
  const invalidRows: CsvValidationRow<StudentCsvRow>[] = [];
  const seenIdsInFile = new Set<string>();
  const seenEmailsInFile = new Set<string>();
  const duplicateIds = new Set<string>();
  const duplicateEmails = new Set<string>();

  for (let i = 1; i < rows.length; i++) {
    const raw = rows[i];
    const studentId = raw[0]?.trim() || '';
    const name = raw[1]?.trim() || '';
    const email = raw[2]?.trim().toLowerCase() || '';
    const program = raw[3]?.trim() || '';
    const academicYear = raw[4]?.trim() || '2025-2026';
    const semester = raw[5]?.trim() || 'Semester 1';
    const section = raw[6]?.trim() || 'Section A';

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check mandatory fields
    if (!studentId) errors.push('Missing studentId');
    if (!name) errors.push('Missing student name');
    if (!email) errors.push('Missing email address');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push(`Invalid email format: "${email}"`);
    }

    // Check duplicate student IDs
    if (studentId) {
      if (seenIdsInFile.has(studentId)) {
        errors.push(`Duplicate studentId within CSV: ${studentId}`);
        duplicateIds.add(studentId);
      } else if (existingStudentIds.has(studentId)) {
        errors.push(`Student ID already exists in database: ${studentId}`);
        duplicateIds.add(studentId);
      }
      seenIdsInFile.add(studentId);
    }

    // Check duplicate emails
    if (email) {
      if (seenEmailsInFile.has(email)) {
        errors.push(`Duplicate email within CSV: ${email}`);
        duplicateEmails.add(email);
      } else if (existingEmails.has(email)) {
        errors.push(`Email already exists in database: ${email}`);
        duplicateEmails.add(email);
      }
      seenEmailsInFile.add(email);
    }

    if (!program) warnings.push('Defaulted program to General Studies');

    const rowObj: CsvValidationRow<StudentCsvRow> = {
      rowIndex: i + 1,
      data: { studentId, name, email, program, academicYear, semester, section },
      raw,
      isValid: errors.length === 0,
      errors,
      warnings,
    };

    if (rowObj.isValid) {
      validRows.push(rowObj);
    } else {
      invalidRows.push(rowObj);
    }
  }

  return {
    totalRows: rows.length - 1,
    validRows,
    invalidRows,
    duplicateIds: Array.from(duplicateIds),
    duplicateEmails: Array.from(duplicateEmails),
    missingFacultyIds: [],
    headers: rows[0],
  };
}

/**
 * Validates faculty.csv:
 * facultyId, name, email, department
 */
export function validateFacultyCsv(
  csvText: string,
  existingFacultyIds: Set<string> = new Set(),
  existingEmails: Set<string> = new Set()
): CsvValidationResult<FacultyCsvRow> {
  const rows = parseCsvText(csvText);
  if (rows.length === 0) {
    return {
      totalRows: 0,
      validRows: [],
      invalidRows: [],
      duplicateIds: [],
      duplicateEmails: [],
      missingFacultyIds: [],
      headers: [],
    };
  }

  const validRows: CsvValidationRow<FacultyCsvRow>[] = [];
  const invalidRows: CsvValidationRow<FacultyCsvRow>[] = [];
  const seenIdsInFile = new Set<string>();
  const seenEmailsInFile = new Set<string>();
  const duplicateIds = new Set<string>();
  const duplicateEmails = new Set<string>();

  for (let i = 1; i < rows.length; i++) {
    const raw = rows[i];
    const facultyId = raw[0]?.trim() || '';
    const name = raw[1]?.trim() || '';
    const email = raw[2]?.trim().toLowerCase() || '';
    const department = raw[3]?.trim() || '';

    const errors: string[] = [];
    const warnings: string[] = [];

    if (!facultyId) errors.push('Missing facultyId');
    if (!name) errors.push('Missing faculty name');
    if (!email) errors.push('Missing faculty email');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push(`Invalid email format: "${email}"`);
    }
    if (!department) errors.push('Missing academic department');

    if (facultyId) {
      if (seenIdsInFile.has(facultyId)) {
        errors.push(`Duplicate facultyId in CSV: ${facultyId}`);
        duplicateIds.add(facultyId);
      } else if (existingFacultyIds.has(facultyId)) {
        errors.push(`Faculty ID already exists in database: ${facultyId}`);
        duplicateIds.add(facultyId);
      }
      seenIdsInFile.add(facultyId);
    }

    if (email) {
      if (seenEmailsInFile.has(email)) {
        errors.push(`Duplicate email in CSV: ${email}`);
        duplicateEmails.add(email);
      } else if (existingEmails.has(email)) {
        errors.push(`Email already registered in database: ${email}`);
        duplicateEmails.add(email);
      }
      seenEmailsInFile.add(email);
    }

    const rowObj: CsvValidationRow<FacultyCsvRow> = {
      rowIndex: i + 1,
      data: { facultyId, name, email, department },
      raw,
      isValid: errors.length === 0,
      errors,
      warnings,
    };

    if (rowObj.isValid) {
      validRows.push(rowObj);
    } else {
      invalidRows.push(rowObj);
    }
  }

  return {
    totalRows: rows.length - 1,
    validRows,
    invalidRows,
    duplicateIds: Array.from(duplicateIds),
    duplicateEmails: Array.from(duplicateEmails),
    missingFacultyIds: [],
    headers: rows[0],
  };
}

/**
 * Validates subjects.csv:
 * subjectId, subjectName, semester, academicYear, section, facultyId
 */
export function validateSubjectsCsv(
  csvText: string,
  knownFacultyIds: Set<string> = new Set()
): CsvValidationResult<SubjectCsvRow> {
  const rows = parseCsvText(csvText);
  if (rows.length === 0) {
    return {
      totalRows: 0,
      validRows: [],
      invalidRows: [],
      duplicateIds: [],
      duplicateEmails: [],
      missingFacultyIds: [],
      headers: [],
    };
  }

  const validRows: CsvValidationRow<SubjectCsvRow>[] = [];
  const invalidRows: CsvValidationRow<SubjectCsvRow>[] = [];
  const missingFacultyIds = new Set<string>();

  for (let i = 1; i < rows.length; i++) {
    const raw = rows[i];
    const subjectId = raw[0]?.trim() || '';
    const subjectName = raw[1]?.trim() || '';
    const semester = raw[2]?.trim() || 'Semester 1';
    const academicYear = raw[3]?.trim() || '2025-2026';
    const section = raw[4]?.trim() || 'Section A';
    const facultyId = raw[5]?.trim() || '';

    const errors: string[] = [];
    const warnings: string[] = [];

    if (!subjectId) errors.push('Missing subjectId / course code');
    if (!subjectName) errors.push('Missing subjectName');

    if (!facultyId) {
      warnings.push('No assigned facultyId provided; unassigned course');
    } else if (knownFacultyIds.size > 0 && !knownFacultyIds.has(facultyId)) {
      warnings.push(`Warning: Assigned facultyId "${facultyId}" not found in current faculty directory`);
      missingFacultyIds.add(facultyId);
    }

    const rowObj: CsvValidationRow<SubjectCsvRow> = {
      rowIndex: i + 1,
      data: { subjectId, subjectName, semester, academicYear, section, facultyId },
      raw,
      isValid: errors.length === 0,
      errors,
      warnings,
    };

    if (rowObj.isValid) {
      validRows.push(rowObj);
    } else {
      invalidRows.push(rowObj);
    }
  }

  return {
    totalRows: rows.length - 1,
    validRows,
    invalidRows,
    duplicateIds: [],
    duplicateEmails: [],
    missingFacultyIds: Array.from(missingFacultyIds),
    headers: rows[0],
  };
}

/**
 * Validates timetable.csv:
 * subjectId, facultyId, academicYear, section, day, startTime, endTime, room
 */
export function validateTimetableCsv(
  csvText: string,
  knownFacultyIds: Set<string> = new Set()
): CsvValidationResult<TimetableCsvRow> {
  const rows = parseCsvText(csvText);
  if (rows.length === 0) {
    return {
      totalRows: 0,
      validRows: [],
      invalidRows: [],
      duplicateIds: [],
      duplicateEmails: [],
      missingFacultyIds: [],
      headers: [],
    };
  }

  const validRows: CsvValidationRow<TimetableCsvRow>[] = [];
  const invalidRows: CsvValidationRow<TimetableCsvRow>[] = [];
  const missingFacultyIds = new Set<string>();

  for (let i = 1; i < rows.length; i++) {
    const raw = rows[i];
    const subjectId = raw[0]?.trim() || '';
    const facultyId = raw[1]?.trim() || '';
    const academicYear = raw[2]?.trim() || '2025-2026';
    const section = raw[3]?.trim() || '';
    const day = raw[4]?.trim() || 'Monday';
    const startTime = raw[5]?.trim() || '09:00';
    const endTime = raw[6]?.trim() || '10:00';
    const room = raw[7]?.trim() || 'Room 101';

    const errors: string[] = [];
    const warnings: string[] = [];

    if (!subjectId) errors.push('Missing subjectId');
    if (!facultyId) errors.push('Missing facultyId');
    else if (knownFacultyIds.size > 0 && !knownFacultyIds.has(facultyId)) {
      warnings.push(`Warning: Assigned facultyId "${facultyId}" not found in current faculty directory`);
      missingFacultyIds.add(facultyId);
    }
    if (!section) errors.push('Missing class section');

    const rowObj: CsvValidationRow<TimetableCsvRow> = {
      rowIndex: i + 1,
      data: { subjectId, facultyId, academicYear, section, day, startTime, endTime, room },
      raw,
      isValid: errors.length === 0,
      errors,
      warnings,
    };

    if (rowObj.isValid) {
      validRows.push(rowObj);
    } else {
      invalidRows.push(rowObj);
    }
  }

  return {
    totalRows: rows.length - 1,
    validRows,
    invalidRows,
    duplicateIds: [],
    duplicateEmails: [],
    missingFacultyIds: Array.from(missingFacultyIds),
    headers: rows[0],
  };
}

/**
 * Commits validated student rows into Cloud Firestore
 */
export async function commitStudentsToFirestore(
  rows: StudentCsvRow[]
): Promise<{ inserted: number; errors: string[] }> {
  const batch = writeBatch(db);
  const errors: string[] = [];
  let count = 0;

  for (const st of rows) {
    try {
      const cleanId = st.studentId.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      const docRef = doc(db, 'students', cleanId);
      batch.set(docRef, {
        studentId: st.studentId,
        id: cleanId,
        name: st.name,
        email: st.email,
        program: st.program,
        academicYear: st.academicYear,
        semester: st.semester,
        section: st.section,
        createdAt: new Date().toISOString(),
      });

      // Also register in users collection
      const userRef = doc(db, 'users', cleanId);
      batch.set(userRef, {
        id: cleanId,
        name: st.name,
        email: st.email,
        role: 'student',
        rollNumber: st.studentId,
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        createdAt: new Date().toISOString(),
      });
      count++;
    } catch (e: any) {
      errors.push(`Row ${st.studentId}: ${e.message}`);
    }
  }

  await batch.commit();
  return { inserted: count, errors };
}

/**
 * Commits validated faculty rows into Cloud Firestore
 */
export async function commitFacultyToFirestore(
  rows: FacultyCsvRow[]
): Promise<{ inserted: number; errors: string[] }> {
  const batch = writeBatch(db);
  const errors: string[] = [];
  let count = 0;

  for (const f of rows) {
    try {
      const cleanId = f.facultyId.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      const docRef = doc(db, 'faculty', cleanId);
      batch.set(docRef, {
        facultyId: f.facultyId,
        id: cleanId,
        name: f.name,
        email: f.email,
        department: f.department,
        createdAt: new Date().toISOString(),
      });

      const userRef = doc(db, 'users', cleanId);
      batch.set(userRef, {
        id: cleanId,
        name: f.name,
        email: f.email,
        role: 'faculty',
        employeeId: f.facultyId,
        department: f.department,
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        createdAt: new Date().toISOString(),
      });
      count++;
    } catch (e: any) {
      errors.push(`Row ${f.facultyId}: ${e.message}`);
    }
  }

  await batch.commit();
  return { inserted: count, errors };
}

/**
 * Commits subjects and sections to Cloud Firestore
 */
export async function commitSubjectsToFirestore(
  rows: SubjectCsvRow[]
): Promise<{ inserted: number; errors: string[] }> {
  const batch = writeBatch(db);
  const errors: string[] = [];
  let count = 0;

  for (const s of rows) {
    try {
      const cleanId = s.subjectId.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      const docRef = doc(db, 'subjects', cleanId);
      batch.set(docRef, {
        ...s,
        id: cleanId,
        updatedAt: new Date().toISOString(),
      });

      // Auto-register section if specified
      if (s.section) {
        const secId = s.section.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        batch.set(doc(db, 'sections', secId), {
          id: secId,
          name: s.section,
          academicYearId: s.academicYear,
        });
      }
      count++;
    } catch (e: any) {
      errors.push(`Row ${s.subjectId}: ${e.message}`);
    }
  }

  await batch.commit();
  return { inserted: count, errors };
}

/**
 * Commits timetable slots to Cloud Firestore
 */
export async function commitTimetableToFirestore(
  rows: TimetableCsvRow[]
): Promise<{ inserted: number; errors: string[] }> {
  const batch = writeBatch(db);
  const errors: string[] = [];
  let count = 0;

  for (let i = 0; i < rows.length; i++) {
    const t = rows[i];
    try {
      const slotId = `slot_${t.day.toLowerCase()}_${t.subjectId}_${i}`;
      batch.set(doc(db, 'timetable', slotId), {
        ...t,
        id: slotId,
        updatedAt: new Date().toISOString(),
      });
      count++;
    } catch (e: any) {
      errors.push(`Row ${i + 1}: ${e.message}`);
    }
  }

  await batch.commit();
  return { inserted: count, errors };
}

// ==========================================
// EXPORT ACTIONS (Direct from Cloud Firestore)
// ==========================================

/**
 * Action 5: Export Students CSV from Cloud Firestore
 */
export async function exportStudentsCsvFromFirestore(): Promise<number> {
  const snap = await getDocs(collection(db, 'students'));
  const headers = ['studentId', 'name', 'email', 'program', 'academicYear', 'semester', 'section'];

  const rows = snap.docs.map(d => {
    const data = d.data();
    return [
      data.studentId || d.id,
      data.name || '',
      data.email || '',
      data.program || '',
      data.academicYear || '2025-2026',
      data.semester || '',
      data.section || '',
    ].map(escapeCsvCell).join(',');
  });

  const csv = [headers.map(escapeCsvCell).join(','), ...rows].join('\r\n');
  const dateStr = new Date().toISOString().split('T')[0];
  triggerCsvDownload(csv, `students_${dateStr}.csv`);
  return snap.size;
}

/**
 * Action 6: Export Faculty CSV from Cloud Firestore
 */
export async function exportFacultyCsvFromFirestore(): Promise<number> {
  const snap = await getDocs(collection(db, 'faculty'));
  const headers = ['facultyId', 'name', 'email', 'department'];

  const rows = snap.docs.map(d => {
    const data = d.data();
    return [
      data.facultyId || d.id,
      data.name || '',
      data.email || '',
      data.department || '',
    ].map(escapeCsvCell).join(',');
  });

  const csv = [headers.map(escapeCsvCell).join(','), ...rows].join('\r\n');
  const dateStr = new Date().toISOString().split('T')[0];
  triggerCsvDownload(csv, `faculty_${dateStr}.csv`);
  return snap.size;
}

/**
 * Action 7: Export Attendance CSV from Cloud Firestore
 */
export async function exportAttendanceCsvFromFirestore(): Promise<number> {
  const snap = await getDocs(collection(db, 'attendanceRecords'));
  const headers = [
    'recordId',
    'studentId',
    'subjectId',
    'sectionId',
    'date',
    'status',
    'verificationMethod',
    'timestamp',
  ];

  const rows = snap.docs.map(d => {
    const data = d.data();
    return [
      d.id,
      data.studentId || '',
      data.subjectId || '',
      data.sectionId || '',
      data.date || '',
      data.status || 'present',
      data.verificationMethod || 'Dynamic QR',
      data.timestamp || '',
    ].map(escapeCsvCell).join(',');
  });

  const csv = [headers.map(escapeCsvCell).join(','), ...rows].join('\r\n');
  const dateStr = new Date().toISOString().split('T')[0];
  triggerCsvDownload(csv, `attendance_records_${dateStr}.csv`);
  return snap.size;
}

/**
 * Action 8: Export Participation Marks CSV from Cloud Firestore
 */
export async function exportParticipationMarksCsvFromFirestore(): Promise<number> {
  const snap = await getDocs(collection(db, 'participationMarks'));
  const headers = [
    'markId',
    'studentId',
    'subjectId',
    'provisionalScore',
    'approvedScore',
    'status',
    'approvedBy',
  ];

  const rows = snap.docs.map(d => {
    const data = d.data();
    return [
      d.id,
      data.studentId || '',
      data.subjectId || '',
      data.provisionalScore ?? 4.0,
      data.approvedScore ?? data.provisionalScore ?? 4.0,
      data.status || 'provisional',
      data.approvedBy || '',
    ].map(escapeCsvCell).join(',');
  });

  const csv = [headers.map(escapeCsvCell).join(','), ...rows].join('\r\n');
  const dateStr = new Date().toISOString().split('T')[0];
  triggerCsvDownload(csv, `participation_marks_${dateStr}.csv`);
  return snap.size;
}

/**
 * Action 9: Export Assignment, Quiz, and Coding-Test Reports CSV from Cloud Firestore
 */
export async function exportAssessmentsReportCsvFromFirestore(): Promise<number> {
  const asgSnap = await getDocs(collection(db, 'assignmentSubmissions'));
  const quizSnap = await getDocs(collection(db, 'quizAttempts'));
  const codeSnap = await getDocs(collection(db, 'codingSubmissions'));

  const headers = [
    'AssessmentType',
    'RecordId',
    'AssessmentId',
    'StudentId',
    'ScoreOrMarks',
    'MaxScore',
    'Status',
    'SubmittedAt',
  ];

  const rows: string[] = [];

  asgSnap.forEach(d => {
    const data = d.data();
    rows.push(
      [
        'Assignment',
        d.id,
        data.assignmentId || '',
        data.studentId || '',
        data.marks ?? 0,
        data.maxMarks ?? 25,
        data.quality || 'Submitted',
        data.submittedAt || '',
      ].map(escapeCsvCell).join(',')
    );
  });

  quizSnap.forEach(d => {
    const data = d.data();
    rows.push(
      [
        'Quiz',
        d.id,
        data.quizId || '',
        data.studentId || '',
        data.score ?? 0,
        data.maxScore ?? 10,
        'Completed',
        data.attemptedAt || '',
      ].map(escapeCsvCell).join(',')
    );
  });

  codeSnap.forEach(d => {
    const data = d.data();
    rows.push(
      [
        'CodingTest',
        d.id,
        data.testId || '',
        data.studentId || '',
        data.marks ?? 0,
        data.maxMarks ?? 30,
        data.status || 'Passed',
        data.submittedAt || '',
      ].map(escapeCsvCell).join(',')
    );
  });

  const csv = [headers.map(escapeCsvCell).join(','), ...rows].join('\r\n');
  const dateStr = new Date().toISOString().split('T')[0];
  triggerCsvDownload(csv, `assessment_quiz_coding_report_${dateStr}.csv`);
  return rows.length;
}
