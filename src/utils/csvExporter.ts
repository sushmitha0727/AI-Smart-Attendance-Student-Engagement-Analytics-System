import { User, Program, Section, Subject, FacultyAssignment, AttendanceRecord, SystemSettings } from '../types';
import { calculateAttendanceStats } from './academicCalculations';
import { getOrdinalYear } from './sectionResolver';

/**
 * Escapes a cell value according to RFC 4180 CSV standard.
 */
export function escapeCsvCell(val: string | number | boolean | null | undefined): string {
  if (val === null || val === undefined) {
    return '""';
  }
  const str = String(val);
  // If string contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Generates an institutional CSV string for all enrolled students.
 */
export function generateStudentsCsv(
  students: User[],
  programs: Program[],
  sections: Section[],
  attendanceRecords: AttendanceRecord[] = [],
  systemSettings?: SystemSettings
): string {
  const threshold = systemSettings?.attendanceThresholdPercent ?? 75;
  const headers = [
    'Student Name',
    'Registration / Roll Number',
    'Institutional Email',
    'Program Code',
    'Program Name',
    'Year of Study',
    'Enrolled Class / Section',
    'Semester',
    'Classes Conducted',
    'Classes Attended',
    'Attendance Percentage',
    'Academic Standing',
    'Biometric Face Consent',
    'Account Status',
    'Provisioned By Admin',
  ];

  const rows = students.map(st => {
    const prog = programs.find(p => p.id === st.programId);
    const sec = sections.find(s => s.id === st.sectionId);
    const recs = attendanceRecords.filter(r => r.studentId === st.id);
    const stats = calculateAttendanceStats(recs);
    const isUnder = stats.percentage < threshold;

    const rowValues = [
      st.name,
      st.rollNumber || st.id,
      st.email,
      prog?.code || 'N/A',
      prog?.name || 'General Program',
      st.yearOfStudy ? getOrdinalYear(st.yearOfStudy) : '1st Year',
      sec?.name || st.sectionId || 'Class Assigned',
      st.semesterId ? `Semester ${st.semesterId.replace('sem-', '')}` : 'Current',
      stats.conducted,
      stats.present,
      `${stats.percentage}%`,
      isUnder ? `Below ${threshold}% At-Risk` : 'Good Standing',
      st.faceConsentGiven ? 'Consented' : 'Pending Consent',
      'Active',
      st.createdByAdmin ? 'Yes (Admin Provisioned)' : 'System Seeded',
    ];

    return rowValues.map(escapeCsvCell).join(',');
  });

  return [headers.map(escapeCsvCell).join(','), ...rows].join('\r\n');
}

/**
 * Generates an institutional CSV string for all appointed faculty / teachers.
 */
export function generateTeachersCsv(
  faculty: User[],
  subjects: Subject[],
  sections: Section[],
  facultyAssignments: FacultyAssignment[],
  allUsers: User[] = []
): string {
  const headers = [
    'Faculty Name',
    'Employee ID / User ID',
    'Institutional Email',
    'Department',
    'Designation',
    'Assigned Courses / Subjects',
    'Handled Class Sections',
    'Total Handled Sections',
    'Total Enrolled Students',
    'Account Status',
    'Role',
    'Provisioned By Admin',
  ];

  const rows = faculty.map(f => {
    const assignments = facultyAssignments.filter(fa => fa.facultyId === f.id);
    
    // Assigned subject names with code
    const assignedSubjectNames = Array.from(
      new Set(
        assignments.map(asg => {
          const s = subjects.find(sub => sub.id === asg.subjectId);
          return s ? `${s.name} (${s.code})` : asg.subjectId;
        })
      )
    );

    // Handled section names
    const assignedSectionIds = Array.from(new Set(assignments.map(asg => asg.sectionId)));
    const assignedSectionNames = assignedSectionIds.map(secId => {
      const s = sections.find(sec => sec.id === secId);
      return s ? s.name : secId;
    });

    // Enrolled student count across these sections
    const totalEnrolled = allUsers.filter(
      u => u.role === 'student' && u.sectionId && assignedSectionIds.includes(u.sectionId)
    ).length;

    const rowValues = [
      f.name,
      f.employeeId || f.id,
      f.email,
      f.department || 'Academic Division',
      f.designation || 'Faculty Member',
      assignedSubjectNames.length > 0 ? assignedSubjectNames.join('; ') : 'None Assigned',
      assignedSectionNames.length > 0 ? assignedSectionNames.join('; ') : 'None Assigned',
      assignedSectionNames.length,
      totalEnrolled,
      'Active',
      'Faculty',
      f.createdByAdmin ? 'Yes (Admin Provisioned)' : 'System Seeded',
    ];

    return rowValues.map(escapeCsvCell).join(',');
  });

  return [headers.map(escapeCsvCell).join(','), ...rows].join('\r\n');
}

/**
 * Generates a targeted CSV string for a specific class section roster.
 */
export function generateClassRosterCsv(
  courseName: string,
  courseCode: string,
  sectionNames: string[],
  students: User[],
  sections: Section[],
  attendanceRecords: AttendanceRecord[] = [],
  thresholdPercent = 75
): string {
  const headers = [
    'Student Name',
    'Registration / Roll Number',
    'Enrolled Class / Section',
    'Course Code',
    'Course Name',
    'Classes Conducted',
    'Classes Attended',
    'Attendance Percentage',
    'Standing Status',
    'Biometric Face Consent',
    'Institutional Email',
  ];

  const rows = students.map(st => {
    const sec = sections.find(s => s.id === st.sectionId);
    const recs = attendanceRecords.filter(r => r.studentId === st.id);
    const stats = calculateAttendanceStats(recs);
    const isUnder = stats.percentage < thresholdPercent;

    const rowValues = [
      st.name,
      st.rollNumber || st.id,
      sec?.name || st.sectionId || sectionNames.join(', '),
      courseCode,
      courseName,
      stats.conducted,
      stats.present,
      `${stats.percentage}%`,
      isUnder ? `Below ${thresholdPercent}% At-Risk` : 'Good Standing',
      st.faceConsentGiven ? 'Consented' : 'Pending',
      st.email,
    ];

    return rowValues.map(escapeCsvCell).join(',');
  });

  return [headers.map(escapeCsvCell).join(','), ...rows].join('\r\n');
}

/**
 * Triggers a browser download of a CSV file with UTF-8 BOM encoding.
 */
export function triggerCsvDownload(csvContent: string, fileName: string): void {
  // UTF-8 BOM (\uFEFF) ensures Excel and Numbers parse UTF-8 characters without corruption
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
