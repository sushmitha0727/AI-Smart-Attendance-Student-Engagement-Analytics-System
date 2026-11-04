import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Info,
  CheckCircle2,
  AlertCircle,
  Layers,
  Award,
} from 'lucide-react';
import {
  calculateWeeklyParticipationTrends,
  WeeklyParticipationSummary,
  WeeklyParticipationTrendPoint,
} from '../../utils/academicCalculations';
import { Subject, User, ParticipationScore } from '../../types';

interface ParticipationTrendChartProps {
  student: User;
  currentScore?: number;
  participationScores?: ParticipationScore[];
  subjects?: Subject[];
  attendancePercentage?: number;
  availableStudents?: User[];
  onSelectStudent?: (student: User) => void;
  showStudentSelector?: boolean;
  title?: string;
  subtitle?: string;
}

export const ParticipationTrendChart: React.FC<ParticipationTrendChartProps> = ({
  student,
  currentScore,
  participationScores = [],
  subjects = [],
  attendancePercentage,
  availableStudents,
  onSelectStudent,
  showStudentSelector = false,
  title = 'Student Participation Score Trends (Last 4 Weeks)',
  subtitle = 'Continuous 4-week longitudinal progression across assignments, quizzes, coding labs, discussions, and attendance consistency.',
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [showComponentBreakdown, setShowComponentBreakdown] = useState<boolean>(false);
  const [showClassBenchmark, setShowClassBenchmark] = useState<boolean>(true);

  // Find relevant participation score for student & subject
  const studentScoreRecord = useMemo(() => {
    if (selectedSubjectId === 'all') {
      return participationScores.find(p => p.studentId === student.id);
    }
    return participationScores.find(
      p => p.studentId === student.id && p.subjectId === selectedSubjectId
    );
  }, [participationScores, student.id, selectedSubjectId]);

  const effectiveScore = currentScore ?? studentScoreRecord?.provisionalScore ?? 4.2;

  // Calculate 4-week trend metrics
  const summary: WeeklyParticipationSummary = useMemo(() => {
    return calculateWeeklyParticipationTrends({
      studentId: student.id,
      currentParticipationScore: effectiveScore,
      attendancePercentage: attendancePercentage ?? 82.5,
      subjectId: selectedSubjectId !== 'all' ? selectedSubjectId : undefined,
    });
  }, [student.id, effectiveScore, attendancePercentage, selectedSubjectId]);

  const { trendData, direction, delta, percentageChange, fourWeekAverage, highestWeek, strongestComponent, needsAttention, summaryText } = summary;

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const point: WeeklyParticipationTrendPoint = payload[0]?.payload;
    if (!point) return null;

    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-xl shadow-xl border border-slate-700 text-xs min-w-[240px] space-y-2">
        <div className="border-b border-slate-800 pb-1.5 flex items-center justify-between">
          <span className="font-bold text-slate-100">{point.week}</span>
          <span className="text-[10px] text-slate-400 font-mono">{point.label}</span>
        </div>

        <div className="flex items-center justify-between py-0.5">
          <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
            Participation Score:
          </span>
          <span className="font-bold text-emerald-300 font-mono text-sm">
            {point.score.toFixed(2)} / 5.0
          </span>
        </div>

        {showClassBenchmark && (
          <div className="flex items-center justify-between py-0.5 text-slate-300">
            <span className="flex items-center gap-1.5 text-blue-300">
              <span className="w-2.5 h-0.5 bg-blue-400 inline-block" />
              Class Section Avg:
            </span>
            <span className="font-mono">{point.classAverage.toFixed(2)}</span>
          </div>
        )}

        <div className="flex items-center justify-between py-0.5 text-slate-400">
          <span className="flex items-center gap-1.5 text-amber-300">
            <span className="w-2.5 h-0.5 bg-amber-400 inline-block border-dashed" />
            Target Threshold:
          </span>
          <span className="font-mono text-amber-300">3.75 (75%)</span>
        </div>

        {showComponentBreakdown && (
          <div className="pt-2 border-t border-slate-800 space-y-1 text-[11px] text-slate-300">
            <div className="font-semibold text-slate-400 text-[10px] uppercase tracking-wider mb-1">
              Component Breakdown:
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Coding Lab Tests (max 1.5):</span>
              <span className="font-mono text-emerald-300">{point.codingScore.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Assignments (max 1.0):</span>
              <span className="font-mono text-indigo-300">{point.assignmentScore.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Quizzes (max 1.0):</span>
              <span className="font-mono text-cyan-300">{point.quizScore.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Class Discussion (max 1.0):</span>
              <span className="font-mono text-purple-300">{point.discussionScore.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Consistency (max 0.5):</span>
              <span className="font-mono text-amber-300">{point.consistencyScore.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-5">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">{title}</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">{subtitle}</p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {showStudentSelector && availableStudents && onSelectStudent && (
            <div className="flex items-center gap-1.5">
              <label htmlFor="student-trend-select" className="text-xs text-slate-500 font-medium">Student:</label>
              <select
                id="student-trend-select"
                value={student.id}
                onChange={e => {
                  const target = availableStudents.find(s => s.id === e.target.value);
                  if (target) onSelectStudent(target);
                }}
                className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500 outline-hidden"
              >
                {availableStudents.map(st => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.rollNumber || st.id})
                  </option>
                ))}
              </select>
            </div>
          )}

          {subjects.length > 0 && (
            <div className="flex items-center gap-1.5">
              <label htmlFor="subject-trend-select" className="text-xs text-slate-500 font-medium">Subject:</label>
              <select
                id="subject-trend-select"
                value={selectedSubjectId}
                onChange={e => setSelectedSubjectId(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500 outline-hidden"
              >
                <option value="all">All Subjects (Weighted Aggregate)</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Breakdown Toggle */}
          <button
            type="button"
            onClick={() => setShowComponentBreakdown(prev => !prev)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              showComponentBreakdown
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
            title="Toggle component breakdown lines for assignments, quizzes, coding tests, and discussions"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{showComponentBreakdown ? 'Hide Breakdown' : 'Rubric Breakdown'}</span>
          </button>

          {/* Benchmark Toggle */}
          <button
            type="button"
            onClick={() => setShowClassBenchmark(prev => !prev)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              showClassBenchmark
                ? 'bg-blue-50 text-blue-800 border-blue-300'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
            title="Toggle section class average benchmark line"
          >
            <Award className="w-3.5 h-3.5" />
            <span>Class Benchmark</span>
          </button>
        </div>
      </div>

      {/* Metric Highlights Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <span className="text-[11px] text-slate-500 font-medium block">Current Week Score</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-bold font-mono text-slate-900">{effectiveScore.toFixed(2)}</span>
            <span className="text-xs text-slate-400">/ 5.0</span>
          </div>
          <span className="text-[10px] text-slate-500">Week 4 Evaluation</span>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <span className="text-[11px] text-slate-500 font-medium block">4-Week Trajectory</span>
          <div className="flex items-center gap-1.5 mt-1">
            {direction === 'Improving' && <TrendingUp className="w-4 h-4 text-emerald-600" />}
            {direction === 'Declining' && <TrendingDown className="w-4 h-4 text-rose-600" />}
            {direction === 'Stable' && <Minus className="w-4 h-4 text-blue-600" />}
            <span
              className={`text-sm font-bold font-mono ${
                direction === 'Improving'
                  ? 'text-emerald-700'
                  : direction === 'Declining'
                  ? 'text-rose-700'
                  : 'text-blue-700'
              }`}
            >
              {delta > 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2)} pts ({delta >= 0 ? `+${percentageChange}%` : `${percentageChange}%`})
            </span>
          </div>
          <span className="text-[10px] text-slate-500 capitalize">{direction} Trend</span>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <span className="text-[11px] text-slate-500 font-medium block">4-Week Average</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-bold font-mono text-slate-900">{fourWeekAverage.toFixed(2)}</span>
            <span className="text-xs text-slate-400">/ 5.0</span>
          </div>
          <span className="text-[10px] text-slate-500">Peak: {highestWeek}</span>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <span className="text-[11px] text-slate-500 font-medium block">Lead Performance Area</span>
          <div className="mt-1 font-semibold text-xs text-emerald-800 truncate">
            {strongestComponent}
          </div>
          <span className="text-[10px] text-slate-500">
            {needsAttention ? `Focus: ${needsAttention}` : 'Strong engagement across rubrics'}
          </span>
        </div>
      </div>

      {/* Main Recharts Line Chart */}
      <div className="w-full h-72 sm:h-80 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trendData} margin={{ top: 10, right: 30, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="week"
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              tick={{ fontSize: 12, fill: '#475569' }}
            />
            <YAxis
              domain={[0, 5.0]}
              ticks={[0, 1.0, 2.0, 3.0, 3.75, 4.0, 5.0]}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              tick={{ fontSize: 11, fill: '#475569' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              height={36}
              iconType="circle"
              wrapperStyle={{ fontSize: '11px', paddingTop: '0px' }}
            />

            {/* Target Threshold Benchmark (3.75 marks) */}
            <ReferenceLine
              y={3.75}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: 'Target (3.75)',
                position: 'right',
                fill: '#b45309',
                fontSize: 10,
                fontWeight: 600,
              }}
            />

            {/* Class Section Average Line */}
            {showClassBenchmark && (
              <Line
                type="monotone"
                dataKey="classAverage"
                name="Section Class Average"
                stroke="#64748b"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 3, fill: '#64748b' }}
                activeDot={{ r: 5 }}
              />
            )}

            {/* Rubric Breakdown Component Lines */}
            {showComponentBreakdown && (
              <>
                <Line
                  type="monotone"
                  dataKey="codingScore"
                  name="Coding Lab Tests (1.5 max)"
                  stroke="#10b981"
                  strokeWidth={1.5}
                  dot={{ r: 2.5 }}
                />
                <Line
                  type="monotone"
                  dataKey="assignmentScore"
                  name="Assignments (1.0 max)"
                  stroke="#6366f1"
                  strokeWidth={1.5}
                  dot={{ r: 2.5 }}
                />
                <Line
                  type="monotone"
                  dataKey="quizScore"
                  name="Quizzes (1.0 max)"
                  stroke="#06b6d4"
                  strokeWidth={1.5}
                  dot={{ r: 2.5 }}
                />
                <Line
                  type="monotone"
                  dataKey="discussionScore"
                  name="Class Discussion (1.0 max)"
                  stroke="#a855f7"
                  strokeWidth={1.5}
                  dot={{ r: 2.5 }}
                />
                <Line
                  type="monotone"
                  dataKey="consistencyScore"
                  name="Consistency (0.5 max)"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  dot={{ r: 2.5 }}
                />
              </>
            )}

            {/* Main Student Overall Participation Score Line */}
            <Line
              type="monotone"
              dataKey="score"
              name="Student Participation Score (/ 5.0)"
              stroke="#047857"
              strokeWidth={3.5}
              dot={{ r: 5, fill: '#047857', strokeWidth: 2, stroke: '#ffffff' }}
              activeDot={{ r: 7, fill: '#059669', strokeWidth: 2, stroke: '#ffffff' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Trend Insights & Pedagogical Feedback */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-slate-900 flex items-center gap-2">
              <span>Trend Analysis: {direction} Trajectory</span>
              <span className="text-[10px] text-slate-500 font-normal">({student.name} · {student.rollNumber || student.id})</span>
            </div>
            <p className="text-slate-600 mt-0.5 text-[11px] leading-relaxed">
              {summaryText}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          {effectiveScore >= 3.75 ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Above Target Threshold</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-semibold">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>Recovery Plan Active</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
