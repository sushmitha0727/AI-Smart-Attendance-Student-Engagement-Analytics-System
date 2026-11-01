import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAttendanceStats,
  calculateAttendanceRecovery,
  projectAttendanceScenario,
  calculateParticipationScore,
  evaluateEngagement,
  generateDynamicQrToken,
  validateAttendanceScan,
  DEFAULT_RUBRIC_WEIGHTS,
} from './academicCalculations';
import { AttendanceRecord, AttendanceSession, User } from '../types';

test('calculateAttendanceStats calculates correct percentages', () => {
  const records: AttendanceRecord[] = [
    { id: '1', sessionId: 's1', studentId: 'st1', subjectId: 'sub1', sectionId: 'sec1', date: '2026-10-01', status: 'Present', verificationType: 'Face+QR' },
    { id: '2', sessionId: 's2', studentId: 'st1', subjectId: 'sub1', sectionId: 'sec1', date: '2026-10-02', status: 'Present', verificationType: 'Face+QR' },
    { id: '3', sessionId: 's3', studentId: 'st1', subjectId: 'sub1', sectionId: 'sec1', date: '2026-10-03', status: 'Absent', verificationType: 'Manual Override' },
    { id: '4', sessionId: 's4', studentId: 'st1', subjectId: 'sub1', sectionId: 'sec1', date: '2026-10-04', status: 'Late', verificationType: 'Face+QR' },
  ];

  const stats = calculateAttendanceStats(records);
  assert.equal(stats.conducted, 4);
  assert.equal(stats.present, 3); // 2 Present + 1 Late
  assert.equal(stats.absent, 1);
  assert.equal(stats.percentage, 75.0);
});

test('calculateAttendanceRecovery calculates classes needed when below threshold', () => {
  // Conducted 20, Present 12 -> 60% attendance. Target is 75%.
  // (12 + X) / (20 + X) >= 0.75 => 12 + X >= 15 + 0.75X => 0.25X >= 3 => X >= 12.
  const recovery = calculateAttendanceRecovery(20, 12, 75);
  assert.equal(recovery.currentPercentage, 60.0);
  assert.equal(recovery.meetsThreshold, false);
  assert.equal(recovery.classesNeeded, 12);
  assert.equal(recovery.canMissClasses, 0);
});

test('calculateAttendanceRecovery calculates classes student can safely miss when above threshold', () => {
  // Conducted 20, Present 18 -> 90% attendance. Target is 75%.
  // 18 / (20 + M) >= 0.75 => 20 + M <= 24 => M <= 4.
  const recovery = calculateAttendanceRecovery(20, 18, 75);
  assert.equal(recovery.currentPercentage, 90.0);
  assert.equal(recovery.meetsThreshold, true);
  assert.equal(recovery.classesNeeded, 0);
  assert.equal(recovery.canMissClasses, 4);
});

test('projectAttendanceScenario accurately predicts future rate', () => {
  // Currently 10 / 15. Student attends 4 out of next 5 classes -> (10+4)/(15+5) = 14/20 = 70.0%
  const projected = projectAttendanceScenario(15, 10, 4, 5);
  assert.equal(projected, 70.0);
});

test('calculateParticipationScore out of 5 with standard weights', () => {
  const inputs = {
    assignmentNormalized: 1.0, // 1.0 * 1.0 = 1.0
    quizNormalized: 0.8,       // 0.8 * 1.0 = 0.8
    codingNormalized: 1.0,     // 1.0 * 1.5 = 1.5
    discussionNormalized: 0.5, // 0.5 * 1.0 = 0.5
    consistencyNormalized: 1.0,// 1.0 * 0.5 = 0.5
  };
  const result = calculateParticipationScore(inputs, {}, DEFAULT_RUBRIC_WEIGHTS);
  // Total expected = 1.0 + 0.8 + 1.5 + 0.5 + 0.5 = 4.30
  assert.equal(result.provisionalScore, 4.30);
  assert.equal(result.effectiveWeights.codingWeight, 1.5);
});

test('calculateParticipationScore redistributes weight when coding is marked Not Applicable', () => {
  // If coding (1.5) is marked N/A:
  // Remaining available sum = 1.0 + 1.0 + 1.0 + 0.5 = 3.5
  // Scale = 5.0 / 3.5 ~= 1.42857
  const inputs = {
    assignmentNormalized: 1.0,
    quizNormalized: 1.0,
    codingNormalized: 0.0, // Should be ignored because N/A
    discussionNormalized: 1.0,
    consistencyNormalized: 1.0,
  };
  const result = calculateParticipationScore(inputs, { coding: true }, DEFAULT_RUBRIC_WEIGHTS);

  // When all applicable components are 1.0, total provisional score must equal 5.0!
  assert.equal(result.provisionalScore, 5.0);
  assert.equal(result.effectiveWeights.codingWeight, 0);

  // Sum of effective weights should be exactly 5.0 (allowing tiny float precision)
  const sumWeights =
    result.effectiveWeights.assignmentWeight +
    result.effectiveWeights.quizWeight +
    result.effectiveWeights.discussionWeight +
    result.effectiveWeights.consistencyWeight;
  assert.ok(Math.abs(sumWeights - 5.0) < 0.05);
});

test('evaluateEngagement returns Insufficient evidence when activities < 3', () => {
  const res = evaluateEngagement({
    attendanceRate: 90,
    assignmentRate: 85,
    quizRate: 80,
    discussionPoints: 2,
    totalActivitiesOffered: 2, // Less than 3
    recentActivityTrendRatio: 1.0,
  });
  assert.equal(res.level, 'Insufficient evidence');
  assert.equal(res.confidence, 'Low');
  assert.ok(res.reasons[0].includes('Fewer than 3'));
});

test('evaluateEngagement computes High engagement with plain language reasons', () => {
  const res = evaluateEngagement({
    attendanceRate: 92,
    assignmentRate: 90,
    quizRate: 85,
    codingRate: 95,
    discussionPoints: 4,
    totalActivitiesOffered: 10,
    recentActivityTrendRatio: 1.2,
  });
  assert.equal(res.level, 'High');
  assert.equal(res.trend, 'Improving');
  assert.equal(res.confidence, 'High');
  assert.ok(res.reasons.some(r => r.includes('attendance record')));
  assert.ok(res.reasons.some(r => r.includes('assignment completion')));
});

test('validateAttendanceScan enforces window, QR freshness, duplicate, and section match', () => {
  const now = 1000000;
  const session: AttendanceSession = {
    id: 'sess-100',
    subjectId: 'sub-java',
    sectionId: 'sec-2a',
    facultyId: 'fac-ramesh',
    date: '2026-11-01',
    period: 1,
    room: 'Lab 402',
    scheduledStartTime: '09:00',
    sessionStartedAt: now,
    windowMinutes: 15,
    active: true,
    currentQrToken: '',
    qrGeneratedAt: now,
  };

  const currentQr = generateDynamicQrToken('sess-100', now);
  session.currentQrToken = currentQr.token;

  const validStudent: User = {
    id: 'stud-aarav',
    name: 'Aarav Sharma',
    email: 'aarav@univ.edu',
    role: 'student',
    avatarUrl: '',
    sectionId: 'sec-2a',
  };

  // 1. Valid scan
  const validRes = validateAttendanceScan({
    session,
    student: validStudent,
    scannedToken: currentQr.token,
    existingRecords: [],
    currentTimeMs: now + 2000,
  });
  assert.equal(validRes.isValid, true);
  assert.equal(validRes.status, 'ACCEPTED');

  // 2. Expired 15-minute window
  const expiredWindowRes = validateAttendanceScan({
    session,
    student: validStudent,
    scannedToken: currentQr.token,
    existingRecords: [],
    currentTimeMs: now + (16 * 60 * 1000), // 16 minutes later
  });
  assert.equal(expiredWindowRes.isValid, false);
  assert.equal(expiredWindowRes.status, 'REJECTED');
  assert.ok(expiredWindowRes.reason?.includes('15-minute'));

  // 3. Invalid / stale QR token
  const invalidQrRes = validateAttendanceScan({
    session,
    student: validStudent,
    scannedToken: 'QR-RANDOM-FAKE-TOKEN',
    existingRecords: [],
    currentTimeMs: now + 2000,
  });
  assert.equal(invalidQrRes.isValid, false);
  assert.equal(invalidQrRes.status, 'SUSPICIOUS');

  // 4. Duplicate scan
  const duplicateRes = validateAttendanceScan({
    session,
    student: validStudent,
    scannedToken: currentQr.token,
    existingRecords: [{
      id: 'r1',
      sessionId: 'sess-100',
      studentId: 'stud-aarav',
      subjectId: 'sub-java',
      sectionId: 'sec-2a',
      date: '2026-11-01',
      status: 'Present',
      verificationType: 'Face+QR',
    }],
    currentTimeMs: now + 2000,
  });
  assert.equal(duplicateRes.isValid, false);
  assert.equal(duplicateRes.status, 'REJECTED');
  assert.ok(duplicateRes.reason?.includes('already been recorded'));

  // 5. Wrong section
  const wrongSectionStudent: User = {
    id: 'stud-sneha',
    name: 'Sneha Reddy',
    email: 'sneha@univ.edu',
    role: 'student',
    avatarUrl: '',
    sectionId: 'sec-1a', // enrolled in 1st Year - A instead of 2nd Year - A
  };
  const wrongSecRes = validateAttendanceScan({
    session,
    student: wrongSectionStudent,
    scannedToken: currentQr.token,
    existingRecords: [],
    currentTimeMs: now + 2000,
  });
  assert.equal(wrongSecRes.isValid, false);
  assert.equal(wrongSecRes.status, 'SUSPICIOUS');
  assert.ok(wrongSecRes.reason?.includes('not enrolled'));
});
