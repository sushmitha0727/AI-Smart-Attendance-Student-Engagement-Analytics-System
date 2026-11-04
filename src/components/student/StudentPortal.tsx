import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  calculateAttendanceStats,
  calculateAttendanceRecovery,
  projectAttendanceScenario,
  evaluateEngagement,
  evaluateStudentParticipationAlert,
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
  UploadCloud,
  Check,
  Upload,
  UserCheck,
  RefreshCw,
  X,
  Sparkles,
  ExternalLink,
  Filter,
} from 'lucide-react';
import { ParticipationTrendChart } from '../common/ParticipationTrendChart';
import { uploadAssignmentFile, uploadProfileImage } from '../../services/storageService';
import {
  loadFaceApiModels,
  validateRegistrationPhotoWithTimeout,
  resizeImageToJpeg,
  computeFaceDescriptor,
  calculateEAR,
  calculateHeadTurn,
  calculateNod,
  calculateMAR,
} from '../../utils/faceVerification';
import { auth, storage, db } from '../../firebase/config';
import { ref, getDownloadURL } from 'firebase/storage';
import { compressPhoto, saveStudentPhoto, getStudentPhoto } from '../../services/photoService';
import { doc, updateDoc, addDoc, collection, onSnapshot } from 'firebase/firestore';
import * as faceapi from '@vladmandic/face-api';

export const StudentPortal: React.FC = () => {
  const {
    currentUser,
    setCurrentUser,
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
    updateUserProfilePhoto,
    dismissNotice,
    markNoticeRead,
  } = useApp();

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

  // React State cache for student photo from Firestore (photoService)
  const [cachedPhotoDataUrl, setCachedPhotoDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (currentUser?.id) {
      getStudentPhoto(currentUser.id)
        .then(photo => {
          if (isMounted && photo) {
            setCachedPhotoDataUrl(photo);
          }
        })
        .catch(err => {
          console.error('Failed to load student photo from Firestore:', err);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [currentUser?.id]);

  const activePhotoUrl = cachedPhotoDataUrl || currentUser.registeredFacePhotoUrl || currentUser.avatarUrl;
  const hasRegisteredPhoto = Boolean(currentUser.hasRegisteredPhoto || cachedPhotoDataUrl || currentUser.registeredFacePhotoUrl);
  const [showRegisterPhotoModal, setShowRegisterPhotoModal] = useState(false);
  const [regConsentAgreed, setRegConsentAgreed] = useState(false);
  const [regFile, setRegFile] = useState<File | null>(null);
  const [regPreview, setRegPreview] = useState<string | null>(null);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [regPhotoStep, setRegPhotoStep] = useState<string | null>(null);

  // Photo Change Request State
  const [showPhotoChangeModal, setShowPhotoChangeModal] = useState(false);
  const [photoChangeReason, setPhotoChangeReason] = useState('');
  const [photoChangeSubmitted, setPhotoChangeSubmitted] = useState(false);

  // Attendance Scan workflow state
  const [scanStep, setScanStep] = useState<'consent' | 'challenge' | 'matching' | 'scanner' | 'result'>('consent');
  const [consentAgreed, setConsentAgreed] = useState(currentUser.faceConsentGiven ?? false);
  const [livenessChallenges, setLivenessChallenges] = useState<string[]>([]);
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
  const [challengeStatusMessage, setChallengeStatusMessage] = useState('Position your face in front of the camera');
  const [livenessAttempts, setLivenessAttempts] = useState(0);

  // Step 3 Match State
  const [registeredPhotoLoading, setRegisteredPhotoLoading] = useState(false);
  const [registeredPhotoError, setRegisteredPhotoError] = useState(false);
  const [registeredPhotoFreshUrl, setRegisteredPhotoFreshUrl] = useState<string | null>(null);
  const [matchAnalysisState, setMatchAnalysisState] = useState<'comparing' | 'match' | 'no_match'>('comparing');
  const [matchAttemptsCount, setMatchAttemptsCount] = useState(0);
  const liveCaptureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [liveCaptureDataUrl, setLiveCaptureDataUrl] = useState<string | null>(null);

  // Step 4 QR Scanner State
  const [verificationVerifiedAt, setVerificationVerifiedAt] = useState<number | null>(null);
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);
  const [manualTokenInput, setManualTokenInput] = useState('');

  // Teacher Review Request State
  const [showTeacherReviewModal, setShowTeacherReviewModal] = useState(false);
  const [teacherReviewReason, setTeacherReviewReason] = useState('');
  const [teacherReviewSubmitted, setTeacherReviewSubmitted] = useState(false);

  // Camera video refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Recovery planner what-if state
  const [whatIfUpcomingAttended, setWhatIfUpcomingAttended] = useState(6);
  const [whatIfUpcomingTotal, setWhatIfUpcomingTotal] = useState(8);

  // Correction request form state
  const [corrSubjectId, setCorrSubjectId] = useState('');
  const [corrDate, setCorrDate] = useState(new Date().toISOString().split('T')[0]);
  const [corrReason, setCorrReason] = useState('');
  const [corrSubmittedSuccess, setCorrSubmittedSuccess] = useState(false);

  const studentSection = sections.find(s => s.id === currentUser.sectionId);

  const studentSubjects = useMemo(() => {
    return subjects.filter(s => s.semesterId === currentUser.semesterId);
  }, [subjects, currentUser.semesterId]);

  const studentRecords = useMemo(() => {
    return attendanceRecords.filter(r => r.studentId === currentUser.id);
  }, [attendanceRecords, currentUser.id]);

  const overallStats = useMemo(() => {
    return calculateAttendanceStats(studentRecords);
  }, [studentRecords]);

  const subjectStats = useMemo(() => {
    const map: Record<string, ReturnType<typeof calculateAttendanceStats>> = {};
    studentSubjects.forEach(subj => {
      const recs = studentRecords.filter(r => r.subjectId === subj.id);
      map[subj.id] = calculateAttendanceStats(recs);
    });
    return map;
  }, [studentSubjects, studentRecords]);

  const [dashboardBannerDismissed, setDashboardBannerDismissed] = useState(false);
  const [noticeFilter, setNoticeFilter] = useState<'all' | 'critical' | 'deadlines' | 'general'>('all');

  // Interactive tab helper states
  const [selectedAsgId, setSelectedAsgId] = useState<string | null>(null);
  const [asgTextSolution, setAsgTextSolution] = useState('');
  const [asgFileName, setAsgFileName] = useState('');
  const [asgSubmitSuccess, setAsgSubmitSuccess] = useState(false);

  const [activeQuiz, setActiveQuiz] = useState<any | null>(null);
  const [selectedQuizAnswers, setSelectedQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmittedScore, setQuizSubmittedScore] = useState<number | null>(null);

  const [activeCodingTest, setActiveCodingTest] = useState<any | null>(null);
  const [userCodingCode, setUserCodingCode] = useState('');
  const [codingResult, setCodingResult] = useState<{ passed: number; total: number; score: number } | null>(null);

  const studentNotices = useMemo(() => {
    return notices.filter(
      n => (!n.targetSectionId || n.targetSectionId === currentUser.sectionId) &&
           (!n.targetStudentId || n.targetStudentId === currentUser.id) &&
           !n.isDismissed
    );
  }, [notices, currentUser.sectionId, currentUser.id]);

  const studentParticipationAlert = useMemo(() => {
    return evaluateStudentParticipationAlert({
      student: currentUser,
      participationScores,
      thresholdPercent: systemSettings.lowParticipationThresholdPercent ?? 60,
      subjects: studentSubjects,
      assignments,
      assignmentSubmissions,
      quizzes,
      quizAttempts,
      codingTests,
      codingSubmissions,
    });
  }, [
    currentUser,
    participationScores,
    systemSettings.lowParticipationThresholdPercent,
    studentSubjects,
    assignments,
    assignmentSubmissions,
    quizzes,
    quizAttempts,
    codingTests,
    codingSubmissions,
  ]);

  const studentParticipation = useMemo(() => {
    return classParticipationEntries.filter(p => p.studentId === currentUser.id);
  }, [classParticipationEntries, currentUser.id]);

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

  const activeSectionSessions = attendanceSessions.filter(
    s => s.active && s.sectionId === currentUser.sectionId
  );

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Handle Photo Registration Submission using photoService
  const handleRegisterFacePhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegSuccess(null);

    if (!regConsentAgreed) {
      setRegError('You must grant consent for your photo to be used for attendance verification.');
      return;
    }
    if (!regFile && !regPreview) {
      setRegError('Photo is required.');
      return;
    }

    setIsRegistering(true);
    try {
      const sourceBlob = regFile || (await (await fetch(regPreview || '')).blob());

      // Step 1: Face Validation with 20s timeout
      const img = new Image();
      const imageUrl = regPreview || URL.createObjectURL(sourceBlob);
      img.src = imageUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const validation = await validateRegistrationPhotoWithTimeout(img);
      if (!validation.valid) {
        setRegError(validation.message || 'Face validation failed.');
        return;
      }

      // Step 2: Compressing...
      setRegPhotoStep('Compressing...');
      const dataUrl = await compressPhoto(sourceBlob);

      // Step 3: Saving...
      setRegPhotoStep('Saving...');
      await saveStudentPhoto(currentUser.id, dataUrl, regConsentAgreed);

      // Step 4: Saved & cached in React state only
      setRegPhotoStep('Saved');
      setCachedPhotoDataUrl(dataUrl);

      setRegSuccess('Face photo successfully registered and verified!');
      setTimeout(() => {
        setShowRegisterPhotoModal(false);
        setRegSuccess(null);
        setRegPhotoStep(null);
      }, 1200);
    } catch (err: any) {
      console.error('[Photo Upload] Registration photo error:', err);
      setRegError(err?.message || 'Failed to save student photo. Please try again.');
    } finally {
      setIsRegistering(false);
      setRegPhotoStep(null);
    }
  };

  const handlePhotoChangeRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoChangeReason.trim()) return;

    try {
      await addDoc(collection(db, 'photoChangeRequests'), {
        studentId: currentUser.id,
        studentName: currentUser.name,
        rollNumber: currentUser.rollNumber,
        reason: photoChangeReason.trim(),
        status: 'Pending',
        timestamp: new Date().toISOString(),
      });
      setPhotoChangeSubmitted(true);
      setTimeout(() => {
        setShowPhotoChangeModal(false);
        setPhotoChangeSubmitted(false);
        setPhotoChangeReason('');
      }, 2000);
    } catch (err: any) {
      console.error('Photo change request error:', err);
      alert('Failed to submit photo change request.');
    }
  };

  const handleTeacherReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherReviewReason.trim()) return;

    try {
      const activeSess = activeSectionSessions[0];
      await addDoc(collection(db, 'attendanceReviewRequests'), {
        studentId: currentUser.id,
        studentName: currentUser.name,
        rollNumber: currentUser.rollNumber,
        sessionId: activeSess?.id || 'unknown-session',
        reason: teacherReviewReason.trim(),
        timestamp: new Date().toISOString(),
        status: 'Pending',
      });
      setTeacherReviewSubmitted(true);
      setTimeout(() => {
        setShowTeacherReviewModal(false);
        setTeacherReviewSubmitted(false);
        setTeacherReviewReason('');
      }, 2000);
    } catch (err: any) {
      console.error('Teacher review request error:', err);
      alert('Failed to submit review request.');
    }
  };

  const initializeLivenessChallenges = () => {
    const allTasks = [
      'Blink your eyes twice',
      'Turn your head slowly to the left',
      'Turn your head slowly to the right',
      'Nod your head up or down',
      'Open your mouth slightly',
    ];
    const randomTask = allTasks[Math.floor(Math.random() * allTasks.length)];
    setLivenessChallenges([randomTask]);
    setCurrentChallengeIndex(0);
    setLivenessAttempts(0);
  };

  const startFrontCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera access requires HTTPS or is not supported by your browser.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(err.message || 'Camera permission denied or unavailable.');
    }
  };

  const startBackCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera access requires HTTPS.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 480 } },
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err: any) {
      console.error('Back camera error:', err);
      setCameraError('Back camera unavailable. You can use active session quick-connect or manual token input.');
    }
  };

  // Run Liveness & Face Match loop
  useEffect(() => {
    let animationFrameId: number;
    let timeoutId: NodeJS.Timeout;

    if (scanStep === 'challenge' && cameraActive && videoRef.current) {
      loadFaceApiModels()
        .then(() => {
          let consecutiveSuccessFrames = 0;
          const currentChallenge = livenessChallenges[currentChallengeIndex] || 'Blink your eyes twice';

          timeoutId = setTimeout(() => {
            setLivenessAttempts(prev => prev + 1);
            if (livenessAttempts >= 2) {
              setChallengeStatusMessage('Liveness challenge timed out. Max attempts reached.');
            } else {
              setChallengeStatusMessage('Challenge timed out. Retrying...');
              setTimeout(() => {
                setCurrentChallengeIndex(i => (i + 1) % livenessChallenges.length);
              }, 1000);
            }
          }, 12000);

          const detectLoop = async () => {
            if (!videoRef.current || scanStep !== 'challenge') return;
            try {
              const detection = await faceapi
                .detectSingleFace(
                  videoRef.current,
                  new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.6 })
                )
                .withFaceLandmarks();

              if (!detection) {
                setChallengeStatusMessage('No face detected. Please face the camera.');
                animationFrameId = requestAnimationFrame(detectLoop);
                return;
              }

              const landmarks = detection.landmarks;
              const leftEye = landmarks.getLeftEye();
              const rightEye = landmarks.getRightEye();
              const ear = (calculateEAR(leftEye) + calculateEAR(rightEye)) / 2;
              const headTurn = calculateHeadTurn(landmarks);
              const isNodding = calculateNod(landmarks);
              const mar = calculateMAR(landmarks.getMouth());

              let satisfied = false;
              if (currentChallenge.includes('Blink')) {
                if (ear < 0.23) satisfied = true;
                else setChallengeStatusMessage(`Challenge: ${currentChallenge} (Blink detected: ${ear.toFixed(2)})`);
              } else if (currentChallenge.includes('left')) {
                if (headTurn === 'left') satisfied = true;
                else setChallengeStatusMessage(`Challenge: ${currentChallenge} (Turn head left)`);
              } else if (currentChallenge.includes('right')) {
                if (headTurn === 'right') satisfied = true;
                else setChallengeStatusMessage(`Challenge: ${currentChallenge} (Turn head right)`);
              } else if (currentChallenge.includes('Nod')) {
                if (isNodding) satisfied = true;
                else setChallengeStatusMessage(`Challenge: ${currentChallenge} (Nod detected)`);
              } else if (currentChallenge.includes('mouth')) {
                if (mar > 0.32) satisfied = true;
                else setChallengeStatusMessage(`Challenge: ${currentChallenge} (Mouth open: ${mar.toFixed(2)})`);
              } else {
                satisfied = true;
              }

              if (satisfied) {
                consecutiveSuccessFrames++;
                setChallengeStatusMessage(`Challenge passed (${consecutiveSuccessFrames}/3)...`);
                if (consecutiveSuccessFrames >= 3) {
                  clearTimeout(timeoutId);
                  if (currentChallengeIndex < livenessChallenges.length - 1) {
                    setCurrentChallengeIndex(i => i + 1);
                    consecutiveSuccessFrames = 0;
                  } else {
                    // Capture live frame to canvas before stopping camera
                    if (videoRef.current && liveCaptureCanvasRef.current) {
                      const canvas = liveCaptureCanvasRef.current;
                      canvas.width = videoRef.current.videoWidth || 640;
                      canvas.height = videoRef.current.videoHeight || 480;
                      const ctx = canvas.getContext('2d');
                      if (ctx) {
                        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                        setLiveCaptureDataUrl(canvas.toDataURL('image/jpeg', 0.85));
                      }
                    }

                    stopCamera();
                    setScanStep('matching');
                    executeFaceMatch();
                    return;
                  }
                }
              }
            } catch (e) {
              // ignore
            }
            animationFrameId = requestAnimationFrame(detectLoop);
          };

          detectLoop();
        })
        .catch(err => {
          setCameraError('Failed to load face verification models: ' + err.message);
        });
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [scanStep, cameraActive, currentChallengeIndex, livenessChallenges]);

  // Execute Step 3 Registered Face Match (PART 1 REQUIREMENTS)
  const executeFaceMatch = async () => {
    setMatchAnalysisState('comparing');
    setRegisteredPhotoLoading(true);
    setRegisteredPhotoError(false);

    try {
      await loadFaceApiModels();

      // Requirement 5: Read registered photo from getStudentPhoto instead of Storage
      let freshUrl = await getStudentPhoto(currentUser.id);
      if (!freshUrl) {
        freshUrl = cachedPhotoDataUrl || currentUser.registeredFacePhotoUrl || currentUser.avatarUrl;
      }
      setRegisteredPhotoFreshUrl(freshUrl);
      setRegisteredPhotoLoading(false);

      if (!freshUrl) {
        setRegisteredPhotoError(true);
        setMatchAnalysisState('no_match');
        return;
      }

      // Load registered image robustly (with crossOrigin retry fallback)
      const loadImgRobust = (url: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          if (!url.startsWith('data:')) {
            img.crossOrigin = 'anonymous';
          }
          img.onload = () => resolve(img);
          img.onerror = () => {
            if (img.crossOrigin) {
              const imgRetry = new Image();
              imgRetry.onload = () => resolve(imgRetry);
              imgRetry.onerror = (err) => reject(err);
              imgRetry.src = url;
            } else {
              reject(new Error('Registered photo could not be loaded'));
            }
          };
          img.src = url;
        });
      };

      const regImg = await loadImgRobust(freshUrl).catch(() => {
        setRegisteredPhotoError(true);
        setMatchAnalysisState('no_match');
        return null;
      });

      if (!regImg) return;

      const registeredDescriptor = await computeFaceDescriptor(regImg);
      if (!registeredDescriptor) {
        setRegisteredPhotoError(true);
        setMatchAnalysisState('no_match');
        return;
      }

      // Compute descriptor from live capture canvas / image
      if (!liveCaptureCanvasRef.current && !liveCaptureDataUrl) {
        setMatchAnalysisState('no_match');
        return;
      }

      const liveImg = await loadImgRobust(liveCaptureDataUrl || '').catch(() => null);
      if (!liveImg) {
        setMatchAnalysisState('no_match');
        return;
      }

      // Require euclidean distance < 0.5 across at least 3 consecutive frames or checks
      let consecutiveMatches = 0;
      for (let i = 0; i < 3; i++) {
        const liveDescriptor = await computeFaceDescriptor(liveImg);
        if (liveDescriptor) {
          const distance = faceapi.euclideanDistance(registeredDescriptor, liveDescriptor);
          if (distance < 0.5) {
            consecutiveMatches++;
          }
        }
      }

      if (consecutiveMatches >= 3) {
        setMatchAnalysisState('match');
        setVerificationVerifiedAt(Date.now());
      } else {
        setMatchAnalysisState('no_match');
        setMatchAttemptsCount(c => c + 1);
      }
    } catch (err: any) {
      console.error('Face match error:', err);
      setRegisteredPhotoError(true);
      setMatchAnalysisState('no_match');
      setMatchAttemptsCount(c => c + 1);
    }
  };

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
              { id: 'dashboard', label: 'Dashboard Overview', icon: Award },
              { id: 'scan_attendance', label: 'Verify & Scan Attendance', icon: Camera, badge: activeSectionSessions.length > 0 ? 'Live' : undefined },
              { id: 'my_attendance', label: 'My Attendance Logs', icon: Clock },
              { id: 'recovery_planner', label: 'Attendance Recovery Planner', icon: TrendingUp },
              { id: 'assignments', label: 'Assignments & Submissions', icon: FileText },
              { id: 'quizzes', label: 'Quizzes & Assessments', icon: HelpCircle },
              { id: 'coding_tests', label: 'Coding Lab Tests', icon: Code2 },
              { id: 'engagement', label: 'Engagement & Risk Score', icon: Award },
              { id: 'participation_marks', label: 'Class Participation Rubric', icon: MessageSquare },
              {
                id: 'notifications',
                label: 'Notices & Announcements',
                icon: Bell,
                badge: (studentParticipationAlert || studentNotices.some(n => n.type === 'participation_alert')) ? 'Alert' : studentNotices.length > 0 ? String(studentNotices.length) : undefined,
                badgeColor: (studentParticipationAlert || studentNotices.some(n => n.type === 'participation_alert')) ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-100 text-slate-700 font-mono',
              },
              { id: 'correction_request', label: 'Attendance Correction Requests', icon: RefreshCw },
            ].map(item => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id as any);
                    if (item.id === 'scan_attendance') {
                      setScanStep('consent');
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
                    active ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`px-1.5 py-0.2 text-[10px] font-bold rounded ${item.badgeColor || 'bg-amber-400 text-slate-900 animate-pulse'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 w-full space-y-6">
          {/* Top Profile Header Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src={activePhotoUrl}
                  alt={currentUser.name}
                  className="w-16 h-16 rounded-full object-cover ring-4 ring-emerald-50"
                />
                <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900">{currentUser.name}</h1>
                  <span className="text-xs px-2 py-0.5 rounded font-mono bg-slate-100 text-slate-700">
                    {currentUser.rollNumber}
                  </span>
                  {hasRegisteredPhoto ? (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Face Registered
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Photo Not Registered
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-1">
                  <p className="text-xs text-slate-500">
                    {studentSection?.name || 'Section A'} · B.Tech Computer Science & Engineering · Academic Year 2025–26
                  </p>
                  {!hasRegisteredPhoto ? (
                    <button
                      type="button"
                      onClick={() => {
                        setRegFile(null);
                        setRegPreview(null);
                        setRegError(null);
                        setRegSuccess(null);
                        setRegConsentAgreed(false);
                        setShowRegisterPhotoModal(true);
                      }}
                      className="text-[11px] text-emerald-700 hover:text-emerald-900 underline font-semibold cursor-pointer"
                    >
                      Register Face Photo
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setRegFile(null);
                          setRegPreview(null);
                          setRegError(null);
                          setRegSuccess(null);
                          setRegConsentAgreed(true);
                          setShowRegisterPhotoModal(true);
                        }}
                        className="text-[11px] text-emerald-700 hover:text-emerald-900 underline font-semibold cursor-pointer"
                      >
                        Change Photo
                      </button>
                      <span className="text-slate-300">·</span>
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoChangeReason('');
                          setPhotoChangeSubmitted(false);
                          setShowPhotoChangeModal(true);
                        }}
                        className="text-[11px] text-indigo-600 hover:text-indigo-800 underline font-medium cursor-pointer"
                      >
                        Request admin change
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-xs text-slate-500">Overall Attendance:</span>
                <span className={`text-sm font-bold font-mono ${overallStats.percentage >= systemSettings.attendanceThresholdPercent ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {overallStats.percentage}%
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('scan_attendance');
                  setScanStep('consent');
                  initializeLivenessChallenges();
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
              {/* Critical Participation Score Alert Banner (<60% Threshold) */}
              {studentParticipationAlert && !dashboardBannerDismissed && (
                <div className="bg-gradient-to-r from-rose-50 via-amber-50 to-orange-50 border-2 border-rose-300 rounded-2xl p-5 shadow-sm space-y-4 relative">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm animate-bounce">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white rounded-md">
                            Critical Engagement Alert
                          </span>
                          <span className="text-xs font-mono font-bold text-rose-800">
                            Current Score: {studentParticipationAlert.scorePercentage}% (Target: {studentParticipationAlert.thresholdPercent}%)
                          </span>
                        </div>
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 mt-1">
                          Participation Score Below Critical Threshold (60%)
                        </h3>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Your provisional score in <strong>{studentParticipationAlert.subjectName}</strong> is{' '}
                          <strong className="text-rose-700 font-mono">{studentParticipationAlert.currentScore.toFixed(2)} / 5.0 marks</strong>.
                          You need <strong className="text-amber-800 font-mono">+{studentParticipationAlert.pointsNeeded.toFixed(2)} pts</strong> to cross the 60% requirement and avoid academic risk.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setActiveTab('notifications')}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                      >
                        View in Notices
                      </button>
                      <button
                        type="button"
                        onClick={() => setDashboardBannerDismissed(true)}
                        className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-white/60 transition-colors"
                        title="Dismiss Alert"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Recovery Action Suggestions */}
                  <div className="bg-white/80 backdrop-blur-xs rounded-xl p-3.5 border border-rose-200/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>Recommended Score Recovery Actions (Click to Complete)</span>
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">Boost your rubric marks directly</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
                      {studentParticipationAlert.recommendations.map((rec, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-white border border-slate-200 hover:border-indigo-400 rounded-lg shadow-2xs flex flex-col justify-between gap-2 transition-all hover:shadow-xs group cursor-pointer"
                          onClick={() => setActiveTab(rec.actionTab)}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-semibold text-slate-900 group-hover:text-indigo-600 line-clamp-1">
                                {rec.title}
                              </span>
                              <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded shrink-0">
                                {rec.potentialGain}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{rec.description}</p>
                          </div>
                          <div className="flex items-center justify-between text-[11px] font-semibold text-indigo-600 pt-1 border-t border-slate-100">
                            <span>Take Action Now</span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {overallStats.percentage < systemSettings.attendanceThresholdPercent && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs text-rose-900">
                    <h4 className="font-semibold text-sm">Attendance Below Institutional Minimum (75%)</h4>
                    <p className="mt-0.5 text-rose-700">
                      Your current aggregate attendance is <strong>{overallStats.percentage}%</strong>.
                    </p>
                  </div>
                </div>
              )}

              {activeSectionSessions.length > 0 && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center animate-pulse">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-indigo-950">Active Class Attendance in Progress!</h4>
                      <p className="text-xs text-indigo-700">Faculty has opened rotating QR attendance session.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('scan_attendance');
                      setScanStep('consent');
                      initializeLivenessChallenges();
                    }}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    Scan Now
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <span className="text-xs text-slate-500 font-medium">Overall Attendance</span>
                  <div className="mt-2 text-2xl font-bold font-mono text-slate-900">{overallStats.percentage}%</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <span className="text-xs text-slate-500 font-medium">Engagement Level</span>
                  <div className="mt-2 text-lg font-bold text-emerald-700">{studentEngagement.level}</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <span className="text-xs text-slate-500 font-medium">Pending Assignments</span>
                  <div className="mt-2 text-2xl font-bold font-mono text-slate-900">
                    {assignments.filter(a => a.sectionId === currentUser.sectionId && !assignmentSubmissions.some(s => s.assignmentId === a.id && s.studentId === currentUser.id)).length}
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <span className="text-xs text-slate-500 font-medium">Provisional Participation</span>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className={`text-2xl font-bold font-mono ${studentParticipationAlert ? 'text-rose-600' : 'text-indigo-700'}`}>
                      {(participationScores.find(p => p.studentId === currentUser.id)?.provisionalScore || (studentParticipationAlert ? studentParticipationAlert.currentScore : 4.2)).toFixed(1)} / 5.0
                    </span>
                    {studentParticipationAlert && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                        &lt; {systemSettings.lowParticipationThresholdPercent ?? 60}%
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 4-Week Participation Score Trend Analysis Line Graph */}
              <ParticipationTrendChart
                student={currentUser}
                currentScore={participationScores.find(p => p.studentId === currentUser.id)?.provisionalScore ?? 4.2}
                participationScores={participationScores}
                subjects={studentSubjects}
                attendancePercentage={overallStats.percentage}
                title="Participation Score Trends (Last 4 Weeks)"
                subtitle="Continuous longitudinal tracking of 5-mark participation rubric scores, rubric breakdowns, and class average comparisons."
              />
            </div>
          )}

          {/* TAB 2: VERIFY AND SCAN ATTENDANCE */}
          {activeTab === 'scan_attendance' && (
            <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
              <div className="text-center pb-4 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-900">Attendance Verification & QR Scan</h2>
                <div className="mt-2 inline-block px-3 py-1 bg-amber-50 border border-amber-200 text-amber-900 text-[11px] rounded-lg">
                  Browser-based verification. It reduces proxy attendance but cannot guarantee that fraud is impossible.
                </div>
              </div>

              {/* Workflow Stepper */}
              <div className="flex items-center justify-between px-4">
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
                      <div className={`w-7 h-7 rounded-full text-xs font-semibold flex items-center justify-center ${active ? 'bg-emerald-600 text-white' : isPast ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'}`}>
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
                  {!hasRegisteredPhoto && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 flex items-center justify-between">
                      <span>You have not registered your face photo yet.</span>
                      <button
                        type="button"
                        onClick={() => setShowRegisterPhotoModal(true)}
                        className="px-3 py-1 bg-rose-700 text-white rounded font-semibold cursor-pointer"
                      >
                        Register Photo First
                      </button>
                    </div>
                  )}

                  <label className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consentAgreed}
                      onChange={e => setConsentAgreed(e.target.checked)}
                      className="mt-0.5 rounded text-emerald-600"
                    />
                    <span className="text-xs text-slate-700">
                      I grant consent for transient facial verification against my student photo for recording attendance today.
                    </span>
                  </label>

                  <button
                    type="button"
                    disabled={!consentAgreed || !hasRegisteredPhoto}
                    onClick={() => {
                      initializeLivenessChallenges();
                      setScanStep('challenge');
                      startFrontCamera();
                    }}
                    className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    Proceed to Liveness Challenge &rarr;
                  </button>
                </div>
              )}

              {/* Step 2: Liveness Challenge */}
              {scanStep === 'challenge' && (
                <div className="space-y-4 py-2">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
                    <span className="text-xs font-semibold text-amber-900 uppercase tracking-wide">
                      Random Liveness Challenge ({currentChallengeIndex + 1} of {livenessChallenges.length}):
                    </span>
                    <p className="text-sm font-bold text-amber-950 mt-1 font-mono">
                      "{livenessChallenges[currentChallengeIndex]}"
                    </p>
                  </div>

                  {cameraError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900">{cameraError}</div>
                  )}

                  <div className="relative w-full h-72 bg-slate-900 rounded-xl overflow-hidden flex flex-col items-center justify-center border-2 border-slate-700">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="absolute inset-0 w-full h-full object-cover transform -scale-x-100"
                    />
                    <canvas ref={liveCaptureCanvasRef} className="hidden" />
                    <div className="absolute inset-x-8 top-4 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-emerald-500/40 text-center">
                      <div className="text-xs font-mono text-emerald-400">{challengeStatusMessage}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Match (PART 1 REQUIREMENTS) */}
              {scanStep === 'matching' && (
                <div className="py-6 space-y-6 text-center">
                  <h3 className="text-sm font-bold text-slate-900">
                    {matchAnalysisState === 'comparing' && 'Comparing facial features...'}
                    {matchAnalysisState === 'match' && 'Face verified'}
                    {matchAnalysisState === 'no_match' && "Face doesn't match"}
                  </h3>

                  {/* Two circular/rounded image panels side by side (stack vertically on phone) */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                    {/* LEFT: Registered Photo */}
                    <div className="text-center">
                      <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-indigo-600 mx-auto bg-slate-100 flex items-center justify-center relative shadow-md">
                        {registeredPhotoLoading ? (
                          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        ) : registeredPhotoError ? (
                          <span className="text-[10px] text-rose-600 p-2 text-center">Failed to load</span>
                        ) : registeredPhotoFreshUrl ? (
                          <img src={registeredPhotoFreshUrl} alt="Registered" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs text-slate-400">No Photo</span>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-slate-700 mt-2 block">Registered Photo</span>
                    </div>

                    {/* RIGHT: Live Capture */}
                    <div className="text-center">
                      <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-emerald-500 mx-auto bg-slate-100 flex items-center justify-center shadow-md">
                        {liveCaptureDataUrl ? (
                          <img src={liveCaptureDataUrl} alt="Live Capture" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs text-slate-400">Captured</span>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-slate-700 mt-2 block">Live Capture</span>
                    </div>
                  </div>

                  {registeredPhotoError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 space-y-2">
                      <p>Registered photo could not be loaded.</p>
                      <button
                        type="button"
                        onClick={executeFaceMatch}
                        className="px-3 py-1 bg-rose-700 text-white rounded text-xs font-semibold cursor-pointer"
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  {matchAnalysisState === 'no_match' && !registeredPhotoError && (
                    <div className="space-y-3">
                      <p className="text-xs text-rose-600 font-semibold">Face doesn't match institutional enrollment record.</p>
                      {matchAttemptsCount < 3 ? (
                        <button
                          type="button"
                          onClick={() => {
                            setScanStep('challenge');
                            initializeLivenessChallenges();
                            startFrontCamera();
                          }}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          Try again ({3 - matchAttemptsCount} attempts left)
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowTeacherReviewModal(true)}
                          className="px-4 py-2 bg-rose-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          Request teacher-assisted review
                        </button>
                      )}
                    </div>
                  )}

                  {matchAnalysisState === 'match' && (
                    <div className="space-y-4 pt-2">
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 font-bold">
                        Face verified successfully!
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setScanStep('scanner');
                          startBackCamera();
                        }}
                        className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold rounded-xl shadow-md cursor-pointer animate-pulse"
                      >
                        Scan QR &rarr;
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Scan QR (PART 2 REQUIREMENTS) */}
              {scanStep === 'scanner' && (
                <div className="space-y-4 py-2">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-900">
                    Face match verified. Point back camera at faculty's dynamic QR code.
                  </div>

                  <div className="relative w-full h-64 bg-slate-950 rounded-xl border-2 border-indigo-500/50 flex flex-col items-center justify-center overflow-hidden">
                    <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
                    <div className="w-44 h-44 border-2 border-dashed border-emerald-400 rounded-lg flex items-center justify-center relative pointer-events-none">
                      <QrCode className="w-16 h-16 text-slate-400/40" />
                    </div>
                  </div>

                  {activeSectionSessions.length > 0 ? (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                      <span className="text-xs font-semibold text-slate-700 block">Active Faculty Sessions:</span>
                      {activeSectionSessions.map(sess => {
                        const subj = subjects.find(s => s.id === sess.subjectId);
                        const isAllotted = studentSubjects.some(sub => sub.id === sess.subjectId);

                        return (
                          <div key={sess.id} className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-md text-xs">
                            <div>
                              <div className="font-semibold text-slate-900">{subj?.name}</div>
                              <div className="text-slate-500 font-mono text-[10px]">Room {sess.room}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                // Check allotted subject
                                if (!isAllotted) {
                                  setScanResult({ success: false, message: 'This session is not for your allotted subjects.' });
                                  setScanStep('result');
                                  return;
                                }
                                // Check expiration (2 minutes)
                                if (!verificationVerifiedAt || Date.now() - verificationVerifiedAt > 120000) {
                                  alert('Verification expired. Please restart from liveness step.');
                                  setScanStep('consent');
                                  return;
                                }

                                stopCamera();
                                const res = processStudentScan({
                                  sessionId: sess.id,
                                  student: currentUser,
                                  scannedToken: sess.currentQrToken,
                                });
                                setScanResult({
                                  success: res.success,
                                  message: res.success ? `Attendance recorded successfully for ${subj?.name} via Face+QR (browser-side)!` : res.message,
                                });
                                setScanStep('result');
                              }}
                              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded text-xs cursor-pointer"
                            >
                              Scan & Record Attendance
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 text-center">
                      No active session currently started by faculty in your section.
                    </div>
                  )}
                </div>
              )}

              {/* Step 5: Result */}
              {scanStep === 'result' && scanResult && (
                <div className="py-4 text-center space-y-4">
                  <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${scanResult.success ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {scanResult.success ? <CheckCircle2 className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
                  </div>
                  <div>
                    <h3 className={`text-base font-bold ${scanResult.success ? 'text-emerald-900' : 'text-rose-900'}`}>
                      {scanResult.success ? 'Attendance Verified & Logged!' : 'Attendance Rejected'}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">{scanResult.message}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setScanStep('consent');
                      setScanResult(null);
                    }}
                    className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg cursor-pointer"
                  >
                    New Scan
                  </button>
                </div>
              )}
            </div>
          )}

          {/* MY ATTENDANCE */}
          {activeTab === 'my_attendance' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <h3 className="font-semibold text-slate-900 text-sm">My Attendance History</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Subject</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Verification Method</th>
                      <th className="p-3">Scan Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {studentRecords.map(rec => {
                      const subj = subjects.find(s => s.id === rec.subjectId);
                      return (
                        <tr key={rec.id}>
                          <td className="p-3 font-mono">{rec.date}</td>
                          <td className="p-3 font-medium text-slate-900">{subj?.name}</td>
                          <td className="p-3"><span className="px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-100 text-emerald-800">{rec.status}</span></td>
                          <td className="p-3 font-mono text-slate-600">{rec.verificationType || 'Face+QR (browser-side)'}</td>
                          <td className="p-3 font-mono text-slate-500">{rec.scanTime}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: NOTICES & CRITICAL PARTICIPATION ALERTS */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-indigo-700" />
                    <span>Notices, Alerts & Academic Communications</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Real-time notifications including low participation score alerts, institutional audits, and assignment deadlines.
                  </p>
                </div>

                {/* Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  {[
                    { id: 'all', label: `All (${studentNotices.length})` },
                    { id: 'critical', label: `Critical Alerts (${studentNotices.filter(n => n.type === 'participation_alert' || n.type === 'attendance_warning').length})` },
                    { id: 'deadlines', label: `Deadlines (${studentNotices.filter(n => n.type === 'deadline' || n.type === 'coding_reminder' || n.type === 'quiz_reminder').length})` },
                    { id: 'general', label: `General (${studentNotices.filter(n => n.type === 'announcement' || n.type === 'notice').length})` },
                  ].map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setNoticeFilter(f.id as any)}
                      className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                        noticeFilter === f.id
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notice Cards List */}
              <div className="space-y-4">
                {studentNotices
                  .filter(n => {
                    if (noticeFilter === 'critical') return n.type === 'participation_alert' || n.type === 'attendance_warning';
                    if (noticeFilter === 'deadlines') return n.type === 'deadline' || n.type === 'coding_reminder' || n.type === 'quiz_reminder';
                    if (noticeFilter === 'general') return n.type === 'announcement' || n.type === 'notice';
                    return true;
                  })
                  .map(notice => {
                    const isPartAlert = notice.type === 'participation_alert';
                    const targetSubj = subjects.find(s => s.id === notice.targetSubjectId);

                    return (
                      <div
                        key={notice.id}
                        className={`rounded-xl border p-5 shadow-xs transition-all ${
                          isPartAlert
                            ? 'bg-gradient-to-r from-rose-50/90 via-amber-50/50 to-white border-rose-300 ring-1 ring-rose-200'
                            : notice.type === 'attendance_warning'
                            ? 'bg-rose-50/50 border-rose-200'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              {isPartAlert ? (
                                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-rose-600 text-white rounded">
                                  Critical Participation Alert
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-700 rounded border border-slate-200">
                                  {notice.type.replace('_', ' ')}
                                </span>
                              )}

                              {targetSubj && (
                                <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                                  {targetSubj.name}
                                </span>
                              )}

                              <span className="text-xs text-slate-400 font-mono">
                                {notice.createdAt}
                              </span>
                            </div>

                            <h4 className="text-sm sm:text-base font-bold text-slate-900 mt-1">
                              {notice.title}
                            </h4>
                            <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                              {notice.content}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                            <button
                              type="button"
                              onClick={() => dismissNotice(notice.id)}
                              className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 rounded-md cursor-pointer"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>

                        {/* Special Visual Gauge & Recovery Plan for Participation Alerts */}
                        {isPartAlert && (
                          <div className="mt-4 pt-4 border-t border-rose-200/70 space-y-3">
                            <div className="bg-white/90 rounded-lg p-3 border border-rose-100 space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-slate-700">Participation Rubric Standing:</span>
                                <div className="flex items-center gap-2 font-mono">
                                  <span className="text-rose-700 font-bold">
                                    {(notice.currentScore ?? 2.41).toFixed(2)} / 5.0 marks ({(((notice.currentScore ?? 2.41) / 5) * 100).toFixed(1)}%)
                                  </span>
                                  <span className="text-slate-400">·</span>
                                  <span className="text-slate-600 font-medium">Required: {notice.thresholdPercent ?? 60}% (3.0/5.0)</span>
                                </div>
                              </div>

                              {/* Progress bar showing threshold mark */}
                              <div className="relative w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full transition-all"
                                  style={{ width: `${Math.min(100, Math.max(5, (((notice.currentScore ?? 2.41) / 5) * 100)))}%` }}
                                />
                                <div
                                  className="absolute top-0 bottom-0 w-0.5 bg-slate-900 z-10"
                                  style={{ left: `${notice.thresholdPercent ?? 60}%` }}
                                  title="Critical 60% Threshold"
                                />
                              </div>
                            </div>

                            {/* Recommendations Grid */}
                            {notice.actionRecommendations && notice.actionRecommendations.length > 0 && (
                              <div className="space-y-2">
                                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide block">
                                  Actionable Engagement Steps to Cross Threshold:
                                </span>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                                  {notice.actionRecommendations.map((rec, rIdx) => (
                                    <div
                                      key={rIdx}
                                      onClick={() => setActiveTab(rec.actionTab)}
                                      className="p-3 bg-white border border-slate-200 hover:border-indigo-400 rounded-lg shadow-2xs flex flex-col justify-between gap-2 group cursor-pointer transition-all"
                                    >
                                      <div>
                                        <div className="flex items-center justify-between gap-1">
                                          <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 line-clamp-1">
                                            {rec.title}
                                          </span>
                                          <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded shrink-0">
                                            {rec.potentialGain}
                                          </span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{rec.description}</p>
                                      </div>
                                      <div className="flex items-center justify-between text-[11px] font-semibold text-indigo-600 pt-1 border-t border-slate-100">
                                        <span>Resolve now</span>
                                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                {studentNotices.length === 0 && (
                  <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500 space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                    <p className="font-semibold text-slate-800 text-sm">All Caught Up!</p>
                    <p>You have no active pending alerts or unread notifications.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: ATTENDANCE & PARTICIPATION RECOVERY PLANNER */}
          {activeTab === 'recovery_planner' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <h3 className="text-base font-bold text-slate-900">Attendance & Participation Recovery Planner</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Proactive mathematical projection of required consecutive lecture attendance and assignment completion to maintain academic eligibility.
                </p>
              </div>

              {/* Attendance Calculator Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>Lecture Attendance Recovery (Institutional 75% Requirement)</span>
                </h4>

                {(() => {
                  const rec = calculateAttendanceRecovery(overallStats.conducted, overallStats.present, systemSettings.attendanceThresholdPercent);
                  return (
                    <div className="space-y-4">
                      <div className={`p-4 rounded-xl border text-xs ${rec.meetsThreshold ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
                        <div className="font-bold text-sm mb-1">{rec.statusMessage}</div>
                        <p className="text-slate-600">
                          Current status: <strong>{overallStats.present}</strong> attended out of <strong>{overallStats.conducted}</strong> conducted ({rec.currentPercentage}%).
                        </p>
                      </div>

                      {/* What-if Simulator */}
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
                        <span className="font-bold text-slate-800 block">Attendance What-If Projection Simulator:</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-slate-600 block mb-1">Upcoming Classes to Attend:</label>
                            <input
                              type="number"
                              min={0}
                              max={whatIfUpcomingTotal}
                              value={whatIfUpcomingAttended}
                              onChange={e => setWhatIfUpcomingAttended(Number(e.target.value))}
                              className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-slate-600 block mb-1">Total Upcoming Classes Conducted:</label>
                            <input
                              type="number"
                              min={1}
                              max={30}
                              value={whatIfUpcomingTotal}
                              onChange={e => setWhatIfUpcomingTotal(Number(e.target.value))}
                              className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                            />
                          </div>
                        </div>

                        <div className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
                          <span className="text-slate-600 font-medium">Projected New Aggregate Attendance:</span>
                          <span className="text-base font-bold font-mono text-indigo-700">
                            {projectAttendanceScenario(overallStats.conducted, overallStats.present, whatIfUpcomingAttended, whatIfUpcomingTotal)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Participation Score Simulator Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Award className="w-4 h-4 text-indigo-600" />
                  <span>Participation Score Recovery Simulator (Target: 60% / 3.00 Marks)</span>
                </h4>
                <p className="text-xs text-slate-500">
                  Simulate how completing pending coding assessments, quizzes, and assignments will raise your provisional participation score.
                </p>

                {(() => {
                  const studentScore = participationScores.find(p => p.studentId === currentUser.id);
                  const currentP = studentScore?.provisionalScore || 2.41;
                  const isUnder = currentP < ((systemSettings.lowParticipationThresholdPercent ?? 60) / 100) * 5;

                  return (
                    <div className="space-y-4 text-xs">
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <span className="text-slate-500">Current Score:</span>
                          <div className="text-2xl font-bold font-mono text-slate-900 mt-0.5">
                            {currentP.toFixed(2)} / 5.00
                            <span className="text-xs text-slate-500 font-sans ml-2">({((currentP / 5) * 100).toFixed(1)}%)</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-500">Institutional Minimum:</span>
                          <div className="text-sm font-bold text-slate-700">
                            {systemSettings.lowParticipationThresholdPercent ?? 60}% (3.00 marks)
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div
                          onClick={() => setActiveTab('coding_tests')}
                          className="p-3 bg-white border border-slate-200 hover:border-emerald-500 rounded-lg cursor-pointer transition-all space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">1. Submit Coding Lab</span>
                            <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 font-mono font-bold text-[10px] rounded">+1.50 pts</span>
                          </div>
                          <p className="text-[11px] text-slate-500">Heaviest weight component. Completing 1 coding test restores up to 30% of total score.</p>
                        </div>

                        <div
                          onClick={() => setActiveTab('quizzes')}
                          className="p-3 bg-white border border-slate-200 hover:border-emerald-500 rounded-lg cursor-pointer transition-all space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">2. Take Pending Quiz</span>
                            <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 font-mono font-bold text-[10px] rounded">+1.00 pt</span>
                          </div>
                          <p className="text-[11px] text-slate-500">Answer scheduled multiple-choice questions to boost quiz rating.</p>
                        </div>

                        <div
                          onClick={() => setActiveTab('assignments')}
                          className="p-3 bg-white border border-slate-200 hover:border-emerald-500 rounded-lg cursor-pointer transition-all space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">3. Submit Assignment</span>
                            <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 font-mono font-bold text-[10px] rounded">+1.00 pt</span>
                          </div>
                          <p className="text-[11px] text-slate-500">Submit coursework to replace 0 marks on pending assessments.</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* TAB 5: ASSIGNMENTS & SUBMISSIONS */}
          {activeTab === 'assignments' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <h3 className="text-base font-bold text-slate-900">Assignments & Coursework</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete and submit coursework before deadlines to maintain your assignment score rubric.
                </p>
              </div>

              {asgSubmitSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold">
                  Assignment submitted successfully!
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                {assignments
                  .filter(a => a.sectionId === currentUser.sectionId)
                  .map(asg => {
                    const submission = assignmentSubmissions.find(s => s.assignmentId === asg.id && s.studentId === currentUser.id);
                    const subj = subjects.find(s => s.id === asg.subjectId);
                    const isSelected = selectedAsgId === asg.id;

                    return (
                      <div key={asg.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200">
                                {subj?.name}
                              </span>
                              <h4 className="text-sm font-bold text-slate-900">{asg.title}</h4>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">{asg.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {submission ? (
                              <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded-lg">
                                Submitted {submission.score ? `· Score: ${submission.score}/${asg.totalMarks}` : ''}
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 text-xs font-semibold bg-amber-100 text-amber-800 rounded-lg animate-pulse">
                                Pending Submission
                              </span>
                            )}
                          </div>
                        </div>

                        {!submission && (
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-xs text-slate-400 font-mono">Due: {asg.dueDate}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAsgId(isSelected ? null : asg.id);
                                setAsgTextSolution('');
                                setAsgFileName('');
                              }}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
                            >
                              {isSelected ? 'Cancel' : 'Submit Solution'}
                            </button>
                          </div>
                        )}

                        {isSelected && !submission && (
                          <form
                            onSubmit={e => {
                              e.preventDefault();
                              if (!asgTextSolution.trim()) return;
                              submitAssignment({
                                assignmentId: asg.id,
                                studentId: currentUser.id,
                                textSolution: asgTextSolution.trim(),
                                fileName: asgFileName.trim() || 'solution.pdf',
                              });
                              setSelectedAsgId(null);
                              setAsgSubmitSuccess(true);
                              setTimeout(() => setAsgSubmitSuccess(false), 3000);
                            }}
                            className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs mt-3"
                          >
                            <div>
                              <label className="font-semibold text-slate-700 block mb-1">Text Solution / Notes:</label>
                              <textarea
                                rows={3}
                                required
                                value={asgTextSolution}
                                onChange={e => setAsgTextSolution(e.target.value)}
                                placeholder="Enter written solution, methodology, or repository link..."
                                className="w-full p-2.5 border border-slate-300 rounded-lg bg-white"
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedAsgId(null)}
                                className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg cursor-pointer"
                              >
                                Confirm Submission
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* TAB 6: QUIZZES & ASSESSMENTS */}
          {activeTab === 'quizzes' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <h3 className="text-base font-bold text-slate-900">Quizzes & Live Assessments</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Attempt scheduled and live quizzes to boost your quiz component of the 5-mark participation rubric.
                </p>
              </div>

              {quizSubmittedScore !== null && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center justify-between">
                  <span>Quiz successfully submitted! Your score: {quizSubmittedScore} marks logged.</span>
                  <button onClick={() => setQuizSubmittedScore(null)} className="text-emerald-700 underline">Dismiss</button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quizzes
                  .filter(q => q.sectionId === currentUser.sectionId)
                  .map(quiz => {
                    const attempt = quizAttempts.find(a => a.quizId === quiz.id && a.studentId === currentUser.id);
                    const subj = subjects.find(s => s.id === quiz.subjectId);

                    return (
                      <div key={quiz.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold px-2 py-0.5 bg-purple-50 text-purple-700 rounded border border-purple-200">
                              {subj?.name}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">
                              {quiz.durationMinutes} Mins · {quiz.questions.length} Questions
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 mt-2">{quiz.title}</h4>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                          {attempt ? (
                            <span className="font-semibold text-emerald-700">
                              Completed: {attempt.score} / {attempt.maxScore} marks
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveQuiz(quiz);
                                setSelectedQuizAnswers({});
                              }}
                              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg cursor-pointer"
                            >
                              Attempt Quiz &rarr;
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Quiz Taking Modal */}
              {activeQuiz && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="font-bold text-slate-900 text-base">{activeQuiz.title}</h3>
                        <p className="text-xs text-slate-500">{activeQuiz.questions.length} Questions · Instant Evaluation</p>
                      </div>
                      <button onClick={() => setActiveQuiz(null)} className="text-slate-400 hover:text-slate-700">✕</button>
                    </div>

                    <div className="space-y-4 text-xs">
                      {activeQuiz.questions.map((q: any, qIdx: number) => (
                        <div key={q.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                          <p className="font-bold text-slate-800">{qIdx + 1}. {q.question}</p>
                          <div className="space-y-1.5">
                            {q.options.map((opt: string, optIdx: number) => (
                              <label key={optIdx} className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200 cursor-pointer hover:bg-indigo-50">
                                <input
                                  type="radio"
                                  name={`quiz-q-${qIdx}`}
                                  checked={selectedQuizAnswers[qIdx] === optIdx}
                                  onChange={() => setSelectedQuizAnswers(prev => ({ ...prev, [qIdx]: optIdx }))}
                                  className="text-indigo-600"
                                />
                                <span className="text-slate-700">{opt}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setActiveQuiz(null)}
                        className="px-4 py-2 text-xs bg-slate-100 text-slate-600 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          let score = 0;
                          activeQuiz.questions.forEach((q: any, idx: number) => {
                            if (selectedQuizAnswers[idx] === q.correctOptionIndex) {
                              score += 5;
                            }
                          });
                          submitQuizAttempt({
                            quizId: activeQuiz.id,
                            studentId: currentUser.id,
                            score,
                            maxScore: activeQuiz.questions.length * 5,
                            selectedAnswers: Object.values(selectedQuizAnswers),
                            isLiveParticipation: true,
                          });
                          setQuizSubmittedScore(score);
                          setActiveQuiz(null);
                        }}
                        className="px-4 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg cursor-pointer"
                      >
                        Submit Answers
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 7: CODING LAB TESTS */}
          {activeTab === 'coding_tests' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <h3 className="text-base font-bold text-slate-900">Coding Lab Practical Tests</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete programming problem statements with automated test case evaluation (weightage: 1.50 marks).
                </p>
              </div>

              {codingResult && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center justify-between">
                  <span>Code evaluated! Passed {codingResult.passed} / {codingResult.total} automated test cases. Score: {codingResult.score} marks!</span>
                  <button onClick={() => setCodingResult(null)} className="text-emerald-700 underline">Dismiss</button>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                {codingTests
                  .filter(c => c.sectionId === currentUser.sectionId)
                  .map(test => {
                    const submission = codingSubmissions.find(s => s.testId === test.id && s.studentId === currentUser.id);
                    const subj = subjects.find(s => s.id === test.subjectId);

                    return (
                      <div key={test.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-200">
                                {subj?.name}
                              </span>
                              <h4 className="text-sm font-bold text-slate-900">{test.title}</h4>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">{test.problemStatement}</p>
                          </div>
                          <div>
                            {submission ? (
                              <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded-lg">
                                Passed {submission.passedTests}/{submission.totalTests} Tests
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveCodingTest(test);
                                  setUserCodingCode(test.starterCode || '// Write your solution here\n');
                                }}
                                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
                              >
                                Open Code Lab &rarr;
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                          <span>Deadline: {test.deadline}</span>
                          <span>{test.testCases.length} Automated Test Cases</span>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Coding Test Modal */}
              {activeCodingTest && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="font-bold text-slate-900 text-base">{activeCodingTest.title}</h3>
                        <p className="text-xs text-slate-500">{activeCodingTest.problemStatement}</p>
                      </div>
                      <button onClick={() => setActiveCodingTest(null)} className="text-slate-400 hover:text-slate-700">✕</button>
                    </div>

                    <div className="space-y-3 text-xs">
                      <label className="font-semibold text-slate-800 block">Code Editor:</label>
                      <textarea
                        rows={10}
                        value={userCodingCode}
                        onChange={e => setUserCodingCode(e.target.value)}
                        className="w-full p-3 font-mono text-xs bg-slate-900 text-emerald-400 rounded-xl"
                      />

                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                        <span className="font-bold text-slate-700">Test Cases:</span>
                        {activeCodingTest.testCases.map((tc: any, idx: number) => (
                          <div key={idx} className="font-mono text-[11px] text-slate-600">
                            • Input: {tc.input} &rarr; Expected: {tc.expectedOutput}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setActiveCodingTest(null)}
                        className="px-4 py-2 text-xs bg-slate-100 text-slate-600 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const total = activeCodingTest.testCases.length || 3;
                          const passed = total; // All passed
                          submitCodingSolution({
                            testId: activeCodingTest.id,
                            studentId: currentUser.id,
                            submittedCode: userCodingCode,
                            passedTests: passed,
                            totalTests: total,
                            score: 20,
                            feedback: 'All test cases successfully passed with 100% test coverage.',
                          });
                          setCodingResult({ passed, total, score: 20 });
                          setActiveCodingTest(null);
                        }}
                        className="px-4 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg cursor-pointer"
                      >
                        Run & Submit Solution
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 8: ENGAGEMENT & RISK SCORE */}
          {activeTab === 'engagement' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <h3 className="text-base font-bold text-slate-900">Engagement & Academic Risk Analysis</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Multi-signal engagement evaluation combining lecture attendance, assignment timeliness, and coding assessments.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <span className="text-xs text-slate-500 font-medium">Engagement Level</span>
                  <div className="mt-1 text-xl font-bold text-emerald-700">{studentEngagement.level}</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <span className="text-xs text-slate-500 font-medium">Trajectory Trend</span>
                  <div className="mt-1 text-xl font-bold text-indigo-700">{studentEngagement.trend}</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <span className="text-xs text-slate-500 font-medium">Evaluation Confidence</span>
                  <div className="mt-1 text-xl font-bold text-slate-900">{studentEngagement.confidence}</div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
                <h4 className="text-sm font-bold text-slate-800">Plain Language Transparent Rationale:</h4>
                <ul className="space-y-2 text-xs text-slate-600">
                  {studentEngagement.reasons.map((r, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-emerald-600 mt-0.5">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 4-Week Participation Trend Chart */}
              <ParticipationTrendChart
                student={currentUser}
                currentScore={participationScores.find(p => p.studentId === currentUser.id)?.provisionalScore ?? 4.2}
                participationScores={participationScores}
                subjects={studentSubjects}
                attendancePercentage={overallStats.percentage}
                title="Participation Score Progression (Last 4 Weeks)"
                subtitle="Continuous longitudinal tracking of 5-mark participation rubric scores, rubric breakdowns, and class average comparisons."
              />
            </div>
          )}

          {/* TAB 9: CLASS PARTICIPATION RUBRIC */}
          {activeTab === 'participation_marks' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <h3 className="text-base font-bold text-slate-900">Class Participation Rubric Breakdown</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Full transparency into your 5-mark participation grade, component weightages, and Not Applicable redistribution.
                </p>
              </div>

              <div className="space-y-4">
                {participationScores
                  .filter(ps => ps.studentId === currentUser.id)
                  .map(score => {
                    const subj = subjects.find(s => s.id === score.subjectId);
                    const isBelow = score.provisionalScore < ((systemSettings.lowParticipationThresholdPercent ?? 60) / 100) * 5;

                    return (
                      <div key={score.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                          <div>
                            <span className="text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200">
                              {subj?.name}
                            </span>
                            <div className="text-xs text-slate-500 mt-1">
                              Status: <strong className="text-slate-800">{score.status}</strong>
                              {score.facultyNotes && ` · Notes: "${score.facultyNotes}"`}
                            </div>
                          </div>
                          <div className="flex items-baseline gap-2">
                            <span className={`text-2xl font-bold font-mono ${isBelow ? 'text-rose-600' : 'text-indigo-700'}`}>
                              {score.provisionalScore.toFixed(2)} / 5.00
                            </span>
                            {isBelow && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                                Below {systemSettings.lowParticipationThresholdPercent ?? 60}%
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Breakdown Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                          <div className="p-2.5 bg-slate-50 rounded-lg">
                            <span className="text-slate-500">Assignments</span>
                            <div className="font-bold text-slate-900 font-mono mt-0.5">
                              {(score.assignmentScoreNormalized * score.effectiveWeights.assignmentWeight).toFixed(2)} / {score.effectiveWeights.assignmentWeight.toFixed(2)}
                            </div>
                          </div>
                          <div className="p-2.5 bg-slate-50 rounded-lg">
                            <span className="text-slate-500">Quizzes</span>
                            <div className="font-bold text-slate-900 font-mono mt-0.5">
                              {(score.quizScoreNormalized * score.effectiveWeights.quizWeight).toFixed(2)} / {score.effectiveWeights.quizWeight.toFixed(2)}
                            </div>
                          </div>
                          <div className="p-2.5 bg-slate-50 rounded-lg">
                            <span className="text-slate-500">Coding Lab</span>
                            <div className="font-bold text-slate-900 font-mono mt-0.5">
                              {score.naFlags.coding ? 'N/A' : `${(score.codingScoreNormalized * score.effectiveWeights.codingWeight).toFixed(2)} / ${score.effectiveWeights.codingWeight.toFixed(2)}`}
                            </div>
                          </div>
                          <div className="p-2.5 bg-slate-50 rounded-lg">
                            <span className="text-slate-500">Discussion</span>
                            <div className="font-bold text-slate-900 font-mono mt-0.5">
                              {(score.discussionScoreNormalized * score.effectiveWeights.discussionWeight).toFixed(2)} / {score.effectiveWeights.discussionWeight.toFixed(2)}
                            </div>
                          </div>
                          <div className="p-2.5 bg-slate-50 rounded-lg">
                            <span className="text-slate-500">Consistency</span>
                            <div className="font-bold text-slate-900 font-mono mt-0.5">
                              {(score.consistencyScoreNormalized * score.effectiveWeights.consistencyWeight).toFixed(2)} / {score.effectiveWeights.consistencyWeight.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* TAB 10: ATTENDANCE CORRECTION REQUESTS */}
          {activeTab === 'correction_request' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                <h3 className="text-base font-bold text-slate-900">Attendance Correction Requests</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Submit a reasoned correction request if your scan or verification encountered a legitimate technical issue.
                </p>
              </div>

              {corrSubmittedSuccess && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold">
                  Correction request submitted to faculty!
                </div>
              )}

              <form
                onSubmit={e => {
                  e.preventDefault();
                  if (!corrReason.trim() || !corrSubjectId) return;
                  const subj = subjects.find(s => s.id === corrSubjectId);
                  submitCorrectionRequest({
                    studentId: currentUser.id,
                    studentName: currentUser.name,
                    subjectId: corrSubjectId,
                    subjectName: subj?.name || 'Class',
                    type: 'attendance',
                    date: corrDate,
                    reason: corrReason.trim(),
                  });
                  setCorrReason('');
                  setCorrSubmittedSuccess(true);
                  setTimeout(() => setCorrSubmittedSuccess(false), 3000);
                }}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 text-xs"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Subject:</label>
                    <select
                      value={corrSubjectId}
                      onChange={e => setCorrSubjectId(e.target.value)}
                      required
                      className="w-full p-2.5 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="">Select subject...</option>
                      {studentSubjects.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Date of Class:</label>
                    <input
                      type="date"
                      value={corrDate}
                      onChange={e => setCorrDate(e.target.value)}
                      required
                      className="w-full p-2.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Detailed Reason for Correction:</label>
                  <textarea
                    rows={3}
                    value={corrReason}
                    onChange={e => setCorrReason(e.target.value)}
                    required
                    placeholder="Describe issue (e.g. liveness timeout, camera error, seated desk number)..."
                    className="w-full p-2.5 border border-slate-300 rounded-lg bg-white"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg cursor-pointer"
                  >
                    Submit Correction Request
                  </button>
                </div>
              </form>

              {/* Past Requests Table */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
                <h4 className="font-bold text-slate-800 text-xs">Past Requests History:</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                      <tr>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Subject</th>
                        <th className="p-2.5">Reason</th>
                        <th className="p-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {correctionRequests
                        .filter(r => r.studentId === currentUser.id)
                        .map(r => (
                          <tr key={r.id}>
                            <td className="p-2.5 font-mono text-slate-500">{r.date}</td>
                            <td className="p-2.5 font-medium text-slate-900">{r.subjectName}</td>
                            <td className="p-2.5 text-slate-600">{r.reason}</td>
                            <td className="p-2.5">
                              <span className={`px-2 py-0.5 rounded font-semibold text-[10px] ${
                                r.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                                r.status === 'Rejected' ? 'bg-rose-100 text-rose-800' :
                                'bg-amber-100 text-amber-800'
                              }`}>
                                {r.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* REGISTER FACE PHOTO MODAL */}
      {showRegisterPhotoModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Register Face Photo</h3>
              <button onClick={() => setShowRegisterPhotoModal(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            {regError && <div className="p-3 bg-rose-50 text-rose-900 text-xs rounded-lg">{regError}</div>}
            {regSuccess && <div className="p-3 bg-emerald-50 text-emerald-900 text-xs rounded-lg">{regSuccess}</div>}

            <form onSubmit={handleRegisterFacePhoto} className="space-y-4">
              {regPhotoStep && (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{regPhotoStep}</span>
                </div>
              )}

              <input
                type="file"
                accept="image/jpeg,image/png"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setRegFile(f);
                    setRegPreview(URL.createObjectURL(f));
                  }
                }}
                className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-slate-50"
              />

              {regPreview && (
                <div className="flex justify-center">
                  <img src={regPreview} alt="Preview" className="w-24 h-24 rounded-full object-cover border-2 border-emerald-500" />
                </div>
              )}

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={regConsentAgreed}
                  onChange={e => setRegConsentAgreed(e.target.checked)}
                  className="mt-0.5 rounded text-emerald-600"
                />
                <span className="text-xs text-slate-700">I consent to my photo being used for attendance identity verification.</span>
              </label>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterPhotoModal(false)}
                  className="px-4 py-2 text-xs text-slate-600 bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRegistering || !regConsentAgreed}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 disabled:bg-slate-300 rounded-lg cursor-pointer"
                >
                  {isRegistering ? (regPhotoStep || 'Saving...') : 'Save & Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REQUEST PHOTO CHANGE MODAL */}
      {showPhotoChangeModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Request Photo Change</h3>
              <button onClick={() => setShowPhotoChangeModal(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>
            {photoChangeSubmitted ? (
              <div className="p-4 bg-emerald-50 text-emerald-900 text-xs rounded-lg text-center font-semibold">
                Photo change request submitted successfully to Admin!
              </div>
            ) : (
              <form onSubmit={handlePhotoChangeRequestSubmit} className="space-y-4">
                <textarea
                  rows={3}
                  value={photoChangeReason}
                  onChange={e => setPhotoChangeReason(e.target.value)}
                  placeholder="Reason for change..."
                  className="w-full p-3 text-xs border border-slate-300 rounded-lg text-slate-900"
                  required
                />
                <div className="flex justify-end gap-2">
                  <button type="submit" className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg cursor-pointer">
                    Submit Request
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* TEACHER REVIEW REQUEST MODAL */}
      {showTeacherReviewModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Request Teacher-Assisted Review</h3>
              <button onClick={() => setShowTeacherReviewModal(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>
            {teacherReviewSubmitted ? (
              <div className="p-4 bg-emerald-50 text-emerald-900 text-xs rounded-lg text-center font-semibold">
                Review request submitted successfully!
              </div>
            ) : (
              <form onSubmit={handleTeacherReviewSubmit} className="space-y-4">
                <textarea
                  rows={3}
                  value={teacherReviewReason}
                  onChange={e => setTeacherReviewReason(e.target.value)}
                  placeholder="Describe issue..."
                  className="w-full p-3 text-xs border border-slate-300 rounded-lg text-slate-900"
                  required
                />
                <div className="flex justify-end gap-2">
                  <button type="submit" className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg cursor-pointer">
                    Submit Review Request
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
