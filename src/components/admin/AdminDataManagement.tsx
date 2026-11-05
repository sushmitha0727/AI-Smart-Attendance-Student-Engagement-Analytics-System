import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Database,
  Cloud,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Upload,
  Download,
  FileSpreadsheet,
  Users,
  Building2,
  BookOpen,
  Calendar,
  Sparkles,
  RefreshCw,
  FileCheck,
  ShieldCheck,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  validateStudentsCsv,
  validateFacultyCsv,
  validateSubjectsCsv,
  validateTimetableCsv,
  commitStudentsToFirestore,
  commitFacultyToFirestore,
  commitSubjectsToFirestore,
  commitTimetableToFirestore,
  exportStudentsCsvFromFirestore,
  exportFacultyCsvFromFirestore,
  exportAttendanceCsvFromFirestore,
  exportParticipationMarksCsvFromFirestore,
  exportAssessmentsReportCsvFromFirestore,
  CsvValidationResult,
  StudentCsvRow,
  FacultyCsvRow,
  SubjectCsvRow,
  TimetableCsvRow,
} from '../../services/csvDataService';
import { triggerCsvDownload } from '../../utils/csvExporter';

export const AdminDataManagement: React.FC = () => {
  const {
    firebaseConnected,
    firebaseLatency,
    firebaseError,
    recheckFirebaseConnection,
    users,
    studentsList,
    facultyList,
    subjects,
    sections,
    attendanceRecords,
  } = useApp();

  const [activeImportTab, setActiveImportTab] = useState<'students' | 'faculty' | 'subjects' | 'timetable'>('students');
  const [csvContent, setCsvContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitMessage, setCommitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [exportLoading, setExportLoading] = useState<string | null>(null);

  // Existing IDs sets for duplicate detection
  const existingStudentIds = useMemo(() => {
    return new Set(users.filter(u => u.role === 'student').map(u => (u.rollNumber || u.id).trim()));
  }, [users]);

  const existingEmails = useMemo(() => {
    return new Set(users.map(u => (u.email || '').toLowerCase().trim()));
  }, [users]);

  const knownFacultyIds = useMemo(() => {
    return new Set(users.filter(u => u.role === 'faculty').map(u => (u.employeeId || u.id).trim()));
  }, [users]);

  // Run validation on loaded CSV text
  const validationResult = useMemo(() => {
    if (!csvContent.trim()) return null;

    if (activeImportTab === 'students') {
      return validateStudentsCsv(csvContent, existingStudentIds, existingEmails);
    }
    if (activeImportTab === 'faculty') {
      return validateFacultyCsv(csvContent, knownFacultyIds, existingEmails);
    }
    if (activeImportTab === 'subjects') {
      return validateSubjectsCsv(csvContent, knownFacultyIds);
    }
    if (activeImportTab === 'timetable') {
      return validateTimetableCsv(csvContent, knownFacultyIds);
    }
    return null;
  }, [csvContent, activeImportTab, existingStudentIds, existingEmails, knownFacultyIds]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setCommitMessage(null);
    const reader = new FileReader();
    reader.onload = evt => {
      setCsvContent(evt.target?.result as string || '');
    };
    reader.readAsText(file);
  };

  const handleDownloadTemplate = () => {
    let headers = '';
    let sampleRows = '';
    let templateName = '';

    if (activeImportTab === 'students') {
      headers = 'studentId, name, email, program, academicYear, semester, section';
      sampleRows =
        '2025CS101, Aarav Verma, aarav.v@student.univ.edu, B.Tech(CSE), 2025-2026, Semester 3, Section A\n' +
        '2025CS102, Priya Sen, priya.s@student.univ.edu, B.Tech(CSE-AI-ML), 2025-2026, Semester 3, Section B\n' +
        '2025CS103, Rahul Roy, rahul.r@student.univ.edu, B.Tech(CSE-DA), 2025-2026, Semester 3, Section C';
      templateName = 'students_template.csv';
    } else if (activeImportTab === 'faculty') {
      headers = 'facultyId, name, email, department';
      sampleRows =
        'FAC301, Dr. Sneha Gupta, sneha.gupta@univ.edu, Computer Science & Engineering\n' +
        'FAC302, Prof. Amit Patel, amit.patel@univ.edu, Information Technology\n' +
        'FAC303, Dr. Meera Nambiar, meera.n@univ.edu, Data Science & AI';
      templateName = 'faculty_template.csv';
    } else if (activeImportTab === 'subjects') {
      headers = 'subjectId, subjectName, semester, academicYear, section, facultyId';
      sampleRows =
        '7CS1235, Generative Artificial Intelligence, Semester 7, 2025-2026, VII Btech 2023 CSE - DA, fac-ramesh\n' +
        '7CS1281, Auto ML, Semester 7, 2025-2026, VII BTech 2023 CSE AIML - A, fac-ramesh\n' +
        '5CS1102, Deep Learning Systems, Semester 5, 2025-2026, Section B, fac-ramesh';
      templateName = 'subjects_template.csv';
    } else {
      headers = 'subjectId, facultyId, academicYear, section, day, startTime, endTime, room';
      sampleRows =
        '7CS1235, fac-ramesh, 2025-2026, VII Btech 2023 CSE - DA, Monday, 09:00, 10:00, Room 304\n' +
        '7CS1281, fac-ramesh, 2025-2026, VII BTech 2023 CSE AIML - A, Tuesday, 11:00, 12:00, AI Lab 2\n' +
        '5CS1102, fac-ramesh, 2025-2026, Section B, Wednesday, 14:00, 15:00, Room 201';
      templateName = 'timetable_template.csv';
    }

    const fullCsv = `${headers}\n${sampleRows}`;
    triggerCsvDownload(fullCsv, templateName);
  };

  const handleCommitToFirestore = async () => {
    if (!validationResult || validationResult.validRows.length === 0) return;

    setIsCommitting(true);
    setCommitMessage(null);

    try {
      if (activeImportTab === 'students') {
        const rows = (validationResult as CsvValidationResult<StudentCsvRow>).validRows.map(r => r.data);
        const res = await commitStudentsToFirestore(rows);
        setCommitMessage({
          type: 'success',
          text: `Successfully imported ${res.inserted} students into Cloud Firestore permanently!`,
        });
      } else if (activeImportTab === 'faculty') {
        const rows = (validationResult as CsvValidationResult<FacultyCsvRow>).validRows.map(r => r.data);
        const res = await commitFacultyToFirestore(rows);
        setCommitMessage({
          type: 'success',
          text: `Successfully imported ${res.inserted} faculty into Cloud Firestore permanently!`,
        });
      } else if (activeImportTab === 'subjects') {
        const rows = (validationResult as CsvValidationResult<SubjectCsvRow>).validRows.map(r => r.data);
        const res = await commitSubjectsToFirestore(rows);
        setCommitMessage({
          type: 'success',
          text: `Successfully imported ${res.inserted} courses/sections into Cloud Firestore permanently!`,
        });
      } else if (activeImportTab === 'timetable') {
        const rows = (validationResult as CsvValidationResult<TimetableCsvRow>).validRows.map(r => r.data);
        const res = await commitTimetableToFirestore(rows);
        setCommitMessage({
          type: 'success',
          text: `Successfully imported ${res.inserted} timetable periods into Cloud Firestore permanently!`,
        });
      }

      setCsvContent('');
      setFileName('');
    } catch (err: any) {
      setCommitMessage({
        type: 'error',
        text: `Firestore commit error: ${err.message || 'Unknown database failure'}`,
      });
    } finally {
      setIsCommitting(false);
    }
  };

  const handleExport = async (actionKey: string, exportFn: () => Promise<number>, title: string) => {
    setExportLoading(actionKey);
    try {
      const count = await exportFn();
      setCommitMessage({
        type: 'success',
        text: `Exported latest ${count} records from Cloud Firestore to ${title}.`,
      });
    } catch (err: any) {
      setCommitMessage({
        type: 'error',
        text: `Failed to export from Firestore: ${err.message}`,
      });
    } finally {
      setExportLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Live Firebase Connection Status Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                firebaseConnected ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'
              }`}
            >
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    firebaseConnected
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${firebaseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                  {firebaseConnected ? 'Cloud Firestore & Firebase Auth Connected' : 'Offline / Reconnecting'}
                </span>
                {firebaseConnected && firebaseLatency !== null && (
                  <span className="text-xs text-slate-500 font-mono">
                    {firebaseLatency}ms latency
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Permanent database target: <strong className="font-mono text-slate-800">neural-lambda-pbvhw</strong> (Firestore Database & Storage active).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={recheckFirebaseConnection}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 self-start md:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Test Connection</span>
          </button>
        </div>

        {/* Database Collection Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4 text-xs">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
            <span className="text-slate-500 block text-[11px] font-medium">Students Enrolled</span>
            <span className="text-base font-bold text-slate-900 mt-0.5 block">{studentsList.length}</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
            <span className="text-slate-500 block text-[11px] font-medium">Faculty Appointed</span>
            <span className="text-base font-bold text-slate-900 mt-0.5 block">{facultyList.length}</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
            <span className="text-slate-500 block text-[11px] font-medium">Courses & Sections</span>
            <span className="text-base font-bold text-slate-900 mt-0.5 block">{subjects.length} / {sections.length}</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
            <span className="text-slate-500 block text-[11px] font-medium">Attendance Records</span>
            <span className="text-base font-bold text-slate-900 mt-0.5 block">{attendanceRecords.length}</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70 col-span-2 sm:col-span-1">
            <span className="text-slate-500 block text-[11px] font-medium">Zero Passwords Stored</span>
            <span className="text-xs font-bold text-emerald-700 mt-1 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Strictly Enforced
            </span>
          </div>
        </div>
      </div>

      {/* Global Action Message */}
      {commitMessage && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs ${
            commitMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-rose-50 text-rose-900 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {commitMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{commitMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setCommitMessage(null)}
            className="text-slate-400 hover:text-slate-700 font-bold px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. SECTION A: CSV IMPORT HUB WITH REAL-TIME PRE-IMPORT VALIDATION */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Upload className="w-5 h-5 text-indigo-700" />
            Batch CSV Data Import Hub (Actions 1–4)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Bulk-import official university records into Cloud Firestore. Validates rows, checks duplicate IDs/emails, and validates faculty assignments before saving.
          </p>
        </div>

        {/* 4 Import Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto text-xs pb-1">
          {[
            { id: 'students', label: '1. Import Students CSV', icon: Users, format: 'studentId, name, email, program, academicYear, semester, section' },
            { id: 'faculty', label: '2. Import Faculty CSV', icon: Building2, format: 'facultyId, name, email, department' },
            { id: 'subjects', label: '3. Import Subjects & Sections CSV', icon: BookOpen, format: 'subjectId, subjectName, semester, academicYear, section, facultyId' },
            { id: 'timetable', label: '4. Import Timetable CSV', icon: Calendar, format: 'subjectId, facultyId, academicYear, section, day, startTime, endTime, room' },
          ].map(tab => {
            const Icon = tab.icon;
            const isCurrent = activeImportTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveImportTab(tab.id as any);
                  setCsvContent('');
                  setFileName('');
                  setCommitMessage(null);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                  isCurrent
                    ? 'border-[#162b78] text-[#162b78] bg-blue-50/50'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Format Specifier & Template Downloader */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <span className="font-bold text-slate-800">Required CSV Schema:</span>
            <div className="font-mono text-indigo-950 font-semibold bg-white px-2.5 py-1 rounded-md border border-slate-200 mt-1 inline-block">
              {activeImportTab === 'students' && 'studentId, name, email, program, academicYear, semester, section'}
              {activeImportTab === 'faculty' && 'facultyId, name, email, department'}
              {activeImportTab === 'subjects' && 'subjectId, subjectName, semester, academicYear, section, facultyId'}
              {activeImportTab === 'timetable' && 'subjectId, facultyId, academicYear, section, day, startTime, endTime, room'}
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Template CSV</span>
          </button>
        </div>

        {/* Upload Zone */}
        <div className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-6 text-center transition-colors bg-slate-50/50">
          <input
            type="file"
            id="csv-file-input"
            accept=".csv,text/csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <label htmlFor="csv-file-input" className="cursor-pointer block">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center mx-auto mb-2">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-slate-900">
              {fileName ? fileName : 'Click to select or drop CSV file'}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Supports UTF-8 encoded .csv files up to 10MB.
            </p>
          </label>
        </div>

        {/* 3. Validation Breakdown Table */}
        {validationResult && (
          <div className="space-y-4 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold">
                  Total Rows: {validationResult.totalRows}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Valid: {validationResult.validRows.length}
                </span>
                {validationResult.invalidRows.length > 0 && (
                  <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 text-xs font-bold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                    Invalid: {validationResult.invalidRows.length}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleCommitToFirestore}
                disabled={isCommitting || validationResult.validRows.length === 0}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                {isCommitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving to Firestore...</span>
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4" />
                    <span>Save {validationResult.validRows.length} Valid Records to Firestore</span>
                  </>
                )}
              </button>
            </div>

            {/* Duplicate Alerts */}
            {validationResult.duplicateIds.length > 0 && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Duplicate IDs Detected:</strong> {validationResult.duplicateIds.join(', ')}
                </div>
              </div>
            )}
            {validationResult.duplicateEmails.length > 0 && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Duplicate Emails Detected:</strong> {validationResult.duplicateEmails.join(', ')}
                </div>
              </div>
            )}
            {validationResult.missingFacultyIds.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Missing Faculty Warning:</strong> The following referenced faculty IDs do not exist in the faculty directory: {validationResult.missingFacultyIds.join(', ')}.
                </div>
              </div>
            )}

            {/* Data Inspection Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-80 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Row</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Data Preview</th>
                    <th className="py-2.5 px-3">Validation Diagnostics</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...validationResult.invalidRows, ...validationResult.validRows].map((row, idx) => (
                    <tr
                      key={idx}
                      className={row.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/40 hover:bg-rose-50/70'}
                    >
                      <td className="py-2 px-3 font-mono text-slate-500">#{row.rowIndex}</td>
                      <td className="py-2 px-3">
                        {row.isValid ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Valid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded">
                            <AlertCircle className="w-3 h-3 text-rose-600" /> Invalid
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-700 text-[11px] truncate max-w-xs">
                        {row.raw.join(' | ')}
                      </td>
                      <td className="py-2 px-3">
                        {row.errors.length > 0 ? (
                          <div className="text-rose-700 text-[11px] font-medium">
                            {row.errors.join('; ')}
                          </div>
                        ) : row.warnings.length > 0 ? (
                          <div className="text-amber-700 text-[11px]">
                            {row.warnings.join('; ')}
                          </div>
                        ) : (
                          <span className="text-emerald-700 text-[11px]">Ready for Firestore</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 4. SECTION B: CLOUD FIRESTORE DIRECT EXPORT ACTIONS (Actions 5–9) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Download className="w-5 h-5 text-indigo-700" />
            Live Cloud Firestore CSV Exports (Actions 5–9)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Downloads freshly queried datasets directly from Cloud Firestore at the instant of click, formatted to institutional standards.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {/* Action 5 */}
          <div className="p-4 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl transition-all flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>5. Export Students CSV</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                All enrolled students in Cloud Firestore (studentId, name, email, program, academicYear, semester, section).
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleExport('students', exportStudentsCsvFromFirestore, 'students.csv')}
              disabled={exportLoading === 'students'}
              className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exportLoading === 'students' ? 'Fetching...' : 'Download Students CSV'}</span>
            </button>
          </div>

          {/* Action 6 */}
          <div className="p-4 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl transition-all flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>6. Export Faculty CSV</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Appointed faculty and teacher directory (facultyId, name, email, department).
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleExport('faculty', exportFacultyCsvFromFirestore, 'faculty.csv')}
              disabled={exportLoading === 'faculty'}
              className="w-full py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exportLoading === 'faculty' ? 'Fetching...' : 'Download Faculty CSV'}</span>
            </button>
          </div>

          {/* Action 7 */}
          <div className="p-4 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl transition-all flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                <Calendar className="w-4 h-4 text-purple-600" />
                <span>7. Export Attendance CSV</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Every logged lecture session record (studentId, subjectId, date, status, verification method).
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleExport('attendance', exportAttendanceCsvFromFirestore, 'attendance.csv')}
              disabled={exportLoading === 'attendance'}
              className="w-full py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exportLoading === 'attendance' ? 'Fetching...' : 'Download Attendance CSV'}</span>
            </button>
          </div>

          {/* Action 8 */}
          <div className="p-4 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl transition-all flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>8. Export Participation Marks CSV</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Continuous engagement and calculated participation marks (/5) approved by course faculty.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleExport('participation', exportParticipationMarksCsvFromFirestore, 'participation_marks.csv')}
              disabled={exportLoading === 'participation'}
              className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exportLoading === 'participation' ? 'Fetching...' : 'Download Participation Marks'}</span>
            </button>
          </div>

          {/* Action 9 */}
          <div className="p-4 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl transition-all flex flex-col justify-between space-y-3 md:col-span-2 lg:col-span-2">
            <div>
              <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                <BookOpen className="w-4 h-4 text-rose-600" />
                <span>9. Export Assignment, Quiz, and Coding-Test Reports CSV</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Consolidated assessment records across assignments submitted, live quiz attempts, and coding practical submissions.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleExport('assessments', exportAssessmentsReportCsvFromFirestore, 'assessments_report.csv')}
              disabled={exportLoading === 'assessments'}
              className="w-full py-2 bg-[#162b78] hover:bg-[#10205c] text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exportLoading === 'assessments' ? 'Fetching...' : 'Download Assessment & Test Reports CSV'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
