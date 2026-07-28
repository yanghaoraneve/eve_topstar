import {
  canEndTurn,
  completeStoryWithoutChoice,
  createInitialGameState,
  endTurn,
  getActiveStoryEvent,
  getAvailableRoutineEvents,
  getUnlockedLocations,
  moveToLocation,
  playRoutineEvent,
  resolveStoryChoice,
} from "@/lib/topstar/game";
import type { ChoiceDef, GameState, RoutineEventDef } from "@/lib/topstar/types";

type Policy = "balanced" | "creator" | "stage" | "pr" | "bond";
type Stats = GameState["stats"];
type Run = {
  policy: Policy;
  success: boolean;
  turns: number;
  ending?: string;
  unlockedEndingIds: string[];
  stats: Stats;
};

function rand(seed: { v: number }): number {
  seed.v = (seed.v * 1103515245 + 12345) % 2147483648;
  return seed.v / 2147483648;
}
function pick<T>(arr: T[], score: (x: T) => number, seed: { v: number }, n = 3): T {
  const ranked = arr.map((x) => ({ x, s: score(x) })).sort((a, b) => b.s - a.s);
  const top = ranked.slice(0, Math.min(n, ranked.length));
  return top[Math.floor(rand(seed) * top.length)].x;
}
function sDelta(c: ChoiceDef, k: keyof Stats) {
  return c.effects.filter((e): e is Extract<typeof e, { type: "stat" }> => e.type === "stat" && e.key === k).reduce((n, e) => n + e.delta, 0);
}
function scoreChoice(policy: Policy, c: ChoiceDef) {
  const cost = c.staminaCost ?? 0;
  const v = {
    c: sDelta(c, "creativity"),
    s: sDelta(c, "stage"),
    p: sDelta(c, "popularity"),
    r: sDelta(c, "resilience"),
    b: sDelta(c, "bond"),
    a: sDelta(c, "authority"),
    rp: sDelta(c, "reputation"),
    t: sDelta(c, "tacit"),
  };
  if (policy === "creator") return v.c * 2 + v.a + v.rp - cost * 0.2;
  if (policy === "stage") return v.s * 2 + v.p + v.rp - cost * 0.2;
  if (policy === "pr") return v.p * 1.8 + v.rp * 1.6 + v.a - cost * 0.2;
  if (policy === "bond") return v.b * 1.8 + v.t * 1.6 + v.r - cost * 0.2;
  return v.c + v.s + v.p + v.r + v.b + v.a + v.rp + v.t - cost * 0.1;
}
function scoreRoutine(policy: Policy, e: RoutineEventDef) {
  const stats = e.effects.filter((x): x is Extract<typeof x, { type: "stat" }> => x.type === "stat");
  const g = (k: keyof Stats) => stats.filter((x) => x.key === k).reduce((n, x) => n + x.delta, 0);
  const eff = (x: number) => x / Math.max(1, e.staminaCost);
  if (policy === "creator") return eff(g("creativity") * 2 + g("authority") + g("reputation") * 0.7);
  if (policy === "stage") return eff(g("stage") * 2 + g("popularity") + g("reputation") * 0.5);
  if (policy === "pr") return eff(g("popularity") * 1.8 + g("reputation") * 1.6 + g("authority"));
  if (policy === "bond") return eff(g("bond") * 1.8 + g("tacit") * 1.8 + g("resilience"));
  return eff(g("creativity") + g("stage") + g("popularity") + g("resilience") + g("bond") + g("authority") + g("reputation") + g("tacit"));
}

function routineCandidatesByLocation(st: GameState): { event: RoutineEventDef; locationId: string }[] {
  return getUnlockedLocations(st).flatMap((location) => {
    const moved = moveToLocation(st, location.id);
    return getAvailableRoutineEvents(moved).map((event) => ({
      event,
      locationId: location.id,
    }));
  });
}

function run(policy: Policy, seedValue: number): Run {
  const seed = { v: seedValue };
  let st = createInitialGameState();
  let guard = 0;
  while (st.currentTurn <= 144 && !st.gameOverEndingId) {
    guard += 1;
    if (guard > 9000) break;
    while (true) {
      const story = getActiveStoryEvent(st);
      if (!story) break;
      if (!story.choices || story.choices.length === 0) {
        st = completeStoryWithoutChoice(st);
        continue;
      }
      const affordable = story.choices.filter((c) => (c.staminaCost ?? 0) <= st.staminaCurrent);
      if (!affordable.length) break;
      const choice = pick(affordable, (c) => scoreChoice(policy, c), seed, 3);
      if (choice.id === "choice_turn114_accept") {
        st = { ...st, chunwanSongTitle: "慢慢" };
      }
      st = resolveStoryChoice(st, choice);
    }
    while (true) {
      const candidates = routineCandidatesByLocation(st);
      if (!candidates.length) break;
      const picked = pick(candidates, (x) => scoreRoutine(policy, x.event), seed, 4);
      st = moveToLocation(st, picked.locationId);
      const before = st.staminaCurrent;
      const next = playRoutineEvent(st, picked.event.id);
      if (next.staminaCurrent === before) break;
      st = next;
      if (st.staminaCurrent <= 0) break;
    }
    if (!canEndTurn(st)) break;
    if (st.currentTurn >= 144) break;
    st = endTurn(st);
  }
  return {
    policy,
    success: st.currentTurn >= 144 && !st.gameOverEndingId,
    turns: st.currentTurn,
    ending: st.gameOverEndingId,
    unlockedEndingIds: st.unlockedEndingIds,
    stats: st.stats,
  };
}

const policies: Policy[] = ["balanced", "creator", "stage", "pr", "bond"];
const N = 40;
let seed = 20260428;
const runs: Run[] = [];
for (const p of policies) {
  for (let i = 0; i < N; i++) {
    runs.push(run(p, seed));
    seed += 131;
  }
}

const unlockedEndingFrequency: Record<string, number> = {};
const failByEnding: Record<string, number> = {};
for (const r of runs) {
  if (r.ending) failByEnding[r.ending] = (failByEnding[r.ending] ?? 0) + 1;
  for (const id of r.unlockedEndingIds) unlockedEndingFrequency[id] = (unlockedEndingFrequency[id] ?? 0) + 1;
}

console.log(
  JSON.stringify(
    {
      totalRuns: runs.length,
      runsPerPolicy: N,
      successRuns: runs.filter((r) => r.success).length,
      failByEnding,
      unlockedEndingFrequency: Object.entries(unlockedEndingFrequency).sort((a, b) => b[1] - a[1]),
    },
    null,
    2
  )
);
