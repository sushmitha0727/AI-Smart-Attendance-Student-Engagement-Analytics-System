import { test } from 'node:test';
import assert from 'node:assert';
import { resolveSectionsForProgramAndYear, getOrdinalYear } from './sectionResolver';
import { INSTITUTIONAL_PROGRAMS_CATALOG } from '../data/programsCatalog';
import { SEED_SECTIONS } from '../data/seedData';

test('getOrdinalYear formats year numbers correctly', () => {
  assert.strictEqual(getOrdinalYear(1), '1st Year');
  assert.strictEqual(getOrdinalYear(2), '2nd Year');
  assert.strictEqual(getOrdinalYear(3), '3rd Year');
  assert.strictEqual(getOrdinalYear(4), '4th Year');
  assert.strictEqual(getOrdinalYear(5), '5th Year');
});

test('resolveSectionsForProgramAndYear produces tailored sections for BBA Year 1', () => {
  const bba = INSTITUTIONAL_PROGRAMS_CATALOG.find(p => p.code === 'BBA');
  assert.ok(bba, 'BBA program must exist');

  const sections = resolveSectionsForProgramAndYear(bba, 1, SEED_SECTIONS);
  assert.ok(sections.length >= 3, 'Should provide at least 3 sections for BBA Year 1');

  // Should all reference BBA and 1st Year
  for (const s of sections) {
    assert.strictEqual(s.yearNumber, 1);
    assert.ok(s.name.includes('BBA') || s.name.includes('1st Year'));
  }
});

test('resolveSectionsForProgramAndYear includes specialized senior classes for B.Tech(CSE-DA)', () => {
  const cseda = INSTITUTIONAL_PROGRAMS_CATALOG.find(p => p.name === 'B.Tech(CSE-DA)');
  assert.ok(cseda, 'B.Tech(CSE-DA) program must exist');

  const sections = resolveSectionsForProgramAndYear(cseda, 4, SEED_SECTIONS);
  const daSection = sections.find(s => s.name.includes('VII Btech 2023 CSE - DA'));
  assert.ok(daSection, 'Must include VII Btech 2023 CSE - DA');
});

test('resolveSectionsForProgramAndYear includes senior AI ML classes for B.Tech(AI&ML)', () => {
  const aiml = INSTITUTIONAL_PROGRAMS_CATALOG.find(p => p.name === 'B.Tech(AI&ML)');
  assert.ok(aiml, 'B.Tech(AI&ML) program must exist');

  const sections = resolveSectionsForProgramAndYear(aiml, 4, SEED_SECTIONS);
  assert.ok(sections.some(s => s.name.includes('AIML')), 'Must include senior AIML classes');
});
