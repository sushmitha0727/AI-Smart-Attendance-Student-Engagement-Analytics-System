/**
 * Pure academic and attendance calculation logic.
 * Decoupled from UI components for high performance, reliability, and automated testing.
 */

import {
  AttendanceRecord,
  AttendanceSession,
  ConfidenceLevel,
  EngagementAnalytics,
  EngagementLevel,
  EngagementTrend,
  ParticipationScoreRubric,
  User,
} from '../types';

export const DEFAULT_RUBRIC_WEIGHTS: ParticipationScoreRubric = {
  assignmentWeight: 1.0,
  quizWeight: 1.0,
  codingWeight: 1.5,
  discussionWeight: 1.0,
  consistencyWeight: 0.5,
};

/**
 * Calculates attendance statistics for a given set of records.
 */
export function calculateAttendanceStats(
  records: AttendanceRecord[],
  totalConductedOverride?: number
) {
  const conducted = totalConductedOverride !== undefined 
    ? Math.max(totalConductedOverride, records.length) 
    : records.length;

  const present = records.filter(r => r.status === 'Present' || r.status === 'Late').length;
  const absent = records.filter(r => r.status === 'Absent').length;
  const excused = records.filter(r => r.status === 'Excused').length;

  const percentage = conducted > 0 
    ? Number(((present / conducted) * 100).toFixed(1)) 
    : 0;

  return {
    conducted,
    present,
    absent,
    excused,
    percentage,
  };
}

/**
 * Attendance Recovery Planner:
 * Calculates minimum consecutive classes needed to achieve or maintain the target threshold,
 * or calculates how many classes can safely be missed without dropping below threshold.
 */
export function calculateAttendanceRecovery(
  conducted: number,
  present: number,
  targetThresholdPercent = 75
) {
  if (conducted <= 0) {
    return {
      currentPercentage: 100,
      classesNeeded: 0,
      canMissClasses: 0,
      meetsThreshold: true,
      statusMessage: 'No classes conducted yet.',
    };
  }

  const currentPercentage = Number(((present / conducted) * 100).toFixed(1));
  const targetFraction = targetThresholdPercent / 100;

  if (currentPercentage >= targetThresholdPercent) {
    // Student meets or exceeds threshold. Calculate how many classes they can afford to miss:
    // P / (C + M) >= T/100 => M <= (100 * P / T) - C
    const maxConducted = (present / targetFraction);
    const canMiss = Math.max(0, Math.floor(maxConducted - conducted));

    return {
      currentPercentage,
      classesNeeded: 0,
      canMissClasses: canMiss,
      meetsThreshold: true,
      statusMessage: canMiss > 0
        ? `You meet the ${targetThresholdPercent}% requirement and can miss up to ${canMiss} upcoming class${canMiss > 1 ? 'es' : ''}.`
        : `You are exactly at or just above ${targetThresholdPercent}%. Attend the next class to maintain good standing.`,
    };
  }

  // Student is below threshold. Calculate consecutive classes needed:
  // (P + X) / (C + X) >= T/100
  // P + X >= targetFraction * C + targetFraction * X
  // X * (1 - targetFraction) >= targetFraction * C - P
  // X >= (targetFraction * C - P) / (1 - targetFraction)
  if (targetFraction >= 1) {
    return {
      currentPercentage,
      classesNeeded: 999,
      canMissClasses: 0,
      meetsThreshold: false,
      statusMessage: '100% threshold cannot be mathematically reached if any class was missed.',
    };
  }

  const numerator = (targetFraction * conducted) - present;
  const denominator = 1 - targetFraction;
  const classesNeeded = Math.max(1, Math.ceil(numerator / denominator));

  return {
    currentPercentage,
    classesNeeded,
    canMissClasses: 0,
    meetsThreshold: false,
    statusMessage: `Attend the next ${classesNeeded} consecutive class${classesNeeded > 1 ? 'es' : ''} to reach ${targetThresholdPercent}%.`,
  };
}

/**
 * Projects attendance percentage for what-if scenarios:
 * "If I attend A classes out of the next N classes"
 */
export function projectAttendanceScenario(
  conducted: number,
  present: number,
  upcomingAttended: number,
  upcomingTotal: number
): number {
  const newConducted = conducted + upcomingTotal;
  const newPresent = present + upcomingAttended;
  if (newConducted === 0) return 100;
  return Number(((newPresent / newConducted) * 100).toFixed(1));
}

export interface ParticipationScoreInput {
  assignmentNormalized: number; // 0.0 - 1.0 (completion, timeliness, quality)
  quizNormalized: number;       // 0.0 - 1.0 (attempts, live participation)
  codingNormalized: number;     // 0.0 - 1.0 (test cases passed, submissions)
  discussionNormalized: number; // 0.0 - 1.0 (questions, activities recorded)
  consistencyNormalized: number;// 0.0 - 1.0 (regularity & streak)
}

export interface NaFlags {
  assignment?: boolean;
  quiz?: boolean;
  coding?: boolean;
  discussion?: boolean;
  consistency?: boolean;
}

/**
 * Calculates the provisional participation score out of 5 marks.
 * Proportional redistribution is applied when any activity is marked Not Applicable.
 */
export function calculateParticipationScore(
  inputs: ParticipationScoreInput,
  naFlags: NaFlags = {},
  baseRubric: ParticipationScoreRubric = DEFAULT_RUBRIC_WEIGHTS
) {
  // Determine available categories and baseline sum
  let availableSum = 0;
  if (!naFlags.assignment) availableSum += baseRubric.assignmentWeight;
  if (!naFlags.quiz) availableSum += baseRubric.quizWeight;
  if (!naFlags.coding) availableSum += baseRubric.codingWeight;
  if (!naFlags.discussion) availableSum += baseRubric.discussionWeight;
  if (!naFlags.consistency) availableSum += baseRubric.consistencyWeight;

  // Fallback if everything was marked NA
  if (availableSum <= 0) {
    return {
      provisionalScore: 0,
      effectiveWeights: {
        assignmentWeight: 0,
        quizWeight: 0,
        codingWeight: 0,
        discussionWeight: 0,
        consistencyWeight: 0,
      },
      breakdown: {
        assignment: 0,
        quiz: 0,
        coding: 0,
        discussion: 0,
        consistency: 0,
      },
      naFlags,
    };
  }

  // Scale factor so total sum of available weights always equals exactly 5.0
  const scale = 5.0 / availableSum;

  const effectiveWeights: ParticipationScoreRubric = {
    assignmentWeight: naFlags.assignment ? 0 : Number((baseRubric.assignmentWeight * scale).toFixed(3)),
    quizWeight: naFlags.quiz ? 0 : Number((baseRubric.quizWeight * scale).toFixed(3)),
    codingWeight: naFlags.coding ? 0 : Number((baseRubric.codingWeight * scale).toFixed(3)),
    discussionWeight: naFlags.discussion ? 0 : Number((baseRubric.discussionWeight * scale).toFixed(3)),
    consistencyWeight: naFlags.consistency ? 0 : Number((baseRubric.consistencyWeight * scale).toFixed(3)),
  };

  const assignmentPart = naFlags.assignment ? 0 : inputs.assignmentNormalized * effectiveWeights.assignmentWeight;
  const quizPart = naFlags.quiz ? 0 : inputs.quizNormalized * effectiveWeights.quizWeight;
  const codingPart = naFlags.coding ? 0 : inputs.codingNormalized * effectiveWeights.codingWeight;
  const discussionPart = naFlags.discussion ? 0 : inputs.discussionNormalized * effectiveWeights.discussionWeight;
  const consistencyPart = naFlags.consistency ? 0 : inputs.consistencyNormalized * effectiveWeights.consistencyWeight;

  const totalRaw = assignmentPart + quizPart + codingPart + discussionPart + consistencyPart;
  const provisionalScore = Number(Math.min(5.0, Math.max(0, totalRaw)).toFixed(2));

  return {
    provisionalScore,
    effectiveWeights,
    breakdown: {
      assignment: Number(assignmentPart.toFixed(2)),
      quiz: Number(quizPart.toFixed(2)),
      coding: Number(codingPart.toFixed(2)),
      discussion: Number(discussionPart.toFixed(2)),
      consistency: Number(consistencyPart.toFixed(2)),
    },
    naFlags,
  };
}

/**
 * Evaluates student engagement:
 * - Requires sufficient evidence (minimum 3 observations across activities)
 * - Returns 'Insufficient evidence' if data is sparse
 * - Computes trend and plain-language transparent reasons
 * - Fully compatible with theory-only classes where coding is absent
 */
export function evaluateEngagement(params: {
  attendanceRate: number; // 0 - 100
  assignmentRate: number; // 0 - 100
  quizRate: number;       // 0 - 100
  codingRate?: number;    // 0 - 100 or undefined if N/A
  discussionPoints: number; // 0+
  totalActivitiesOffered: number;
  recentActivityTrendRatio: number; // >1 is improving, <1 is declining
}): {
  level: EngagementLevel;
  trend: EngagementTrend;
  confidence: ConfidenceLevel;
  reasons: string[];
  compositeScore: number;
} {
  const {
    attendanceRate,
    assignmentRate,
    quizRate,
    codingRate,
    discussionPoints,
    totalActivitiesOffered,
    recentActivityTrendRatio,
  } = params;

  // Rule: If total available activities < 3, report Insufficient evidence
  if (totalActivitiesOffered < 3) {
    return {
      level: 'Insufficient evidence',
      trend: 'Stable',
      confidence: 'Low',
      reasons: ['Fewer than 3 academic activities conducted so far in this term.'],
      compositeScore: 0,
    };
  }

  const reasons: string[] = [];
  let componentCount = 0;
  let scoreSum = 0;

  // Attendance component (25%)
  scoreSum += attendanceRate;
  componentCount++;
  if (attendanceRate >= 85) {
    reasons.push(`Strong lecture attendance record (${attendanceRate}%).`);
  } else if (attendanceRate < 75) {
    reasons.push(`Attendance (${attendanceRate}%) is currently below the 75% required threshold.`);
  }

  // Assignment component (25%)
  scoreSum += assignmentRate;
  componentCount++;
  if (assignmentRate >= 80) {
    reasons.push(`High assignment completion rate (${assignmentRate}%).`);
  } else if (assignmentRate <= 50) {
    reasons.push(`Multiple pending or late assignment submissions (${assignmentRate}% completed).`);
  }

  // Quiz component (25%)
  scoreSum += quizRate;
  componentCount++;
  if (quizRate >= 75) {
    reasons.push(`Active participation in class quizzes and live polls (${quizRate}%).`);
  }

  // Coding component (if applicable, 25%)
  if (codingRate !== undefined && codingRate !== null) {
    scoreSum += codingRate;
    componentCount++;
    if (codingRate >= 80) {
      reasons.push(`Consistently passes all test cases on coding problems (${codingRate}%).`);
    } else if (codingRate < 50) {
      reasons.push(`Struggling with automated test cases on programming assessments.`);
    }
  }

  // Discussion points boost/reason
  if (discussionPoints >= 3) {
    reasons.push(`Frequently contributes to classroom Q&A and peer discussions (+${discussionPoints} pts).`);
  }

  const compositeScore = Number((scoreSum / componentCount).toFixed(1));

  let level: EngagementLevel = 'Medium';
  if (compositeScore >= 80) {
    level = 'High';
  } else if (compositeScore < 60) {
    level = 'Low';
  }

  let trend: EngagementTrend = 'Stable';
  if (recentActivityTrendRatio >= 1.15) {
    trend = 'Improving';
    reasons.push('Demonstrating upward trajectory in recent weeks.');
  } else if (recentActivityTrendRatio <= 0.85) {
    trend = 'Declining';
    reasons.push('Recent activity shows a downward dip compared to early term.');
  }

  let confidence: ConfidenceLevel = 'Medium';
  if (totalActivitiesOffered >= 8) {
    confidence = 'High';
  } else if (totalActivitiesOffered <= 4) {
    confidence = 'Low';
  }

  return {
    level,
    trend,
    confidence,
    reasons,
    compositeScore,
  };
}

/**
 * Dynamic QR token generator:
 * Changes every 5 seconds using a deterministic interval hash.
 */
export function generateDynamicQrToken(sessionId: string, timestampMs: number): {
  token: string;
  intervalIndex: number;
  expiresInSeconds: number;
} {
  const intervalSeconds = 5;
  const intervalIndex = Math.floor(timestampMs / (intervalSeconds * 1000));
  const msIntoInterval = timestampMs % (intervalSeconds * 1000);
  const expiresInSeconds = Math.max(1, Math.ceil((5000 - msIntoInterval) / 1000));

  // Lightweight deterministic token hash
  const raw = `${sessionId}:${intervalIndex}:SALT_SMART_ATTENDANCE_2026`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash) + raw.charCodeAt(i);
    hash |= 0;
  }
  const token = `QR-${sessionId.slice(0, 6).toUpperCase()}-${Math.abs(hash).toString(36).toUpperCase()}-${intervalIndex % 10000}`;

  return {
    token,
    intervalIndex,
    expiresInSeconds,
  };
}

/**
 * Validates a student's attendance scan:
 * 1. Session must be active
 * 2. Scan must be within 15 minutes of session start
 * 3. Student must be enrolled in the session's section
 * 4. Token must match current interval or immediately previous interval (grace tolerance of 5s)
 * 5. Student must not have already submitted for this session
 */
export function validateAttendanceScan(params: {
  session: AttendanceSession;
  student: User;
  scannedToken: string;
  existingRecords: AttendanceRecord[];
  currentTimeMs: number;
}): {
  isValid: boolean;
  status: 'ACCEPTED' | 'REJECTED' | 'SUSPICIOUS';
  reason?: string;
} {
  const { session, student, scannedToken, existingRecords, currentTimeMs } = params;

  // 1. Session active check
  if (!session.active) {
    return {
      isValid: false,
      status: 'REJECTED',
      reason: 'This attendance session has been closed by the faculty.',
    };
  }

  // 2. 15-Minute window check
  const windowMs = (session.windowMinutes || 15) * 60 * 1000;
  const sessionAgeMs = currentTimeMs - session.sessionStartedAt;

  if (sessionAgeMs > windowMs) {
    return {
      isValid: false,
      status: 'REJECTED',
      reason: 'The 15-minute attendance window has expired.',
    };
  }

  // 3. Section enrollment check
  if (student.sectionId && student.sectionId !== session.sectionId) {
    return {
      isValid: false,
      status: 'SUSPICIOUS',
      reason: 'Student is not enrolled in this class section.',
    };
  }

  // 4. Duplicate scan check
  const alreadyMarked = existingRecords.some(
    r => r.sessionId === session.id && r.studentId === student.id && (r.status === 'Present' || r.status === 'Late')
  );
  if (alreadyMarked) {
    return {
      isValid: false,
      status: 'REJECTED',
      reason: 'Attendance has already been recorded for this session.',
    };
  }

  // 5. Dynamic QR token validity check
  const currentTokenInfo = generateDynamicQrToken(session.id, currentTimeMs);
  const prevTokenInfo = generateDynamicQrToken(session.id, currentTimeMs - 5000);

  const tokenMatches =
    scannedToken === currentTokenInfo.token ||
    scannedToken === prevTokenInfo.token ||
    scannedToken === session.currentQrToken;

  if (!tokenMatches) {
    return {
      isValid: false,
      status: 'SUSPICIOUS',
      reason: 'Expired or invalid QR code. QR updates every 5 seconds.',
    };
  }

  return {
    isValid: true,
    status: 'ACCEPTED',
  };
}
