import { test } from 'node:test';
import assert from 'node:assert';
import {
  validateStudentsCsv,
  validateFacultyCsv,
  validateSubjectsCsv,
  validateTimetableCsv,
} from './csvDataService';

test('validateStudentsCsv identifies valid rows, invalid emails, and duplicates', () => {
  const csv = `studentId, name, email, program, academicYear, semester, section
2024CS01, Aarav Sharma, aarav@student.univ.edu, B.Tech(CSE), 2025-2026, Semester 3, Section A
2024CS02, Diya Patel, diya@student.univ.edu, B.Tech(CSE-AI-ML), 2025-2026, Semester 3, Section B
2024CS01, Duplicate Aarav, bad-email, B.Tech(CSE), 2025-2026, Semester 3, Section A`;

  const existingIds = new Set(['2024CS99']);
  const result = validateStudentsCsv(csv, existingIds);

  assert.strictEqual(result.totalRows, 3);
  assert.strictEqual(result.validRows.length, 2);
  assert.strictEqual(result.invalidRows.length, 1);
  assert.ok(result.duplicateIds.includes('2024CS01'));
  assert.ok(result.invalidRows[0].errors.some(e => e.includes('email') || e.includes('Duplicate')));
});

test('validateFacultyCsv flags missing departments and malformed emails', () => {
  const csv = `facultyId, name, email, department
FAC001, Dr. Ramesh Kumar, ramesh.kumar@univ.edu, Computer Science & Engineering
FAC002, Dr. Ananya Sen, ananya@univ.edu, 
FAC003, Dr. Vikram Rao, invalid-mail, Information Technology`;

  const result = validateFacultyCsv(csv);
  assert.strictEqual(result.validRows.length, 1);
  assert.strictEqual(result.invalidRows.length, 2);
});

test('validateSubjectsCsv flags unassigned or missing faculty IDs', () => {
  const csv = `subjectId, subjectName, semester, academicYear, section, facultyId
7CS1235, Generative AI, Semester 7, 2025-2026, Section A, FAC001
7CS1281, Auto ML, Semester 7, 2025-2026, Section B, NON_EXISTENT_FAC`;

  const knownFaculty = new Set(['FAC001']);
  const result = validateSubjectsCsv(csv, knownFaculty);

  assert.strictEqual(result.validRows.length, 2);
  assert.ok(result.missingFacultyIds.includes('NON_EXISTENT_FAC'));
});

test('validateTimetableCsv verifies day, times, room, and faculty assignment', () => {
  const csv = `subjectId, facultyId, academicYear, section, day, startTime, endTime, room
7CS1235, FAC001, 2025-2026, Section A, Monday, 09:00, 10:00, Room 301
, FAC001, 2025-2026, Section A, Tuesday, 10:00, 11:00, Room 302`;

  const result = validateTimetableCsv(csv);
  assert.strictEqual(result.validRows.length, 1);
  assert.strictEqual(result.invalidRows.length, 1);
});
