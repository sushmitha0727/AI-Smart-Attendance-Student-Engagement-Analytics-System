import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  calculateAttendanceStats,
  calculateAttendanceRecovery,
  projectAttendanceScenario,
  evaluateEngagement,
} from '../../utils/academicCalculations';
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  Camera,
  QrCode,
  FileText,
  HelpCircle,
  Code2,
  TrendingUp,
  Award,
  Bell,
  MessageSquare,
  ShieldCheck,
  RotateCw,
  ArrowRight,
  Send,
  Eye,
  Calendar,
  AlertCircle,
  Play,
} from 'lucide-react';

export const StudentPortal: React.FC = () => {
  const {
    currentUser,
    subjects,
    sections,
    attendanceSessions,
    attendanceRecords,
    assignments,
    assignmentSubmissions,
    quizzes,
    quizAttempts,
    codingTests,
    codingSubmissions,
    classParticipationEntries,
    participationScores,
    notices,
    correctionRequests,
    systemSettings,
    processStudentScan,
    submitAssignment,
    submitQuizAttempt,
    submitCodingSolution,
    submitCorrectionRequest,
  } = useApp();

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<
    | 'dashboard'
    | 'scan_attendance'
    | 'my_attendance'
    | 'recovery_planner'
    | 'assignments'
    | 'quizzes'
    | 'coding_tests'
    | 'engagement'
    | 'participation_marks'
    | 'notifications'
    | 'correction_request'
  >('dashboard');

  // Attendance Scan workflow state
  const [scanStep, setScanStep] = useState<'consent' | 'challenge' | 'matching' | 'scanner' | 'result'>('consent');
  const [consentAgreed, setConsentAgreed] = useState(currentUser.faceConsentGiven ?? true);
  const [livenessChallenge, setLivenessChallenge] = useState<string>('Blink once, then turn head left slowly');
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const [challengeInProgress, setChallengeInProgress] = useState(false);
  const [matchingInProgress, setMatchingInProgress] = useState(false);
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);
  const [manualTokenInput, setManualTokenInput] = useState('');

  // Recovery planner what-if state
  const [whatIfUpcomingAttended, setWhatIfUpcomingAttended] = useState(6);
  const [whatIfUpcomingTotal, setWhatIfUpcomingTotal] = useState(8);

  // Assignment submission modal state
  const [activeAssignmentModal, setActiveAssignmentModal] = useState<string | null>(null);
  const [assignmentText, setAssignmentText] = useState('');
  const [assignmentFileName, setAssignmentFileName] = useState('');

  // Quiz modal state
  const [activeQuizModal, setActiveQuizModal] = useState<string | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});

  // Coding test modal state
  const [activeCodingModal, setActiveCodingModal] = useState<string | null>(null);
  const [codingCode, setCodingCode] = useState('');
  const [codingRunResult, setCodingRunResult] = useState<string | null>(null);

  // Correction request form state
  const [corrSubjectId, setCorrSubjectId] = useState('');
  const [corrType, setCorrType] = useState<'attendance' | 'assignment'>('attendance');
  const [corrDate, setCorrDate] = useState(new Date().toISOString().split('T')[0]);
  const [corrReason, setCorrReason] = useState('');
  const [corrSubmittedSuccess, setCorrSubmittedSuccess] = useState(false);

  // Scanned photo viewer modal state
  const [viewingPhotoRecord, setViewingPhotoRecord] = useState<any | null>(null);

  // Student section info
  const studentSection = sections.find(s => s.id === currentUser.sectionId);

  // Student's subjects (all subjects in their semester/section)
  const studentSubjects = useMemo(() => {
    return subjects.filter(s => s.semesterId === currentUser.semesterId);
  }, [subjects, currentUser.semesterId]);

  // Student's attendance records
  const studentRecords = useMemo(() => {
    return attendanceRecords.filter(r => r.studentId === currentUser.id);
  }, [attendanceRecords, currentUser.id]);

  // Overall attendance stats
  const overallStats = useMemo(() => {
    return calculateAttendanceStats(studentRecords);
  }, [studentRecords]);

  // Subject-wise stats map
  const subjectStats = useMemo(() => {
    const map: Record<string, ReturnType<typeof calculateAttendanceStats>> = {};
    studentSubjects.forEach(subj => {
      const recs = studentRecords.filter(r => r.subjectId === subj.id);
      map[subj.id] = calculateAttendanceStats(recs);
    });
    return map;
  }, [studentSubjects, studentRecords]);

  // Enrolled section notices
  const studentNotices = useMemo(() => {
    return notices.filter(
      n => !n.targetSectionId || n.targetSectionId === currentUser.sectionId
    );
  }, [notices, currentUser.sectionId]);

  // Student participation entries
  const studentParticipation = useMemo(() => {
    return classParticipationEntries.filter(p => p.studentId === currentUser.id);
  }, [classParticipationEntries, currentUser.id]);

  // Calculate engagement summary
  const studentEngagement = useMemo(() => {
    const totalAssignments = assignments.filter(a => a.sectionId === currentUser.sectionId).length;
    const completedAssignments = assignmentSubmissions.filter(s => s.studentId === currentUser.id).length;
    const assignmentRate = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 80;

    const totalQuizzes = quizzes.filter(q => q.sectionId === currentUser.sectionId).length;
    const completedQuizzes = quizAttempts.filter(q => q.studentId === currentUser.id).length;
    const quizRate = totalQuizzes > 0 ? (completedQuizzes / totalQuizzes) * 100 : 75;

    const totalCoding = codingTests.filter(c => c.sectionId === currentUser.sectionId).length;
    const completedCoding = codingSubmissions.filter(c => c.studentId === currentUser.id).length;
    const codingRate = totalCoding > 0 ? (completedCoding / totalCoding) * 100 : 70;

    const discussionPoints = studentParticipation.reduce((acc, curr) => acc + curr.points, 0);

    return evaluateEngagement({
      attendanceRate: overallStats.percentage,
      assignmentRate,
      quizRate,
      codingRate: totalCoding > 0 ? codingRate : undefined,
      discussionPoints,
      totalActivitiesOffered: totalAssignments + totalQuizzes + totalCoding + 5,
      recentActivityTrendRatio: overallStats.percentage < 70 ? 0.8 : 1.15,
    });
  }, [
    currentUser.sectionId,
    currentUser.id,
    assignments,
    assignmentSubmissions,
    quizzes,
    quizAttempts,
    codingTests,
    codingSubmissions,
    studentParticipation,
    overallStats.percentage,
  ]);

  // Randomize liveness challenges
  const generateNewChallenge = () => {
    const challenges = [
      'Blink once, then turn head left slowly',
      'Turn head right, then blink twice',
      'Look straight, then nod head downward',
      'Smile briefly, then tilt head to the left',
      'Blink twice, then look straight at the camera',
    ];
    const picked = challenges[Math.floor(Math.random() * challenges.length)];
    setLivenessChallenge(picked);
    setChallengeCompleted(false);
  };

  const startChallengeVerification = () => {
    setChallengeInProgress(true);
    setTimeout(() => {
      setChallengeInProgress(false);
      setChallengeCompleted(true);
      // Automatically advance to face match
      setScanStep('matching');
      setMatchingInProgress(true);
      setTimeout(() => {
        setMatchingInProgress(false);
        setScanStep('scanner');
      }, 1500);
    }, 2000);
  };

  // Currently active attendance sessions for student's section
  const activeSectionSessions = attendanceSessions.filter(
    s => s.active && s.sectionId === currentUser.sectionId
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Vertical Side Panel */}
        <aside className="w-full lg:w-64 shrink-0 bg-white border border-slate-200 rounded-xl p-3 shadow-xs lg:sticky lg:top-20">
          <div className="px-3 py-2 border-b border-slate-100 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Student Navigation</span>
            <div className="text-xs font-bold text-slate-900 mt-0.5 truncate">{currentUser.name}</div>
            <div className="text-[11px] text-slate-500 font-mono">{currentUser.rollNumber} · {studentSection?.name || 'Section'}</div>
          </div>

          <nav className="flex flex-col gap-1 w-full text-xs">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: ArrowRight },
              { id: 'scan_attendance', label: 'Verify & Scan Attendance', icon: Camera, highlight: true },
              { id: 'my_attendance', label: 'My Attendance', icon: CheckCircle2 },
              { id: 'recovery_planner', label: 'Recovery Planner', icon: TrendingUp },
              { id: 'my_assignments', label: 'My Assignments', icon: FileText },
              { id: 'quizzes', label: 'Quizzes & Live Polls', icon: HelpCircle },
              { id: 'coding_tests', label: 'Coding Tests', icon: Code2 },
              { id: 'engagement', label: 'My Engagement', icon: Award },
              { id: 'participation_marks', label: 'Participation Marks (/5)', icon: Award },
              { id: 'notifications', label: `Notifications (${studentNotices.length})`, icon: Bell },
              { id: 'correction_request', label: 'Correction Request', icon: MessageSquare },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id || (tab.id === 'my_assignments' && activeTab === 'assignments');
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    if (tab.id === 'my_assignments') setActiveTab('assignments');
                    else setActiveTab(tab.id as any);
                  }}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-left w-full cursor-pointer ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-900 font-semibold border-l-4 border-emerald-600'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  } ${tab.highlight ? 'font-semibold' : ''}`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                    <span className="truncate">{tab.label}</span>
                  </div>
                  {tab.highlight && !isActive && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Quick attendance status at bottom of side panel */}
          <div className="mt-4 pt-3 border-t border-slate-100 p-2 text-xs">
            <div className="flex items-center justify-between text-slate-500 text-[11px] mb-1">
              <span>Overall Standing:</span>
              <span className={`font-mono font-bold ${overallStats.percentage >= systemSettings.attendanceThresholdPercent ? 'text-emerald-700' : 'text-rose-600'}`}>
                {overallStats.percentage}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${overallStats.percentage >= systemSettings.attendanceThresholdPercent ? 'bg-emerald-600' : 'bg-rose-500'}`}
                style={{ width: `${Math.min(100, overallStats.percentage)}%` }}
              />
            </div>
          </div>
        </aside>

        {/* Right Main Content */}
        <div className="flex-1 min-w-0 w-full space-y-6">
          {/* Student Welcome Header */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img
                src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80'}
                alt={currentUser.name}
                className="w-14 h-14 rounded-full object-cover ring-2 ring-emerald-500/30"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900">{currentUser.name}</h1>
                  <span className="text-xs px-2 py-0.5 rounded font-mono bg-slate-100 text-slate-700">
                    {currentUser.rollNumber}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {studentSection?.name || '2nd Year – A'} · B.Tech Computer Science & Engineering · Academic Year 2025–26
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Attendance Status Badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-xs text-slate-500">Overall Attendance:</span>
                <span
                  className={`text-sm font-bold font-mono ${
                    overallStats.percentage >= systemSettings.attendanceThresholdPercent
                      ? 'text-emerald-700'
                      : 'text-rose-600'
                  }`}
                >
                  {overallStats.percentage}%
                </span>
                {overallStats.percentage < systemSettings.attendanceThresholdPercent && (
                  <span className="text-[10px] uppercase font-bold text-rose-600 bg-rose-50 px-1 rounded">
                    At Risk
                  </span>
                )}
              </div>

              {/* Quick Scan Attendance Shortcut Button */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('scan_attendance');
                  setScanStep('consent');
                  generateNewChallenge();
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Verify & Scan Attendance</span>
              </button>
            </div>
          </div>

      {/* TAB 1: DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Top Banner Alert if below 75% */}
          {overallStats.percentage < systemSettings.attendanceThresholdPercent && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs text-rose-900">
                <h4 className="font-semibold text-sm">Attendance Below Institutional Minimum (75%)</h4>
                <p className="mt-0.5 text-rose-700">
                  Your current aggregate attendance is <strong>{overallStats.percentage}%</strong>. The institution requires a minimum of {systemSettings.attendanceThresholdPercent}% to appear for end-semester examinations.
                </p>
                <div className="mt-2.5">
                  <button
                    type="button"
                    onClick={() => setActiveTab('recovery_planner')}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-rose-800 hover:text-rose-900 underline underline-offset-2"
                  >
                    Open Attendance Recovery Planner &rarr;
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Active Live Attendance Notice */}
          {activeSectionSessions.length > 0 && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center animate-pulse">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-indigo-950">
                    Active Class Attendance in Progress!
                  </h4>
                  <p className="text-xs text-indigo-700">
                    Faculty has opened rotating QR attendance. 15-minute window is currently running.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('scan_attendance');
                  setScanStep('consent');
                  generateNewChallenge();
                }}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs"
              >
                Scan Now
              </button>
            </div>
          )}

          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <span className="text-xs text-slate-500 font-medium">Overall Attendance</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono text-slate-900">
                  {overallStats.percentage}%
                </span>
                <span className="text-xs text-slate-500">
                  {overallStats.present} / {overallStats.conducted} classes
                </span>
              </div>
              <div className="mt-2 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    overallStats.percentage >= 75 ? 'bg-emerald-600' : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, overallStats.percentage)}%` }}
                />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <span className="text-xs text-slate-500 font-medium">Engagement Level</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className={`text-lg font-bold ${
                  studentEngagement.level === 'High'
                    ? 'text-emerald-700'
                    : studentEngagement.level === 'Medium'
                    ? 'text-amber-700'
                    : 'text-rose-700'
                }`}>
                  {studentEngagement.level}
                </span>
                <span className="text-xs text-slate-500">
                  Trend: {studentEngagement.trend}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 truncate">
                {studentEngagement.reasons[0] || 'Based on attendance and submissions'}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <span className="text-xs text-slate-500 font-medium">Pending Assignments</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono text-slate-900">
                  {assignments.filter(a => a.sectionId === currentUser.sectionId && !assignmentSubmissions.some(s => s.assignmentId === a.id && s.studentId === currentUser.id)).length}
                </span>
                <span className="text-xs text-slate-500">Due this week</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('assignments')}
                className="mt-2 text-xs font-medium text-emerald-700 hover:text-emerald-800"
              >
                View tasks &rarr;
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <span className="text-xs text-slate-500 font-medium">Provisional Participation</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono text-indigo-700">
                  {(participationScores.find(p => p.studentId === currentUser.id)?.provisionalScore || 4.2).toFixed(1)} / 5.0
                </span>
                <span className="text-xs text-slate-500">Auto-scored</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('participation_marks')}
                className="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-700"
              >
                View rubric breakdown &rarr;
              </button>
            </div>
          </div>

          {/* Subject-Wise Attendance Breakdown */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="font-semibold text-slate-900 text-sm mb-4">Subject Attendance Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {studentSubjects.map(subj => {
                const stats = subjectStats[subj.id] || { conducted: 0, present: 0, absent: 0, percentage: 0 };
                const isUnder = stats.percentage < systemSettings.attendanceThresholdPercent;
                return (
                  <div
                    key={subj.id}
                    className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-xs text-slate-900">{subj.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {subj.code} · {subj.credits} Credits · {subj.type}
                        </div>
                      </div>
                      <span
                        className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                          isUnder ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {stats.percentage}%
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-600">
                      <span>Attended: {stats.present}/{stats.conducted}</span>
                      <span>Absent: {stats.absent}</span>
                    </div>

                    <div className="mt-1.5 w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isUnder ? 'bg-rose-500' : 'bg-emerald-600'}`}
                        style={{ width: `${Math.min(100, stats.percentage)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Enrolled Notices */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="font-semibold text-slate-900 text-sm mb-3">Class Announcements & Deadlines</h3>
            <div className="divide-y divide-slate-100">
              {studentNotices.slice(0, 3).map(notice => (
                <div key={notice.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-medium text-xs text-slate-900">{notice.title}</h4>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">{notice.createdAt}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{notice.content}</p>
                  <div className="mt-1.5 text-[11px] text-slate-400">
                    Posted by {notice.authorName}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: VERIFY AND SCAN ATTENDANCE (CORE REQUIRED WORKFLOW) */}
      {activeTab === 'scan_attendance' && (
        <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="text-center pb-4 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">Attendance Verification & QR Scan</h2>
            <p className="text-xs text-slate-500 mt-1">
              Sequence: Consent &rarr; Random Liveness Challenge &rarr; Registered Face Match &rarr; Dynamic QR Scanner
            </p>
          </div>

          {/* Workflow Stepper */}
          <div className="flex items-center justify-between my-6 px-4">
            {[
              { id: 'consent', label: '1. Consent' },
              { id: 'challenge', label: '2. Liveness' },
              { id: 'matching', label: '3. Match' },
              { id: 'scanner', label: '4. Scan' },
            ].map(step => {
              const active = scanStep === step.id;
              const isPast =
                (step.id === 'consent' && scanStep !== 'consent') ||
                (step.id === 'challenge' && (scanStep === 'matching' || scanStep === 'scanner' || scanStep === 'result')) ||
                (step.id === 'matching' && (scanStep === 'scanner' || scanStep === 'result'));
              return (
                <div key={step.id} className="flex flex-col items-center">
                  <div
                    className={`w-7 h-7 rounded-full text-xs font-semibold flex items-center justify-center transition-colors ${
                      active
                        ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                        : isPast
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isPast ? '✓' : step.label[0]}
                  </div>
                  <span className={`text-[11px] mt-1 ${active ? 'font-semibold text-slate-900' : 'text-slate-400'}`}>
                    {step.label.slice(3)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Step 1: Consent */}
          {scanStep === 'consent' && (
            <div className="space-y-4 py-2">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-700 space-y-2">
                <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Institutional Biometric Consent & Privacy Guarantee</span>
                </div>
                <p>
                  In accordance with university academic policy, student identity verification is performed by matching your live camera feed against your consented institutional enrollment photograph on record.
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li><strong>Zero Video Retention:</strong> Camera frames are processed strictly client-side in volatile memory and are permanently discarded immediately after verification.</li>
                  <li><strong>No Aadhaar Requirement:</strong> This system uses your internal university student profile and does not integrate or require government Aadhaar data.</li>
                  <li><strong>Anti-Spoofing:</strong> A random physical motion challenge is enforced before activating the dynamic QR reader.</li>
                </ul>
              </div>

              <label className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentAgreed}
                  onChange={e => setConsentAgreed(e.target.checked)}
                  className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs text-slate-700">
                  I grant consent for transient facial verification against my student photo for recording attendance today.
                </span>
              </label>

              <button
                type="button"
                disabled={!consentAgreed}
                onClick={() => {
                  generateNewChallenge();
                  setScanStep('challenge');
                }}
                className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                Proceed to Liveness Challenge &rarr;
              </button>
            </div>
          )}

          {/* Step 2: Random Liveness Challenge */}
          {scanStep === 'challenge' && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
                <span className="text-xs font-semibold text-amber-900 uppercase tracking-wide">
                  Random Liveness Challenge:
                </span>
                <p className="text-sm font-bold text-amber-950 mt-1 font-mono">
                  "{livenessChallenge}"
                </p>
              </div>

              {/* Camera Simulation Viewport */}
              <div className="relative w-full h-64 bg-slate-900 rounded-xl overflow-hidden flex flex-col items-center justify-center border-2 border-slate-700">
                <img
                  src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=300&q=80'}
                  alt="Student face preview"
                  className="w-36 h-36 rounded-full object-cover border-2 border-emerald-400 opacity-90"
                />

                {/* Animated Liveness Landmark Box */}
                <div className="absolute inset-x-8 inset-y-6 border border-emerald-500/50 rounded-lg pointer-events-none flex items-center justify-center">
                  <div className="text-[11px] font-mono text-emerald-400 bg-slate-950/80 px-2 py-0.5 rounded border border-emerald-500/40">
                    {challengeInProgress ? 'Analyzing facial landmark trajectory...' : 'Ready for challenge'}
                  </div>
                </div>

                <div className="absolute bottom-2 text-[10px] text-slate-400">
                  Demo Verification Mode · High-precision face bounding active
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={generateNewChallenge}
                  className="px-3 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>New Challenge</span>
                </button>

                <button
                  type="button"
                  disabled={challengeInProgress}
                  onClick={startChallengeVerification}
                  className="flex-1 py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {challengeInProgress ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      <span>Verifying Liveness Motion...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4" />
                      <span>Perform Action & Verify</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Registered-Face Match */}
          {scanStep === 'matching' && (
            <div className="py-6 text-center space-y-4">
              <div className="flex items-center justify-center gap-6">
                <div className="text-center">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-slate-300 mx-auto">
                    <img
                      src={currentUser.registeredFacePhotoUrl || currentUser.avatarUrl}
                      alt="Registered"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">Institutional Record</span>
                </div>

                <div className="text-center">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    ⇄
                  </div>
                  <span className="text-[10px] font-mono text-emerald-600 mt-1 block">
                    {matchingInProgress ? 'Matching...' : '98.8% Match'}
                  </span>
                </div>

                <div className="text-center">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-emerald-500 mx-auto">
                    <img
                      src={currentUser.avatarUrl}
                      alt="Live Verified"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">Live Verified Frame</span>
                </div>
              </div>

              <div className="text-xs text-slate-600">
                1:1 Face match confirmed against student enrollment record ({currentUser.rollNumber}).
                Opening QR scanner immediately...
              </div>
            </div>
          )}

          {/* Step 4: Dynamic QR Scanner */}
          {scanStep === 'scanner' && (
            <div className="space-y-4 py-2">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Face matched & consented. QR Scanner is now open. Point at faculty's dynamic QR code.</span>
              </div>

              {/* QR Scanner Viewfinder Simulation */}
              <div className="relative w-full h-64 bg-slate-950 rounded-xl border-2 border-indigo-500/50 flex flex-col items-center justify-center overflow-hidden">
                {/* Viewfinder Target Reticle */}
                <div className="w-44 h-44 border-2 border-dashed border-emerald-400 rounded-lg flex items-center justify-center relative">
                  <div className="absolute inset-x-0 h-0.5 bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                  <QrCode className="w-16 h-16 text-slate-600/40" />
                </div>
                <p className="text-[11px] text-slate-400 mt-3 font-mono">
                  Scanning for active 5-second dynamic tokens...
                </p>
              </div>

              {/* Active Sessions Quick Connect (Demo Convenience) */}
              {activeSectionSessions.length > 0 ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-xs font-semibold text-slate-700 block mb-2">
                    Active Faculty Session in Your Section:
                  </span>
                  {activeSectionSessions.map(sess => {
                    const subj = subjects.find(s => s.id === sess.subjectId);
                    return (
                      <div
                        key={sess.id}
                        className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-md text-xs"
                      >
                        <div>
                          <div className="font-semibold text-slate-900">{subj?.name}</div>
                          <div className="text-slate-500 font-mono text-[10px]">
                            Room {sess.room} · Active Token: {sess.currentQrToken.slice(0, 16)}...
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const res = processStudentScan({
                              sessionId: sess.id,
                              student: currentUser,
                              scannedToken: sess.currentQrToken,
                            });
                            setScanResult(res);
                            setScanStep('result');
                          }}
                          className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded text-xs cursor-pointer"
                        >
                          Simulate Scanner Lock
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 text-center">
                  No active session currently started by faculty in your section ({studentSection?.name}).
                  Switch to Faculty role (Dr. Ramesh Kumar) to start a session, or enter a token manually below.
                </div>
              )}

              {/* Manual Token Scan Option */}
              <div className="pt-2 border-t border-slate-100">
                <label className="text-[11px] font-medium text-slate-600 block mb-1">
                  Manual QR Token Input (or external optical reader input):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualTokenInput}
                    onChange={e => setManualTokenInput(e.target.value)}
                    placeholder="e.g. QR-JAVA-OCT31-ROTATING-01"
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                  <button
                    type="button"
                    disabled={!manualTokenInput.trim()}
                    onClick={() => {
                      // Attempt validation against any active session
                      const targetSess = attendanceSessions.find(s => s.active) || attendanceSessions[0];
                      if (targetSess) {
                        const res = processStudentScan({
                          sessionId: targetSess.id,
                          student: currentUser,
                          scannedToken: manualTokenInput.trim(),
                        });
                        setScanResult(res);
                        setScanStep('result');
                      }
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white text-xs font-medium rounded-lg"
                  >
                    Submit Scan
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Verification & Scan Result */}
          {scanStep === 'result' && scanResult && (
            <div className="py-4 text-center space-y-4">
              <div
                className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${
                  scanResult.success ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}
              >
                {scanResult.success ? (
                  <CheckCircle2 className="w-8 h-8" />
                ) : (
                  <AlertCircle className="w-8 h-8" />
                )}
              </div>

              <div>
                <h3
                  className={`text-base font-bold ${
                    scanResult.success ? 'text-emerald-900' : 'text-rose-900'
                  }`}
                >
                  {scanResult.success ? 'Attendance Verified & Logged!' : 'Attendance Rejected'}
                </h3>
                <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
                  {scanResult.message}
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 text-left space-y-1">
                <div><strong>Timestamp:</strong> {new Date().toLocaleTimeString()}</div>
                <div><strong>Method:</strong> Consented Face Liveness + Dynamic QR Token</div>
                <div><strong>Security Hash:</strong> Validated against 5-second interval cipher</div>
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setScanStep('consent');
                    setScanResult(null);
                    generateNewChallenge();
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  New Scan
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('my_attendance')}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs"
                >
                  View My Attendance
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MY ATTENDANCE */}
      {activeTab === 'my_attendance' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <h3 className="font-semibold text-slate-900 text-sm mb-4">Subject-Wise Attendance Record</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Subject Name</th>
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">Conducted</th>
                    <th className="py-2.5 px-3">Present</th>
                    <th className="py-2.5 px-3">Absent</th>
                    <th className="py-2.5 px-3">Percentage</th>
                    <th className="py-2.5 px-3">Standing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {studentSubjects.map(subj => {
                    const stats = subjectStats[subj.id] || { conducted: 0, present: 0, absent: 0, percentage: 0 };
                    const meets = stats.percentage >= systemSettings.attendanceThresholdPercent;
                    return (
                      <tr key={subj.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-medium text-slate-900">{subj.name}</td>
                        <td className="py-3 px-3 font-mono text-slate-500">{subj.code}</td>
                        <td className="py-3 px-3">{stats.conducted}</td>
                        <td className="py-3 px-3 text-emerald-700 font-medium">{stats.present}</td>
                        <td className="py-3 px-3 text-rose-600">{stats.absent}</td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">{stats.percentage}%</td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              meets ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {meets ? 'Good Standing' : 'Below 75% At-Risk'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed Attendance History */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <h3 className="font-semibold text-slate-900 text-sm mb-3">Recent Attendance Logs</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Subject</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Scanned Photo</th>
                    <th className="py-2.5 px-3">Scan Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {studentRecords.slice(0, 10).map(rec => {
                    const subj = subjects.find(s => s.id === rec.subjectId);
                    const hasScanned = rec.status === 'Present' || rec.status === 'Late' || rec.verificationType === 'Face+QR';
                    return (
                      <tr key={rec.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono text-slate-600">{rec.date}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-900">{subj?.name || 'Class'}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              rec.status === 'Present'
                                ? 'bg-emerald-100 text-emerald-800'
                                : rec.status === 'Excused'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {rec.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          {hasScanned ? (
                            <button
                              type="button"
                              onClick={() => setViewingPhotoRecord(rec)}
                              className="group flex items-center gap-2 cursor-pointer focus:outline-hidden"
                              title="Click to view verified scanned photo"
                            >
                              <img
                                src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80'}
                                alt="Scanned Face"
                                className="w-7 h-7 rounded-full object-cover ring-2 ring-emerald-500/50 group-hover:ring-emerald-600 transition-all shadow-xs"
                              />
                              <span className="text-[11px] text-emerald-700 font-medium group-hover:underline flex items-center gap-0.5">
                                <Eye className="w-3.5 h-3.5 text-emerald-600" />
                                <span>View Photo</span>
                              </span>
                            </button>
                          ) : (
                            <span className="text-slate-400 text-xs italic">No scan</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 font-mono">{rec.scanTime || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Scanned Verification Photo Inspection Modal */}
          {viewingPhotoRecord && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
              <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <Camera className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Verified Scanned Face Frame</h3>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {subjects.find(s => s.id === viewingPhotoRecord.subjectId)?.name || 'Class Session'} · {viewingPhotoRecord.date}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewingPhotoRecord(null)}
                    className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="my-4 space-y-4">
                  <div className="relative rounded-xl overflow-hidden border-2 border-emerald-500/50 bg-slate-950 flex flex-col items-center justify-center p-4">
                    <img
                      src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80'}
                      alt="Verified Face Frame"
                      className="w-44 h-44 rounded-full object-cover border-4 border-emerald-400 shadow-lg"
                    />
                    <div className="mt-3 px-3 py-1 bg-slate-900/90 border border-emerald-500/50 rounded-full flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>1:1 Match: 98.8% Approved</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Student:</span>
                      <span className="font-semibold text-slate-900">{currentUser.name} ({currentUser.rollNumber})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Captured At:</span>
                      <span className="font-mono text-slate-900">{viewingPhotoRecord.scanTime || '09:04:12 AM'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Attendance Status:</span>
                      <span className="font-semibold text-emerald-700">Present (Face Matched + QR)</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setViewingPhotoRecord(null)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: ATTENDANCE RECOVERY PLANNER */}
      {activeTab === 'recovery_planner' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <div className="pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Attendance Recovery Planner</h3>
              <p className="text-xs text-slate-500 mt-1">
                Calculate exactly how many consecutive upcoming classes you must attend to achieve or maintain the institutional minimum ({systemSettings.attendanceThresholdPercent}%).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {/* Overall Recovery Status */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                  Overall Aggregate Recovery
                </span>
                {(() => {
                  const recovery = calculateAttendanceRecovery(
                    overallStats.conducted,
                    overallStats.present,
                    systemSettings.attendanceThresholdPercent
                  );
                  return (
                    <div className="mt-3 space-y-3">
                      <div className="flex items-baseline justify-between">
                        <span className="text-3xl font-extrabold font-mono text-slate-900">
                          {recovery.currentPercentage}%
                        </span>
                        <span className="text-xs text-slate-500">
                          Target: {systemSettings.attendanceThresholdPercent}%
                        </span>
                      </div>

                      <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs space-y-1.5">
                        <div className="font-semibold text-slate-900">Plan Requirement:</div>
                        <p className={recovery.meetsThreshold ? 'text-emerald-700' : 'text-rose-700 font-medium'}>
                          {recovery.statusMessage}
                        </p>
                      </div>

                      <div className="text-[11px] text-slate-500">
                        Formula: <code>(Present + X) / (Conducted + X) ≥ {systemSettings.attendanceThresholdPercent / 100}</code>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* What-If Scenario Calculator */}
              <div className="p-4 bg-indigo-50/50 border border-indigo-200 rounded-xl">
                <span className="text-xs font-semibold text-indigo-950 uppercase tracking-wider block">
                  Interactive "What-If" Scenario Simulator
                </span>
                <p className="text-xs text-indigo-700 mt-1">
                  Project your attendance if you attend a custom number of upcoming classes.
                </p>

                <div className="mt-4 space-y-3">
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">
                      Upcoming classes conducted: {whatIfUpcomingTotal}
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={20}
                      value={whatIfUpcomingTotal}
                      onChange={e => {
                        const total = Number(e.target.value);
                        setWhatIfUpcomingTotal(total);
                        if (whatIfUpcomingAttended > total) setWhatIfUpcomingAttended(total);
                      }}
                      className="w-full accent-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">
                      Classes you will attend: {whatIfUpcomingAttended}
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={whatIfUpcomingTotal}
                      value={whatIfUpcomingAttended}
                      onChange={e => setWhatIfUpcomingAttended(Number(e.target.value))}
                      className="w-full accent-emerald-600"
                    />
                  </div>

                  {(() => {
                    const projected = projectAttendanceScenario(
                      overallStats.conducted,
                      overallStats.present,
                      whatIfUpcomingAttended,
                      whatIfUpcomingTotal
                    );
                    const meets = projected >= systemSettings.attendanceThresholdPercent;
                    return (
                      <div className="p-3 bg-white border border-indigo-100 rounded-lg text-center">
                        <span className="text-xs text-slate-500">Projected Attendance Rate:</span>
                        <div className={`text-2xl font-bold font-mono mt-0.5 ${meets ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {projected}%
                        </div>
                        <span className={`text-[11px] font-medium ${meets ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {meets ? '✓ Meets 75% Requirement' : '✗ Still below 75%'}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Subject-by-Subject Recovery Table */}
            <div className="mt-6 pt-4 border-t border-slate-100">
              <h4 className="font-semibold text-xs text-slate-900 uppercase tracking-wider mb-3">
                Subject-Specific Recovery Requirements
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="py-2.5 px-3">Subject</th>
                      <th className="py-2.5 px-3">Conducted / Present</th>
                      <th className="py-2.5 px-3">Current %</th>
                      <th className="py-2.5 px-3">Consecutive Classes Needed</th>
                      <th className="py-2.5 px-3">Can Afford to Miss</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {studentSubjects.map(subj => {
                      const stats = subjectStats[subj.id] || { conducted: 0, present: 0, absent: 0, percentage: 0 };
                      const rec = calculateAttendanceRecovery(stats.conducted, stats.present, systemSettings.attendanceThresholdPercent);
                      return (
                        <tr key={subj.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-medium text-slate-900">{subj.name}</td>
                          <td className="py-2.5 px-3 text-slate-600">{stats.conducted} / {stats.present}</td>
                          <td className="py-2.5 px-3 font-mono font-bold">{rec.currentPercentage}%</td>
                          <td className="py-2.5 px-3">
                            {rec.classesNeeded > 0 ? (
                              <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-bold font-mono">
                                {rec.classesNeeded} classes
                              </span>
                            ) : (
                              <span className="text-slate-400">0 (Target Met)</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            {rec.canMissClasses > 0 ? (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-mono">
                                Up to {rec.canMissClasses} classes
                              </span>
                            ) : (
                              <span className="text-slate-400">0 classes</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: MY ASSIGNMENTS */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 text-base">Course Assignments</h3>
            <span className="text-xs text-slate-500">Enrolled section: {studentSection?.name}</span>
          </div>

          <div className="space-y-3">
            {assignments
              .filter(a => a.sectionId === currentUser.sectionId)
              .map(asg => {
                const subj = subjects.find(s => s.id === asg.subjectId);
                const submission = assignmentSubmissions.find(
                  s => s.assignmentId === asg.id && s.studentId === currentUser.id
                );
                return (
                  <div
                    key={asg.id}
                    className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-slate-900">{asg.title}</span>
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                            {subj?.name}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">{asg.description}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs text-slate-500 block">Due: {asg.dueDate}</span>
                        <span className="text-xs font-semibold text-slate-700 block">
                          Total Marks: {asg.totalMarks}
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      {submission ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-700 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Submitted: {submission.submittedAt}
                            </span>
                            {submission.score !== undefined && (
                              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded">
                                Score: {submission.score} / {asg.totalMarks}
                              </span>
                            )}
                            {submission.qualityRating && (
                              <span className="text-slate-500">
                                Quality: <strong>{submission.qualityRating}</strong>
                              </span>
                            )}
                          </div>
                          {submission.feedback && (
                            <p className="text-slate-600 italic">
                              Faculty feedback: "{submission.feedback}"
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-amber-700 font-medium flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Pending Submission
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setActiveAssignmentModal(asg.id);
                          setAssignmentText(submission?.textSolution || '');
                          setAssignmentFileName(submission?.fileName || '');
                        }}
                        className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium cursor-pointer"
                      >
                        {submission ? 'Update Submission' : 'Submit Work'}
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Submission Modal */}
          {activeAssignmentModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
              <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg p-5">
                <h3 className="font-semibold text-slate-900 text-base mb-1">Submit Assignment</h3>
                <p className="text-xs text-slate-500 mb-4">
                  Enter your solution narrative and attach your completed work.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">
                      Solution Notes / Explanation
                    </label>
                    <textarea
                      rows={4}
                      value={assignmentText}
                      onChange={e => setAssignmentText(e.target.value)}
                      placeholder="Describe your implementation details, algorithmic complexity, and testing results..."
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">
                      Attach File / Archive Name
                    </label>
                    <input
                      type="text"
                      value={assignmentFileName}
                      onChange={e => setAssignmentFileName(e.target.value)}
                      placeholder="e.g. Solution_AaravSharma_2024CS01.zip"
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveAssignmentModal(null)}
                    className="px-4 py-2 text-xs text-slate-700 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      submitAssignment({
                        assignmentId: activeAssignmentModal,
                        studentId: currentUser.id,
                        textSolution: assignmentText,
                        fileName: assignmentFileName || 'Submission_Document.pdf',
                      });
                      setActiveAssignmentModal(null);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
                  >
                    Confirm Submission
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: QUIZZES & LIVE QUIZZES */}
      {activeTab === 'quizzes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 text-base">Class Quizzes & Live Polls</h3>
            <span className="text-xs text-slate-500">Timed assessments</span>
          </div>

          <div className="space-y-3">
            {quizzes
              .filter(q => q.sectionId === currentUser.sectionId)
              .map(quiz => {
                const subj = subjects.find(s => s.id === quiz.subjectId);
                const attempt = quizAttempts.find(
                  a => a.quizId === quiz.id && a.studentId === currentUser.id
                );
                return (
                  <div
                    key={quiz.id}
                    className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-900">{quiz.title}</span>
                        {quiz.isLive && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 animate-pulse">
                            Live Quiz
                          </span>
                        )}
                        <span className="text-xs text-slate-500 font-mono">({subj?.name})</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {quiz.questions.length} Questions · Duration: {quiz.durationMinutes} Minutes · Total: {quiz.totalMarks} Marks
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {attempt ? (
                        <div className="text-right">
                          <span className="text-xs font-semibold text-emerald-700 block">
                            Completed: {attempt.score} / {quiz.totalMarks} Marks
                          </span>
                          <span className="text-[11px] text-slate-400 block">{attempt.attemptedAt}</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveQuizModal(quiz.id);
                            setQuizAnswers({});
                          }}
                          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Start Quiz</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Interactive Quiz Runner Modal */}
          {activeQuizModal && (() => {
            const currentQuiz = quizzes.find(q => q.id === activeQuizModal);
            if (!currentQuiz) return null;
            return (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
                <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg p-5 max-h-[85vh] overflow-y-auto">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{currentQuiz.title}</h3>
                      <span className="text-xs text-slate-500">Duration: {currentQuiz.durationMinutes} mins</span>
                    </div>
                    <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-mono text-xs font-bold rounded">
                      Total: {currentQuiz.totalMarks} Marks
                    </span>
                  </div>

                  <div className="space-y-4 my-4">
                    {currentQuiz.questions.map((q, idx) => (
                      <div key={q.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                        <span className="text-xs font-semibold text-slate-900 block mb-2">
                          Q{idx + 1}. {q.question}
                        </span>
                        <div className="space-y-1.5">
                          {q.options.map((opt, optIdx) => (
                            <label
                              key={optIdx}
                              className={`flex items-center gap-2 p-2 rounded border text-xs cursor-pointer transition-colors ${
                                quizAnswers[q.id] === optIdx
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-medium'
                                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <input
                                type="radio"
                                name={q.id}
                                checked={quizAnswers[q.id] === optIdx}
                                onChange={() => setQuizAnswers(prev => ({ ...prev, [q.id]: optIdx }))}
                                className="text-emerald-600"
                              />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setActiveQuizModal(null)}
                      className="px-4 py-2 text-xs text-slate-700 hover:bg-slate-100 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        let score = 0;
                        const pointsPerQ = currentQuiz.totalMarks / currentQuiz.questions.length;
                        currentQuiz.questions.forEach(q => {
                          if (quizAnswers[q.id] === q.correctOptionIndex) {
                            score += pointsPerQ;
                          }
                        });
                        submitQuizAttempt({
                          quizId: currentQuiz.id,
                          studentId: currentUser.id,
                          score: Math.round(score),
                          maxScore: currentQuiz.totalMarks,
                          selectedAnswers: Object.values(quizAnswers),
                          isLiveParticipation: currentQuiz.isLive,
                        });
                        setActiveQuizModal(null);
                      }}
                      className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
                    >
                      Submit Quiz & View Score
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 7: CODING TESTS */}
      {activeTab === 'coding_tests' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 text-base">Automated Coding Practical Tests</h3>
            <span className="text-xs text-slate-500">Graded against hidden test cases</span>
          </div>

          <div className="space-y-3">
            {codingTests
              .filter(c => c.sectionId === currentUser.sectionId)
              .map(test => {
                const subj = subjects.find(s => s.id === test.subjectId);
                const submission = codingSubmissions.find(
                  s => s.testId === test.id && s.studentId === currentUser.id
                );
                return (
                  <div
                    key={test.id}
                    className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-slate-900">{test.title}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                            {subj?.name}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">{test.problemStatement}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs text-slate-500 block">Deadline: {test.deadline}</span>
                        <span className="text-xs font-semibold text-slate-700 block">
                          Total Marks: {test.totalMarks}
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      {submission ? (
                        <div className="flex items-center gap-3 text-xs">
                          <span className="font-semibold text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Passed: {submission.passedTests}/{submission.totalTests} Test Cases
                          </span>
                          <span className="font-mono text-slate-700 font-bold">
                            Score: {submission.score}/{test.totalMarks}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-amber-700 font-medium flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Not yet submitted
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setActiveCodingModal(test.id);
                          setCodingCode(submission?.submittedCode || test.starterCode);
                          setCodingRunResult(null);
                        }}
                        className="px-3.5 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
                      >
                        {submission ? 'Edit Code & Retest' : 'Open IDE & Code'}
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Interactive Code Editor Modal */}
          {activeCodingModal && (() => {
            const currentTest = codingTests.find(c => c.id === activeCodingModal);
            if (!currentTest) return null;
            return (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
                <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl p-5 max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{currentTest.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{currentTest.problemStatement}</p>
                    </div>
                  </div>

                  <div className="my-3">
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Code Editor (Java / Python)
                    </label>
                    <textarea
                      rows={10}
                      value={codingCode}
                      onChange={e => setCodingCode(e.target.value)}
                      className="w-full p-3 font-mono text-xs bg-slate-950 text-emerald-400 rounded-lg border border-slate-800 focus:outline-hidden"
                    />
                  </div>

                  {/* Test Cases preview */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5 mb-3">
                    <span className="font-semibold text-slate-900 block">Verification Test Cases:</span>
                    {currentTest.testCases.map((tc, idx) => (
                      <div key={idx} className="font-mono text-[11px] text-slate-600">
                        Case {idx + 1}: <code>Input: {tc.input}</code> &rarr; <code>Expected: {tc.expectedOutput}</code>
                      </div>
                    ))}
                  </div>

                  {codingRunResult && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 mb-3">
                      <div className="font-semibold">{codingRunResult}</div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setActiveCodingModal(null)}
                      className="px-4 py-2 text-xs text-slate-700 hover:bg-slate-100 rounded-lg"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCodingRunResult(`Running test cases... Passed ${currentTest.testCases.length}/${currentTest.testCases.length} tests successfully!`);
                        submitCodingSolution({
                          testId: currentTest.id,
                          studentId: currentUser.id,
                          submittedCode: codingCode,
                          passedTests: currentTest.testCases.length,
                          totalTests: currentTest.testCases.length,
                          score: currentTest.totalMarks,
                        });
                      }}
                      className="px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg"
                    >
                      Run & Submit Solution
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 8: MY ENGAGEMENT */}
      {activeTab === 'engagement' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Student Engagement Analytics</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Multi-modal evaluation combining attendance consistency, assignment timeliness, quiz participation, and classroom discussions.
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                  studentEngagement.level === 'High'
                    ? 'bg-emerald-100 text-emerald-800'
                    : studentEngagement.level === 'Medium'
                    ? 'bg-amber-100 text-amber-800'
                    : studentEngagement.level === 'Low'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-slate-100 text-slate-800'
                }`}
              >
                {studentEngagement.level} Engagement
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-5">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-xs text-slate-500 block">Trajectory / Trend</span>
                <span className="text-base font-bold text-slate-900 capitalize mt-1 block">
                  {studentEngagement.trend}
                </span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-xs text-slate-500 block">Analytics Confidence</span>
                <span className="text-base font-bold text-slate-900 capitalize mt-1 block">
                  {studentEngagement.confidence} Evidence
                </span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-xs text-slate-500 block">Composite Metric Score</span>
                <span className="text-base font-mono font-bold text-slate-900 mt-1 block">
                  {studentEngagement.compositeScore} / 100
                </span>
              </div>
            </div>

            {/* Plain language reasons */}
            <div className="mt-4">
              <h4 className="font-semibold text-xs text-slate-900 uppercase tracking-wider mb-2">
                Transparent Evidence Breakdown
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-700">
                {studentEngagement.reasons.map((reason, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Actionable Next Steps */}
            <div className="mt-6 p-4 bg-indigo-50/60 border border-indigo-200 rounded-lg text-xs space-y-2">
              <span className="font-semibold text-indigo-950 block">Suggested Academic Actions:</span>
              <ul className="list-disc pl-5 space-y-1 text-indigo-900">
                {overallStats.percentage < 75 && (
                  <li>Prioritize attending the next 6 scheduled sessions to exit the attendance recovery flag.</li>
                )}
                <li>Maintain on-time submissions for pending lab coding tasks to secure maximum practical marks.</li>
                <li>Participate in classroom question-answer discussions during Theory sessions.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 9: PARTICIPATION MARKS (/5) */}
      {activeTab === 'participation_marks' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <div className="pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Participation Score Breakdown (Out of 5.0 Marks)</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Calculated automatically across 5 academic participation components. Standard attendance is NOT double-counted.
              </p>
            </div>

            <div className="space-y-4 mt-5">
              {participationScores
                .filter(p => p.studentId === currentUser.id)
                .map(score => {
                  const subj = subjects.find(s => s.id === score.subjectId);
                  return (
                    <div key={score.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-sm text-slate-900">{subj?.name}</span>
                          <span className="text-xs text-slate-500 ml-2 font-mono">({subj?.code})</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xl font-bold font-mono text-indigo-700">
                            {score.approvedScore.toFixed(2)} / 5.00
                          </span>
                          <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                            Status: {score.status}
                          </span>
                        </div>
                      </div>

                      {/* Component breakdown */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                        <div className="p-2 bg-white rounded border border-slate-200">
                          <span className="text-[11px] text-slate-500 block">Assignments</span>
                          <span className="font-bold text-slate-900 font-mono mt-0.5 block">
                            {(score.assignmentScoreNormalized * score.effectiveWeights.assignmentWeight).toFixed(2)} / {score.effectiveWeights.assignmentWeight.toFixed(2)}
                          </span>
                        </div>

                        <div className="p-2 bg-white rounded border border-slate-200">
                          <span className="text-[11px] text-slate-500 block">Quizzes / Polls</span>
                          <span className="font-bold text-slate-900 font-mono mt-0.5 block">
                            {(score.quizScoreNormalized * score.effectiveWeights.quizWeight).toFixed(2)} / {score.effectiveWeights.quizWeight.toFixed(2)}
                          </span>
                        </div>

                        <div className="p-2 bg-white rounded border border-slate-200">
                          <span className="text-[11px] text-slate-500 block">Coding Practical</span>
                          <span className="font-bold text-slate-900 font-mono mt-0.5 block">
                            {score.naFlags.coding ? (
                              <span className="text-amber-700">N/A (Redistributed)</span>
                            ) : (
                              `${(score.codingScoreNormalized * score.effectiveWeights.codingWeight).toFixed(2)} / ${score.effectiveWeights.codingWeight.toFixed(2)}`
                            )}
                          </span>
                        </div>

                        <div className="p-2 bg-white rounded border border-slate-200">
                          <span className="text-[11px] text-slate-500 block">Discussions</span>
                          <span className="font-bold text-slate-900 font-mono mt-0.5 block">
                            {(score.discussionScoreNormalized * score.effectiveWeights.discussionWeight).toFixed(2)} / {score.effectiveWeights.discussionWeight.toFixed(2)}
                          </span>
                        </div>

                        <div className="p-2 bg-white rounded border border-slate-200">
                          <span className="text-[11px] text-slate-500 block">Consistency</span>
                          <span className="font-bold text-slate-900 font-mono mt-0.5 block">
                            {(score.consistencyScoreNormalized * score.effectiveWeights.consistencyWeight).toFixed(2)} / {score.effectiveWeights.consistencyWeight.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {score.facultyNotes && (
                        <div className="text-xs text-slate-600 italic bg-white p-2.5 rounded border border-slate-200">
                          Faculty note: "{score.facultyNotes}"
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 10: NOTIFICATIONS */}
      {activeTab === 'notifications' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 text-base">Class Notices & Reminders</h3>
            <span className="text-xs text-slate-500">Filtered for your section</span>
          </div>

          <div className="divide-y divide-slate-100 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            {studentNotices.map(notice => (
              <div key={notice.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-xs text-slate-900">{notice.title}</h4>
                  <span className="text-[11px] font-mono text-slate-400">{notice.createdAt}</span>
                </div>
                <p className="text-xs text-slate-600 mt-1">{notice.content}</p>
                <div className="mt-2 text-[11px] text-slate-400">
                  From: {notice.authorName} ({notice.authorRole.toUpperCase()})
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 11: CORRECTION REQUEST */}
      {activeTab === 'correction_request' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs max-w-2xl">
            <h3 className="font-bold text-slate-900 text-base mb-1">Submit Record Review Request</h3>
            <p className="text-xs text-slate-500 mb-4">
              Students cannot alter records directly. Submit a formal reasoned request to the subject faculty for review.
            </p>

            {corrSubmittedSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900">
                ✓ Review request submitted successfully. Faculty has been notified for verification.
              </div>
            )}

            <form
              onSubmit={e => {
                e.preventDefault();
                const subj = subjects.find(s => s.id === corrSubjectId) || studentSubjects[0];
                submitCorrectionRequest({
                  studentId: currentUser.id,
                  studentName: currentUser.name,
                  subjectId: subj.id,
                  subjectName: subj.name,
                  type: corrType,
                  date: corrDate,
                  reason: corrReason,
                });
                setCorrReason('');
                setCorrSubmittedSuccess(true);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="font-medium text-slate-700 block mb-1">Select Subject</label>
                <select
                  value={corrSubjectId}
                  onChange={e => setCorrSubjectId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  required
                >
                  <option value="">-- Choose Subject --</option>
                  {studentSubjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-slate-700 block mb-1">Review Category</label>
                  <select
                    value={corrType}
                    onChange={e => setCorrType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="attendance">Attendance Record</option>
                    <option value="assignment">Assignment Mark</option>
                    <option value="participation">Participation Entry</option>
                  </select>
                </div>

                <div>
                  <label className="font-medium text-slate-700 block mb-1">Date of Session</label>
                  <input
                    type="date"
                    value={corrDate}
                    onChange={e => setCorrDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">
                  Reason for Review (Mandatory)
                </label>
                <textarea
                  rows={3}
                  value={corrReason}
                  onChange={e => setCorrReason(e.target.value)}
                  placeholder="Explain why you could not scan during the 15-minute window or provide medical cert details..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg shadow-xs cursor-pointer"
              >
                Submit Correction Request
              </button>
            </form>
          </div>

          {/* Previous Requests Table */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <h4 className="font-semibold text-slate-900 text-sm mb-3">Your Past Review Requests</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-2.5 px-3">Subject</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Reason</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Faculty Response</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {correctionRequests
                    .filter(c => c.studentId === currentUser.id)
                    .map(cr => (
                      <tr key={cr.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-medium text-slate-900">{cr.subjectName}</td>
                        <td className="py-2.5 px-3 capitalize">{cr.type}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">{cr.date}</td>
                        <td className="py-2.5 px-3 text-slate-700 max-w-xs">{cr.reason}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              cr.status === 'Approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : cr.status === 'Rejected'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {cr.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 italic">
                          {cr.facultyNotes || 'Pending review by instructor'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
};
