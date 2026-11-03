import { test } from 'node:test';
import assert from 'node:assert';
import { INSTITUTIONAL_PROGRAMS_CATALOG } from './programsCatalog';

test('programs catalog contains extensive programs of study', () => {
  assert.ok(INSTITUTIONAL_PROGRAMS_CATALOG.length >= 80, `Expected at least 80 programs, found ${INSTITUTIONAL_PROGRAMS_CATALOG.length}`);

  // Check unique IDs
  const idSet = new Set<string>();
  for (const prog of INSTITUTIONAL_PROGRAMS_CATALOG) {
    assert.ok(prog.id, 'Program must have an ID');
    assert.ok(prog.name, 'Program must have a name');
    assert.ok(prog.code, 'Program must have a code');
    assert.ok(prog.durationYears > 0, 'Program must have a positive duration');
    assert.strictEqual(idSet.has(prog.id), false, `Duplicate program ID: ${prog.id}`);
    idSet.add(prog.id);
  }
});

test('programs catalog includes key degrees and emerging specializations requested', () => {
  const names = INSTITUTIONAL_PROGRAMS_CATALOG.map(p => p.name);

  // Check specific requested programs
  const requiredPrograms = [
    'BBA',
    'MBA',
    'M.Com.',
    'B.Tech(AI&ML)',
    'B.Tech(AI&DS)',
    'B.Tech(CSE)',
    'B.Tech(CSE-AI-ML)',
    'B.Tech(CSE-CC)',
    'B.Tech(CSE-CS)',
    'B.Tech(CSE-DA)',
    'B.Tech(CSE-Gen)',
    'B.Tech(IT)',
    'B.Tech(IT-AR/VR)',
    'B.Tech(IT-CC & IT)',
    'B.Tech(IT-DA)',
    'B.Tech(CSE-ESPE)',
    'B.Tech(CSE-EAFT)',
    'BCA(H)',
    'M.Tech',
    'MCA',
    'B.Tech(Aerospace)',
    'B.Tech(Civil)',
    'B.Tech(EEEE)',
    'B.Tech(ECE)',
    'B.Tech(Mechanical)',
    'BBA(H)',
    'B.Com',
    'B.Com(H)',
    'B.Des.',
    'B.Des.(Animation Film Design)',
    'B.Des(Communincation Design)',
    'B.Des(Fashion Design)',
    'B.Des(Interaction Design)',
    'B.Des(Interior Design)',
    'B.Des(Product Design)',
    'BA. LLB.(Hons.)',
    'BBA. LLB.(Hons.)',
    'LLB',
    'LLM',
    'BA(Economics)',
    'BA-English',
    'BA-Media Studies',
    'BA-Political Science',
    'BA-Sociology',
    'BFA-Painting',
    'BSc. (CS)',
    'BSc. (DS)',
    'BSc. Pyscology',
    'BVA',
    'MA-Creative Writing',
    'MSc. (DS)',
    'MPA-Master of Performing Arts',
    'B.Tech CSE',
    'B.Tech Bio Technology',
    'B.Tech – CSE with specialisation in Software Product Development',
    'B.Tech – CSE with specialisation in Artificial Intelligence and Future Technologies',
    'B.Tech in Production Engineering',
    'B.Tech in Biotechnology',
    'BA (Hons.) Philosophy',
    'BA/B.A. (Hons.) Public Policy / Public Administration / Politics and Governance',
    'BCA (Hons.) – Data Science',
    'BCA (Hons.) – Artificial Intelligence & Machine Learning',
    'BCA (Hons.) – Game Development',
    'Bachelor of Liberal Arts',
    'B.Sc. (Hons.) Economics',
    'B.Sc. (Hons.) Animation, VFX and Gaming',
    'B.Sc. (Hons.) Film and TV Production',
    'B.Sc. (Hons.) Statistics',
    'B.Sc. – Applied Mathematics',
    'B.Sc. (Hons.) Physics',
    'B.Sc. (Hons.) Chemistry',
    'B.Sc. – Operation Theatre and Anaesthesia Technology',
    'B.Sc. – Medical Laboratory Technology',
    'B.Sc. – Cardiovascular Technology',
    'B.Sc. – Respiratory Therapy',
    'Bachelor of Performing Arts',
    'M.Tech – Artificial Intelligence and Data Science',
    'BBA Aviation',
    'B.Sc. Aviation Sciences',
    'M.Tech – Computer Science and Engineering',
    'B.Tech – CSE with specialisation in Quantum Computing and Information Science',
    'B.Tech – Artificial Intelligence and Machine Learning',
    'B.Tech – Robotics and Artificial Intelligence',
    'B.Tech – Cyber Physical Systems',
    'M.Tech – CSE with specialisation in AI & Deep Learning',
    'M.Tech – CSE with specialisation in Quantum Computing',
    'M.Tech – CSE with specialisation in AI Powered Robotics & Automation Systems',
    'M.Tech – CSE with specialisation in Cognitive Computing',
    'M.Tech – CSE with specialisation in Ethical AI and Responsible Innovation',
    'M.Tech – CSE with specialisation in Hybrid AI Systems',
    'MBA (Fintech)',
    'B.Com with CA',
  ];

  for (const progName of requiredPrograms) {
    assert.ok(names.includes(progName), `Expected program "${progName}" was not found in catalog`);
  }
});
