import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { QrCodeView } from '../common/QrCodeView';
import {
  calculateAttendanceStats,
  calculateParticipationScore,
  evaluateEngagement,
} from '../../utils/academicCalculations';
import {
  Calendar,
  Users,
  QrCode,
  FileText,
  HelpCircle,
  Code2,
  Award,
  AlertTriangle,
  HeartHandshake,
  Bell,
  Download,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Edit,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Send,
  Sliders,
  ChevronRight,
  Upload,
  FolderGit2,
  MessageSquare,
  ExternalLink,
  Trash2,
  Eye,
  Check,
  BookOpen,
} from 'lucide-react';
import { AttendanceStatus } from '../../types';
import {
  generateClassRosterCsv,
  generateStudentsCsv,
  triggerCsvDownload,
} from '../../utils/csvExporter';

export const FacultyPortal: React.FC = () => {
  const {
    currentUser,
    programs,
    subjects,
    sections,
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
    correctAttendance,
    createAssignment,
    gradeAssignment,
    createQuiz,
    createCodingTest,
    recordClassParticipation,
    approveParticipationScore,
    toggleActivityNa,
    createIntervention,
    updateIntervention,
    createNotice,
    reviewCorrectionRequest,
  } = useApp();

  const [activeTab, setActiveTab] = useState<
    | 'dashboard'
    | 'timetable'
    | 'classes'
    | 'attendance'
    | 'assignments'
    | 'quizzes'
    | 'coding_tests'
    | 'participation'
    | 'engagement'
    | 'alerts'
    | 'interventions'
    | 'notices'
    | 'reports'
  >('dashboard');

  // Filter ONLY subjects & sections assigned to this faculty member!
  const myAssignments = useMemo(() => {
    return facultyAssignments.filter(fa => fa.facultyId === currentUser.id);
  }, [facultyAssignments, currentUser.id]);

  const myAssignedSubjectIds = useMemo(() => {
    return Array.from(new Set(myAssignments.map(fa => fa.subjectId)));
  }, [myAssignments]);

  const myAssignedSectionIds = useMemo(() => {
    return Array.from(new Set(myAssignments.map(fa => fa.sectionId)));
  }, [myAssignments]);

  const mySubjects = useMemo(() => {
    return subjects.filter(s => myAssignedSubjectIds.includes(s.id));
  }, [subjects, myAssignedSubjectIds]);

  const mySections = useMemo(() => {
    return sections.filter(s => myAssignedSectionIds.includes(s.id));
  }, [sections, myAssignedSectionIds]);

  const myTimetable = useMemo(() => {
    return timetableSlots.filter(t => t.facultyId === currentUser.id);
  }, [timetableSlots, currentUser.id]);

  // Enrolled students in this faculty's assigned sections
  const myStudents = useMemo(() => {
    return users.filter(u => u.role === 'student' && u.sectionId && myAssignedSectionIds.includes(u.sectionId));
  }, [users, myAssignedSectionIds]);

  // Group classes handled by course (e.g. VII Btech 2023 CSE - DA -> Generative Artificial Intelligence (7CS 1235))
  const classesHandledByCourse = useMemo(() => {
    const map = new Map<string, {
      subject: (typeof subjects)[0];
      sectionNames: string[];
      sectionIds: string[];
      totalEnrolled: number;
    }>();

    myAssignments.forEach(asg => {
      const subj = subjects.find(s => s.id === asg.subjectId);
      const sec = sections.find(s => s.id === asg.sectionId);
      if (!subj) return;
      const enrolled = users.filter(u => u.sectionId === asg.sectionId).length;

      if (!map.has(subj.id)) {
        map.set(subj.id, {
          subject: subj,
          sectionNames: sec ? [sec.name] : [],
          sectionIds: sec ? [sec.id] : [],
          totalEnrolled: enrolled,
        });
      } else {
        const item = map.get(subj.id)!;
        if (sec && !item.sectionNames.includes(sec.name)) {
          item.sectionNames.push(sec.name);
          item.sectionIds.push(sec.id);
          item.totalEnrolled += enrolled;
        }
      }
    });

    return Array.from(map.values());
  }, [myAssignments, subjects, sections, users]);

  // Attendance sessions launched by this faculty
  const mySessions = useMemo(() => {
    return attendanceSessions.filter(s => s.facultyId === currentUser.id);
  }, [attendanceSessions, currentUser.id]);

  const activeSession = mySessions.find(s => s.active);

  // Correction Modal State
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState('');
  const [newAttendanceStatus, setNewAttendanceStatus] = useState<AttendanceStatus>('Present');
  const [correctionReason, setCorrectionReason] = useState('');

  // New Session State
  const [newSessSubjectId, setNewSessSubjectId] = useState(mySubjects[0]?.id || '');
  const [newSessSectionId, setNewSessSectionId] = useState(mySections[0]?.id || '');
  const [newSessRoom, setNewSessRoom] = useState('Lab 402');
  const [newSessPeriod, setNewSessPeriod] = useState(1);

  // New Assignment Modal
  const [showNewAsgModal, setShowNewAsgModal] = useState(false);
  const [newAsgTitle, setNewAsgTitle] = useState('');
  const [newAsgDesc, setNewAsgDesc] = useState('');
  const [newAsgSubj, setNewAsgSubj] = useState(mySubjects[0]?.id || '');
  const [newAsgSec, setNewAsgSec] = useState(mySections[0]?.id || '');
  const [newAsgDue, setNewAsgDue] = useState('2026-11-10');
  const [newAsgMarks, setNewAsgMarks] = useState(20);

  // Grading Modal
  const [gradingSubmId, setGradingSubmId] = useState<string | null>(null);
  const [gradeScore, setGradeScore] = useState(18);
  const [gradeFeedback, setGradeFeedback] = useState('Well executed implementation.');
  const [gradeQuality, setGradeQuality] = useState<'High' | 'Good' | 'Needs Improvement'>('High');

  // Participation Entry Form
  const [partStudentId, setPartStudentId] = useState('');
  const [partSubjId, setPartSubjId] = useState(mySubjects[0]?.id || '');
  const [partCategory, setPartCategory] = useState<'Question' | 'Answer' | 'Discussion' | 'Activity' | 'Poll'>('Question');
  const [partPoints, setPartPoints] = useState(4);
  const [partNotes, setPartNotes] = useState('');

  // New Notice Form
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');
  const [noticeSubj, setNoticeSubj] = useState(mySubjects[0]?.id || '');
  const [noticeSec, setNoticeSec] = useState(mySections[0]?.id || '');

  // New Intervention Form
  const [intvStudentId, setIntvStudentId] = useState('');
  const [intvType, setIntvType] = useState<'Mentoring' | 'Remedial Resource' | 'Recovery Plan' | 'Parent Notification'>('Recovery Plan');
  const [intvNotes, setIntvNotes] = useState('');
  const [intvAction, setIntvAction] = useState('');

  // Reasoned score adjustment modal
  const [adjustScoreModal, setAdjustScoreModal] = useState<string | null>(null);
  const [adjustedScoreValue, setAdjustedScoreValue] = useState(4.5);
  const [adjustScoreReason, setAdjustScoreReason] = useState('');
  // Selected class for detailed workspace view
  const [selectedClassCourseId, setSelectedClassCourseId] = useState<string | null>(null);
  const [classWorkspaceTab, setClassWorkspaceTab] = useState<
    'roster' | 'messages' | 'assignments' | 'coding' | 'uploads' | 'projects' | 'participation'
  >('roster');
  const [selectedClassSectionFilter, setSelectedClassSectionFilter] = useState<string>('all');

  // Teacher message posting state
  const [classNoticeTitle, setClassNoticeTitle] = useState('');
  const [classNoticeContent, setClassNoticeContent] = useState('');
  const [classNoticeType, setClassNoticeType] = useState<'announcement' | 'deadline' | 'notice'>('announcement');
  const [classNoticeSuccessMsg, setClassNoticeSuccessMsg] = useState(false);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState<'Lecture Notes' | 'Slides' | 'Lab Manual' | 'Dataset' | 'Reference Paper'>('Lecture Notes');
  const [uploadFileUrl, setUploadFileUrl] = useState('');
  const [uploadFileSize, setUploadFileSize] = useState('3.5 MB');

  // Group Project modal state
  const [showGroupProjModal, setShowGroupProjModal] = useState(false);
  const [projTeamName, setProjTeamName] = useState('');
  const [projTitle, setProjTitle] = useState('');
  const [projMembers, setProjMembers] = useState<string[]>([]);
  const [projGithubUrl, setProjGithubUrl] = useState('');
  const [projMaxScore, setProjMaxScore] = useState(30);

  // Coding test creation modal state
  const [showNewCodingModal, setShowNewCodingModal] = useState(false);
  const [newCodeTitle, setNewCodeTitle] = useState('');
  const [newCodeProblem, setNewCodeProblem] = useState('');
  const [newCodeStarter, setNewCodeStarter] = useState('def solution():\n    pass');
  const [newCodeDeadline, setNewCodeDeadline] = useState('2026-11-15 23:59:00');
  const [newCodeMarks, setNewCodeMarks] = useState(25);

  // Alerts for this faculty's classes only!
  const myAlerts = useMemo(() => {
    const list: Array<{ id: string; student: any; subjectName: string; type: string; message: string; severity: 'high' | 'medium' }> = [];
    myStudents.forEach(st => {
      mySubjects.forEach(sb => {
        const recs = attendanceRecords.filter(r => r.studentId === st.id && r.subjectId === sb.id);
        const stats = calculateAttendanceStats(recs);
        if (stats.conducted >= 4 && stats.percentage < systemSettings.attendanceThresholdPercent) {
          list.push({
            id: `alt-att-${st.id}-${sb.id}`,
            student: st,
            subjectName: sb.name,
            type: 'Low Attendance',
            message: `${st.name} attendance is ${stats.percentage}% (${stats.present}/${stats.conducted} classes). Below ${systemSettings.attendanceThresholdPercent}%.`,
            severity: 'high',
          });
        }
      });
    });
    return list;
  }, [myStudents, mySubjects, attendanceRecords, systemSettings.attendanceThresholdPercent]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Vertical Side Panel */}
        <aside className="w-full lg:w-64 shrink-0 bg-white border border-slate-200 rounded-xl p-3 shadow-xs lg:sticky lg:top-20">
          <div className="px-3 py-2 border-b border-slate-100 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Faculty Navigation</span>
            <div className="text-xs font-bold text-slate-900 mt-0.5 truncate">{currentUser.name}</div>
            <div className="text-[11px] text-slate-500 truncate">{currentUser.designation}</div>
          </div>

          <nav className="flex flex-col gap-1 w-full text-xs">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: ArrowRight },
              { id: 'timetable', label: 'My Timetable', icon: Calendar },
              { id: 'classes', label: 'My Classes', icon: Users, count: classesHandledByCourse.length },
              { id: 'attendance', label: 'Attendance & QR', icon: QrCode, badge: activeSession ? 'ACTIVE' : undefined },
              { id: 'engagement', label: 'Engagement Analytics', icon: Sliders },
              { id: 'alerts', label: `Alerts (${myAlerts.length})`, icon: AlertTriangle, alert: myAlerts.length > 0 },
              { id: 'interventions', label: 'Interventions', icon: HeartHandshake },
              { id: 'reports', label: 'Reports & Export', icon: Download },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-left w-full cursor-pointer ${
                    isActive
                      ? 'bg-blue-50 text-blue-900 font-semibold border-l-4 border-blue-600'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-700' : 'text-slate-400'}`} />
                    <span className="truncate">{tab.label}</span>
                  </div>
                  {tab.count !== undefined && !tab.badge && (
                    <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded-full text-[10px] font-bold shrink-0">
                      {tab.count}
                    </span>
                  )}
                  {tab.badge && (
                    <span className="px-1.5 py-0.2 bg-emerald-600 text-white rounded text-[9px] font-bold shrink-0">
                      {tab.badge}
                    </span>
                  )}
                  {tab.alert && !tab.badge && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Quick Active Session Indicator */}
          {activeSession && (
            <div className="mt-4 pt-3 border-t border-slate-100 p-2 text-xs bg-indigo-50/50 rounded-lg border border-indigo-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">Live Session</span>
              <div className="text-xs font-semibold text-slate-900 mt-0.5 truncate">
                {subjects.find(s => s.id === activeSession.subjectId)?.name}
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('attendance')}
                className="mt-2 text-[11px] font-semibold text-indigo-700 hover:underline flex items-center gap-1"
              >
                <span>View rotating QR &rarr;</span>
              </button>
            </div>
          )}
        </aside>

        {/* Right Main Content */}
        <div className="flex-1 min-w-0 w-full space-y-6">
          {/* Faculty Profile Banner */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-14 h-14 rounded-full object-cover ring-2 ring-blue-500/30"
              />
              <div>
                <h1 className="text-xl font-bold text-slate-900">{currentUser.name}</h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {activeSession ? (
                <button
                  type="button"
                  onClick={() => setActiveTab('attendance')}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs animate-pulse cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Active Attendance Session &rarr;</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('attendance');
                    if (mySubjects.length > 0) setNewSessSubjectId(mySubjects[0].id);
                    if (mySections.length > 0) setNewSessSectionId(mySections[0].id);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Start Attendance Session</span>
                </button>
              )}
            </div>
          </div>

      {/* TAB 1: FACULTY DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <span className="text-xs text-slate-500 font-medium">Assigned Classes</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono text-slate-900">{myAssignments.length}</span>
                <span className="text-xs text-slate-500">{mySubjects.length} Subjects</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <span className="text-xs text-slate-500 font-medium">Enrolled Students</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono text-slate-900">{myStudents.length}</span>
                <span className="text-xs text-slate-500">Across assigned sections</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <span className="text-xs text-slate-500 font-medium">Pending Submissions</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono text-slate-900">
                  {assignmentSubmissions.filter(s => s.score === undefined).length}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('assignments')}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Grade now &rarr;
                </button>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <span className="text-xs text-slate-500 font-medium">Low Attendance Alerts</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className={`text-2xl font-bold font-mono ${myAlerts.length > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                  {myAlerts.length}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('alerts')}
                  className="text-xs text-rose-600 hover:underline"
                >
                  View alerts &rarr;
                </button>
              </div>
            </div>
          </div>

          {/* Today's Schedule & Quick Action */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <h3 className="font-semibold text-slate-900 text-sm mb-3">Today's Class Schedule</h3>
            <div className="space-y-2.5">
              {myTimetable.map(slot => {
                const subj = subjects.find(s => s.id === slot.subjectId);
                const sec = sections.find(s => s.id === slot.sectionId);
                return (
                  <div
                    key={slot.id}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-semibold text-xs text-slate-900 flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900">Class: {sec?.name}</span>
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded text-[10px] font-medium">
                          Course: {subj?.name} ({subj?.code})
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                        <span>Time: {slot.startTime} – {slot.endTime}</span>
                        <span>Room: {slot.room}</span>
                        <span>Period {slot.periodNumber}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('attendance');
                        setNewSessSubjectId(slot.subjectId);
                        setNewSessSectionId(slot.sectionId);
                        setNewSessRoom(slot.room);
                        setNewSessPeriod(slot.periodNumber);
                      }}
                      className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Start Dynamic Attendance</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MY TIMETABLE */}
      {activeTab === 'timetable' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <h3 className="font-semibold text-slate-900 text-sm mb-4">Faculty Weekly Schedule Grid</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-2.5 px-3">Day</th>
                    <th className="py-2.5 px-3">Period</th>
                    <th className="py-2.5 px-3">Time</th>
                    <th className="py-2.5 px-3">Subject</th>
                    <th className="py-2.5 px-3">Class / Section</th>
                    <th className="py-2.5 px-3">Room</th>
                    <th className="py-2.5 px-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {myTimetable.map(slot => {
                    const subj = subjects.find(s => s.id === slot.subjectId);
                    const sec = sections.find(s => s.id === slot.sectionId);
                    return (
                      <tr key={slot.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-semibold text-slate-900">{slot.dayOfWeek}</td>
                        <td className="py-3 px-3 font-mono">Period {slot.periodNumber}</td>
                        <td className="py-3 px-3 text-slate-600">{slot.startTime} – {slot.endTime}</td>
                        <td className="py-3 px-3 font-medium text-slate-900">{subj?.name}</td>
                        <td className="py-3 px-3 font-mono text-slate-600">{sec?.name}</td>
                        <td className="py-3 px-3 font-mono text-slate-700">{slot.room}</td>
                        <td className="py-3 px-3">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('attendance');
                              setNewSessSubjectId(slot.subjectId);
                              setNewSessSectionId(slot.sectionId);
                              setNewSessRoom(slot.room);
                              setNewSessPeriod(slot.periodNumber);
                            }}
                            className="text-xs text-blue-700 hover:text-blue-900 font-semibold"
                          >
                            Launch Session &rarr;
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MY CLASSES & CLASS WORKSPACE */}
      {activeTab === 'classes' && (
        <div className="space-y-6">
          {/* VIEW A: LIST OF HANDLED CLASSES (When no specific class is opened) */}
          {!selectedClassCourseId ? (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">Classes Handled by Faculty</h3>
                </div>
                <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md shrink-0 font-medium">
                  {classesHandledByCourse.length} Courses · {myAssignments.length} Section Assignments
                </span>
              </div>

              <div className="space-y-3.5">
                {classesHandledByCourse.map((item, idx) => (
                  <div
                    key={item.subject.id}
                    onClick={() => {
                      setSelectedClassCourseId(item.subject.id);
                      setClassWorkspaceTab('roster');
                      setSelectedClassSectionFilter('all');
                    }}
                    className="p-4 bg-slate-50 hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 rounded-xl transition-all cursor-pointer group shadow-2xs"
                  >
                    <div className="space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                              Class Name
                            </span>
                            <span className="text-xs text-slate-400">#{idx + 1}</span>
                          </div>
                          <div className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-blue-700 transition-colors flex items-center gap-2">
                            <span>{item.sectionNames.join(', ')}</span>
                            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2 py-0.5 bg-slate-200/80 text-slate-700 text-[11px] font-semibold rounded">
                            {item.sectionNames.length} {item.sectionNames.length > 1 ? 'Sections' : 'Section'}
                          </span>
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-semibold rounded">
                            {item.totalEnrolled} Students Enrolled
                          </span>
                        </div>
                      </div>

                      <div className="pt-2.5 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-slate-700">Course Name:</span>
                          <span className="font-medium text-slate-900">{item.subject.name}</span>
                          <span className="font-mono text-slate-500 font-semibold">({item.subject.code})</span>
                          <span className="text-slate-400">·</span>
                          <span className="text-slate-500">{item.subject.type} · {item.subject.credits} Credits</span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0" onClick={e => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedClassCourseId(item.subject.id);
                              setClassWorkspaceTab('roster');
                              setSelectedClassSectionFilter('all');
                            }}
                            className="px-3 py-1 bg-white border border-blue-600 text-blue-700 hover:bg-blue-50 font-semibold rounded text-xs transition-colors cursor-pointer"
                          >
                            Open Class Workspace &rarr;
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('attendance');
                              setNewSessSubjectId(item.subject.id);
                              if (item.sectionIds.length > 0) setNewSessSectionId(item.sectionIds[0]);
                            }}
                            className="px-3 py-1 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded text-xs transition-colors cursor-pointer"
                          >
                            Start Session &rarr;
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* VIEW B: CLASS WORKSPACE (When a teacher clicked into a class) */
            (() => {
              const selectedClass = classesHandledByCourse.find(c => c.subject.id === selectedClassCourseId);
              if (!selectedClass) return null;

              // Filter enrolled students for this class based on section pill
              const filteredStudents = users.filter(u => {
                if (u.role !== 'student' || !u.sectionId) return false;
                if (selectedClassSectionFilter === 'all') {
                  return selectedClass.sectionIds.includes(u.sectionId);
                }
                return u.sectionId === selectedClassSectionFilter;
              });

              // Class-specific items
              const classNotices = notices.filter(
                n => n.targetSubjectId === selectedClass.subject.id ||
                  (n.targetSectionId && selectedClass.sectionIds.includes(n.targetSectionId))
              );
              const classAssignments = assignments.filter(a => a.subjectId === selectedClass.subject.id);
              const classCodingTests = codingTests.filter(c => c.subjectId === selectedClass.subject.id);
              const classMaterials = courseMaterials.filter(m => m.subjectId === selectedClass.subject.id);
              const classProjects = groupProjects.filter(p => p.subjectId === selectedClass.subject.id);

              return (
                <div className="space-y-6">
                  {/* Top Class Workspace Header & Breadcrumbs */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedClassCourseId(null)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 mt-0.5"
                          title="Back to All Handled Classes"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>All Classes</span>
                        </button>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                              Class Workspace
                            </span>
                            <span className="text-xs text-slate-400 font-mono">
                              {selectedClass.subject.code}
                            </span>
                          </div>
                          <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                            {selectedClass.sectionNames.join(', ')}
                          </h2>
                          <div className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-3">
                            <span>Course: <strong className="text-slate-900">{selectedClass.subject.name}</strong></span>
                            <span>·</span>
                            <span>{selectedClass.subject.type} ({selectedClass.subject.credits} Credits)</span>
                            <span>·</span>
                            <span>Enrolled: <strong className="text-blue-700">{selectedClass.totalEnrolled} Students</strong></span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('attendance');
                            setNewSessSubjectId(selectedClass.subject.id);
                            if (selectedClass.sectionIds.length > 0) setNewSessSectionId(selectedClass.sectionIds[0]);
                          }}
                          className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer transition-colors"
                        >
                          <QrCode className="w-4 h-4" />
                          <span>Start Dynamic Attendance</span>
                        </button>
                      </div>
                    </div>

                    {/* Class Workspace Navigation Tabs */}
                    <div className="flex items-center gap-1 pt-3 overflow-x-auto text-xs">
                      {[
                        { id: 'roster', label: `Students Roster (${selectedClass.totalEnrolled})`, icon: Users },
                        { id: 'messages', label: `Class Announcements (${classNotices.length})`, icon: MessageSquare },
                        { id: 'assignments', label: `Assignments (${classAssignments.length})`, icon: FileText },
                        { id: 'coding', label: `Coding Tests (${classCodingTests.length})`, icon: Code2 },
                        { id: 'uploads', label: `Uploads & Materials (${classMaterials.length})`, icon: Upload },
                        { id: 'projects', label: `Group Projects (${classProjects.length})`, icon: FolderGit2 },
                        { id: 'participation', label: 'Participation (/5)', icon: Award },
                      ].map(tab => {
                        const Icon = tab.icon;
                        const isCurrent = classWorkspaceTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setClassWorkspaceTab(tab.id as any)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                              isCurrent
                                ? 'bg-blue-600 text-white shadow-xs font-semibold'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            <span>{tab.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* SUB-TAB 1: STUDENTS & ATTENDANCE ROSTER (TABULAR FORM) */}
                  {classWorkspaceTab === 'roster' && (
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-slate-900 text-sm">
                            Class Students Attendance & Biometric Data
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Individual attendance records, conducted classes, attended count, percentage, and 1:1 face match consent.
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {/* Section filter pill for multi-section courses */}
                          {selectedClass.sectionIds.length > 1 && (
                            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1.5">Section:</span>
                              <button
                                type="button"
                                onClick={() => setSelectedClassSectionFilter('all')}
                                className={`px-2 py-0.5 rounded font-medium cursor-pointer ${
                                  selectedClassSectionFilter === 'all'
                                    ? 'bg-white text-blue-700 shadow-2xs font-semibold'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                All ({selectedClass.totalEnrolled})
                              </button>
                              {selectedClass.sectionIds.map(secId => {
                                const sec = sections.find(s => s.id === secId);
                                const count = users.filter(u => u.sectionId === secId).length;
                                return (
                                  <button
                                    key={secId}
                                    type="button"
                                    onClick={() => setSelectedClassSectionFilter(secId)}
                                    className={`px-2 py-0.5 rounded font-medium cursor-pointer ${
                                      selectedClassSectionFilter === secId
                                        ? 'bg-white text-blue-700 shadow-2xs font-semibold'
                                        : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                  >
                                    {sec?.name} ({count})
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {/* Save Class Students CSV Button */}
                          <button
                            type="button"
                            onClick={() => {
                              const csv = generateClassRosterCsv(
                                selectedClass.subject.name,
                                selectedClass.subject.code,
                                selectedClass.sectionNames,
                                filteredStudents,
                                sections,
                                attendanceRecords,
                                systemSettings.attendanceThresholdPercent
                              );
                              const safeName = selectedClass.subject.code.replace(/[^a-zA-Z0-9]/g, '_');
                              const dateStr = new Date().toISOString().split('T')[0];
                              triggerCsvDownload(csv, `class_${safeName}_enrolled_students_${dateStr}.csv`);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer transition-colors"
                            title="Download CSV of this class's enrolled students, roll numbers, and attendance stats"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Save Class Students CSV ({filteredStudents.length})</span>
                          </button>
                        </div>
                      </div>

                      {/* Tabular Form for Student Attendance Data */}
                      <div className="overflow-x-auto border border-slate-200 rounded-lg">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                            <tr>
                              <th className="py-2.5 px-3">Student Name</th>
                              <th className="py-2.5 px-3">Reg No / Roll No</th>
                              <th className="py-2.5 px-3">Class / Section</th>
                              <th className="py-2.5 px-3 text-center">Conducted</th>
                              <th className="py-2.5 px-3 text-center">Attended</th>
                              <th className="py-2.5 px-3">Attendance %</th>
                              <th className="py-2.5 px-3">Standing</th>
                              <th className="py-2.5 px-3">Face Consent</th>
                              <th className="py-2.5 px-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredStudents.length > 0 ? (
                              filteredStudents.map(st => {
                                const sec = sections.find(s => s.id === st.sectionId);
                                const recs = attendanceRecords.filter(
                                  r => r.studentId === st.id && r.subjectId === selectedClass.subject.id
                                );
                                const stats = calculateAttendanceStats(recs);
                                const isUnder = stats.percentage < systemSettings.attendanceThresholdPercent;

                                return (
                                  <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="py-2.5 px-3">
                                      <div className="flex items-center gap-2.5">
                                        <img
                                          src={st.avatarUrl || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80'}
                                          alt={st.name}
                                          className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200"
                                        />
                                        <div>
                                          <div className="font-semibold text-slate-900">{st.name}</div>
                                          <div className="text-[10px] text-slate-400 font-mono">{st.email}</div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-3 font-mono font-medium text-slate-700">{st.rollNumber}</td>
                                    <td className="py-2.5 px-3">
                                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-medium">
                                        {sec?.name}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3 text-center font-mono text-slate-600 font-medium">
                                      {stats.conducted}
                                    </td>
                                    <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-700">
                                      {stats.present}
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <div className="flex items-center gap-2">
                                        <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                          <div
                                            className={`h-full rounded-full ${isUnder ? 'bg-rose-500' : 'bg-emerald-600'}`}
                                            style={{ width: `${Math.min(100, stats.percentage)}%` }}
                                          />
                                        </div>
                                        <span className={`font-mono font-bold ${isUnder ? 'text-rose-600' : 'text-slate-900'}`}>
                                          {stats.percentage}%
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <span
                                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                          isUnder
                                            ? 'bg-rose-100 text-rose-800'
                                            : 'bg-emerald-100 text-emerald-800'
                                        }`}
                                      >
                                        {isUnder ? 'Below 75% At-Risk' : 'Good Standing'}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3">
                                      {st.faceConsentGiven ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium border border-emerald-200">
                                          <ShieldCheck className="w-3 h-3" /> Consented
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-medium border border-amber-200">
                                          Pending Consent
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-3 text-right">
                                      <div className="flex items-center justify-end gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setClassWorkspaceTab('participation');
                                            setPartStudentId(st.id);
                                          }}
                                          className="text-xs text-blue-700 hover:text-blue-900 font-medium px-2 py-1 rounded hover:bg-blue-50 cursor-pointer"
                                        >
                                          +Points
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveTab('attendance');
                                          }}
                                          className="text-xs text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-100 cursor-pointer"
                                        >
                                          Logs
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan={9} className="py-6 text-center text-slate-400 italic">
                                  No students enrolled in this section selection.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* SUB-TAB 2: CLASS ANNOUNCEMENTS & TEACHER MESSAGE POSTING */}
                  {classWorkspaceTab === 'messages' && (
                    <div className="space-y-6">
                      {/* Teacher Post Message Card */}
                      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                          <div>
                            <h3 className="font-semibold text-slate-900 text-sm">Post a Message / Announcement to Class</h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Messages posted here appear immediately for all enrolled students in their Student Portal notifications.
                            </p>
                          </div>
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-semibold rounded">
                            Direct Student Visibility
                          </span>
                        </div>

                        {classNoticeSuccessMsg && (
                          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-900">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Message successfully broadcasted! It is now visible to enrolled students in this class.</span>
                          </div>
                        )}

                        <form
                          onSubmit={e => {
                            e.preventDefault();
                            if (!classNoticeTitle.trim() || !classNoticeContent.trim()) return;

                            createNotice({
                              title: classNoticeTitle.trim(),
                              content: classNoticeContent.trim(),
                              type: classNoticeType,
                              authorId: currentUser.id,
                              authorName: currentUser.name,
                              authorRole: 'faculty',
                              targetSubjectId: selectedClass.subject.id,
                              targetSectionId: selectedClassSectionFilter === 'all'
                                ? selectedClass.sectionIds[0]
                                : selectedClassSectionFilter,
                            });

                            setClassNoticeTitle('');
                            setClassNoticeContent('');
                            setClassNoticeSuccessMsg(true);
                            setTimeout(() => setClassNoticeSuccessMsg(false), 4000);
                          }}
                          className="space-y-3.5"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="md:col-span-2">
                              <label className="text-xs font-medium text-slate-700 block mb-1">
                                Announcement Title *
                              </label>
                              <input
                                type="text"
                                required
                                value={classNoticeTitle}
                                onChange={e => setClassNoticeTitle(e.target.value)}
                                placeholder="e.g. Lab 4 Assignment Guidelines & Evaluation Rubric"
                                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                              />
                            </div>

                            <div>
                              <label className="text-xs font-medium text-slate-700 block mb-1">
                                Message Category
                              </label>
                              <select
                                value={classNoticeType}
                                onChange={e => setClassNoticeType(e.target.value as any)}
                                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                              >
                                <option value="announcement">Announcement</option>
                                <option value="deadline">Deadline Reminder</option>
                                <option value="notice">Important Notice</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-medium text-slate-700 block mb-1">
                              Message Content *
                            </label>
                            <textarea
                              required
                              rows={3}
                              value={classNoticeContent}
                              onChange={e => setClassNoticeContent(e.target.value)}
                              placeholder="Type details, reading materials, submission instructions, or reminders for the class..."
                              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                            />
                          </div>

                          <div className="flex items-center justify-between pt-2">
                            <span className="text-[11px] text-slate-500">
                              Target: <strong>{selectedClass.sectionNames.join(', ')}</strong> ({selectedClass.subject.name})
                            </span>
                            <button
                              type="submit"
                              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Post Message to Class</span>
                            </button>
                          </div>
                        </form>
                      </div>

                      {/* Active Notices Feed for this Class */}
                      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                        <h4 className="font-semibold text-slate-900 text-sm">Active Class Notices & Updates</h4>
                        {classNotices.length > 0 ? (
                          <div className="divide-y divide-slate-100">
                            {classNotices.map(notice => (
                              <div key={notice.id} className="py-3.5 first:pt-0 last:pb-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h5 className="font-semibold text-xs text-slate-900">{notice.title}</h5>
                                      <span className="px-1.5 py-0.2 bg-blue-50 text-blue-800 rounded text-[9px] font-bold uppercase tracking-wider">
                                        {notice.type}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{notice.content}</p>
                                    <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-2">
                                      <span>Posted by {notice.authorName}</span>
                                      <span>·</span>
                                      <span>{notice.createdAt}</span>
                                      <span>·</span>
                                      <span className="text-emerald-700 font-medium flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" /> Live for enrolled students
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6 text-xs text-slate-400">
                            No announcements posted for this class yet. Post one above to notify students.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* SUB-TAB 3: ASSIGNMENTS INSIDE THIS CLASS */}
                  {classWorkspaceTab === 'assignments' && (
                    <div className="space-y-6">
                      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
                          <div>
                            <h3 className="font-semibold text-slate-900 text-sm">Course Assignments & Submissions</h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Created specifically for {selectedClass.subject.name} ({selectedClass.sectionNames.join(', ')})
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setNewAsgSubj(selectedClass.subject.id);
                              setNewAsgSec(selectedClass.sectionIds[0] || '');
                              setShowNewAsgModal(true);
                            }}
                            className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Create Assignment</span>
                          </button>
                        </div>

                        {classAssignments.length > 0 ? (
                          <div className="space-y-4">
                            {classAssignments.map(asg => {
                              const submissions = assignmentSubmissions.filter(s => s.assignmentId === asg.id);
                              return (
                                <div key={asg.id} className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                                    <div>
                                      <h4 className="font-bold text-sm text-slate-900">{asg.title}</h4>
                                      <p className="text-xs text-slate-600 mt-1">{asg.description}</p>
                                      <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-3">
                                        <span>Due: <strong className="text-slate-800">{asg.dueDate}</strong></span>
                                        <span>·</span>
                                        <span>Max Marks: <strong className="text-slate-800">{asg.totalMarks}</strong></span>
                                        <span>·</span>
                                        <span>Submissions: <strong className="text-blue-700">{submissions.length} / {selectedClass.totalEnrolled}</strong></span>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (submissions.length > 0) setGradingSubmId(submissions[0].id);
                                      }}
                                      className="px-3 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded text-xs shrink-0 cursor-pointer"
                                    >
                                      Review Submissions ({submissions.length})
                                    </button>
                                  </div>

                                  {submissions.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-slate-200">
                                      <span className="text-[11px] font-semibold text-slate-700 block mb-2">
                                        Student Submissions:
                                      </span>
                                      <div className="space-y-2">
                                        {submissions.map(subm => {
                                          const student = users.find(u => u.id === subm.studentId);
                                          return (
                                            <div
                                              key={subm.id}
                                              className="p-2.5 bg-white border border-slate-200 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                                            >
                                              <div>
                                                <div className="font-medium text-slate-900">
                                                  {student?.name || 'Student'} ({student?.rollNumber})
                                                </div>
                                                <div className="text-[10px] text-slate-500 font-mono">
                                                  File: {subm.fileName || 'Online text solution'} · Submitted: {subm.submittedAt}
                                                </div>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                {subm.score !== undefined ? (
                                                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded font-mono text-[10px]">
                                                    Graded: {subm.score}/{asg.totalMarks} ({subm.qualityRating})
                                                  </span>
                                                ) : (
                                                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded text-[10px]">
                                                    Pending Evaluation
                                                  </span>
                                                )}
                                                <button
                                                  type="button"
                                                  onClick={() => setGradingSubmId(subm.id)}
                                                  className="px-2.5 py-1 bg-blue-700 hover:bg-blue-800 text-white font-medium rounded text-[11px] cursor-pointer"
                                                >
                                                  {subm.score !== undefined ? 'Edit Grade' : 'Grade Submission'}
                                                </button>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-slate-400 text-xs">
                            No assignments created for this class yet. Click "+ Create Assignment" to start.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* SUB-TAB 4: CODING TESTS INSIDE THIS CLASS */}
                  {classWorkspaceTab === 'coding' && (
                    <div className="space-y-6">
                      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
                          <div>
                            <h3 className="font-semibold text-slate-900 text-sm">Automated Coding Tests & Lab Challenges</h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Hands-on programming tests with automated unit test runner and test case scoring.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowNewCodingModal(true)}
                            className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Create Coding Test</span>
                          </button>
                        </div>

                        {classCodingTests.length > 0 ? (
                          <div className="space-y-4">
                            {classCodingTests.map(test => {
                              const submissions = codingSubmissions.filter(s => s.testId === test.id);
                              return (
                                <div key={test.id} className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                                    <div>
                                      <h4 className="font-bold text-sm text-slate-900">{test.title}</h4>
                                      <p className="text-xs text-slate-600 mt-1">{test.problemStatement}</p>
                                      <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-3">
                                        <span>Deadline: <strong className="text-slate-800">{test.deadline}</strong></span>
                                        <span>·</span>
                                        <span>Test Cases: <strong className="text-slate-800">{test.testCases.length} cases</strong></span>
                                        <span>·</span>
                                        <span>Total Marks: <strong className="text-slate-800">{test.totalMarks}</strong></span>
                                      </div>
                                    </div>
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-semibold text-[10px] shrink-0">
                                      {submissions.length} Submissions
                                    </span>
                                  </div>

                                  {submissions.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-slate-200">
                                      <span className="text-[11px] font-semibold text-slate-700 block mb-2">
                                        Automated Evaluation Results:
                                      </span>
                                      <div className="space-y-2">
                                        {submissions.map(subm => {
                                          const student = users.find(u => u.id === subm.studentId);
                                          return (
                                            <div
                                              key={subm.id}
                                              className="p-2.5 bg-white border border-slate-200 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                                            >
                                              <div>
                                                <span className="font-medium text-slate-900">{student?.name}</span>
                                                <span className="font-mono text-slate-500 ml-2">({student?.rollNumber})</span>
                                                <div className="text-[10px] text-slate-500 mt-0.5">
                                                  Feedback: {subm.feedback || 'Passed all automated test assertions'}
                                                </div>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-mono font-bold rounded text-[10px]">
                                                  Pass Rate: {subm.passedTests}/{subm.totalTests} ({subm.score} pts)
                                                </span>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-slate-400 text-xs">
                            No coding tests scheduled for this class yet.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* SUB-TAB 5: UPLOADS & COURSE MATERIALS INSIDE THIS CLASS */}
                  {classWorkspaceTab === 'uploads' && (
                    <div className="space-y-6">
                      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
                          <div>
                            <h3 className="font-semibold text-slate-900 text-sm">Course Materials, Slides & Datasets</h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Uploaded lecture notes, datasets, lab manuals, and syllabus files for enrolled students.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowUploadModal(true)}
                            className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload Material</span>
                          </button>
                        </div>

                        {classMaterials.length > 0 ? (
                          <div className="divide-y divide-slate-100">
                            {classMaterials.map(mat => (
                              <div key={mat.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-start gap-3">
                                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                                    <BookOpen className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-xs text-slate-900">{mat.title}</h4>
                                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                                      <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded text-[10px] font-medium">
                                        {mat.type}
                                      </span>
                                      <span>·</span>
                                      <span>Size: {mat.fileSize}</span>
                                      <span>·</span>
                                      <span>Uploaded: {mat.uploadedAt}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <a
                                    href={mat.fileUrl}
                                    download
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium flex items-center gap-1 transition-colors"
                                  >
                                    <Download className="w-3 h-3" />
                                    <span>Download</span>
                                  </a>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-slate-400 text-xs">
                            No materials uploaded for this class yet. Click "+ Upload Material" to upload slides or lab sheets.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* SUB-TAB 6: GROUP PROJECTS INSIDE THIS CLASS */}
                  {classWorkspaceTab === 'projects' && (
                    <div className="space-y-6">
                      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
                          <div>
                            <h3 className="font-semibold text-slate-900 text-sm">Collaborative Group Projects & Teams</h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Student project teams, GitHub code repositories, milestone evaluations, and scores.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowGroupProjModal(true)}
                            className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Project Team</span>
                          </button>
                        </div>

                        {classProjects.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {classProjects.map(proj => (
                              <div key={proj.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
                                      {proj.teamName}
                                    </span>
                                    <h4 className="font-bold text-sm text-slate-900 mt-0.5">{proj.projectTitle}</h4>
                                  </div>
                                  <span
                                    className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                                      proj.status === 'Evaluated'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : proj.status === 'Review Ready'
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-blue-100 text-blue-800'
                                    }`}
                                  >
                                    {proj.status}
                                  </span>
                                </div>

                                <div className="text-xs text-slate-600">
                                  <span className="font-semibold text-slate-700">Team Members:</span> {proj.members.join(', ')}
                                </div>

                                {proj.githubUrl && (
                                  <div className="flex items-center gap-1 text-xs text-blue-700">
                                    <FolderGit2 className="w-3.5 h-3.5" />
                                    <a href={proj.githubUrl} target="_blank" rel="noreferrer" className="truncate hover:underline">
                                      {proj.githubUrl}
                                    </a>
                                  </div>
                                )}

                                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                                  <div>
                                    <span className="text-slate-500 font-medium">Evaluation Score: </span>
                                    <strong className="text-slate-900 font-mono">
                                      {proj.score !== undefined ? `${proj.score} / ${proj.maxScore}` : 'Pending review'}
                                    </strong>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newScoreStr = window.prompt(`Enter evaluation score out of ${proj.maxScore}:`, String(proj.score || 25));
                                      if (newScoreStr !== null) {
                                        const scoreNum = parseFloat(newScoreStr);
                                        if (!isNaN(scoreNum)) {
                                          updateGroupProject(proj.id, {
                                            score: scoreNum,
                                            status: 'Evaluated',
                                            feedback: 'Project evaluated by faculty instructor.',
                                          });
                                        }
                                      }
                                    }}
                                    className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded text-xs cursor-pointer"
                                  >
                                    Score Team
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-slate-400 text-xs">
                            No group projects assigned yet for this class.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* SUB-TAB 7: CLASS PARTICIPATION INSIDE THIS CLASS */}
                  {classWorkspaceTab === 'participation' && (
                    <div className="space-y-6">
                      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                        <h3 className="font-semibold text-slate-900 text-sm mb-3">Record Student Class Participation</h3>
                        <form
                          onSubmit={e => {
                            e.preventDefault();
                            if (!partStudentId) return;
                            recordClassParticipation({
                              subjectId: selectedClass.subject.id,
                              sectionId: selectedClass.sectionIds[0] || '',
                              studentId: partStudentId,
                              date: new Date().toISOString().split('T')[0],
                              category: partCategory,
                              points: partPoints,
                              facultyNotes: partNotes,
                            });
                            setPartNotes('');
                            alert('Class participation point logged!');
                          }}
                          className="space-y-3"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="text-xs font-medium text-slate-700 block mb-1">Student</label>
                              <select
                                value={partStudentId}
                                onChange={e => setPartStudentId(e.target.value)}
                                required
                                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                              >
                                <option value="">Select Enrolled Student...</option>
                                {filteredStudents.map(st => (
                                  <option key={st.id} value={st.id}>
                                    {st.name} ({st.rollNumber})
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="text-xs font-medium text-slate-700 block mb-1">Interaction Type</label>
                              <select
                                value={partCategory}
                                onChange={e => setPartCategory(e.target.value as any)}
                                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                              >
                                <option value="Question">Question Asked</option>
                                <option value="Answer">Answer Provided</option>
                                <option value="Discussion">Class Discussion Lead</option>
                                <option value="Activity">In-class Lab Activity</option>
                                <option value="Poll">Live Poll Answer</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-xs font-medium text-slate-700 block mb-1">Points (1 to 5)</label>
                              <input
                                type="number"
                                min={1}
                                max={5}
                                value={partPoints}
                                onChange={e => setPartPoints(parseInt(e.target.value, 10) || 1)}
                                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-medium text-slate-700 block mb-1">Notes / Context</label>
                            <input
                              type="text"
                              value={partNotes}
                              onChange={e => setPartNotes(e.target.value)}
                              placeholder="e.g., Answered complex query on KV caching"
                              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                            />
                          </div>

                          <div className="flex justify-end">
                            <button
                              type="submit"
                              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg text-xs"
                            >
                              Log Participation
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* MODAL 1: Upload Course Material Modal */}
                  {showUploadModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
                      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-5 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                          <h3 className="font-bold text-slate-900 text-sm">Upload Material for {selectedClass.subject.code}</h3>
                          <button
                            type="button"
                            onClick={() => setShowUploadModal(false)}
                            className="text-slate-400 hover:text-slate-600 font-bold"
                          >
                            ✕
                          </button>
                        </div>

                        <form
                          onSubmit={e => {
                            e.preventDefault();
                            if (!uploadTitle.trim()) return;
                            addCourseMaterial({
                              subjectId: selectedClass.subject.id,
                              sectionId: selectedClass.sectionIds[0] || '',
                              facultyId: currentUser.id,
                              title: uploadTitle.trim(),
                              type: uploadCategory,
                              fileUrl: uploadFileUrl || `/materials/${uploadTitle.toLowerCase().replace(/\s+/g, '_')}.pdf`,
                              fileSize: uploadFileSize || '2.5 MB',
                            });
                            setUploadTitle('');
                            setShowUploadModal(false);
                          }}
                          className="space-y-3"
                        >
                          <div>
                            <label className="text-xs font-medium text-slate-700 block mb-1">Document Title *</label>
                            <input
                              type="text"
                              required
                              value={uploadTitle}
                              onChange={e => setUploadTitle(e.target.value)}
                              placeholder="e.g. Lecture 05: LoRA Adapter Merging Notes"
                              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-medium text-slate-700 block mb-1">Category</label>
                            <select
                              value={uploadCategory}
                              onChange={e => setUploadCategory(e.target.value as any)}
                              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                            >
                              <option value="Lecture Notes">Lecture Notes</option>
                              <option value="Slides">Slides</option>
                              <option value="Lab Manual">Lab Manual</option>
                              <option value="Dataset">Dataset</option>
                              <option value="Reference Paper">Reference Paper</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-xs font-medium text-slate-700 block mb-1">File Size / Format</label>
                            <input
                              type="text"
                              value={uploadFileSize}
                              onChange={e => setUploadFileSize(e.target.value)}
                              placeholder="e.g. 4.2 MB (PDF)"
                              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                            />
                          </div>

                          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => setShowUploadModal(false)}
                              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg text-xs"
                            >
                              Upload File
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* MODAL 2: Add Group Project Team Modal */}
                  {showGroupProjModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
                      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-5 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                          <h3 className="font-bold text-slate-900 text-sm">Add Group Project Team</h3>
                          <button
                            type="button"
                            onClick={() => setShowGroupProjModal(false)}
                            className="text-slate-400 hover:text-slate-600 font-bold"
                          >
                            ✕
                          </button>
                        </div>

                        <form
                          onSubmit={e => {
                            e.preventDefault();
                            if (!projTeamName.trim() || !projTitle.trim()) return;
                            addGroupProject({
                              subjectId: selectedClass.subject.id,
                              sectionId: selectedClass.sectionIds[0] || '',
                              facultyId: currentUser.id,
                              teamName: projTeamName.trim(),
                              projectTitle: projTitle.trim(),
                              members: projMembers.length > 0 ? projMembers : ['Aarav Sharma', 'Priya Patel'],
                              status: 'In Progress',
                              githubUrl: projGithubUrl || undefined,
                              maxScore: projMaxScore || 30,
                            });
                            setProjTeamName('');
                            setProjTitle('');
                            setProjMembers([]);
                            setShowGroupProjModal(false);
                          }}
                          className="space-y-3"
                        >
                          <div>
                            <label className="text-xs font-medium text-slate-700 block mb-1">Team Name *</label>
                            <input
                              type="text"
                              required
                              value={projTeamName}
                              onChange={e => setProjTeamName(e.target.value)}
                              placeholder="e.g. VisionTransformers Team"
                              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-medium text-slate-700 block mb-1">Project Title *</label>
                            <input
                              type="text"
                              required
                              value={projTitle}
                              onChange={e => setProjTitle(e.target.value)}
                              placeholder="e.g. Real-Time Vision Question Answering"
                              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-medium text-slate-700 block mb-1">Github Repository URL</label>
                            <input
                              type="url"
                              value={projGithubUrl}
                              onChange={e => setProjGithubUrl(e.target.value)}
                              placeholder="https://github.com/institution/repo"
                              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-medium text-slate-700 block mb-1">
                              Select Members from Class:
                            </label>
                            <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1.5 text-xs">
                              {filteredStudents.map(st => (
                                <label key={st.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                                  <input
                                    type="checkbox"
                                    checked={projMembers.includes(st.name)}
                                    onChange={e => {
                                      if (e.target.checked) {
                                        setProjMembers(prev => [...prev, st.name]);
                                      } else {
                                        setProjMembers(prev => prev.filter(m => m !== st.name));
                                      }
                                    }}
                                    className="rounded border-slate-300"
                                  />
                                  <span>{st.name} ({st.rollNumber})</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => setShowGroupProjModal(false)}
                              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg text-xs"
                            >
                              Create Team
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* MODAL 3: Create Coding Test Modal */}
                  {showNewCodingModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
                      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg p-5 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                          <h3 className="font-bold text-slate-900 text-sm">Create Coding Challenge for {selectedClass.subject.code}</h3>
                          <button
                            type="button"
                            onClick={() => setShowNewCodingModal(false)}
                            className="text-slate-400 hover:text-slate-600 font-bold"
                          >
                            ✕
                          </button>
                        </div>

                        <form
                          onSubmit={e => {
                            e.preventDefault();
                            if (!newCodeTitle.trim() || !newCodeProblem.trim()) return;

                            createCodingTest({
                              subjectId: selectedClass.subject.id,
                              sectionId: selectedClass.sectionIds[0] || '',
                              facultyId: currentUser.id,
                              title: newCodeTitle.trim(),
                              problemStatement: newCodeProblem.trim(),
                              starterCode: newCodeStarter,
                              testCases: [
                                { input: 'test(input1)', expectedOutput: 'output1', description: 'Basic test case' },
                                { input: 'test(input2)', expectedOutput: 'output2', description: 'Corner case' },
                              ],
                              deadline: newCodeDeadline,
                              totalMarks: newCodeMarks,
                            });

                            setNewCodeTitle('');
                            setNewCodeProblem('');
                            setShowNewCodingModal(false);
                          }}
                          className="space-y-3"
                        >
                          <div>
                            <label className="text-xs font-medium text-slate-700 block mb-1">Test Title *</label>
                            <input
                              type="text"
                              required
                              value={newCodeTitle}
                              onChange={e => setNewCodeTitle(e.target.value)}
                              placeholder="e.g. Implementing Multi-Head Attention"
                              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-medium text-slate-700 block mb-1">Problem Statement *</label>
                            <textarea
                              required
                              rows={3}
                              value={newCodeProblem}
                              onChange={e => setNewCodeProblem(e.target.value)}
                              placeholder="Provide problem specification, complexity requirements..."
                              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-medium text-slate-700 block mb-1">Deadline</label>
                              <input
                                type="text"
                                value={newCodeDeadline}
                                onChange={e => setNewCodeDeadline(e.target.value)}
                                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-slate-700 block mb-1">Total Marks</label>
                              <input
                                type="number"
                                value={newCodeMarks}
                                onChange={e => setNewCodeMarks(parseInt(e.target.value, 10) || 25)}
                                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => setShowNewCodingModal(false)}
                              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg text-xs"
                            >
                              Create Test
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* TAB 4: ATTENDANCE & DYNAMIC QR */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {activeSession ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Dynamic Rotating QR View */}
              <div>
                <QrCodeView
                  token={activeSession.currentQrToken}
                  qrGeneratedAt={activeSession.qrGeneratedAt}
                  refreshIntervalSeconds={5}
                  sessionStartedAt={activeSession.sessionStartedAt}
                  windowMinutes={activeSession.windowMinutes}
                  subjectName={subjects.find(s => s.id === activeSession.subjectId)?.name || 'Subject'}
                  sectionName={sections.find(s => s.id === activeSession.sectionId)?.name || 'Section'}
                  room={activeSession.room}
                  onCloseSession={() => closeAttendanceSession(activeSession.id)}
                />
              </div>

              {/* Live Scanned List */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col h-[520px]">
                <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm">Real-Time Scanned Students</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Updated live as students verify face and scan current rotating QR
                    </p>
                  </div>
                  {(() => {
                    const scanned = attendanceRecords.filter(r => r.sessionId === activeSession.id && r.status === 'Present');
                    return (
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-xs font-bold font-mono">
                        {scanned.length} Present
                      </span>
                    );
                  })()}
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 my-2">
                  {attendanceRecords
                    .filter(r => r.sessionId === activeSession.id)
                    .map(rec => {
                      const st = users.find(u => u.id === rec.studentId);
                      return (
                        <div key={rec.id} className="py-2.5 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2.5">
                            <img src={st?.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                            <div>
                              <div className="font-semibold text-slate-900">{st?.name}</div>
                              <span className="text-slate-400 font-mono text-[10px]">{st?.rollNumber}</span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold">
                              Face Verified + QR
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                              {rec.scanTime}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          ) : (
            /* Launcher for New Session */
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs max-w-xl mx-auto">
              <h3 className="font-bold text-slate-900 text-base mb-1">Start New Attendance Session</h3>
              <p className="text-xs text-slate-500 mb-4">
                Generates a dynamic QR code refreshing every 5 seconds. Scans will be accepted for 15 minutes.
              </p>

              <form
                onSubmit={e => {
                  e.preventDefault();
                  startAttendanceSession(newSessSubjectId, newSessSectionId, newSessRoom, newSessPeriod);
                }}
                className="space-y-4 text-xs"
              >
                <div>
                  <label className="font-medium text-slate-700 block mb-1">Subject</label>
                  <select
                    value={newSessSubjectId}
                    onChange={e => setNewSessSubjectId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    required
                  >
                    {mySubjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-medium text-slate-700 block mb-1">Section</label>
                  <select
                    value={newSessSectionId}
                    onChange={e => setNewSessSectionId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    required
                  >
                    {mySections.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Room / Lab</label>
                    <input
                      type="text"
                      value={newSessRoom}
                      onChange={e => setNewSessRoom(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Period Number</label>
                    <input
                      type="number"
                      min={1}
                      max={8}
                      value={newSessPeriod}
                      onChange={e => setNewSessPeriod(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      required
                    />
                  </div>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-slate-600 text-[11px] space-y-1">
                  <div>• QR Code rotates automatically every 5 seconds.</div>
                  <div>• 15-minute strict countdown window enforces on-time arrival.</div>
                  <div>• Students must pass random liveness challenge before scanning.</div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg shadow-xs cursor-pointer"
                >
                  Launch Live Attendance & QR View
                </button>
              </form>
            </div>
          )}

          {/* Past Attendance Sessions & Reasoned Correction Tool */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <h3 className="font-semibold text-slate-900 text-sm mb-3">
              Attendance Records & Reasoned Faculty Correction
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Teachers can correct attendance only with a mandatory justification. All corrections are logged with previous status, new status, timestamp, and faculty ID.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Subject</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Scanned Photo</th>
                    <th className="py-2.5 px-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attendanceRecords
                    .filter(r => myAssignedSubjectIds.includes(r.subjectId))
                    .slice(0, 12)
                    .map(rec => {
                      const st = users.find(u => u.id === rec.studentId);
                      const subj = subjects.find(s => s.id === rec.subjectId);
                      const hasScanned = rec.status === 'Present' || rec.status === 'Late' || rec.verificationType === 'Face+QR';
                      return (
                        <tr key={rec.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono text-slate-600">{rec.date}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-900">{st?.name}</td>
                          <td className="py-2.5 px-3 text-slate-600">{subj?.name}</td>
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
                              <div className="flex items-center gap-2">
                                <img
                                  src={st?.avatarUrl || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=100&q=80'}
                                  alt=""
                                  className="w-7 h-7 rounded-full object-cover ring-2 ring-emerald-500/40"
                                />
                                <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                                  Face Matched
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs italic">No scan</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedRecordId(rec.id);
                                setNewAttendanceStatus(rec.status === 'Present' ? 'Absent' : 'Present');
                                setCorrectionReason('');
                                setShowCorrectionModal(true);
                              }}
                              className="text-blue-700 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Edit className="w-3 h-3" />
                              <span>Correct</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Reasoned Correction Modal */}
          {showCorrectionModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
              <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-5">
                <h3 className="font-bold text-slate-900 text-base mb-1">Reasoned Attendance Correction</h3>
                <p className="text-xs text-slate-500 mb-4">
                  Institutional audit policy requires a verifiable explanation for altering student attendance.
                </p>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">New Status</label>
                    <select
                      value={newAttendanceStatus}
                      onChange={e => setNewAttendanceStatus(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    >
                      <option value="Present">Present</option>
                      <option value="Absent">Absent</option>
                      <option value="Excused">Excused (Medical / Approved Duty)</option>
                      <option value="Late">Late</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-medium text-slate-700 block mb-1">
                      Correction Reason (Mandatory for Audit Trail)
                    </label>
                    <textarea
                      rows={3}
                      value={correctionReason}
                      onChange={e => setCorrectionReason(e.target.value)}
                      placeholder="e.g. Student network failure verified in Lab 402; student was present and coded during session."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      required
                    />
                  </div>
                </div>

                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCorrectionModal(false)}
                    className="px-4 py-2 text-xs text-slate-700 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!correctionReason.trim()}
                    onClick={() => {
                      correctAttendance({
                        recordId: selectedRecordId,
                        newStatus: newAttendanceStatus,
                        reason: correctionReason.trim(),
                        faculty: currentUser,
                      });
                      setShowCorrectionModal(false);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 rounded-lg shadow-xs"
                  >
                    Log Correction to Audit
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: ASSIGNMENTS */}
      {activeTab === 'assignments' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 text-base">Course Assignments</h3>
            <button
              type="button"
              onClick={() => setShowNewAsgModal(true)}
              className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Assignment</span>
            </button>
          </div>

          <div className="space-y-4">
            {assignments
              .filter(a => myAssignedSubjectIds.includes(a.subjectId))
              .map(asg => {
                const subj = subjects.find(s => s.id === asg.subjectId);
                const submissions = assignmentSubmissions.filter(s => s.assignmentId === asg.id);
                return (
                  <div key={asg.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">{asg.title}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                            {subj?.name}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">{asg.description}</p>
                      </div>
                      <div className="text-right shrink-0 text-xs">
                        <span className="text-slate-500 block">Due: {asg.dueDate}</span>
                        <span className="font-semibold text-slate-700 block">Marks: {asg.totalMarks}</span>
                      </div>
                    </div>

                    {/* Submissions List */}
                    <div className="pt-3 border-t border-slate-100">
                      <span className="text-xs font-semibold text-slate-700 block mb-2">
                        Submissions ({submissions.length})
                      </span>
                      {submissions.length === 0 ? (
                        <span className="text-xs text-slate-400 italic">No student submissions received yet.</span>
                      ) : (
                        <div className="space-y-2">
                          {submissions.map(subm => {
                            const student = users.find(u => u.id === subm.studentId);
                            return (
                              <div
                                key={subm.id}
                                className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                              >
                                <div>
                                  <div className="font-semibold text-slate-900 flex items-center gap-2">
                                    <span>{student?.name}</span>
                                    <span className="text-[10px] text-slate-500 font-mono">({student?.rollNumber})</span>
                                    {subm.qualityRating && (
                                      <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded text-[10px] font-semibold">
                                        {subm.qualityRating}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-slate-500 text-[11px] mt-0.5 flex flex-wrap items-center gap-2">
                                    <span>File: {subm.fileName} · Submitted: {subm.submittedAt}</span>
                                    {subm.fileUrl && (
                                      <a
                                        href={subm.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold underline"
                                      >
                                        <Download className="w-3 h-3" />
                                        <span>Download File</span>
                                      </a>
                                    )}
                                  </div>
                                  {subm.feedback && (
                                    <p className="text-slate-600 text-[11px] italic mt-1">"{subm.feedback}"</p>
                                  )}
                                </div>

                                <div className="flex items-center gap-3">
                                  {subm.score !== undefined ? (
                                    <span className="font-bold font-mono text-slate-900">
                                      Score: {subm.score} / {asg.totalMarks}
                                    </span>
                                  ) : (
                                    <span className="text-amber-700 font-medium">Ungraded</span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setGradingSubmId(subm.id);
                                      setGradeScore(subm.score ?? 18);
                                      setGradeFeedback(subm.feedback ?? '');
                                      setGradeQuality(subm.qualityRating ?? 'High');
                                    }}
                                    className="px-3 py-1 bg-white border border-slate-300 rounded font-medium hover:bg-slate-100"
                                  >
                                    Grade & Review
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Create Assignment Modal */}
          {showNewAsgModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
              <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg p-5">
                <h3 className="font-bold text-slate-900 text-base mb-1">Create New Assignment</h3>
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    createAssignment({
                      title: newAsgTitle,
                      description: newAsgDesc,
                      subjectId: newAsgSubj,
                      sectionId: newAsgSec,
                      facultyId: currentUser.id,
                      dueDate: newAsgDue,
                      totalMarks: newAsgMarks,
                      weightage: 10,
                    });
                    setShowNewAsgModal(false);
                    setNewAsgTitle('');
                    setNewAsgDesc('');
                  }}
                  className="space-y-3 text-xs mt-4"
                >
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Assignment Title</label>
                    <input
                      type="text"
                      value={newAsgTitle}
                      onChange={e => setNewAsgTitle(e.target.value)}
                      placeholder="e.g. Problem Set 2: Synchronization & Concurrency"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      required
                    />
                  </div>

                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Description & Instructions</label>
                    <textarea
                      rows={3}
                      value={newAsgDesc}
                      onChange={e => setNewAsgDesc(e.target.value)}
                      placeholder="Detail guidelines, deliverables, format..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">Subject</label>
                      <select
                        value={newAsgSubj}
                        onChange={e => setNewAsgSubj(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      >
                        {mySubjects.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="font-medium text-slate-700 block mb-1">Section</label>
                      <select
                        value={newAsgSec}
                        onChange={e => setNewAsgSec(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      >
                        {mySections.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">Due Date</label>
                      <input
                        type="date"
                        value={newAsgDue}
                        onChange={e => setNewAsgDue(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">Total Marks</label>
                      <input
                        type="number"
                        value={newAsgMarks}
                        onChange={e => setNewAsgMarks(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowNewAsgModal(false)}
                      className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg"
                    >
                      Post Assignment
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Grading Modal */}
          {gradingSubmId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
              <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-5">
                <h3 className="font-bold text-slate-900 text-base mb-1">Grade Submission</h3>
                <div className="space-y-3 text-xs mt-3">
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Score Awarded</label>
                    <input
                      type="number"
                      value={gradeScore}
                      onChange={e => setGradeScore(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Quality Rating</label>
                    <select
                      value={gradeQuality}
                      onChange={e => setGradeQuality(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    >
                      <option value="High">High</option>
                      <option value="Good">Good</option>
                      <option value="Needs Improvement">Needs Improvement</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Faculty Feedback</label>
                    <textarea
                      rows={3}
                      value={gradeFeedback}
                      onChange={e => setGradeFeedback(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-4">
                  <button
                    type="button"
                    onClick={() => setGradingSubmId(null)}
                    className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      gradeAssignment(gradingSubmId, gradeScore, gradeFeedback, gradeQuality);
                      setGradingSubmId(null);
                    }}
                    className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg text-xs"
                  >
                    Save Grade
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: QUIZZES & LIVE QUIZZES */}
      {activeTab === 'quizzes' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 text-base">Quizzes & Live Classroom Polls</h3>
            <button
              type="button"
              onClick={() => {
                createQuiz({
                  title: 'Live Poll: Synchronization Concepts',
                  subjectId: mySubjects[0]?.id || 'sub-java',
                  sectionId: mySections[0]?.id || 'sec-2a',
                  facultyId: currentUser.id,
                  isLive: true,
                  durationMinutes: 10,
                  totalMarks: 10,
                  dueDate: '2026-11-05',
                  questions: [
                    {
                      id: `q-${Date.now()}`,
                      question: 'Does ReentrantLock support fair locking policies?',
                      options: ['Yes, via constructor parameter', 'No, strictly unfair', 'Only in Java 21+'],
                      correctOptionIndex: 0,
                    },
                  ],
                });
              }}
              className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Launch Quick Live Poll</span>
            </button>
          </div>

          <div className="space-y-4">
            {quizzes
              .filter(q => myAssignedSubjectIds.includes(q.subjectId))
              .map(quiz => {
                const subj = subjects.find(s => s.id === quiz.subjectId);
                const attempts = quizAttempts.filter(a => a.quizId === quiz.id);
                return (
                  <div key={quiz.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">{quiz.title}</span>
                          {quiz.isLive && (
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-bold text-[10px] uppercase">
                              Live Quiz Active
                            </span>
                          )}
                          <span className="text-xs text-slate-500 font-mono">({subj?.name})</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {quiz.questions.length} Questions · Total Marks: {quiz.totalMarks} · Duration: {quiz.durationMinutes} mins
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-bold font-mono text-slate-900">
                          {attempts.length} Student Attempts
                        </span>
                      </div>
                    </div>

                    {attempts.length > 0 && (
                      <div className="pt-2 border-t border-slate-100">
                        <span className="text-xs font-semibold text-slate-700 block mb-1.5">
                          Student Scores:
                        </span>
                        <div className="flex flex-wrap gap-2 text-xs">
                          {attempts.map(att => {
                            const st = users.find(u => u.id === att.studentId);
                            return (
                              <div key={att.id} className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded">
                                <span className="font-semibold text-slate-900">{st?.name}:</span>{' '}
                                <span className="font-mono text-emerald-700">{att.score}/{quiz.totalMarks}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* TAB 7: CODING TESTS */}
      {activeTab === 'coding_tests' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 text-base">Coding Tests & Practical Problem Sets</h3>
            <button
              type="button"
              onClick={() => {
                createCodingTest({
                  title: 'Lab Practical: Custom Binary Heap',
                  subjectId: mySubjects[0]?.id || 'sub-java',
                  sectionId: mySections[0]?.id || 'sec-2a',
                  facultyId: currentUser.id,
                  problemStatement: 'Implement a Min-Heap with insert(val) and extractMin() operating in O(log n) time.',
                  starterCode: `class MinHeap {\n    // TODO: implement\n}`,
                  testCases: [
                    { input: 'insert(10), insert(5), extractMin()', expectedOutput: '5', description: 'Basic min retrieval' },
                  ],
                  deadline: '2026-11-12 23:59:00',
                  totalMarks: 25,
                });
              }}
              className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Coding Test</span>
            </button>
          </div>

          <div className="space-y-4">
            {codingTests
              .filter(c => myAssignedSubjectIds.includes(c.subjectId))
              .map(test => {
                const subj = subjects.find(s => s.id === test.subjectId);
                const subs = codingSubmissions.filter(s => s.testId === test.id);
                return (
                  <div key={test.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">{test.title}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                            {subj?.name}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">{test.problemStatement}</p>
                      </div>
                      <div className="text-right text-xs">
                        <span className="text-slate-500 block">Deadline: {test.deadline}</span>
                        <span className="font-semibold text-slate-700">Total Marks: {test.totalMarks}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100">
                      <span className="text-xs font-semibold text-slate-700 block mb-2">
                        Student Submissions & Test-Case Execution:
                      </span>
                      {subs.length === 0 ? (
                        <span className="text-xs text-slate-400 italic">No submissions yet.</span>
                      ) : (
                        <div className="space-y-2 text-xs">
                          {subs.map(cs => {
                            const st = users.find(u => u.id === cs.studentId);
                            return (
                              <div key={cs.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                                <div className="flex items-center justify-between">
                                  <div className="font-semibold text-slate-900">{st?.name} ({st?.rollNumber})</div>
                                  <div className="flex items-center gap-2 font-mono">
                                    <span className="text-emerald-700 font-bold">
                                      {cs.passedTests}/{cs.totalTests} Tests Passed
                                    </span>
                                    <span>· Score: {cs.score}/{test.totalMarks}</span>
                                  </div>
                                </div>
                                <pre className="mt-2 p-2 bg-slate-950 text-emerald-400 rounded text-[11px] font-mono overflow-x-auto max-h-24">
                                  {cs.submittedCode}
                                </pre>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* TAB 8: CLASS PARTICIPATION */}
      {activeTab === 'participation' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Record New Participation Entry */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <h3 className="font-bold text-slate-900 text-sm mb-3">Record Class Participation</h3>
              <form
                onSubmit={e => {
                  e.preventDefault();
                  if (!partStudentId) return;
                  recordClassParticipation({
                    studentId: partStudentId,
                    subjectId: partSubjId,
                    sectionId: mySections[0]?.id || 'sec-2a',
                    date: new Date().toISOString().split('T')[0],
                    category: partCategory,
                    points: partPoints,
                    facultyNotes: partNotes,
                  });
                  setPartNotes('');
                }}
                className="space-y-3 text-xs"
              >
                <div>
                  <label className="font-medium text-slate-700 block mb-1">Student</label>
                  <select
                    value={partStudentId}
                    onChange={e => setPartStudentId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    required
                  >
                    <option value="">-- Choose Student --</option>
                    {myStudents.map(st => (
                      <option key={st.id} value={st.id}>{st.name} ({st.rollNumber})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-medium text-slate-700 block mb-1">Subject</label>
                  <select
                    value={partSubjId}
                    onChange={e => setPartSubjId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    {mySubjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-medium text-slate-700 block mb-1">Participation Category</label>
                  <select
                    value={partCategory}
                    onChange={e => setPartCategory(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="Question">Insightful Question</option>
                    <option value="Answer">Answered In-Class Query</option>
                    <option value="Discussion">Led Peer Discussion</option>
                    <option value="Activity">Group Activity Lead</option>
                    <option value="Poll">Class Poll / Debate</option>
                  </select>
                </div>

                <div>
                  <label className="font-medium text-slate-700 block mb-1">
                    Points Awarded: {partPoints} / 5
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={partPoints}
                    onChange={e => setPartPoints(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-700 block mb-1">Observation Notes</label>
                  <textarea
                    rows={2}
                    value={partNotes}
                    onChange={e => setPartNotes(e.target.value)}
                    placeholder="e.g. Demonstrated strong knowledge on ReentrantLock deadlock avoidance."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg shadow-xs cursor-pointer"
                >
                  Record Points
                </button>
              </form>
            </div>

            {/* Participation Log Table */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <h3 className="font-bold text-slate-900 text-sm mb-3">Recent Class Participation Log</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Student</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Points</th>
                      <th className="py-2.5 px-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {classParticipationEntries
                      .filter(p => myAssignedSubjectIds.includes(p.subjectId))
                      .map(pe => {
                        const st = users.find(u => u.id === pe.studentId);
                        return (
                          <tr key={pe.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-mono text-slate-500">{pe.date}</td>
                            <td className="py-2.5 px-3 font-medium text-slate-900">{st?.name}</td>
                            <td className="py-2.5 px-3 capitalize">{pe.category}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">+{pe.points}</td>
                            <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">{pe.facultyNotes}</td>
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

      {/* TAB 9: ENGAGEMENT ANALYTICS & PARTICIPATION APPROVAL */}
      {activeTab === 'engagement' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <h3 className="font-semibold text-slate-900 text-sm mb-1">
              Class-Level Engagement & 5-Mark Participation Rubric
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Review provisional scores, toggle Not Applicable categories with proportional redistribution, and approve final participation scores out of 5.0.
            </p>

            <div className="space-y-4">
              {participationScores
                .filter(ps => myAssignedSubjectIds.includes(ps.subjectId))
                .map(score => {
                  const student = users.find(u => u.id === score.studentId);
                  const subj = subjects.find(s => s.id === score.subjectId);
                  return (
                    <div key={score.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900">{student?.name}</span>
                            <span className="text-xs text-slate-500 font-mono">({student?.rollNumber})</span>
                            <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                              {subj?.name}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            Provisional Score: <strong>{score.provisionalScore.toFixed(2)}</strong> / 5.00 · Status: <strong>{score.status}</strong>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold font-mono text-indigo-700">
                            Approved: {score.approvedScore.toFixed(2)} / 5.0
                          </span>

                          <button
                            type="button"
                            onClick={() => {
                              approveParticipationScore(score.id, score.provisionalScore, 'Approved without adjustment');
                            }}
                            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
                          >
                            Approve
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setAdjustScoreModal(score.id);
                              setAdjustedScoreValue(score.approvedScore);
                              setAdjustScoreReason('');
                            }}
                            className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-100 cursor-pointer"
                          >
                            Adjust with Reason
                          </button>
                        </div>
                      </div>

                      {/* Not Applicable Toggle Controls */}
                      <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center gap-3 text-xs">
                        <span className="text-slate-500 font-medium">Activity NA Flags (Dynamic Weight Redistribution):</span>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!score.naFlags.coding}
                            onChange={() => toggleActivityNa(score.id, 'coding')}
                            className="rounded text-blue-600"
                          />
                          <span>Coding NA</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!score.naFlags.quiz}
                            onChange={() => toggleActivityNa(score.id, 'quiz')}
                            className="rounded text-blue-600"
                          />
                          <span>Quiz NA</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!score.naFlags.discussion}
                            onChange={() => toggleActivityNa(score.id, 'discussion')}
                            className="rounded text-blue-600"
                          />
                          <span>Discussion NA</span>
                        </label>
                      </div>

                      {score.adjustmentReason && (
                        <div className="text-xs text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                          <strong>Adjustment reason:</strong> {score.adjustmentReason}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Adjust Score Modal */}
          {adjustScoreModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
              <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-5">
                <h3 className="font-bold text-slate-900 text-base mb-1">Adjust Participation Score</h3>
                <p className="text-xs text-slate-500 mb-4">
                  Manual adjustments to auto-scored participation require a mandatory reason logged to the institutional audit trail.
                </p>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Adjusted Score (/5.0)</label>
                    <input
                      type="number"
                      step={0.1}
                      min={0}
                      max={5.0}
                      value={adjustedScoreValue}
                      onChange={e => setAdjustedScoreValue(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Reason for Adjustment (Mandatory)</label>
                    <textarea
                      rows={3}
                      value={adjustScoreReason}
                      onChange={e => setAdjustScoreReason(e.target.value)}
                      placeholder="e.g. Granted 0.5 bonus points for voluntary technical seminar presentation on Java 21 Virtual Threads."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-4">
                  <button
                    type="button"
                    onClick={() => setAdjustScoreModal(null)}
                    className="px-4 py-2 text-xs text-slate-700 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!adjustScoreReason.trim()}
                    onClick={() => {
                      approveParticipationScore(
                        adjustScoreModal,
                        adjustedScoreValue,
                        undefined,
                        adjustScoreReason.trim()
                      );
                      setAdjustScoreModal(null);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 rounded-lg shadow-xs"
                  >
                    Save & Audit
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 10: ALERTS */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 text-base">
              Class Attendance & Engagement Alerts
            </h3>
            <span className="text-xs text-slate-500">Filtered for your assigned subjects only</span>
          </div>

          {myAlerts.length === 0 ? (
            <div className="p-8 text-center bg-white border border-slate-200 rounded-xl text-slate-500 text-xs">
              No critical attendance or engagement alerts for your assigned classes.
            </div>
          ) : (
            <div className="space-y-3">
              {myAlerts.map(alt => (
                <div
                  key={alt.id}
                  className="bg-white border border-rose-200 rounded-xl p-4 shadow-xs flex items-start justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{alt.student.name}</span>
                        <span className="text-xs text-slate-500 font-mono">({alt.student.rollNumber})</span>
                        <span className="text-[10px] uppercase font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                          {alt.subjectName}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 mt-1">{alt.message}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('interventions');
                      setIntvStudentId(alt.student.id);
                    }}
                    className="px-3.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold rounded-lg shadow-xs shrink-0 cursor-pointer"
                  >
                    Suggest Intervention
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 11: INTERVENTIONS */}
      {activeTab === 'interventions' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Create Intervention Form */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <h3 className="font-bold text-slate-900 text-sm mb-3">Initiate Student Intervention</h3>
              <form
                onSubmit={e => {
                  e.preventDefault();
                  const targetStudent = users.find(u => u.id === intvStudentId);
                  if (!targetStudent) return;
                  createIntervention({
                    studentId: targetStudent.id,
                    studentName: targetStudent.name,
                    facultyId: currentUser.id,
                    subjectId: mySubjects[0]?.id || 'sub-java',
                    sectionId: targetStudent.sectionId || 'sec-2a',
                    type: intvType,
                    status: 'Suggested',
                    notes: intvNotes,
                    suggestedAction: intvAction,
                  });
                  setIntvNotes('');
                  setIntvAction('');
                }}
                className="space-y-3 text-xs"
              >
                <div>
                  <label className="font-medium text-slate-700 block mb-1">Select Student</label>
                  <select
                    value={intvStudentId}
                    onChange={e => setIntvStudentId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    required
                  >
                    <option value="">-- Choose Student --</option>
                    {myStudents.map(st => (
                      <option key={st.id} value={st.id}>{st.name} ({st.rollNumber})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-medium text-slate-700 block mb-1">Intervention Type</label>
                  <select
                    value={intvType}
                    onChange={e => setIntvType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="Recovery Plan">Attendance Recovery Plan</option>
                    <option value="Mentoring">1-on-1 Academic Mentoring</option>
                    <option value="Remedial Resource">Remedial Video & Notes</option>
                    <option value="Parent Notification">Parent Academic Advisory</option>
                  </select>
                </div>

                <div>
                  <label className="font-medium text-slate-700 block mb-1">Reason / Diagnosis</label>
                  <textarea
                    rows={2}
                    value={intvNotes}
                    onChange={e => setIntvNotes(e.target.value)}
                    placeholder="e.g. Student attendance dipped to 62% and missed assignment 1."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-700 block mb-1">Suggested Corrective Action</label>
                  <textarea
                    rows={2}
                    value={intvAction}
                    onChange={e => setIntvAction(e.target.value)}
                    placeholder="e.g. Attend next 6 lab sessions consecutively; submit bonus practical task."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg shadow-xs cursor-pointer"
                >
                  Create & Log Intervention
                </button>
              </form>
            </div>

            {/* Interventions Tracker */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <h3 className="font-bold text-slate-900 text-sm mb-3">Active Student Interventions</h3>
              <div className="space-y-3">
                {interventions
                  .filter(i => i.facultyId === currentUser.id)
                  .map(intv => (
                    <div key={intv.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-900 text-sm">{intv.studentName}</span>
                          <span className="text-slate-500 ml-2">Type: <strong>{intv.type}</strong></span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                          {intv.status}
                        </span>
                      </div>
                      <p className="text-slate-700"><strong>Diagnostic Notes:</strong> {intv.notes}</p>
                      <p className="text-blue-900"><strong>Prescribed Action:</strong> {intv.suggestedAction}</p>
                      {intv.outcomeNotes && (
                        <p className="text-emerald-800 italic bg-white p-2 rounded border border-slate-200">
                          Follow-up Outcome: "{intv.outcomeNotes}"
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 12: NOTICES & REMINDERS */}
      {activeTab === 'notices' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Create Notice Form */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <h3 className="font-bold text-slate-900 text-sm mb-3">Post Class Notice / Reminder</h3>
              <form
                onSubmit={e => {
                  e.preventDefault();
                  createNotice({
                    title: noticeTitle,
                    content: noticeContent,
                    type: 'notice',
                    authorId: currentUser.id,
                    authorName: currentUser.name,
                    authorRole: 'faculty',
                    targetSubjectId: noticeSubj,
                    targetSectionId: noticeSec,
                  });
                  setNoticeTitle('');
                  setNoticeContent('');
                }}
                className="space-y-3 text-xs"
              >
                <div>
                  <label className="font-medium text-slate-700 block mb-1">Notice Title</label>
                  <input
                    type="text"
                    value={noticeTitle}
                    onChange={e => setNoticeTitle(e.target.value)}
                    placeholder="e.g. Lab 3 Viva Preparation Guide"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-700 block mb-1">Target Subject</label>
                  <select
                    value={noticeSubj}
                    onChange={e => setNoticeSubj(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    {mySubjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-medium text-slate-700 block mb-1">Target Section</label>
                  <select
                    value={noticeSec}
                    onChange={e => setNoticeSec(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    {mySections.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-medium text-slate-700 block mb-1">Message Content</label>
                  <textarea
                    rows={3}
                    value={noticeContent}
                    onChange={e => setNoticeContent(e.target.value)}
                    placeholder="Post clear instructions or reminders for enrolled students..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg shadow-xs cursor-pointer"
                >
                  Publish Announcement
                </button>
              </form>
            </div>

            {/* Published Notices */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <h3 className="font-bold text-slate-900 text-sm mb-3">Published Section Notices</h3>
              <div className="divide-y divide-slate-100">
                {notices
                  .filter(n => n.authorId === currentUser.id)
                  .map(notice => (
                    <div key={notice.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between">
                        <h4 className="font-semibold text-xs text-slate-900">{notice.title}</h4>
                        <span className="text-[10px] text-slate-400 font-mono">{notice.createdAt}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{notice.content}</p>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 13: REPORTS & CSV EXPORT */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Class Academic & Attendance Report</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Consolidated attendance percentage, quiz scores, coding practical status, and provisional participation.
                </p>
              </div>

              {/* Export Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const csv = generateStudentsCsv(myStudents, programs, sections, attendanceRecords, systemSettings);
                    const safeName = currentUser.name.replace(/\s+/g, '_');
                    const dateStr = new Date().toISOString().split('T')[0];
                    triggerCsvDownload(csv, `faculty_${safeName}_enrolled_students_${dateStr}.csv`);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer transition-colors"
                  title="Download all students enrolled in your assigned sections"
                >
                  <Download className="w-4 h-4" />
                  <span>Save Enrolled Students CSV ({myStudents.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const headers = ['Roll Number', 'Student Name', 'Section', 'Subject', 'Conducted', 'Present', 'Attendance %', 'Provisional Participation (/5)'];
                    const rows = myStudents.map(st => {
                      const subj = mySubjects[0];
                      const recs = attendanceRecords.filter(r => r.studentId === st.id && r.subjectId === subj?.id);
                      const stats = calculateAttendanceStats(recs);
                      const partScore = participationScores.find(p => p.studentId === st.id && p.subjectId === subj?.id)?.provisionalScore || 4.0;
                      return [
                        st.rollNumber,
                        `"${st.name}"`,
                        `"${sections.find(s => s.id === st.sectionId)?.name}"`,
                        `"${subj?.name}"`,
                        stats.conducted,
                        stats.present,
                        stats.percentage,
                        partScore,
                      ].join(',');
                    });
                    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement('a');
                    link.setAttribute('href', encodedUri);
                    link.setAttribute('download', `Faculty_Academic_Report_${currentUser.name.replace(/\s+/g, '_')}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Save Academic Report CSV</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto mt-4">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-2.5 px-3">Student</th>
                    <th className="py-2.5 px-3">Roll No</th>
                    <th className="py-2.5 px-3">Section</th>
                    <th className="py-2.5 px-3">Attendance %</th>
                    <th className="py-2.5 px-3">Engagement</th>
                    <th className="py-2.5 px-3">Participation (/5)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {myStudents.map(st => {
                    const sec = sections.find(s => s.id === st.sectionId);
                    const recs = attendanceRecords.filter(r => r.studentId === st.id);
                    const stats = calculateAttendanceStats(recs);
                    const partScore = participationScores.find(p => p.studentId === st.id);
                    return (
                      <tr key={st.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-medium text-slate-900">{st.name}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">{st.rollNumber}</td>
                        <td className="py-2.5 px-3 text-slate-600">{sec?.name}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{stats.percentage}%</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                            High
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">
                          {(partScore?.approvedScore || 4.5).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
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
