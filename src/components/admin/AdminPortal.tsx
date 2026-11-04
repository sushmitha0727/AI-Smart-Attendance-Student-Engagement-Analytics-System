import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Users,
  GraduationCap,
  Calendar,
  Layers,
  BookOpen,
  Sliders,
  FileCheck2,
  Download,
  Shield,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  IdCard,
  UserPlus,
  Search,
  Filter,
  Building2,
  Database,
} from 'lucide-react';
import { calculateAttendanceStats } from '../../utils/academicCalculations';
import { IdProvisioningManager } from './IdProvisioningManager';
import { AdminDataManagement } from './AdminDataManagement';
import {
  generateStudentsCsv,
  generateTeachersCsv,
  triggerCsvDownload,
} from '../../utils/csvExporter';

export const AdminPortal: React.FC = () => {
  const {
    firebaseConnected,
    firebaseLatency,
    academicYears,
    programs,
    semesters,
    sections,
    subjects,
    facultyAssignments,
    timetableSlots,
    users,
    attendanceRecords,
    attendanceCorrectionLogs,
    assignments,
    quizzes,
    codingTests,
    systemSettings,
    updateSystemSettings,
    assignFacultyToSubject,
    addTimetableSlot,
    addSubject,
    addSection,
    addProgram,
  } = useApp();

  const [showAddProgram, setShowAddProgram] = useState(false);
  const [progSearch, setProgSearch] = useState('');
  const [progCategoryFilter, setProgCategoryFilter] = useState('ALL');
  const [newProgName, setNewProgName] = useState('');
  const [newProgCode, setNewProgCode] = useState('');
  const [newProgDuration, setNewProgDuration] = useState(4);
  const [newProgDept, setNewProgDept] = useState('Department of Computer Science & Engineering');
  const [newProgCategory, setNewProgCategory] = useState('Computer Science & Emerging AI');

  const [activeTab, setActiveTab] = useState<
    | 'dashboard'
    | 'data_management'
    | 'id_provisioning'
    | 'hierarchy'
    | 'faculty_assignments'
    | 'timetable'
    | 'attendance_thresholds'
    | 'rubric_settings'
    | 'assessments'
    | 'reports'
    | 'audit_logs'
  >('dashboard');

  // Hierarchy add course modal
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [subCode, setSubCode] = useState('');
  const [subName, setSubName] = useState('');
  const [subType, setSubType] = useState<'Theory' | 'Practical/Lab' | 'Theory+Lab' | 'Skill Development'>('Theory+Lab');
  const [subCredits, setSubCredits] = useState(4);
  const [subCoding, setSubCoding] = useState(true);

  // Hierarchy add section modal
  const [showAddSection, setShowAddSection] = useState(false);
  const [secName, setSecName] = useState('');
  const [secProg, setSecProg] = useState('prog-cse');
  const [secSem, setSecSem] = useState('sem-3');
  const [secYear, setSecYear] = useState(1);

  // Faculty assignment builder
  const [assignFacultyId, setAssignFacultyId] = useState('');
  const [assignSubjectId, setAssignSubjectId] = useState('');
  const [assignSectionId, setAssignSectionId] = useState('');

  // Timetable builder
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [slotDay, setSlotDay] = useState<'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday'>('Monday');
  const [slotSubj, setSlotSubj] = useState(subjects[0]?.id || '');
  const [slotSec, setSlotSec] = useState(sections[0]?.id || '');
  const [slotFac, setSlotFac] = useState(users.find(u => u.role === 'faculty')?.id || '');
  const [slotRoom, setSlotRoom] = useState('Room 304');
  const [slotStart, setSlotStart] = useState('09:00');
  const [slotEnd, setSlotEnd] = useState('10:00');
  const [slotPeriod, setSlotPeriod] = useState(1);

  // System settings local state
  const [attThreshold, setAttThreshold] = useState(systemSettings.attendanceThresholdPercent);
  const [honorThreshold, setHonorThreshold] = useState(systemSettings.honorRollThresholdPercent);
  const [windowMins, setWindowMins] = useState(systemSettings.sessionWindowMinutes);
  const [partThreshold, setPartThreshold] = useState(systemSettings.lowParticipationThresholdPercent ?? 60);

  const studentsList = users.filter(u => u.role === 'student');
  const facultyList = users.filter(u => u.role === 'faculty');

  // Institution attendance aggregate
  const overallStats = calculateAttendanceStats(attendanceRecords);

  const programCategories = Array.from(new Set(programs.map(p => p.category || 'General Programs'))).sort();
  const filteredPrograms = programs.filter(p => {
    const query = progSearch.toLowerCase().trim();
    const matchSearch =
      !query ||
      p.name.toLowerCase().includes(query) ||
      p.code.toLowerCase().includes(query) ||
      (p.department && p.department.toLowerCase().includes(query));
    const matchCat = progCategoryFilter === 'ALL' || (p.category || 'General Programs') === progCategoryFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Vertical Side Panel */}
        <aside className="w-full lg:w-64 shrink-0 bg-white border border-slate-200 rounded-xl p-3 shadow-xs lg:sticky lg:top-20">
          <div className="px-3 py-2 border-b border-slate-100 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Admin Control</span>
            <div className="text-xs font-bold text-slate-900 mt-0.5 truncate">{users.find(u => u.role === 'admin')?.name || 'Dr. S. K. Mahajan'}</div>
            <div className="text-[11px] text-slate-500 truncate">Dean of Academic Affairs</div>
          </div>

          <nav className="flex flex-col gap-1 w-full text-xs">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Layers },
              { id: 'data_management', label: 'Data Management & CSV', icon: Database, badge: 'Firestore' },
              { id: 'id_provisioning', label: 'ID & User Provisioning', icon: IdCard, badge: 'Admin Only' },
              { id: 'hierarchy', label: 'Academic Structure', icon: BookOpen },
              { id: 'faculty_assignments', label: 'Faculty Assignments', icon: Users },
              { id: 'timetable', label: 'Timetable Manager', icon: Calendar },
              { id: 'attendance_thresholds', label: 'Attendance Thresholds', icon: Sliders },
              { id: 'rubric_settings', label: 'Participation Rubric', icon: FileCheck2 },
              { id: 'assessments', label: 'Assessments Overview', icon: BookOpen },
              { id: 'reports', label: 'Institutional Reports', icon: Download },
              { id: 'audit_logs', label: `Audit & Privacy Logs (${attendanceCorrectionLogs.length})`, icon: Shield },
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
                      ? 'bg-purple-50 text-purple-900 font-semibold border-l-4 border-purple-600'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-purple-700' : 'text-slate-400'}`} />
                    <span className="truncate">{tab.label}</span>
                  </div>
                  {(tab as any).badge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded">
                      {(tab as any).badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Right Main Content */}
        <div className="flex-1 min-w-0 w-full space-y-6">
          {/* Admin Title Banner */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">Institutional Administration Portal</h1>
                <span className="text-xs px-2 py-0.5 rounded font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                  Dean & Controller Mode
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                  firebaseConnected
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${firebaseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                <span>{firebaseConnected ? 'Cloud Firestore Active' : 'Offline Mode'}</span>
                {firebaseConnected && firebaseLatency !== null && (
                  <span className="font-mono text-[10px] text-slate-500 font-normal">({firebaseLatency}ms)</span>
                )}
              </div>
              <div className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                <span className="text-slate-500">Threshold: </span>
                <span className="font-mono font-bold text-slate-900">{systemSettings.attendanceThresholdPercent}%</span>
              </div>
            </div>
          </div>

      {/* ADMIN DATA MANAGEMENT PAGE (ACTIONS 1-9) */}
      {activeTab === 'data_management' && <AdminDataManagement />}

      {/* ID & USER PROVISIONING (ADMIN EXCLUSIVE) */}
      {activeTab === 'id_provisioning' && <IdProvisioningManager />}

      {/* TAB 1: ADMIN DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Institutional IAM Callout */}
          <div className="bg-gradient-to-r from-[#162b78] via-indigo-900 to-[#10205c] text-white rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs border border-blue-900/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <IdCard className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <div className="text-xs font-bold flex items-center gap-2">
                  <span>Institutional ID & Account Provisioning Center</span>
                  <span className="bg-amber-400 text-slate-900 text-[9px] font-bold uppercase px-1.5 py-0.2 rounded">
                    Admin Exclusive
                  </span>
                </div>
                <div className="text-[11px] text-blue-100/90">
                  Students and faculty can only log in. Issue Student Roll Numbers, register Faculty IDs, generate class rosters, and manage credentials.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('id_provisioning')}
              className="px-3.5 py-1.5 bg-white text-[#162b78] hover:bg-blue-50 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <UserPlus className="w-3.5 h-3.5 text-indigo-700" />
              <span>Issue New IDs &rarr;</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Total Students</span>
              <div className="mt-2 text-2xl font-bold font-mono text-slate-900">{studentsList.length}</div>
              <span className="text-[11px] text-slate-400 mt-1 block">Enrolled in 2025–26</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Active Faculty</span>
              <div className="mt-2 text-2xl font-bold font-mono text-slate-900">{facultyList.length}</div>
              <span className="text-[11px] text-slate-400 mt-1 block">Assigned across depts</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Classes / Sections</span>
              <div className="mt-2 text-2xl font-bold font-mono text-slate-900">{sections.length}</div>
              <span className="text-[11px] text-slate-400 mt-1 block">1st Year A/B, 2nd Year A/B</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Courses Offered</span>
              <div className="mt-2 text-2xl font-bold font-mono text-slate-900">{subjects.length}</div>
              <span className="text-[11px] text-slate-400 mt-1 block">Theory, Lab & Skills</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Avg Attendance</span>
              <div className="mt-2 text-2xl font-bold font-mono text-purple-700">{overallStats.percentage}%</div>
              <span className="text-[11px] text-slate-400 mt-1 block">Threshold: {systemSettings.attendanceThresholdPercent}%</span>
            </div>
          </div>

          {/* Quick Access Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <h3 className="font-semibold text-slate-900 text-sm mb-3">Academic Hierarchy Status</h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded border border-slate-200">
                  <span className="font-medium text-slate-700">Academic Year:</span>
                  <span className="font-mono text-slate-900 font-semibold">2025–2026 (Active)</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded border border-slate-200">
                  <span className="font-medium text-slate-700">Undergraduate Programs:</span>
                  <span className="font-mono text-slate-900 font-semibold">{programs.length} Programs</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded border border-slate-200">
                  <span className="font-medium text-slate-700">Active Faculty Subject Assignments:</span>
                  <span className="font-mono text-slate-900 font-semibold">{facultyAssignments.length} Assignments</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <h3 className="font-semibold text-slate-900 text-sm mb-3">Audit & Compliance Summary</h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded border border-slate-200">
                  <span className="font-medium text-slate-700">Attendance Reasoned Corrections:</span>
                  <span className="font-mono text-slate-900 font-semibold">{attendanceCorrectionLogs.length} Logged Entries</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded border border-slate-200">
                  <span className="font-medium text-slate-700">Dynamic QR Refresh Cycle:</span>
                  <span className="font-mono text-slate-900 font-semibold">5 Seconds (Strict Invalidation)</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded border border-slate-200">
                  <span className="font-medium text-slate-700">Liveness Biometric Retention:</span>
                  <span className="font-mono text-emerald-700 font-semibold">Zero Retention (Compliant)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ACADEMIC STRUCTURE */}
      {activeTab === 'hierarchy' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Academic Catalog & Structure</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Programs &rarr; Semesters &rarr; Class Sections &rarr; Subjects & Courses
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddProgram(true)}
                className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Program</span>
              </button>
              <button
                type="button"
                onClick={() => setShowAddSection(true)}
                className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Class Section</span>
              </button>
              <button
                type="button"
                onClick={() => setShowAddSubject(true)}
                className="px-3.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Course / Subject</span>
              </button>
            </div>
          </div>

          {/* Programs of Study Section */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-purple-700" />
                    Programs of Study Catalog
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[11px] font-bold">
                    {programs.length} Programs Registered
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Institutional degree programs across Engineering, Computing, AI Specializations, Management, Commerce, Design, Law, Sciences, and Allied Health.
                </p>
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <span>Showing <strong className="text-slate-800">{filteredPrograms.length}</strong> of {programs.length}</span>
              </div>
            </div>

            {/* Search & Category Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search program by name (e.g. AI&ML, Fintech, Quantum, Aviation, Psychology)..."
                  value={progSearch}
                  onChange={e => setProgSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:bg-white"
                />
              </div>
              <div className="shrink-0 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={progCategoryFilter}
                  onChange={e => setProgCategoryFilter(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-hidden text-slate-700 font-medium"
                >
                  <option value="ALL">All Disciplines ({programs.length})</option>
                  {programCategories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat} ({programs.filter(p => (p.category || 'General Programs') === cat).length})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Filtered Programs Table */}
            <div className="overflow-x-auto max-h-[360px] overflow-y-auto border border-slate-200 rounded-lg shadow-2xs">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 sticky top-0 z-10 shadow-2xs">
                  <tr>
                    <th className="py-2.5 px-3">Program Code</th>
                    <th className="py-2.5 px-3">Program Name / Specialization</th>
                    <th className="py-2.5 px-3">Duration</th>
                    <th className="py-2.5 px-3">School / Department</th>
                    <th className="py-2.5 px-3">Discipline Category</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPrograms.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No programs found matching "{progSearch}".
                      </td>
                    </tr>
                  ) : (
                    filteredPrograms.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 px-3 font-mono font-bold text-indigo-700">
                          <span className="bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded text-[11px]">
                            {p.code}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-900">
                          {p.name}
                        </td>
                        <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                          {p.durationYears} Years ({p.durationYears * 2} Semesters)
                        </td>
                        <td className="py-2 px-3 text-slate-600 truncate max-w-[200px]" title={p.department}>
                          {p.department || 'Academic Department'}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {p.category || 'General'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setActiveTab('id_provisioning')}
                            className="px-2 py-0.5 text-[10px] font-semibold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 rounded transition-all cursor-pointer"
                          >
                            Issue ID
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sections List */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-3">
              Class Sections
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {sections.map(sec => {
                const count = users.filter(u => u.sectionId === sec.id).length;
                return (
                  <div key={sec.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                    <span className="font-bold text-sm text-slate-900 block">{sec.name}</span>
                    <span className="text-slate-500 mt-1 block">Enrolled Students: <strong>{count}</strong></span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Subjects Table */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-3">
              Subject Catalog
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">Subject Name</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Credits</th>
                    <th className="py-2.5 px-3">Coding Component</th>
                    <th className="py-2.5 px-3">Live Quiz Enabled</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subjects.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono text-slate-600">{s.code}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">{s.name}</td>
                      <td className="py-2.5 px-3 text-slate-600">{s.type}</td>
                      <td className="py-2.5 px-3 font-mono">{s.credits}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${s.hasCodingComponent ? 'bg-indigo-100 text-indigo-800' : 'text-slate-400'}`}>
                          {s.hasCodingComponent ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${s.hasLiveQuiz ? 'bg-emerald-100 text-emerald-800' : 'text-slate-400'}`}>
                          {s.hasLiveQuiz ? 'Yes' : 'No'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Subject Modal */}
          {showAddSubject && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
              <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-5">
                <h3 className="font-bold text-slate-900 text-base mb-1">Add Course / Subject</h3>
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    addSubject({
                      code: subCode,
                      name: subName,
                      programId: 'prog-cse',
                      semesterId: 'sem-3',
                      type: subType,
                      credits: subCredits,
                      hasCodingComponent: subCoding,
                      hasLiveQuiz: true,
                    });
                    setShowAddSubject(false);
                    setSubCode('');
                    setSubName('');
                  }}
                  className="space-y-3 text-xs mt-3"
                >
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Subject Code</label>
                    <input
                      type="text"
                      value={subCode}
                      onChange={e => setSubCode(e.target.value)}
                      placeholder="e.g. CS309"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      required
                    />
                  </div>

                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Subject Name</label>
                    <input
                      type="text"
                      value={subName}
                      onChange={e => setSubName(e.target.value)}
                      placeholder="e.g. Distributed Cloud Computing"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">Course Type</label>
                      <select
                        value={subType}
                        onChange={e => setSubType(e.target.value as any)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      >
                        <option value="Theory">Theory</option>
                        <option value="Practical/Lab">Practical/Lab</option>
                        <option value="Theory+Lab">Theory+Lab</option>
                        <option value="Skill Development">Skill Development</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-medium text-slate-700 block mb-1">Credits</label>
                      <input
                        type="number"
                        min={1}
                        max={6}
                        value={subCredits}
                        onChange={e => setSubCredits(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={subCoding}
                      onChange={e => setSubCoding(e.target.checked)}
                      className="rounded text-purple-600"
                    />
                    <span>Has Coding Practical Component</span>
                  </label>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowAddSubject(false)}
                      className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-semibold rounded-lg"
                    >
                      Save Course
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Add Section Modal */}
          {showAddSection && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
              <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-5">
                <h3 className="font-bold text-slate-900 text-base mb-1">Add Class Section</h3>
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    addSection({
                      name: secName,
                      academicYearId: 'ay-2025-26',
                      programId: secProg,
                      semesterId: `sem-${(secYear * 2) - 1}`,
                    });
                    setShowAddSection(false);
                    setSecName('');
                  }}
                  className="space-y-3 text-xs mt-3"
                >
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Program of Study</label>
                    <select
                      value={secProg}
                      onChange={e => setSecProg(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    >
                      {programs.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Year of Study</label>
                    <select
                      value={secYear}
                      onChange={e => setSecYear(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    >
                      <option value={1}>1st Year (Semester 1 & 2)</option>
                      <option value={2}>2nd Year (Semester 3 & 4)</option>
                      <option value={3}>3rd Year (Semester 5 & 6)</option>
                      <option value={4}>4th Year (Semester 7 & 8)</option>
                      <option value={5}>5th Year (Semester 9 & 10)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Section Name / Class Title</label>
                    <input
                      type="text"
                      value={secName}
                      onChange={e => setSecName(e.target.value)}
                      placeholder="e.g. 1st Year BBA – Section A"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowAddSection(false)}
                      className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-semibold rounded-lg"
                    >
                      Save Section
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Add Program Modal */}
          {showAddProgram && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
              <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-5 animate-scaleUp">
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-purple-700" />
                    Add Program of Study
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowAddProgram(false)}
                    className="text-slate-400 hover:text-slate-600 text-lg font-bold"
                  >
                    &times;
                  </button>
                </div>
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    if (!newProgName.trim() || !newProgCode.trim()) return;
                    addProgram({
                      name: newProgName.trim(),
                      code: newProgCode.trim().toUpperCase(),
                      durationYears: Number(newProgDuration) || 4,
                      department: newProgDept.trim(),
                      category: newProgCategory,
                      degree: newProgName.split(' ')[0] || 'Degree',
                    });
                    setShowAddProgram(false);
                    setNewProgName('');
                    setNewProgCode('');
                  }}
                  className="space-y-3 text-xs"
                >
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">
                      Program Name / Specialization <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newProgName}
                      onChange={e => setNewProgName(e.target.value)}
                      placeholder="e.g. B.Tech – CSE with specialisation in Quantum Computing"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-purple-500"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">
                        Program Code <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newProgCode}
                        onChange={e => setNewProgCode(e.target.value)}
                        placeholder="e.g. BTECH-QC"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg uppercase font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">Duration (Years)</label>
                      <select
                        value={newProgDuration}
                        onChange={e => setNewProgDuration(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      >
                        <option value={1}>1 Year (2 Semesters)</option>
                        <option value={2}>2 Years (4 Semesters)</option>
                        <option value={3}>3 Years (6 Semesters)</option>
                        <option value={4}>4 Years (8 Semesters)</option>
                        <option value={5}>5 Years (10 Semesters)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Academic Department / School</label>
                    <input
                      type="text"
                      value={newProgDept}
                      onChange={e => setNewProgDept(e.target.value)}
                      placeholder="e.g. Department of Quantum Computing"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      required
                    />
                  </div>

                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Discipline Category</label>
                    <select
                      value={newProgCategory}
                      onChange={e => setNewProgCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    >
                      <option value="Computer Science & Emerging AI">Computer Science & Emerging AI</option>
                      <option value="Engineering & Technology">Engineering & Technology</option>
                      <option value="Management & Business">Management & Business</option>
                      <option value="Commerce & Finance">Commerce & Finance</option>
                      <option value="Design & Arts">Design & Arts</option>
                      <option value="Law & Legal Studies">Law & Legal Studies</option>
                      <option value="Humanities & Social Sciences">Humanities & Social Sciences</option>
                      <option value="Sciences & Mathematics">Sciences & Mathematics</option>
                      <option value="Paramedical & Health Sciences">Paramedical & Health Sciences</option>
                      <option value="Aviation Studies">Aviation Studies</option>
                    </select>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowAddProgram(false)}
                      className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-semibold rounded-lg shadow-xs"
                    >
                      Save Program
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: FACULTY ASSIGNMENTS */}
      {activeTab === 'faculty_assignments' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Assignment Form */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <h3 className="font-bold text-slate-900 text-sm mb-3">Assign Faculty to Subject</h3>
              <form
                onSubmit={e => {
                  e.preventDefault();
                  if (!assignFacultyId || !assignSubjectId || !assignSectionId) return;
                  assignFacultyToSubject(assignFacultyId, assignSubjectId, assignSectionId);
                }}
                className="space-y-3 text-xs"
              >
                <div>
                  <label className="font-medium text-slate-700 block mb-1">Faculty Member</label>
                  <select
                    value={assignFacultyId}
                    onChange={e => setAssignFacultyId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    required
                  >
                    <option value="">-- Choose Faculty --</option>
                    {facultyList.map(f => (
                      <option key={f.id} value={f.id}>{f.name} ({f.department})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-medium text-slate-700 block mb-1">Subject</label>
                  <select
                    value={assignSubjectId}
                    onChange={e => setAssignSubjectId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    required
                  >
                    <option value="">-- Choose Subject --</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-medium text-slate-700 block mb-1">Class Section</label>
                  <select
                    value={assignSectionId}
                    onChange={e => setAssignSectionId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    required
                  >
                    <option value="">-- Choose Section --</option>
                    {sections.map(sec => (
                      <option key={sec.id} value={sec.id}>{sec.name}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-purple-700 hover:bg-purple-800 text-white font-semibold rounded-lg shadow-xs cursor-pointer"
                >
                  Assign Subject & Section
                </button>
              </form>
            </div>

            {/* Assignments Matrix */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <h3 className="font-bold text-slate-900 text-sm mb-3">Active Faculty Assignment Matrix</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="py-2.5 px-3">Faculty Name</th>
                      <th className="py-2.5 px-3">Assigned Subject</th>
                      <th className="py-2.5 px-3">Class Section</th>
                      <th className="py-2.5 px-3">Academic Year</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {facultyAssignments.map(fa => {
                      const fac = users.find(u => u.id === fa.facultyId);
                      const subj = subjects.find(s => s.id === fa.subjectId);
                      const sec = sections.find(s => s.id === fa.sectionId);
                      return (
                        <tr key={fa.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{fac?.name}</td>
                          <td className="py-2.5 px-3 text-slate-800">{subj?.name}</td>
                          <td className="py-2.5 px-3 font-mono text-purple-700 font-medium">{sec?.name}</td>
                          <td className="py-2.5 px-3 text-slate-500 font-mono">2025–2026</td>
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

      {/* TAB 4: TIMETABLE MANAGER */}
      {activeTab === 'timetable' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 text-base">Institutional Timetable Schedule</h3>
            <button
              type="button"
              onClick={() => setShowAddSlot(true)}
              className="px-3.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Timetable Slot</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-2.5 px-3">Day</th>
                    <th className="py-2.5 px-3">Period</th>
                    <th className="py-2.5 px-3">Time</th>
                    <th className="py-2.5 px-3">Subject</th>
                    <th className="py-2.5 px-3">Section</th>
                    <th className="py-2.5 px-3">Faculty</th>
                    <th className="py-2.5 px-3">Room</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {timetableSlots.map(slot => {
                    const subj = subjects.find(s => s.id === slot.subjectId);
                    const sec = sections.find(s => s.id === slot.sectionId);
                    const fac = users.find(u => u.id === slot.facultyId);
                    return (
                      <tr key={slot.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{slot.dayOfWeek}</td>
                        <td className="py-2.5 px-3 font-mono">Period {slot.periodNumber}</td>
                        <td className="py-2.5 px-3 text-slate-600">{slot.startTime} – {slot.endTime}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-900">{subj?.name}</td>
                        <td className="py-2.5 px-3 font-mono text-purple-700">{sec?.name}</td>
                        <td className="py-2.5 px-3 text-slate-700">{fac?.name}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{slot.room}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Slot Modal */}
          {showAddSlot && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
              <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-5">
                <h3 className="font-bold text-slate-900 text-base mb-1">Add Timetable Slot</h3>
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    addTimetableSlot({
                      dayOfWeek: slotDay,
                      subjectId: slotSubj,
                      sectionId: slotSec,
                      facultyId: slotFac,
                      room: slotRoom,
                      startTime: slotStart,
                      endTime: slotEnd,
                      periodNumber: slotPeriod,
                    });
                    setShowAddSlot(false);
                  }}
                  className="space-y-3 text-xs mt-3"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">Day of Week</label>
                      <select
                        value={slotDay}
                        onChange={e => setSlotDay(e.target.value as any)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      >
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="font-medium text-slate-700 block mb-1">Period</label>
                      <input
                        type="number"
                        min={1}
                        max={8}
                        value={slotPeriod}
                        onChange={e => setSlotPeriod(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Subject</label>
                    <select
                      value={slotSubj}
                      onChange={e => setSlotSubj(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    >
                      {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Section</label>
                    <select
                      value={slotSec}
                      onChange={e => setSlotSec(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    >
                      {sections.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Faculty</label>
                    <select
                      value={slotFac}
                      onChange={e => setSlotFac(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    >
                      {facultyList.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">Room</label>
                      <input
                        type="text"
                        value={slotRoom}
                        onChange={e => setSlotRoom(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">Start Time</label>
                      <input
                        type="text"
                        value={slotStart}
                        onChange={e => setSlotStart(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">End Time</label>
                      <input
                        type="text"
                        value={slotEnd}
                        onChange={e => setSlotEnd(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowAddSlot(false)}
                      className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-semibold rounded-lg"
                    >
                      Save Slot
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: ATTENDANCE THRESHOLDS */}
      {activeTab === 'attendance_thresholds' && (
        <div className="space-y-6 max-w-2xl bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <h3 className="font-bold text-slate-900 text-base mb-1">Attendance Threshold & Session Policies</h3>
          <p className="text-xs text-slate-500 mb-4">
            Changes immediately update all student Attendance Recovery Planners and faculty low-attendance alert triggers.
          </p>

          <form
            onSubmit={e => {
              e.preventDefault();
              updateSystemSettings({
                attendanceThresholdPercent: attThreshold,
                honorRollThresholdPercent: honorThreshold,
                sessionWindowMinutes: windowMins,
                lowParticipationThresholdPercent: partThreshold,
              });
              alert('Institution settings saved successfully!');
            }}
            className="space-y-4 text-xs"
          >
            <div>
              <label className="font-semibold text-slate-800 block mb-1">
                Minimum Required Attendance Threshold: {attThreshold}%
              </label>
              <input
                type="range"
                min={60}
                max={90}
                value={attThreshold}
                onChange={e => setAttThreshold(Number(e.target.value))}
                className="w-full accent-purple-700"
              />
              <span className="text-[11px] text-slate-500">
                Institutional standard requirement to appear in final exams (Default 75%).
              </span>
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">
                Honor Roll / Dean's List Threshold: {honorThreshold}%
              </label>
              <input
                type="range"
                min={75}
                max={95}
                value={honorThreshold}
                onChange={e => setHonorThreshold(Number(e.target.value))}
                className="w-full accent-purple-700"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">
                Attendance Session Scan Window: {windowMins} Minutes
              </label>
              <input
                type="number"
                min={5}
                max={30}
                value={windowMins}
                onChange={e => setWindowMins(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
              <span className="text-[11px] text-slate-500">
                Rotating dynamic QR will accept scans only for this duration after scheduled lecture start.
              </span>
            </div>

            <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2">
              <label className="font-semibold text-amber-950 block">
                Critical Student Participation Alert Threshold: {partThreshold}% ({((partThreshold / 100) * 5).toFixed(1)} / 5.0 Marks)
              </label>
              <input
                type="range"
                min={40}
                max={80}
                value={partThreshold}
                onChange={e => setPartThreshold(Number(e.target.value))}
                className="w-full accent-amber-600"
              />
              <span className="text-[11px] text-amber-800 block">
                Enrolled students falling below this participation score percentage receive an immediate proactive notification banner and actionable recovery recommendations to encourage active engagement.
              </span>
            </div>

            <button
              type="submit"
              className="py-2.5 px-4 bg-purple-700 hover:bg-purple-800 text-white font-semibold rounded-lg shadow-xs cursor-pointer"
            >
              Update Institutional Thresholds
            </button>
          </form>
        </div>
      )}

      {/* TAB 6: PARTICIPATION RUBRIC SETTINGS */}
      {activeTab === 'rubric_settings' && (
        <div className="space-y-6 max-w-2xl bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <h3 className="font-bold text-slate-900 text-base mb-1">Participation Score Rubric (Default Weights)</h3>
          <p className="text-xs text-slate-500 mb-4">
            Default weights total 5.0 marks. Ordinary lecture attendance is excluded. When any activity is marked Not Applicable, remaining weights are redistributed proportionally.
          </p>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-900">Assignment Engagement</span>
                <span className="text-[11px] text-slate-500 block">Timeliness, depth, and effort</span>
              </div>
              <span className="font-mono font-bold text-slate-900">1.0 Mark</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-900">Quiz & Live Polls</span>
                <span className="text-[11px] text-slate-500 block">Active participation and attempts</span>
              </div>
              <span className="font-mono font-bold text-slate-900">1.0 Mark</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-900">Coding / Practical Tests</span>
                <span className="text-[11px] text-slate-500 block">Automated test case execution</span>
              </div>
              <span className="font-mono font-bold text-slate-900">1.5 Marks</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-900">Class Discussion & Activities</span>
                <span className="text-[11px] text-slate-500 block">In-class questions, group work, polls</span>
              </div>
              <span className="font-mono font-bold text-slate-900">1.0 Mark</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-900">Consistency & Trajectory</span>
                <span className="text-[11px] text-slate-500 block">Demonstrated improvement streak</span>
              </div>
              <span className="font-mono font-bold text-slate-900">0.5 Mark</span>
            </div>

            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-between font-bold text-purple-950">
              <span>Total Default Score</span>
              <span>5.00 Marks</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: ASSESSMENTS OVERVIEW */}
      {activeTab === 'assessments' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <span className="text-xs text-slate-500 font-semibold uppercase">Total Assignments</span>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-2">{assignments.length}</div>
              <div className="mt-3 space-y-1 text-xs">
                {assignments.map(a => (
                  <div key={a.id} className="truncate text-slate-600">• {a.title}</div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <span className="text-xs text-slate-500 font-semibold uppercase">Quizzes & Live Polls</span>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-2">{quizzes.length}</div>
              <div className="mt-3 space-y-1 text-xs">
                {quizzes.map(q => (
                  <div key={q.id} className="truncate text-slate-600">• {q.title}</div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <span className="text-xs text-slate-500 font-semibold uppercase">Coding Problem Sets</span>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-2">{codingTests.length}</div>
              <div className="mt-3 space-y-1 text-xs">
                {codingTests.map(c => (
                  <div key={c.id} className="truncate text-slate-600">• {c.title}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: INSTITUTIONAL REPORTS */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Institution-Wide Academic Report</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Consolidated student attendance, engagement status, and provisional participation.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const csv = generateStudentsCsv(studentsList, programs, sections, attendanceRecords, systemSettings);
                    const dateStr = new Date().toISOString().split('T')[0];
                    triggerCsvDownload(csv, `attendly_enrolled_students_${dateStr}.csv`);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
                  title="Export all enrolled students as separate CSV"
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Save Students CSV ({studentsList.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const csv = generateTeachersCsv(facultyList, subjects, sections, facultyAssignments, users);
                    const dateStr = new Date().toISOString().split('T')[0];
                    triggerCsvDownload(csv, `attendly_faculty_teachers_${dateStr}.csv`);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
                  title="Export all appointed faculty as separate CSV"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Save Teachers CSV ({facultyList.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const headers = ['Roll Number', 'Student Name', 'Section', 'Overall Attendance %', 'At Risk Flag'];
                    const rows = studentsList.map(st => {
                      const recs = attendanceRecords.filter(r => r.studentId === st.id);
                      const stats = calculateAttendanceStats(recs);
                      const isRisk = stats.percentage < systemSettings.attendanceThresholdPercent ? 'YES' : 'NO';
                      return [
                        st.rollNumber,
                        `"${st.name}"`,
                        `"${sections.find(s => s.id === st.sectionId)?.name}"`,
                        stats.percentage,
                        isRisk,
                      ].join(',');
                    });
                    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
                    const encoded = encodeURI(csv);
                    const a = document.createElement('a');
                    a.href = encoded;
                    a.download = 'Institutional_Attendance_Report_2025_2026.csv';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Institution Summary CSV</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto mt-4">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Roll Number</th>
                    <th className="py-2.5 px-3">Class Section</th>
                    <th className="py-2.5 px-3">Conducted / Present</th>
                    <th className="py-2.5 px-3">Attendance %</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {studentsList.map(st => {
                    const sec = sections.find(s => s.id === st.sectionId);
                    const recs = attendanceRecords.filter(r => r.studentId === st.id);
                    const stats = calculateAttendanceStats(recs);
                    const isUnder = stats.percentage < systemSettings.attendanceThresholdPercent;
                    return (
                      <tr key={st.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{st.name}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{st.rollNumber}</td>
                        <td className="py-2.5 px-3 font-mono text-purple-700">{sec?.name}</td>
                        <td className="py-2.5 px-3 text-slate-600">{stats.conducted} / {stats.present}</td>
                        <td className="py-2.5 px-3 font-mono font-bold">{stats.percentage}%</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              isUnder ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isUnder ? 'Below 75%' : 'Good Standing'}
                          </span>
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

      {/* TAB 9: AUDIT LOGS & PRIVACY SETTINGS */}
      {activeTab === 'audit_logs' && (
        <div className="space-y-6">
          {/* Reasoned Attendance Correction Audit Trail */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <h3 className="font-bold text-slate-900 text-sm mb-1">
              Attendance Reasoned Correction Audit Trail
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              All attendance status modifications require a verified explanation and are immutably logged with teacher identity and timestamp.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Subject</th>
                    <th className="py-2.5 px-3">Previous Status</th>
                    <th className="py-2.5 px-3">New Status</th>
                    <th className="py-2.5 px-3">Faculty Reviewer</th>
                    <th className="py-2.5 px-3">Mandatory Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attendanceCorrectionLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono text-slate-500">{log.timestamp}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">{log.studentName}</td>
                      <td className="py-2.5 px-3 text-slate-700">{log.subjectName}</td>
                      <td className="py-2.5 px-3 font-semibold text-rose-700">{log.previousStatus}</td>
                      <td className="py-2.5 px-3 font-semibold text-emerald-700">{log.newStatus}</td>
                      <td className="py-2.5 px-3 text-slate-800">{log.changedByFacultyName}</td>
                      <td className="py-2.5 px-3 text-slate-600 max-w-sm">{log.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Privacy & Data Retention Policy Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs text-xs space-y-3">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-700" />
              <span>Biometric Privacy & Institutional Data Retention Compliance</span>
            </h4>
            <div className="space-y-1.5 text-slate-600">
              <p>• <strong>Zero Video Storage:</strong> Raw camera video frames are processed transiently in browser memory for liveness checks and are never written to disk or transmitted to a remote server.</p>
              <p>• <strong>No Aadhaar Integration:</strong> The system strictly verifies students against consented internal institutional enrollment photos.</p>
              <p>• <strong>Data Retention Period:</strong> Attendance logs and participation entries are configured for a default retention period of {systemSettings.dataRetentionDays} days, after which records are archived in accordance with academic policy.</p>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
};
