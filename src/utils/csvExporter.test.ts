import { test } from 'node:test';
import assert from 'node:assert';
import {
  escapeCsvCell,
  generateStudentsCsv,
  generateTeachersCsv,
  generateClassRosterCsv,
} from './csvExporter';
import { SEED_USERS, SEED_PROGRAMS, SEED_SECTIONS, SEED_SUBJECTS, SEED_FACULTY_ASSIGNMENTS } from '../data/seedData';

test('escapeCsvCell escapes commas, double quotes, and empty values', () => {
  assert.strictEqual(escapeCsvCell(null), '""');
  assert.strictEqual(escapeCsvCell('Hello'), '"Hello"');
  assert.strictEqual(escapeCsvCell('Generative AI (7CS 1235)'), '"Generative AI (7CS 1235)"');
  assert.strictEqual(escapeCsvCell('Name with "Quotes"'), '"Name with ""Quotes"""');
  assert.strictEqual(escapeCsvCell('Line1\nLine2'), '"Line1\nLine2"');
});

test('generateStudentsCsv produces separate student CSV with academic enrollment headers', () => {
  const students = SEED_USERS.filter(u => u.role === 'student');
  const csv = generateStudentsCsv(students, SEED_PROGRAMS, SEED_SECTIONS);

  assert.ok(csv.includes('Student Name'), 'Header should include Student Name');
  assert.ok(csv.includes('Registration / Roll Number'), 'Header should include Registration / Roll Number');
  assert.ok(csv.includes('Program Name'), 'Header should include Program Name');
  assert.ok(csv.includes('Enrolled Class / Section'), 'Header should include Enrolled Class / Section');
  assert.ok(csv.includes('Classes Conducted'), 'Header should include Classes Conducted');
  assert.ok(csv.includes('Attendance Percentage'), 'Header should include Attendance Percentage');

  // Verify student data rows
  for (const st of students) {
    assert.ok(csv.includes(st.name), `CSV should contain student name: ${st.name}`);
    if (st.rollNumber) {
      assert.ok(csv.includes(st.rollNumber), `CSV should contain roll number: ${st.rollNumber}`);
    }
  }

  // Ensure faculty are NOT present in the student CSV
  const faculty = SEED_USERS.filter(u => u.role === 'faculty');
  for (const f of faculty) {
    assert.strictEqual(csv.includes(f.name), false, `Student CSV must NOT contain faculty: ${f.name}`);
  }
});

test('generateTeachersCsv produces separate faculty CSV with departments and handled classes', () => {
  const faculty = SEED_USERS.filter(u => u.role === 'faculty');
  const csv = generateTeachersCsv(
    faculty,
    SEED_SUBJECTS,
    SEED_SECTIONS,
    SEED_FACULTY_ASSIGNMENTS,
    SEED_USERS
  );

  assert.ok(csv.includes('Faculty Name'), 'Header should include Faculty Name');
  assert.ok(csv.includes('Employee ID / User ID'), 'Header should include Employee ID');
  assert.ok(csv.includes('Department'), 'Header should include Department');
  assert.ok(csv.includes('Assigned Courses / Subjects'), 'Header should include Assigned Courses');
  assert.ok(csv.includes('Handled Class Sections'), 'Header should include Handled Class Sections');

  for (const f of faculty) {
    assert.ok(csv.includes(f.name), `Faculty CSV should include faculty name: ${f.name}`);
  }

  // Ensure students are NOT in the faculty CSV
  const students = SEED_USERS.filter(u => u.role === 'student');
  for (const st of students) {
    assert.strictEqual(csv.includes(st.name), false, `Faculty CSV must NOT contain student: ${st.name}`);
  }
});

test('generateClassRosterCsv produces targeted attendance data for a class', () => {
  const students = SEED_USERS.filter(u => u.role === 'student').slice(0, 3);
  const csv = generateClassRosterCsv(
    'Generative Artificial Intelligence',
    '7CS 1235',
    ['VII Btech 2023 CSE - DA'],
    students,
    SEED_SECTIONS
  );

  assert.ok(csv.includes('Student Name'));
  assert.ok(csv.includes('Course Code'));
  assert.ok(csv.includes('7CS 1235'));
  assert.ok(csv.includes('Generative Artificial Intelligence'));
});
