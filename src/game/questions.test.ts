import test from 'node:test';
import assert from 'node:assert/strict';
import { GRADE_5_QUESTIONS, selectRaceQuestions } from './questions';

test('Grade 5 SD question bank has valid structure, unique IDs, and all 4 subjects', () => {
  const ids = new Set<string>();
  const subjects = new Set<string>();

  for (const q of GRADE_5_QUESTIONS) {
    assert.ok(q.id.length > 0, 'question id must be non-empty');
    assert.equal(ids.has(q.id), false, `duplicate question id: ${q.id}`);
    ids.add(q.id);
    subjects.add(q.subject);
    assert.equal(q.options.length, 3, `question ${q.id} must have 3 options`);
    assert.ok(
      q.correctIndex === 0 || q.correctIndex === 1 || q.correctIndex === 2,
      `question ${q.id} correctIndex must be 0..2`,
    );
    assert.ok(q.question.length >= 10, `question ${q.id} text too short`);
    assert.ok(q.explanation.length >= 10, `question ${q.id} explanation too short`);
  }

  assert.deepEqual([...subjects].sort(), ['bahasa', 'ipa', 'ips', 'matematika']);
});

test('selectRaceQuestions returns exact count and respects subject filter', () => {
  const mathSet = selectRaceQuestions('matematika', 5, 42);
  assert.equal(mathSet.length, 5);
  assert.ok(mathSet.every((q) => q.subject === 'matematika'));

  const ipaSet = selectRaceQuestions('ipa', 5, 99);
  assert.equal(ipaSet.length, 5);
  assert.ok(ipaSet.every((q) => q.subject === 'ipa'));
});

test('selectRaceQuestions("semua", 5) includes all 4 Grade 5 SD subjects', () => {
  const mixed = selectRaceQuestions('semua', 5, 12345);
  assert.equal(mixed.length, 5);
  const represented = new Set(mixed.map((q) => q.subject));
  assert.equal(represented.size, 4, 'all 4 subjects should appear across 5 gates');
});
