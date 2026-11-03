import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  UserPlus,
  KeyRound,
  ShieldCheck,
  Copy,
  Check,
  Search,
  Download,
  RotateCcw,
  Trash2,
  Users,
  GraduationCap,
  Building2,
  Sparkles,
  AlertCircle,
  Eye,
  EyeOff,
  IdCard,
  UserCheck,
  CheckCircle2,
  ExternalLink,
  Filter,
} from 'lucide-react';
import { User, Role } from '../../types';
import {
  resolveSectionsForProgramAndYear,
  getOrdinalYear,
  getSemesterIdForYear,
} from '../../utils/sectionResolver';
import {
  generateStudentsCsv,
  generateTeachersCsv,
  triggerCsvDownload,
} from '../../utils/csvExporter';

export const IdProvisioningManager: React.FC = () => {
  const {
    users,
    programs,
    semesters,
    sections,
    subjects,
    facultyAssignments,
    attendanceRecords,
    systemSettings,
    createStudentUser,
    createFacultyUser,
    batchCreateStudents,
    resetUserPassword,
    deleteUserAccount,
    setCurrentUser,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'student' | 'faculty' | 'batch' | 'directory'>('student');

  // Student Form State
  const [studentName, setStudentName] = useState('');
  const [studentRoll, setStudentRoll] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentPassword, setStudentPassword] = useState('password123');
  const [studentProgramId, setStudentProgramId] = useState(programs[0]?.id || 'prog-cse');
  const [studentYearOfStudy, setStudentYearOfStudy] = useState<number>(1);
  const [studentSectionId, setStudentSectionId] = useState('');
  const [studentFaceConsent, setStudentFaceConsent] = useState(true);

  // Dynamically resolve student section options
  const selectedStudentProgram = useMemo(() => {
    return programs.find(p => p.id === studentProgramId) || programs[0];
  }, [programs, studentProgramId]);

  const studentYearOptions = useMemo(() => {
    const duration = selectedStudentProgram?.durationYears || 4;
    return Array.from({ length: duration }, (_, i) => i + 1);
  }, [selectedStudentProgram]);

  const resolvedStudentSections = useMemo(() => {
    return resolveSectionsForProgramAndYear(selectedStudentProgram, studentYearOfStudy, sections);
  }, [selectedStudentProgram, studentYearOfStudy, sections]);

  // When program or year changes, ensure studentSectionId is valid
  useEffect(() => {
    if (resolvedStudentSections.length > 0) {
      if (!resolvedStudentSections.some(s => s.id === studentSectionId)) {
        setStudentSectionId(resolvedStudentSections[0].id);
      }
    }
  }, [resolvedStudentSections, studentSectionId]);

  // Faculty Form State
  const [facultyName, setFacultyName] = useState('');
  const [facultyEmpId, setFacultyEmpId] = useState('');
  const [facultyEmail, setFacultyEmail] = useState('');
  const [facultyPassword, setFacultyPassword] = useState('password123');
  const [facultyDept, setFacultyDept] = useState('Computer Science & Engineering');
  const [facultyDesignation, setFacultyDesignation] = useState('Assistant Professor');
  const [assignedSubjectId, setAssignedSubjectId] = useState(subjects[0]?.id || '');
  const [assignedSectionId, setAssignedSectionId] = useState(sections[0]?.id || '');

  // Batch Form State
  const [batchProgramId, setBatchProgramId] = useState(programs[0]?.id || 'prog-cse');
  const [batchYearOfStudy, setBatchYearOfStudy] = useState<number>(1);
  const [batchSectionId, setBatchSectionId] = useState('');
  const [batchPrefix, setBatchPrefix] = useState('2025CS');
  const [batchStartNum, setBatchStartNum] = useState(11);
  const [batchCount, setBatchCount] = useState(5);
  const [batchNamesText, setBatchNamesText] = useState(
    'Kiran Reddy\nAnanya Sen\nVikram Malhotra\nMeera Nair\nAditya Joshi'
  );

  const selectedBatchProgram = useMemo(() => {
    return programs.find(p => p.id === batchProgramId) || programs[0];
  }, [programs, batchProgramId]);

  const batchYearOptions = useMemo(() => {
    const duration = selectedBatchProgram?.durationYears || 4;
    return Array.from({ length: duration }, (_, i) => i + 1);
  }, [selectedBatchProgram]);

  const resolvedBatchSections = useMemo(() => {
    return resolveSectionsForProgramAndYear(selectedBatchProgram, batchYearOfStudy, sections);
  }, [selectedBatchProgram, batchYearOfStudy, sections]);

  useEffect(() => {
    if (resolvedBatchSections.length > 0) {
      if (!resolvedBatchSections.some(s => s.id === batchSectionId)) {
        setBatchSectionId(resolvedBatchSections[0].id);
      }
    }
  }, [resolvedBatchSections, batchSectionId]);

  // Directory Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'faculty'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});

  // Feedback State
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [issuedSlipUser, setIssuedSlipUser] = useState<User | null>(null);

  // Auto-fill student email as roll number changes
  const handleRollChange = (val: string) => {
    setStudentRoll(val);
    if (!studentEmail || studentEmail.endsWith('@student.univ.edu')) {
      const clean = val.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      setStudentEmail(clean ? `${clean}@student.univ.edu` : '');
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const togglePasswordVisibility = (userId: string) => {
    setShowPasswordMap(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (!studentName.trim() || !studentRoll.trim()) {
        setErrorMessage('Student Name and Roll Number are required.');
        return;
      }

      const chosenSection = resolvedStudentSections.find(s => s.id === studentSectionId) || resolvedStudentSections[0];
      const targetSecId = chosenSection ? chosenSection.id : studentSectionId;
      const targetSecName = chosenSection ? chosenSection.name : studentSectionId;
      const semId = getSemesterIdForYear(studentYearOfStudy);

      const created = createStudentUser({
        name: studentName,
        rollNumber: studentRoll,
        email: studentEmail,
        password: studentPassword,
        programId: studentProgramId,
        semesterId: semId,
        sectionId: targetSecId,
        yearOfStudy: studentYearOfStudy,
        sectionName: targetSecName,
        faceConsentGiven: studentFaceConsent,
      });

      setIssuedSlipUser(created);
      setSuccessMessage(`Student ID ${created.rollNumber} successfully created and registered!`);
      // Reset form
      setStudentName('');
      setStudentRoll('');
      setStudentEmail('');
      setStudentPassword('password123');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create student account.');
    }
  };

  const handleCreateFaculty = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (!facultyName.trim() || !facultyEmail.trim()) {
        setErrorMessage('Faculty Name and Email are required.');
        return;
      }

      const created = createFacultyUser({
        name: facultyName,
        email: facultyEmail,
        employeeId: facultyEmpId || undefined,
        password: facultyPassword,
        department: facultyDept,
        designation: facultyDesignation,
        subjectIds: assignedSubjectId ? [assignedSubjectId] : [],
        sectionIds: assignedSectionId ? [assignedSectionId] : [],
      });

      setIssuedSlipUser(created);
      setSuccessMessage(`Faculty ID ${created.id.toUpperCase()} successfully created!`);
      // Reset form
      setFacultyName('');
      setFacultyEmpId('');
      setFacultyEmail('');
      setFacultyPassword('password123');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create faculty account.');
    }
  };

  const handleBatchGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const names = batchNamesText
        .split('\n')
        .map(n => n.trim())
        .filter(n => n.length > 0);

      if (names.length === 0) {
        setErrorMessage('Please provide at least one student name.');
        return;
      }

      const chosenBatchSection = resolvedBatchSections.find(s => s.id === batchSectionId) || resolvedBatchSections[0];
      const targetSecId = chosenBatchSection ? chosenBatchSection.id : batchSectionId;
      const targetSecName = chosenBatchSection ? chosenBatchSection.name : batchSectionId;
      const semId = getSemesterIdForYear(batchYearOfStudy);

      const studentsPayload = names.map((name, i) => {
        const rollNum = `${batchPrefix}${String(batchStartNum + i).padStart(2, '0')}`;
        return {
          name,
          rollNumber: rollNum,
          email: `${rollNum.toLowerCase()}@student.univ.edu`,
          password: 'password123',
          programId: batchProgramId,
          semesterId: semId,
          sectionId: targetSecId,
          yearOfStudy: batchYearOfStudy,
          sectionName: targetSecName,
        };
      });

      const result = batchCreateStudents(studentsPayload);
      setSuccessMessage(`Batch generated ${result.length} student IDs for section successfully!`);
      setActiveSubTab('directory');
    } catch (err: any) {
      setErrorMessage(err.message || 'Batch creation failed.');
    }
  };

  const handleResetPassword = (user: User) => {
    const newPass = prompt(`Enter new password for ${user.name} (${user.rollNumber || user.id}):`, 'password123');
    if (newPass) {
      resetUserPassword(user.id, newPass);
      setSuccessMessage(`Password updated for ${user.name}.`);
    }
  };

  const handleDelete = (user: User) => {
    if (confirm(`Are you sure you want to delete account for ${user.name} (${user.rollNumber || user.id})?`)) {
      deleteUserAccount(user.id);
      setSuccessMessage(`User ${user.name} deleted.`);
    }
  };

  // Filtered users for directory
  const filteredUsers = users.filter(u => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.rollNumber && u.rollNumber.toLowerCase().includes(q)) ||
      u.id.toLowerCase().includes(q)
    );
  });

  const studentsCount = users.filter(u => u.role === 'student').length;
  const facultyCount = users.filter(u => u.role === 'faculty').length;
  const adminProvisionedCount = users.filter(u => u.createdByAdmin).length;

  // Export handlers for separate student and faculty CSVs
  const handleExportStudentsCsv = () => {
    const studentUsers = users.filter(u => u.role === 'student');
    const csv = generateStudentsCsv(studentUsers, programs, sections, attendanceRecords, systemSettings);
    const dateStr = new Date().toISOString().split('T')[0];
    triggerCsvDownload(csv, `attendly_enrolled_students_${dateStr}.csv`);
    setSuccessMessage(`Successfully exported ${studentUsers.length} enrolled students data as a separate CSV.`);
  };

  const handleExportTeachersCsv = () => {
    const facultyUsers = users.filter(u => u.role === 'faculty');
    const csv = generateTeachersCsv(facultyUsers, subjects, sections, facultyAssignments, users);
    const dateStr = new Date().toISOString().split('T')[0];
    triggerCsvDownload(csv, `attendly_faculty_teachers_${dateStr}.csv`);
    setSuccessMessage(`Successfully exported ${facultyUsers.length} appointed faculty & course assignments as a separate CSV.`);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner: Institutional IAM Policy */}
      <div className="bg-gradient-to-r from-[#162b78] to-[#10205c] rounded-2xl p-6 text-white shadow-sm border border-blue-900/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-amber-400 text-slate-900 text-[10px] font-bold uppercase tracking-wider">
                Admin Exclusive Authority
              </span>
              <span className="text-blue-200 text-xs flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Zero Public Sign-up Policy Active
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <IdCard className="w-6 h-6 text-blue-300" />
              Institutional Identity & User ID Provisioning
            </h2>
            <p className="text-xs sm:text-sm text-blue-100/90 max-w-2xl leading-relaxed">
              In accordance with university regulations, students and faculty are restricted to login only.
              Only verified Institute Administrators possess credentials to generate Student Roll Numbers,
              provision Faculty Accounts, and manage institutional directory rosters.
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap lg:flex-col gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveSubTab('directory')}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Users className="w-4 h-4 text-blue-200" />
              <span>View Directory ({users.length})</span>
            </button>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleExportStudentsCsv}
                className="flex-1 px-3 py-1.5 bg-emerald-600/90 hover:bg-emerald-600 text-white rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                title="Download all enrolled students with classes, rolls, and attendance"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save Students CSV</span>
              </button>
              <button
                type="button"
                onClick={handleExportTeachersCsv}
                className="flex-1 px-3 py-1.5 bg-sky-600/90 hover:bg-sky-600 text-white rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                title="Download all faculty members with assigned subjects and classes"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save Teachers CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10">
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <div className="text-[11px] text-blue-200 font-medium">Enrolled Students</div>
            <div className="text-lg font-bold text-white mt-0.5 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-emerald-400" />
              {studentsCount}
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <div className="text-[11px] text-blue-200 font-medium">Appointed Faculty</div>
            <div className="text-lg font-bold text-white mt-0.5 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-blue-300" />
              {facultyCount}
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <div className="text-[11px] text-blue-200 font-medium">Admin-Provisioned IDs</div>
            <div className="text-lg font-bold text-amber-300 mt-0.5 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              {adminProvisionedCount} Custom
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <div className="text-[11px] text-blue-200 font-medium">Public Registration</div>
            <div className="text-xs font-bold text-rose-300 mt-1 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
              Disabled (Strict IAM)
            </div>
          </div>
        </div>
      </div>

      {/* Action Messages */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-900 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-700 hover:text-rose-900 text-xs font-bold px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Issued Credential Slip Modal */}
      {issuedSlipUser && (
        <div className="bg-amber-50/70 border-2 border-amber-300 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold">
                <IdCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Official Institutional Credential Slip Generated
                </h3>
                <p className="text-[11px] text-slate-600">
                  Issue these credentials to the user. They can now immediately log in via the main portal.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIssuedSlipUser(null)}
              className="text-slate-400 hover:text-slate-700 text-sm font-bold"
            >
              ✕ Dismiss
            </button>
          </div>

          <div className="bg-white border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src={issuedSlipUser.avatarUrl}
                alt={issuedSlipUser.name}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-amber-200"
              />
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">{issuedSlipUser.name}</span>
                  <span
                    className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                      issuedSlipUser.role === 'student'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {issuedSlipUser.role}
                  </span>
                </div>
                <div className="text-xs text-slate-600">
                  User ID / Roll No:{' '}
                  <span className="font-mono font-bold text-indigo-900 bg-indigo-50 px-1.5 py-0.5 rounded">
                    {issuedSlipUser.rollNumber || issuedSlipUser.id}
                  </span>
                </div>
                <div className="text-xs text-slate-500">Email: {issuedSlipUser.email}</div>
                <div className="text-xs text-slate-600">
                  Initial Password:{' '}
                  <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                    {issuedSlipUser.password || 'password123'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() =>
                  handleCopy(
                    `--- ATTENDLY AI CREDENTIAL SLIP ---\nName: ${issuedSlipUser.name}\nRole: ${issuedSlipUser.role.toUpperCase()}\nUser ID / Roll: ${issuedSlipUser.rollNumber || issuedSlipUser.id}\nEmail: ${issuedSlipUser.email}\nInitial Password: ${issuedSlipUser.password || 'password123'}\nPortal URL: http://localhost:3000\n---------------------------------`,
                    'slip-copy'
                  )
                }
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {copiedId === 'slip-copy' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedId === 'slip-copy' ? 'Copied Slip!' : 'Copy Full Credential Slip'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentUser(issuedSlipUser);
                }}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Switch to this Account</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Provisioning Sub-Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl p-1.5 flex flex-wrap gap-1 shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveSubTab('student')}
          className={`flex-1 min-w-[130px] py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'student'
              ? 'bg-[#162b78] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Issue Student ID</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('faculty')}
          className={`flex-1 min-w-[130px] py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'faculty'
              ? 'bg-[#162b78] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Issue Faculty ID</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('batch')}
          className={`flex-1 min-w-[130px] py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'batch'
              ? 'bg-[#162b78] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Batch Class Generator</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('directory')}
          className={`flex-1 min-w-[130px] py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'directory'
              ? 'bg-[#162b78] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Provisioned Directory</span>
          <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 text-[10px] rounded-full">
            {users.length}
          </span>
        </button>
      </div>

      {/* TAB 1: Issue Student ID */}
      {activeSubTab === 'student' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-700" />
                Issue Individual Student Roll Number & Credentials
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Generates a permanent university roll number, academic enrollment profile, and initial login password.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
              Immediate Login Enabled
            </span>
          </div>

          <form onSubmit={handleCreateStudent} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Student Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rohith Verma"
                  value={studentName}
                  onChange={e => setStudentName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Institutional Roll Number / User ID <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2025CS99"
                    value={studentRoll}
                    onChange={e => handleRollChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono uppercase bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const cleanCode = (selectedStudentProgram?.code || 'CS').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
                      const sampleRoll = `2025${cleanCode}${Math.floor(10 + Math.random() * 89)}`;
                      handleRollChange(sampleRoll);
                    }}
                    className="absolute right-2 top-2 text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold px-2 py-0.5 bg-indigo-50 rounded"
                  >
                    Suggest Roll
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Official University Email
                </label>
                <input
                  type="email"
                  placeholder="Auto-generated if left blank"
                  value={studentEmail}
                  onChange={e => setStudentEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Initial / Temporary Password
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={studentPassword}
                    onChange={e => setStudentPassword(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setStudentPassword(`Pass#${Math.floor(1000 + Math.random() * 9000)}`)}
                    className="absolute right-2 top-2 text-[10px] text-slate-600 hover:text-slate-900 font-semibold px-2 py-0.5 bg-slate-200 rounded"
                  >
                    Generate Random
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Program of Study <span className="text-rose-500">*</span>
                </label>
                <select
                  value={studentProgramId}
                  onChange={e => {
                    const newProgId = e.target.value;
                    setStudentProgramId(newProgId);
                    const prog = programs.find(p => p.id === newProgId);
                    if (prog && studentYearOfStudy > prog.durationYears) {
                      setStudentYearOfStudy(1);
                    }
                  }}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                >
                  {Array.from(new Set(programs.map(p => p.category || 'General Programs'))).map(cat => (
                    <optgroup key={cat} label={`── ${cat} ──`}>
                      {programs
                        .filter(p => (p.category || 'General Programs') === cat)
                        .map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.code})
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Year of Study Box */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Year of Study <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-50 px-1.5 py-0.2 rounded">
                    {selectedStudentProgram?.durationYears}-Year Degree
                  </span>
                </label>
                <select
                  value={studentYearOfStudy}
                  onChange={e => setStudentYearOfStudy(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white font-medium text-slate-800"
                >
                  {studentYearOptions.map(yr => (
                    <option key={yr} value={yr}>
                      {getOrdinalYear(yr)} (Semester {(yr * 2) - 1} & {yr * 2})
                    </option>
                  ))}
                </select>
              </div>

              {/* Enrolled Section / Class Box - Tailored to Program & Year */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Enrolled Section / Class <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    Classes tailored for {selectedStudentProgram?.code} · {getOrdinalYear(studentYearOfStudy)}
                  </span>
                </label>
                <select
                  value={studentSectionId}
                  onChange={e => setStudentSectionId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white font-medium text-slate-800"
                >
                  {resolvedStudentSections.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.isExisting ? `(${s.studentCount} enrolled)` : `(Standard Section)`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={studentFaceConsent}
                  onChange={e => setStudentFaceConsent(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                />
                <span className="text-xs text-slate-600">
                  Pre-approve digital face consent verification (Institue Bio-Policy Compliant)
                </span>
              </label>

              <button
                type="submit"
                className="px-5 py-2.5 bg-[#162b78] hover:bg-[#10205c] text-white text-xs font-bold rounded-lg shadow-xs hover:shadow transition-all flex items-center gap-2 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Issue & Register Student ID</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: Issue Faculty ID */}
      {activeSubTab === 'faculty' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-700" />
                Appoint & Provision Faculty Account
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Provisions official faculty credentials, assigns department, and authorizes class attendance sessions.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md">
              Teaching Credentials
            </span>
          </div>

          <form onSubmit={handleCreateFaculty} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Faculty Full Name & Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Harish Chandra"
                  value={facultyName}
                  onChange={e => setFacultyName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Employee ID / Faculty Code
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. FAC-2025-09 (Auto if blank)"
                    value={facultyEmpId}
                    onChange={e => setFacultyEmpId(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono uppercase bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setFacultyEmpId(`FAC-2025-${Math.floor(10 + Math.random() * 89)}`)}
                    className="absolute right-2 top-2 text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold px-2 py-0.5 bg-indigo-50 rounded"
                  >
                    Suggest ID
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Official Institutional Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. h.chandra@univ.edu"
                  value={facultyEmail}
                  onChange={e => setFacultyEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Initial / Temporary Password
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={facultyPassword}
                    onChange={e => setFacultyPassword(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setFacultyPassword(`Prof#${Math.floor(1000 + Math.random() * 9000)}`)}
                    className="absolute right-2 top-2 text-[10px] text-slate-600 hover:text-slate-900 font-semibold px-2 py-0.5 bg-slate-200 rounded"
                  >
                    Generate Random
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Academic Department
                </label>
                <select
                  value={facultyDept}
                  onChange={e => setFacultyDept(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                >
                  <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                  <option value="AI & Data Science">AI & Data Science</option>
                  <option value="Information Technology">Information Technology</option>
                  <option value="Humanities & Management">Humanities & Management</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Designation
                </label>
                <select
                  value={facultyDesignation}
                  onChange={e => setFacultyDesignation(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                >
                  <option value="Assistant Professor">Assistant Professor</option>
                  <option value="Associate Professor">Associate Professor</option>
                  <option value="Professor">Professor</option>
                  <option value="Visiting Lecturer">Visiting Lecturer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assign Course / Subject (Optional)
                </label>
                <select
                  value={assignedSubjectId}
                  onChange={e => setAssignedSubjectId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                >
                  <option value="">-- No initial course assignment --</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assign Section / Class (Optional)
                </label>
                <select
                  value={assignedSectionId}
                  onChange={e => setAssignedSectionId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                >
                  <option value="">-- No initial section assignment --</option>
                  {sections.map(sec => (
                    <option key={sec.id} value={sec.id}>
                      {sec.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#162b78] hover:bg-[#10205c] text-white text-xs font-bold rounded-lg shadow-xs hover:shadow transition-all flex items-center gap-2 cursor-pointer"
              >
                <Building2 className="w-4 h-4" />
                <span>Issue & Register Faculty ID</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: Batch Class Generator */}
      {activeSubTab === 'batch' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-700" />
                Section Roster Batch ID Provisioner
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Quickly provision and register an entire cohort of students for a specific section or lab batch.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-md">
              High Throughput
            </span>
          </div>

          <form onSubmit={handleBatchGenerate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Program
                </label>
                <select
                  value={batchProgramId}
                  onChange={e => {
                    const newProgId = e.target.value;
                    setBatchProgramId(newProgId);
                    const prog = programs.find(p => p.id === newProgId);
                    if (prog) {
                      const cleanCode = (prog.code || 'CS').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
                      setBatchPrefix(`2025${cleanCode}`);
                      if (batchYearOfStudy > prog.durationYears) {
                        setBatchYearOfStudy(1);
                      }
                    }
                  }}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden"
                >
                  {Array.from(new Set(programs.map(p => p.category || 'General Programs'))).map(cat => (
                    <optgroup key={cat} label={`── ${cat} ──`}>
                      {programs
                        .filter(p => (p.category || 'General Programs') === cat)
                        .map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.code})
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Year of Study Box for Batch */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Year of Study</span>
                  <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-50 px-1.5 py-0.2 rounded">
                    {selectedBatchProgram?.durationYears}Y Program
                  </span>
                </label>
                <select
                  value={batchYearOfStudy}
                  onChange={e => setBatchYearOfStudy(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden font-medium text-slate-800"
                >
                  {batchYearOptions.map(yr => (
                    <option key={yr} value={yr}>
                      {getOrdinalYear(yr)} (Sem {(yr * 2) - 1}&{yr * 2})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Target Section / Class</span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    {selectedBatchProgram?.code} · {getOrdinalYear(batchYearOfStudy)}
                  </span>
                </label>
                <select
                  value={batchSectionId}
                  onChange={e => setBatchSectionId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden font-medium text-slate-800"
                >
                  {resolvedBatchSections.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.isExisting ? `(${s.studentCount} enrolled)` : `(Standard Section)`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Roll Prefix & Start Number
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={batchPrefix}
                    onChange={e => setBatchPrefix(e.target.value.toUpperCase())}
                    placeholder="2025CS"
                    className="w-1/2 px-3 py-2 text-sm font-mono uppercase bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden"
                  />
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={batchStartNum}
                    onChange={e => setBatchStartNum(Number(e.target.value))}
                    className="w-1/2 px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Student Names (One per line)
              </label>
              <textarea
                rows={5}
                value={batchNamesText}
                onChange={e => setBatchNamesText(e.target.value)}
                placeholder="Enter one student name per line..."
                className="w-full p-3 text-sm font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Each line will receive sequential roll numbers (e.g., {batchPrefix}{String(batchStartNum).padStart(2, '0')}, {batchPrefix}{String(batchStartNum + 1).padStart(2, '0')}...) with default password <span className="font-mono">password123</span>.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#162b78] hover:bg-[#10205c] text-white text-xs font-bold rounded-lg shadow-xs hover:shadow transition-all flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Generate Batch of {batchNamesText.split('\n').filter(n => n.trim()).length} Student IDs</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: Provisioned Directory */}
      {activeSubTab === 'directory' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-700" />
                Registered Institutional ID Directory
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                All issued User IDs, Roll Numbers, role access levels, and credentials.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExportStudentsCsv}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Download all enrolled student data (programs, roll numbers, sections, attendance stats)"
              >
                <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                <span>Save Students CSV ({studentsCount})</span>
              </button>

              <button
                type="button"
                onClick={handleExportTeachersCsv}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Download all faculty data (departments, designations, course assignments, sections handled)"
              >
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Save Teachers CSV ({facultyCount})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const csvContent =
                    'data:text/csv;charset=utf-8,' +
                    ['Name,Role,UserID_or_Roll,Email,AuthMethod,Status', ...users.map(u => `"${u.name}","${u.role}","${u.rollNumber || u.id}","${u.email}","Firebase Auth","Active"`)].join('\n');
                  const encodedUri = encodeURI(csvContent);
                  const link = document.createElement('a');
                  link.setAttribute('href', encodedUri);
                  link.setAttribute('download', `attendly_roster_accounts_${new Date().toISOString().split('T')[0]}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Export user accounts roster"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Roster CSV</span>
              </button>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by name, roll, or email..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-1 self-start sm:self-auto text-xs">
              <button
                type="button"
                onClick={() => setRoleFilter('all')}
                className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer ${
                  roleFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All ({users.length})
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('student')}
                className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer ${
                  roleFilter === 'student' ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                Students ({studentsCount})
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('faculty')}
                className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer ${
                  roleFilter === 'faculty' ? 'bg-blue-700 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                Faculty ({facultyCount})
              </button>
            </div>
          </div>

          {/* Directory Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">User Details</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">Official User ID / Roll</th>
                  <th className="py-3 px-3">Department / Class</th>
                  <th className="py-3 px-3">Authentication</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No accounts matched your search query.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(user => {
                    const isCopied = copiedId === user.id;

                    return (
                      <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={user.avatarUrl}
                              alt={user.name}
                              className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                                <span>{user.name}</span>
                                {user.createdByAdmin && (
                                  <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1 py-0.2 rounded">
                                    New
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 truncate">{user.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                              user.role === 'admin'
                                ? 'bg-purple-100 text-purple-700'
                                : user.role === 'faculty'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {user.role}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <span className="font-mono font-bold text-indigo-950 bg-indigo-50/80 px-2 py-0.5 rounded border border-indigo-100">
                            {user.rollNumber || user.id}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-slate-600">
                          {user.role === 'student' ? (
                            <div className="space-y-0.5">
                              <div className="font-semibold text-slate-900 text-xs">
                                {sections.find(s => s.id === user.sectionId)?.name || user.sectionId || 'Class Assigned'}
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap">
                                <span>{programs.find(p => p.id === user.programId)?.code || programs.find(p => p.id === user.programId)?.name || 'Degree'}</span>
                                {user.yearOfStudy && (
                                  <span className="px-1.5 py-0.2 rounded bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-[10px]">
                                    {getOrdinalYear(user.yearOfStudy)}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            user.department || 'Academic Division'
                          )}
                        </td>

                        <td className="py-3 px-3">
                          <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-50 border border-amber-200/80 rounded-md text-[11px] font-medium text-amber-900">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Firebase Auth</span>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                handleCopy(
                                  `Name: ${user.name}\nUser ID: ${user.rollNumber || user.id}\nEmail: ${user.email}\nRole: ${user.role}\nAuthentication: Managed via Firebase Auth`,
                                  user.id
                                )
                              }
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                              title="Copy Credentials"
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleResetPassword(user)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                              title="Reset Password"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setCurrentUser(user);
                              }}
                              className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                              title="Login As This User"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                            </button>

                            {user.role !== 'admin' && (
                              <button
                                type="button"
                                onClick={() => handleDelete(user)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                title="Delete ID"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
