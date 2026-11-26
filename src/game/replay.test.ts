import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialRacers } from './courseData';
import {
  computeReplayCameraPose,
  createSyntheticFinishReplayClip,
  fetchMatchReplay,
  getReplayCrossMarkerPct,
  lerpAngle,
  mapReplayPlaybackTime,
  parseReplayClip,
  REPLAY_DURATION_SECONDS,
  ReplayRecorder,
  sampleReplayFrame,
  serializeReplayClip,
  uploadMatchReplay,
} from './replay';

test('ReplayRecorder captures frames at interval and builds a 5-second finish clip with follow-through', () => {
  const recorder = new ReplayRecorder();
  const racers = createInitialRacers();
  const finishZ = -180;
  const finishY = 1.2;

  // Simulate 2.2 seconds of approaching the finish line
  for (let i = 0; i <= 66; i++) {
    const t = i * (1 / 30);
    racers[0].z = finishZ + (2.2 - t) * 11;
    racers[0].y = finishY;
    racers[0].vz = -11;
    racers[0].walkDistance = t * 11;
    recorder.capture(t, racers);
  }

  assert.ok(recorder.getFrameCount() >= 55, 'recorder should keep recent rolling frames');

  const clip = recorder.finalizeFinishClip(finishZ, finishY, 2.2, racers);
  assert.equal(clip.playbackDuration, REPLAY_DURATION_SECONDS);
  assert.equal(clip.playbackDuration, 5.0);
  assert.ok(clip.startRaceTime < clip.crossRaceTime, 'clip starts before crossing finish line');
  assert.ok(clip.endRaceTime > clip.crossRaceTime, 'clip continues with victory follow-through past finish line');

  // Verify player passes finishZ in the finalized clip
  const firstPlayer = clip.frames[0].racers[0];
  const lastPlayer = clip.frames[clip.frames.length - 1].racers[0];
  assert.ok(firstPlayer.z > finishZ, 'replay begins before the finish line');
  assert.ok(lastPlayer.z < finishZ, 'replay ends past the finish line');
});

test('mapReplayPlaybackTime produces monotonic slow-motion source time across 0..5s', () => {
  const racers = createInitialRacers();
  const clip = createSyntheticFinishReplayClip(-180, 1.1, 42, racers);

  let prevSource = -Infinity;
  for (let ms = 0; ms <= 5000; ms += 100) {
    const sample = mapReplayPlaybackTime(ms / 1000, clip);
    assert.ok(
      sample.sourceRaceTime >= prevSource - 1e-6,
      `sourceRaceTime must be monotonic at ${ms}ms (${sample.sourceRaceTime} < ${prevSource})`,
    );
    prevSource = sample.sourceRaceTime;
    assert.ok(
      sample.effectiveSpeedFactor > 0.1 && sample.effectiveSpeedFactor < 0.85,
      `playback must run in slow-motion, got ${sample.effectiveSpeedFactor}`,
    );
  }

  const startSample = mapReplayPlaybackTime(0, clip);
  assert.equal(startSample.crossedFinish, false);
  assert.equal(startSample.finished, false);

  const endSample = mapReplayPlaybackTime(REPLAY_DURATION_SECONDS, clip);
  assert.equal(endSample.crossedFinish, true);
  assert.equal(endSample.finished, true);

  const crossPct = getReplayCrossMarkerPct(clip);
  assert.ok(crossPct >= 40 && crossPct <= 85, `cross marker should sit cleanly mid-late clip, got ${crossPct}%`);
});

test('sampleReplayFrame smoothly interpolates positions and wrapped angles', () => {
  const racers = createInitialRacers();
  const clip = createSyntheticFinishReplayClip(-160, 1.0, 38, racers);

  const midTime = (clip.startRaceTime + clip.endRaceTime) * 0.5;
  const sampled = sampleReplayFrame(clip, midTime);
  assert.equal(sampled.racers.length, racers.length);
  assert.ok(Number.isFinite(sampled.racers[0].x));
  assert.ok(Number.isFinite(sampled.racers[0].y));
  assert.ok(Number.isFinite(sampled.racers[0].z));

  // Verify shortest-arc yaw interpolation across +/-PI boundary
  const wrapped = lerpAngle(Math.PI - 0.1, -Math.PI + 0.1, 0.5);
  assert.ok(Math.abs(Math.abs(wrapped) - Math.PI) < 0.01, `expected angle near PI, got ${wrapped}`);
});

test('computeReplayCameraPose sweeps smoothly and stays inside track column clearances', () => {
  const racers = createInitialRacers();
  const clip = createSyntheticFinishReplayClip(-180, 1.1, 41, racers);

  const pStart = computeReplayCameraPose(0, clip.frames[0].racers[0], -180, 1.1);
  const pMid = computeReplayCameraPose(0.58, clip.frames[Math.floor(clip.frames.length * 0.6)].racers[0], -180, 1.1);
  const pEnd = computeReplayCameraPose(1, clip.frames[clip.frames.length - 1].racers[0], -180, 1.1);

  // Camera sweeps from behind-side (+Z offset) to ahead-side (-Z offset)
  assert.ok(pStart.posZ > clip.frames[0].racers[0].z, 'camera starts behind-right of player');
  assert.ok(pEnd.posZ < clip.frames[clip.frames.length - 1].racers[0].z, 'camera finishes ahead of player');

  // Telephoto FOV dips tighter at crossing climax than at start/end
  assert.ok(pMid.fov < pStart.fov && pMid.fov < pEnd.fov, 'camera zooms subtly at crossing climax');

  // Camera stays clear of finish arch pillars (at x = +/-8) and above deck
  for (const pose of [pStart, pMid, pEnd]) {
    assert.ok(Math.abs(pose.posX) <= 6.5, `posX ${pose.posX} must stay clear of arch pillars`);
    assert.ok(pose.posY >= 2.8, `posY ${pose.posY} must stay above finish deck`);
  }
});

test('serializeReplayClip and parseReplayClip round-trip a FinishReplayClip and reject invalid payloads', () => {
  const racers = createInitialRacers();
  const clip = createSyntheticFinishReplayClip(-180, 1.1, 41, racers);

  const json = serializeReplayClip(clip);
  const parsed = parseReplayClip(json);
  assert.ok(parsed !== null);
  assert.equal(parsed.frames.length, clip.frames.length);
  assert.equal(parsed.finishZ, clip.finishZ);
  assert.equal(parsed.playbackDuration, clip.playbackDuration);

  assert.equal(parseReplayClip('not-json'), null);
  assert.equal(parseReplayClip('{"frames":[]}'), null);
  assert.equal(parseReplayClip('{"frames":"bad"}'), null);
});

test('uploadMatchReplay and fetchMatchReplay interact with /api/replays/:matchId', async () => {
  const racers = createInitialRacers();
  const clip = createSyntheticFinishReplayClip(-180, 1.1, 41, racers);

  let storedBody = '';
  const mockFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (init?.method === 'POST' && url === '/api/replays/match-123') {
      storedBody = String(init.body ?? '');
      return new Response(JSON.stringify({ ok: true, replayKey: 'replays/match-123.json' }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if ((!init?.method || init.method === 'GET') && url === '/api/replays/match-123') {
      return new Response(storedBody, {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
  }) as typeof fetch;

  const uploadRes = await uploadMatchReplay('match-123', clip, '', mockFetch);
  assert.equal(uploadRes.ok, true);
  assert.equal(uploadRes.replayKey, 'replays/match-123.json');

  const fetched = await fetchMatchReplay('match-123', '', mockFetch);
  assert.ok(fetched !== null);
  assert.equal(fetched.frames.length, clip.frames.length);

  const missing = await fetchMatchReplay('missing-id', '', mockFetch);
  assert.equal(missing, null);
});
