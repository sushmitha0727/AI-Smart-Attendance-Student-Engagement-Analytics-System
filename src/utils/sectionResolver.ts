import { Program, Section } from '../types';

export interface ResolvedSectionOption {
  id: string;
  name: string;
  programId: string;
  semesterId: string;
  yearNumber: number;
  studentCount: number;
  isExisting: boolean;
}

export function getOrdinalYear(year: number): string {
  switch (year) {
    case 1:
      return '1st Year';
    case 2:
      return '2nd Year';
    case 3:
      return '3rd Year';
    case 4:
      return '4th Year';
    case 5:
      return '5th Year';
    default:
      return `Year ${year}`;
  }
}

export function getSemesterIdForYear(year: number): string {
  switch (year) {
    case 1:
      return 'sem-1';
    case 2:
      return 'sem-3';
    case 3:
      return 'sem-5';
    case 4:
      return 'sem-7';
    case 5:
      return 'sem-9';
    default:
      return `sem-${(year * 2) - 1}`;
  }
}

/**
 * Resolves appropriate class sections tailored to the selected Program of Study and Year of Study.
 */
export function resolveSectionsForProgramAndYear(
  program: Program | undefined,
  yearOfStudy: number,
  allSections: Section[]
): ResolvedSectionOption[] {
  if (!program) return [];

  const results: ResolvedSectionOption[] = [];
  const addedIds = new Set<string>();

  const yearOrdinal = getOrdinalYear(yearOfStudy);
  const semId = getSemesterIdForYear(yearOfStudy);

  // Normalize program codes and names for matching
  const pCode = program.code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const pName = program.name.toLowerCase();

  // 1. Check existing sections in state
  for (const sec of allSections) {
    const secNameLower = sec.name.toLowerCase();
    let matchesProgram = false;

    // Direct programId match
    if (sec.programId === program.id) {
      matchesProgram = true;
    }
    // Matching by program code in section name (e.g. CSE-DA, AIML)
    else if (pCode.includes('DA') && secNameLower.includes('cse - da')) {
      matchesProgram = true;
    } else if (pCode.includes('AIML') && (secNameLower.includes('aiml') || secNameLower.includes('ai-ml'))) {
      matchesProgram = true;
    } else if (pCode.includes('CSE') && (secNameLower.includes('cse') || secNameLower.includes('btech'))) {
      matchesProgram = true;
    }

    if (matchesProgram) {
      // Check year match
      let matchesYear = false;
      if (yearOfStudy === 1 && (secNameLower.includes('1st year') || sec.semesterId === 'sem-1' || sec.semesterId === 'sem-2')) {
        matchesYear = true;
      } else if (yearOfStudy === 2 && (secNameLower.includes('2nd year') || sec.semesterId === 'sem-3' || sec.semesterId === 'sem-4')) {
        matchesYear = true;
      } else if (yearOfStudy === 3 && (secNameLower.includes('3rd year') || sec.semesterId === 'sem-5' || sec.semesterId === 'sem-6')) {
        matchesYear = true;
      } else if (yearOfStudy === 4 && (secNameLower.includes('4th year') || secNameLower.includes('vii') || secNameLower.includes('viii') || sec.semesterId === 'sem-7' || sec.semesterId === 'sem-8' || sec.semesterId === 'sem-5')) {
        matchesYear = true;
      } else if (yearOfStudy === 5 && (secNameLower.includes('5th year') || secNameLower.includes('ix') || secNameLower.includes('x'))) {
        matchesYear = true;
      }

      if (matchesYear && !addedIds.has(sec.id)) {
        results.push({
          id: sec.id,
          name: sec.name,
          programId: sec.programId,
          semesterId: sec.semesterId || semId,
          yearNumber: yearOfStudy,
          studentCount: sec.studentCount || 0,
          isExisting: true,
        });
        addedIds.add(sec.id);
      }
    }
  }

  // 2. Standard Program-specific sections for this year (A, B, C)
  const defaultSections = [
    { label: 'Section A', code: 'A' },
    { label: 'Section B', code: 'B' },
    { label: 'Section C', code: 'C' },
  ];

  const progShort = program.code || program.name.split(' ')[0] || 'CLASS';
  const slug = progShort.toLowerCase().replace(/[^a-z0-9]/g, '-');

  for (const def of defaultSections) {
    const dynId = `sec-${slug}-y${yearOfStudy}-${def.code.toLowerCase()}`;
    const existingSec = allSections.find(s => s.id === dynId);
    const displayName = `${yearOrdinal} ${program.code} – ${def.label}`;

    if (!addedIds.has(dynId)) {
      results.push({
        id: dynId,
        name: existingSec ? existingSec.name : displayName,
        programId: program.id,
        semesterId: semId,
        yearNumber: yearOfStudy,
        studentCount: existingSec ? existingSec.studentCount : 0,
        isExisting: !!existingSec,
      });
      addedIds.add(dynId);
    }
  }

  return results;
}
