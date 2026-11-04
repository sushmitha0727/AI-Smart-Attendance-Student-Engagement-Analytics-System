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
  Camera,
  CheckSquare,
  XSquare,
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
import { uploadProfileImage } from '../../services/storageService';
import { resizeImageToJpeg, validateRegistrationPhotoWithTimeout } from '../../utils/faceVerification';
import { compressPhoto, saveStudentPhoto, getStudentPhoto } from '../../services/photoService';
import { db } from '../../firebase/config';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';

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
    updateUserProfilePhoto,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'student' | 'faculty' | 'batch' | 'directory' | 'requests'>('student');

  // Photo Requests State
  const [photoRequests, setPhotoRequests] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'photoChangeRequests'),
      snap => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setPhotoRequests(list);
      },
      err => console.warn('Photo requests subscription notice:', err)
    );
    return () => unsub();
  }, []);

  // Student Photo Cache in React State (only)
  const [studentPhotoCache, setStudentPhotoCache] = useState<Record<string, string>>({});

  useEffect(() => {
    let isMounted = true;
    const studentUsers = users.filter(u => u.role === 'student');
    studentUsers.forEach(async student => {
      if (!studentPhotoCache[student.id]) {
        try {
          const photo = await getStudentPhoto(student.id);
          if (isMounted && photo) {
            setStudentPhotoCache(prev => ({ ...prev, [student.id]: photo }));
          }
        } catch (err) {
          console.error(`Failed to fetch photo for student ${student.id}:`, err);
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, [users]);

  // Admin Edit Photo Modal State
  const [showAdminPhotoModal, setShowAdminPhotoModal] = useState(false);
  const [editingPhotoUser, setEditingPhotoUser] = useState<User | null>(null);
  const [adminNewPhotoUrl, setAdminNewPhotoUrl] = useState('');
  const [adminNewPhotoFile, setAdminNewPhotoFile] = useState<File | null>(null);
  const [adminPhotoUploading, setAdminPhotoUploading] = useState(false);
  const [adminPhotoStep, setAdminPhotoStep] = useState<string | null>(null);
  const [photoSaveStep, setPhotoSaveStep] = useState<string | null>(null);

  // Student Form State
  const [studentName, setStudentName] = useState('');
  const [studentRoll, setStudentRoll] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentPassword, setStudentPassword] = useState('password123');
  const [studentProgramId, setStudentProgramId] = useState(programs[0]?.id || 'prog-cse');
  const [studentYearOfStudy, setStudentYearOfStudy] = useState<number>(1);
  const [studentSectionId, setStudentSectionId] = useState('');
  const [studentFaceConsent, setStudentFaceConsent] = useState(true);
  const [studentPhotoFile, setStudentPhotoFile] = useState<File | null>(null);
  const [studentPhotoPreview, setStudentPhotoPreview] = useState<string | null>(null);

  // Faculty Form State
  const [facultyName, setFacultyName] = useState('');
  const [facultyEmpId, setFacultyEmpId] = useState('');
  const [facultyEmail, setFacultyEmail] = useState('');
  const [facultyPassword, setFacultyPassword] = useState('password123');
  const [facultyDept, setFacultyDept] = useState('Computer Science & Engineering');
  const [facultyDesignation, setFacultyDesignation] = useState('Assistant Professor');
  const [assignedSubjectId, setAssignedSubjectId] = useState(subjects[0]?.id || '');
  const [assignedSectionId, setAssignedSectionId] = useState(sections[0]?.id || '');
  const [facultyPhotoFile, setFacultyPhotoFile] = useState<File | null>(null);
  const [facultyPhotoPreview, setFacultyPhotoPreview] = useState<string | null>(null);

  // Batch Form State
  const [batchProgramId, setBatchProgramId] = useState(programs[0]?.id || 'prog-cse');
  const [batchYearOfStudy, setBatchYearOfStudy] = useState<number>(1);
  const [batchSectionId, setBatchSectionId] = useState('');
  const [batchPrefix, setBatchPrefix] = useState('2025CS');
  const [batchStartNum, setBatchStartNum] = useState(11);
  const [batchNamesText, setBatchNamesText] = useState(
    'Kiran Reddy\nAnanya Sen\nVikram Malhotra\nMeera Nair\nAditya Joshi'
  );

  // Directory Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'faculty'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Feedback State
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [issuedSlipUser, setIssuedSlipUser] = useState<User | null>(null);

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

  useEffect(() => {
    if (resolvedStudentSections.length > 0) {
      if (!resolvedStudentSections.some(s => s.id === studentSectionId)) {
        setStudentSectionId(resolvedStudentSections[0].id);
      }
    }
  }, [resolvedStudentSections, studentSectionId]);

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

  const [isCreatingStudent, setIsCreatingStudent] = useState(false);

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!studentName.trim() || !studentRoll.trim()) {
      setErrorMessage('Student Name and Roll Number are required.');
      return;
    }

    setIsCreatingStudent(true);
    let created: User | null = null;

    try {
      const chosenSection = resolvedStudentSections.find(s => s.id === studentSectionId) || resolvedStudentSections[0];
      const targetSecId = chosenSection ? chosenSection.id : studentSectionId;
      const targetSecName = chosenSection ? chosenSection.name : studentSectionId;
      const semId = getSemesterIdForYear(studentYearOfStudy);

      // Requirement 4: Create the student FIRST.
      created = createStudentUser({
        name: studentName.trim(),
        rollNumber: studentRoll.trim().toUpperCase(),
        email: studentEmail.trim() || `${studentRoll.trim().toLowerCase()}@student.univ.edu`,
        password: studentPassword,
        programId: studentProgramId,
        semesterId: semId,
        sectionId: targetSecId,
        yearOfStudy: studentYearOfStudy,
        sectionName: targetSecName,
        faceConsentGiven: studentFaceConsent,
        hasRegisteredPhoto: false,
      });

      setIssuedSlipUser(created);

      // Attempt photo save using photoService if provided
      if (studentPhotoFile || studentPhotoPreview) {
        try {
          const photoToCompress = studentPhotoFile || (await (await fetch(studentPhotoPreview!)).blob());

          setPhotoSaveStep('Compressing...');
          const dataUrl = await compressPhoto(photoToCompress);

          setPhotoSaveStep('Saving...');
          await saveStudentPhoto(created.id, dataUrl, studentFaceConsent);

          setPhotoSaveStep('Saved');
          // Cache photo in React state only
          setStudentPhotoCache(prev => ({ ...prev, [created!.id]: dataUrl }));
          setSuccessMessage(`Student ID ${created.rollNumber} successfully created and registered with face photo!`);
        } catch (photoErr: any) {
          console.error('[Photo Save] Error saving student photo:', photoErr);
          // Requirement 4: Never block student creation. Show this exact message:
          setErrorMessage('Student created, but the photo could not be saved. You can add it later.');
        }
      } else {
        setSuccessMessage(`Student ID ${created.rollNumber} successfully created!`);
      }

      setStudentName('');
      setStudentRoll('');
      setStudentEmail('');
      setStudentPhotoFile(null);
      setStudentPhotoPreview(null);
    } catch (err: any) {
      console.error('[Student Creation] Error creating student account:', err);
      setErrorMessage(err.message || 'Failed to create student account.');
    } finally {
      setIsCreatingStudent(false);
      setPhotoSaveStep(null);
    }
  };

  const handleCreateFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (!facultyName.trim() || !facultyEmail.trim()) {
        setErrorMessage('Faculty Name and Email are required.');
        return;
      }

      const facultyId = facultyEmpId || `fac-${Date.now().toString(36)}`;
      let facultyAvatar = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80';

      if (facultyPhotoFile) {
        try {
          facultyAvatar = await compressPhoto(facultyPhotoFile);
        } catch (photoErr) {
          console.error('Faculty photo compression notice:', photoErr);
        }
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
        avatarUrl: facultyAvatar,
      });

      setIssuedSlipUser(created);
      setSuccessMessage(`Faculty ID successfully created and appointed!`);
      setFacultyName('');
      setFacultyEmpId('');
      setFacultyEmail('');
      setFacultyPhotoFile(null);
      setFacultyPhotoPreview(null);
    } catch (err: any) {
      console.error('Faculty creation error:', err);
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
      setSuccessMessage(`Batch generated ${result.length} student IDs successfully!`);
      setActiveSubTab('directory');
    } catch (err: any) {
      setErrorMessage(err.message || 'Batch creation failed.');
    }
  };

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

  const handleExportStudentsCsv = () => {
    const studentUsers = users.filter(u => u.role === 'student');
    const csv = generateStudentsCsv(studentUsers, programs, sections, attendanceRecords, systemSettings);
    triggerCsvDownload(csv, `attendly_enrolled_students_${new Date().toISOString().split('T')[0]}.csv`);
    setSuccessMessage(`Successfully exported ${studentUsers.length} enrolled students data as CSV.`);
  };

  const handleExportTeachersCsv = () => {
    const facultyUsers = users.filter(u => u.role === 'faculty');
    const csv = generateTeachersCsv(facultyUsers, subjects, sections, facultyAssignments, users);
    triggerCsvDownload(csv, `attendly_faculty_teachers_${new Date().toISOString().split('T')[0]}.csv`);
    setSuccessMessage(`Successfully exported ${facultyUsers.length} faculty data as CSV.`);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
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
              Provision student roll numbers, faculty credentials, manage photos, and review requests.
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap lg:flex-col gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveSubTab('directory')}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/25 border border-white/20 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Users className="w-4 h-4 text-blue-200" />
              <span>View Directory ({users.length})</span>
            </button>
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
            <div className="text-[11px] text-blue-200 font-medium">Photo Change Requests</div>
            <div className="text-lg font-bold text-amber-300 mt-0.5 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              {photoRequests.filter(r => r.status === 'Pending').length} Pending
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

      {/* Action Feedback Messages */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
          <span className="font-semibold">{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="font-bold">✕</button>
        </div>
      )}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-900">
          <span className="font-semibold">{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="font-bold">✕</button>
        </div>
      )}

      {/* Provisioning Sub-Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl p-1.5 flex flex-wrap gap-1 shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveSubTab('student')}
          className={`flex-1 min-w-[120px] py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'student' ? 'bg-[#162b78] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Issue Student ID</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('faculty')}
          className={`flex-1 min-w-[120px] py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'faculty' ? 'bg-[#162b78] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Issue Faculty ID</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('batch')}
          className={`flex-1 min-w-[120px] py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'batch' ? 'bg-[#162b78] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Batch Generator</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('directory')}
          className={`flex-1 min-w-[120px] py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'directory' ? 'bg-[#162b78] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Directory ({users.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('requests')}
          className={`flex-1 min-w-[120px] py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'requests' ? 'bg-[#162b78] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>Photo Requests ({photoRequests.filter(r => r.status === 'Pending').length})</span>
        </button>
      </div>

      {/* TAB 1: Issue Student ID */}
      {activeSubTab === 'student' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-700" />
              Issue Individual Student Roll Number & Credentials (with Required Face Photo)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Generates permanent university roll number and uploads required enrollment face photo.
            </p>
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
                  className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Institutional Roll Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2025CS99"
                  value={studentRoll}
                  onChange={e => handleRollChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono uppercase text-slate-900 bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Official University Email</label>
                <input
                  type="email"
                  placeholder="Auto-generated if blank"
                  value={studentEmail}
                  onChange={e => setStudentEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Password</label>
                <input
                  type="text"
                  value={studentPassword}
                  onChange={e => setStudentPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono text-slate-900 bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Program of Study</label>
                <select
                  value={studentProgramId}
                  onChange={e => setStudentProgramId(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg cursor-pointer"
                >
                  {programs.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Year of Study</label>
                <select
                  value={studentYearOfStudy}
                  onChange={e => setStudentYearOfStudy(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg cursor-pointer"
                >
                  {studentYearOptions.map(yr => (
                    <option key={yr} value={yr}>{getOrdinalYear(yr)} Year</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Enrolled Section</label>
                <select
                  value={studentSectionId}
                  onChange={e => setStudentSectionId(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg cursor-pointer"
                >
                  {resolvedStudentSections.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Required Student Photo Upload Box */}
              <div className="md:col-span-2 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <label className="block text-xs font-semibold text-slate-800">
                  Required Student Face Photo (Single clear face validated) <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-4">
                  {studentPhotoPreview && (
                    <img src={studentPhotoPreview} alt="Preview" className="w-16 h-16 rounded-full object-cover ring-2 ring-indigo-500" />
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    required
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setStudentPhotoFile(file);
                        setStudentPhotoPreview(URL.createObjectURL(file));
                      }
                    }}
                    className="text-xs border border-slate-300 rounded-lg p-2 bg-white flex-1"
                  />
                </div>
              </div>

              {photoSaveStep && (
                <div className="md:col-span-2 p-2.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-semibold flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  <span>{photoSaveStep}</span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={isCreatingStudent}
                className="px-5 py-2.5 bg-[#162b78] hover:bg-[#10205c] disabled:bg-slate-300 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer"
              >
                {isCreatingStudent ? (photoSaveStep || 'Creating...') : 'Issue & Register Student ID'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: Issue Faculty ID */}
      {activeSubTab === 'faculty' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-700" />
              Appoint & Provision Faculty Account (Optional Profile Photo)
            </h3>
          </div>

          <form onSubmit={handleCreateFaculty} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Faculty Full Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Harish Chandra"
                  value={facultyName}
                  onChange={e => setFacultyName(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Employee ID</label>
                <input
                  type="text"
                  placeholder="e.g. FAC-2025-09"
                  value={facultyEmpId}
                  onChange={e => setFacultyEmpId(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono text-slate-900 bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email <span className="text-rose-500">*</span></label>
                <input
                  type="email"
                  required
                  placeholder="h.chandra@univ.edu"
                  value={facultyEmail}
                  onChange={e => setFacultyEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                <input
                  type="text"
                  value={facultyPassword}
                  onChange={e => setFacultyPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono text-slate-900 bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                <select
                  value={facultyDept}
                  onChange={e => setFacultyDept(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg cursor-pointer"
                >
                  <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                  <option value="AI & Data Science">AI & Data Science</option>
                  <option value="Information Technology">Information Technology</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Designation</label>
                <select
                  value={facultyDesignation}
                  onChange={e => setFacultyDesignation(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg cursor-pointer"
                >
                  <option value="Assistant Professor">Assistant Professor</option>
                  <option value="Associate Professor">Associate Professor</option>
                  <option value="Professor">Professor</option>
                </select>
              </div>

              {/* Optional Faculty Photo Upload Box */}
              <div className="md:col-span-2 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <label className="block text-xs font-semibold text-slate-800">
                  Optional Faculty Profile Photo
                </label>
                <div className="flex items-center gap-4">
                  {facultyPhotoPreview && (
                    <img src={facultyPhotoPreview} alt="Preview" className="w-16 h-16 rounded-full object-cover ring-2 ring-indigo-500" />
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setFacultyPhotoFile(file);
                        setFacultyPhotoPreview(URL.createObjectURL(file));
                      }
                    }}
                    className="text-xs border border-slate-300 rounded-lg p-2 bg-white flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#162b78] hover:bg-[#10205c] text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer"
              >
                Appoint & Register Faculty ID
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: Batch Generator */}
      {activeSubTab === 'batch' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
          <h3 className="text-base font-bold text-slate-900">Section Roster Batch ID Provisioner</h3>
          <form onSubmit={handleBatchGenerate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Program</label>
                <select
                  value={batchProgramId}
                  onChange={e => setBatchProgramId(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg cursor-pointer"
                >
                  {programs.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Year of Study</label>
                <select
                  value={batchYearOfStudy}
                  onChange={e => setBatchYearOfStudy(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg cursor-pointer"
                >
                  {batchYearOptions.map(yr => (
                    <option key={yr} value={yr}>{getOrdinalYear(yr)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Section</label>
                <select
                  value={batchSectionId}
                  onChange={e => setBatchSectionId(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg cursor-pointer"
                >
                  {resolvedBatchSections.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Student Names (One per line)</label>
              <textarea
                rows={5}
                value={batchNamesText}
                onChange={e => setBatchNamesText(e.target.value)}
                className="w-full p-3 text-sm font-mono text-slate-900 bg-white border border-slate-300 rounded-lg"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#162b78] text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                Generate Batch IDs
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: Directory */}
      {activeSubTab === 'directory' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">Registered Institutional ID Directory</h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportStudentsCsv}
                className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>Save Students CSV</span>
              </button>
            </div>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name, roll, or email..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
            />
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">User Details</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">Official ID / Roll</th>
                  <th className="py-3 px-3">Department / Class</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredUsers.map(user => {
                  const isCopied = copiedId === user.id;
                  const displayAvatar = (user.role === 'student' && studentPhotoCache[user.id]) || user.avatarUrl;
                  return (
                    <tr key={user.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={displayAvatar}
                            alt={user.name}
                            className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                          />
                          <div>
                            <div className="font-semibold text-slate-900">{user.name}</div>
                            <div className="text-[11px] text-slate-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-indigo-950">
                        {user.rollNumber || user.id}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {user.role === 'student' ? (sections.find(s => s.id === user.sectionId)?.name || 'Section A') : (user.department || 'Academic')}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Change Photo Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPhotoUser(user);
                              setAdminNewPhotoUrl(user.registeredFacePhotoUrl || user.avatarUrl || '');
                              setAdminNewPhotoFile(null);
                              setShowAdminPhotoModal(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                            title="Change Photo"
                          >
                            <Camera className="w-3.5 h-3.5" />
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
                            onClick={() => setCurrentUser(user)}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                            title="Login As User"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                          </button>
                          {user.role !== 'admin' && (
                            <button
                              type="button"
                              onClick={() => handleDelete(user)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: Photo Change Requests */}
      {activeSubTab === 'requests' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900">Student Photo Change Requests</h3>
          <div className="divide-y divide-slate-100">
            {photoRequests.length === 0 ? (
              <p className="py-6 text-center text-slate-400 text-xs">No pending photo change requests.</p>
            ) : (
              photoRequests.map(req => (
                <div key={req.id} className="py-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="font-semibold text-slate-900 text-xs">
                      {req.studentName} ({req.rollNumber})
                    </div>
                    <p className="text-xs text-slate-600">Reason: {req.reason}</p>
                    <div className="text-[10px] text-slate-400">Status: <span className="font-bold text-amber-600">{req.status}</span></div>
                  </div>
                  {req.status === 'Pending' && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await updateDoc(doc(db, 'photoChangeRequests', req.id), { status: 'Approved' });
                            await updateDoc(doc(db, 'users', req.studentId), { registeredFacePhotoUrl: '', registeredFacePhotoPath: '' });
                            setSuccessMessage(`Approved photo change for ${req.studentName}.`);
                          } catch (e: any) {
                            setErrorMessage(e.message || 'Failed to approve');
                          }
                        }}
                        className="px-3 py-1 bg-emerald-700 text-white rounded text-xs font-semibold cursor-pointer"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await updateDoc(doc(db, 'photoChangeRequests', req.id), { status: 'Rejected' });
                          setSuccessMessage(`Rejected photo change for ${req.studentName}.`);
                        }}
                        className="px-3 py-1 bg-rose-700 text-white rounded text-xs font-semibold cursor-pointer"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ADMIN EDIT PHOTO MODAL */}
      {showAdminPhotoModal && editingPhotoUser && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Change Photo: {editingPhotoUser.name}</h3>
              <button onClick={() => setShowAdminPhotoModal(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <div className="space-y-4">
              <div className="flex justify-center">
                <img
                  src={adminNewPhotoFile ? URL.createObjectURL(adminNewPhotoFile) : adminNewPhotoUrl}
                  alt={editingPhotoUser.name}
                  className="w-24 h-24 rounded-full object-cover ring-2 ring-indigo-200"
                />
              </div>

              {adminPhotoStep && (
                <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-semibold flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  <span>{adminPhotoStep}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Upload New Photo (JPEG/PNG)</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) setAdminNewPhotoFile(f);
                  }}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-slate-50 text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAdminPhotoModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={adminPhotoUploading}
                  onClick={async () => {
                    if (!editingPhotoUser) return;
                    setAdminPhotoUploading(true);
                    try {
                      if (!adminNewPhotoFile) {
                        setShowAdminPhotoModal(false);
                        return;
                      }

                      // Step 1: Face validation if student
                      if (editingPhotoUser.role === 'student') {
                        const img = new Image();
                        const url = URL.createObjectURL(adminNewPhotoFile);
                        img.src = url;
                        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
                        const valCheck = await validateRegistrationPhotoWithTimeout(img);
                        URL.revokeObjectURL(url);
                        if (!valCheck.valid) {
                          setErrorMessage(valCheck.message || 'Face validation failed.');
                          return;
                        }

                        // Step 2: Compress
                        setAdminPhotoStep('Compressing...');
                        const dataUrl = await compressPhoto(adminNewPhotoFile);

                        // Step 3: Save to Firestore studentPhotos/{uid}
                        setAdminPhotoStep('Saving...');
                        await saveStudentPhoto(editingPhotoUser.id, dataUrl, true);

                        // Step 4: Saved & Cache in React state only
                        setAdminPhotoStep('Saved');
                        setStudentPhotoCache(prev => ({ ...prev, [editingPhotoUser.id]: dataUrl }));
                      } else {
                        // Faculty Photo
                        setAdminPhotoStep('Compressing...');
                        const dataUrl = await compressPhoto(adminNewPhotoFile);
                        setAdminPhotoStep('Saving...');
                        updateUserProfilePhoto(editingPhotoUser.id, dataUrl);
                        setAdminPhotoStep('Saved');
                      }

                      setSuccessMessage(`Photo successfully updated for ${editingPhotoUser.name}!`);
                      setTimeout(() => setShowAdminPhotoModal(false), 800);
                    } catch (err: any) {
                      console.error('[Photo Upload] Admin photo modal error:', err);
                      setErrorMessage(err.message || 'Failed to update photo.');
                    } finally {
                      setAdminPhotoUploading(false);
                      setAdminPhotoStep(null);
                    }
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#162b78] hover:bg-[#10205c] disabled:bg-slate-300 rounded-lg cursor-pointer"
                >
                  {adminPhotoUploading ? (adminPhotoStep || 'Saving...') : 'Save Updated Photo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
