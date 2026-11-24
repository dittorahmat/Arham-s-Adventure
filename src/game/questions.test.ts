import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_SD_QUESTIONS,
  DEFAULT_GRADE_LEVEL,
  getQuestionsByGrade,
  GRADE_5_QUESTIONS,
  GRADE_LEVELS,
  GRADE_META,
  parseGradeParam,
  selectRaceQuestions,
} from './questions';

test('All SD grades (Kelas 1–6) have valid unique questions across all 4 subjects with >=5 per subject', () => {
  assert.equal(DEFAULT_GRADE_LEVEL, 5);
  assert.deepEqual([...GRADE_LEVELS], [1, 2, 3, 4, 5, 6]);

  const ids = new Set<string>();
  for (const q of ALL_SD_QUESTIONS) {
    assert.ok(q.id.length > 0, 'question id must be non-empty');
    assert.equal(ids.has(q.id), false, `duplicate question id: ${q.id}`);
    ids.add(q.id);
    assert.ok(GRADE_LEVELS.includes(q.grade), `invalid grade ${q.grade}`);
    assert.equal(q.options.length, 3, `question ${q.id} must have 3 options`);
    assert.ok(
      q.correctIndex === 0 || q.correctIndex === 1 || q.correctIndex === 2,
      `question ${q.id} correctIndex must be 0..2`,
    );
    assert.ok(q.question.length >= 10, `question ${q.id} text too short`);
    assert.ok(q.explanation.length >= 10, `question ${q.id} explanation too short`);
  }

  for (const grade of GRADE_LEVELS) {
    assert.ok(GRADE_META[grade].fullLabel.includes(`Kelas ${grade}`));
    const list = getQuestionsByGrade(grade);
    for (const subj of ['matematika', 'ipa', 'ips', 'bahasa'] as const) {
      const count = list.filter((q) => q.subject === subj).length;
      assert.ok(
        count >= 5,
        `Kelas ${grade} SD subject ${subj} needs >=5 distinct questions (found ${count})`,
      );
    }
  }

  assert.equal(GRADE_5_QUESTIONS.length, getQuestionsByGrade(5).length);
});

test('selectRaceQuestions defaults to Grade 5 and respects grade + subject filters across Kelas 1–6', () => {
  // Default grade is Grade 5
  const defaultSet = selectRaceQuestions('semua', 5, 12345);
  assert.equal(defaultSet.length, 5);
  assert.ok(defaultSet.every((q) => q.grade === 5));
  assert.equal(new Set(defaultSet.map((q) => q.subject)).size, 4);

  // Every grade 1..6 returns strictly questions of that grade, with distinct IDs per subject
  for (const grade of GRADE_LEVELS) {
    const mixed = selectRaceQuestions('semua', 5, 77 + grade, grade);
    assert.equal(mixed.length, 5);
    assert.ok(mixed.every((q) => q.grade === grade));
    assert.equal(new Set(mixed.map((q) => q.subject)).size, 4);

    for (const subj of ['matematika', 'ipa', 'ips', 'bahasa'] as const) {
      const focused = selectRaceQuestions(subj, 5, 200 + grade, grade);
      assert.equal(focused.length, 5);
      assert.ok(focused.every((q) => q.grade === grade && q.subject === subj));
      assert.equal(new Set(focused.map((q) => q.id)).size, 5, `no duplicates for Kelas ${grade} ${subj}`);
    }
  }
});

test('parseGradeParam validates 1..6 and returns null for missing/invalid inputs', () => {
  assert.equal(parseGradeParam(null), null);
  assert.equal(parseGradeParam(undefined), null);
  assert.equal(parseGradeParam(''), null);
  assert.equal(parseGradeParam('0'), null);
  assert.equal(parseGradeParam('7'), null);
  assert.equal(parseGradeParam('abc'), null);

  for (const grade of GRADE_LEVELS) {
    assert.equal(parseGradeParam(String(grade)), grade);
  }
});
