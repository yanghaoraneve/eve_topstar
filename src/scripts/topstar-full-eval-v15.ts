import {
  canEndTurn,
  canPurchaseShopItem,
  completeStoryWithoutChoice,
  createInitialGameState,
  endTurn,
  getActiveStoryEvent,
  getAvailableRoutineEvents,
  getUnlockedLocations,
  moveToLocation,
  playRoutineEvent,
  purchaseShopItem,
  resolveStoryChoice,
} from "@/lib/topstar/game";
import { topstarData } from "@/lib/topstar/data";
import type { ChoiceDef, GameState, RoutineEventDef, ShopItemDef } from "@/lib/topstar/types";

type Policy = "balanced" | "creator" | "stage" | "pr" | "bond";
type Stats = GameState["stats"];
type Snapshot = { turn: number; stats: Stats; counters: GameState["counters"] };
type Run = {
  policy: Policy;
  success: boolean;
  turns: number;
  ending?: string;
  unlockedEndingIds: string[];
  stats: Stats;
  counters: GameState["counters"];
  snapshots: Snapshot[];
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

function statDeltaFromEffects(
  effects: ChoiceDef["effects"] | RoutineEventDef["effects"] | ShopItemDef["effects"],
  key: keyof Stats
): number {
  return effects
    .filter((e): e is Extract<(typeof effects)[number], { type: "stat" }> => e.type === "stat" && e.key === key)
    .reduce((n, e) => n + e.delta, 0);
}

function counterDeltaFromEffects(
  effects: ChoiceDef["effects"] | RoutineEventDef["effects"] | ShopItemDef["effects"],
  key: string
): number {
  return effects
    .filter((e): e is Extract<(typeof effects)[number], { type: "counter" }> => e.type === "counter" && e.key === key)
    .reduce((n, e) => n + e.delta, 0);
}

function scoreChoice(policy: Policy, c: ChoiceDef): number {
  const cost = c.staminaCost ?? 0;
  const v = {
    c: statDeltaFromEffects(c.effects, "creativity"),
    s: statDeltaFromEffects(c.effects, "stage"),
    p: statDeltaFromEffects(c.effects, "popularity"),
    r: statDeltaFromEffects(c.effects, "resilience"),
    b: statDeltaFromEffects(c.effects, "bond"),
    a: statDeltaFromEffects(c.effects, "authority"),
    rp: statDeltaFromEffects(c.effects, "reputation"),
    t: statDeltaFromEffects(c.effects, "tacit"),
    fi: counterDeltaFromEffects(c.effects, "fanInteractions"),
    sw: counterDeltaFromEffects(c.effects, "songwritingSessions"),
  };
  if (policy === "creator") return v.c * 2.2 + v.a + v.rp + v.sw * 1.4 - cost * 0.2;
  if (policy === "stage") return v.s * 2.1 + v.p + v.rp * 0.6 - cost * 0.2;
  if (policy === "pr") return v.p * 1.9 + v.rp * 1.6 + v.a + v.fi * 0.8 - cost * 0.2;
  if (policy === "bond") return v.b * 1.9 + v.t * 1.8 + v.r + v.fi * 1.1 - cost * 0.2;
  return v.c + v.s + v.p + v.r + v.b + v.a + v.rp + v.t + v.fi * 0.5 + v.sw * 0.5 - cost * 0.1;
}

function scoreRoutine(policy: Policy, e: RoutineEventDef): number {
  const c = e.effects;
  const v = {
    c: statDeltaFromEffects(c, "creativity"),
    s: statDeltaFromEffects(c, "stage"),
    p: statDeltaFromEffects(c, "popularity"),
    r: statDeltaFromEffects(c, "resilience"),
    b: statDeltaFromEffects(c, "bond"),
    a: statDeltaFromEffects(c, "authority"),
    rp: statDeltaFromEffects(c, "reputation"),
    t: statDeltaFromEffects(c, "tacit"),
    fi: counterDeltaFromEffects(c, "fanInteractions"),
    sw: counterDeltaFromEffects(c, "songwritingSessions"),
  };
  const stamina = Math.max(1, e.staminaCost);
  const gold = e.goldCost ?? 0;
  const coinPenalty = gold > 0 ? gold * 0.03 : 0;
  if (policy === "creator") return (v.c * 2.2 + v.a + v.rp * 0.8 + v.sw * 1.6) / stamina - coinPenalty;
  if (policy === "stage") return (v.s * 2.2 + v.p * 1.2 + v.rp * 0.6) / stamina - coinPenalty;
  if (policy === "pr") return (v.p * 1.9 + v.rp * 1.7 + v.a + v.fi * 1.2) / stamina - coinPenalty;
  if (policy === "bond") return (v.b * 1.8 + v.t * 2 + v.r + v.fi * 1.2) / stamina - coinPenalty;
  return (v.c + v.s + v.p + v.r + v.b + v.a + v.rp + v.t + v.fi * 0.6 + v.sw * 0.6) / stamina - coinPenalty;
}

function scoreShopItem(policy: Policy, item: ShopItemDef): number {
  const c = item.effects;
  const v = {
    c: statDeltaFromEffects(c, "creativity"),
    s: statDeltaFromEffects(c, "stage"),
    p: statDeltaFromEffects(c, "popularity"),
    r: statDeltaFromEffects(c, "resilience"),
    b: statDeltaFromEffects(c, "bond"),
    a: statDeltaFromEffects(c, "authority"),
    rp: statDeltaFromEffects(c, "reputation"),
    t: statDeltaFromEffects(c, "tacit"),
    fi: counterDeltaFromEffects(c, "fanInteractions"),
    sw: counterDeltaFromEffects(c, "songwritingSessions"),
  };
  const value =
    policy === "creator"
      ? v.c * 2.1 + v.a + v.rp + v.sw * 1.6
      : policy === "stage"
      ? v.s * 2.2 + v.p * 1.2 + v.rp * 0.6
      : policy === "pr"
      ? v.p * 1.8 + v.rp * 1.7 + v.a + v.fi
      : policy === "bond"
      ? v.b * 1.8 + v.t * 2 + v.r + v.fi
      : v.c + v.s + v.p + v.r + v.b + v.a + v.rp + v.t + v.fi * 0.6 + v.sw * 0.6;
  return value / Math.max(1, item.price);
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

function takeSnapshot(st: GameState, snapshots: Snapshot[]): void {
  if (st.currentTurn === 36 || st.currentTurn === 84 || st.currentTurn === 120 || st.currentTurn === 144) {
    if (!snapshots.some((x) => x.turn === st.currentTurn)) {
      snapshots.push({
        turn: st.currentTurn,
        stats: structuredClone(st.stats),
        counters: structuredClone(st.counters),
      });
    }
  }
}

function run(policy: Policy, seedValue: number): Run {
  const seed = { v: seedValue };
  let st = createInitialGameState();
  const snapshots: Snapshot[] = [];
  let guard = 0;

  while (st.currentTurn <= 144 && !st.gameOverEndingId) {
    guard += 1;
    if (guard > 12000) break;

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

    // 商店循环（不耗体力，但受金币和购买规则限制）
    for (let i = 0; i < 6; i++) {
      const buyable = topstarData.shopItems.filter((item) => canPurchaseShopItem(st, item.id));
      if (!buyable.length) break;
      const best = buyable
        .map((item) => ({ item, s: scoreShopItem(policy, item) }))
        .sort((a, b) => b.s - a.s)[0];
      if (!best || best.s <= 0) break;
      const next = purchaseShopItem(st, best.item.id);
      if (next === st) break;
      st = next;
    }

    // 日常行动循环（含金币日常）
    for (let i = 0; i < 24; i++) {
      const candidates = routineCandidatesByLocation(st);
      if (!candidates.length) break;
      const picked = pick(candidates, (x) => scoreRoutine(policy, x.event), seed, 4);
      st = moveToLocation(st, picked.locationId);
      const beforeStamina = st.staminaCurrent;
      const beforeCoins = st.coins;
      const next = playRoutineEvent(st, picked.event.id);
      if (next.staminaCurrent === beforeStamina && next.coins === beforeCoins) break;
      st = next;
      if (st.staminaCurrent <= 0) break;
    }

    takeSnapshot(st, snapshots);
    if (!canEndTurn(st)) break;
    if (st.currentTurn >= 144) break;
    st = endTurn(st);
    takeSnapshot(st, snapshots);
  }

  takeSnapshot(st, snapshots);
  return {
    policy,
    success: st.currentTurn >= 144 && !st.gameOverEndingId,
    turns: st.currentTurn,
    ending: st.gameOverEndingId,
    unlockedEndingIds: st.unlockedEndingIds,
    stats: st.stats,
    counters: st.counters,
    snapshots,
  };
}

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

const policies: Policy[] = ["balanced", "creator", "stage", "pr", "bond"];
const RUNS_PER_POLICY = 40;
let seed = 20260416;
const runs: Run[] = [];
for (const policy of policies) {
  for (let i = 0; i < RUNS_PER_POLICY; i++) {
    runs.push(run(policy, seed));
    seed += 131;
  }
}

const failByEnding: Record<string, number> = {};
const unlockedEndingFrequency: Record<string, number> = {};
for (const r of runs) {
  if (r.ending) failByEnding[r.ending] = (failByEnding[r.ending] ?? 0) + 1;
  for (const id of r.unlockedEndingIds) {
    unlockedEndingFrequency[id] = (unlockedEndingFrequency[id] ?? 0) + 1;
  }
}

const finalAvgStats = {
  creativity: avg(runs.map((r) => r.stats.creativity)),
  stage: avg(runs.map((r) => r.stats.stage)),
  popularity: avg(runs.map((r) => r.stats.popularity)),
  resilience: avg(runs.map((r) => r.stats.resilience)),
  bond: avg(runs.map((r) => r.stats.bond)),
  authority: avg(runs.map((r) => r.stats.authority)),
  reputation: avg(runs.map((r) => r.stats.reputation)),
  tacit: avg(runs.map((r) => r.stats.tacit)),
};

const finalAvgCounters = {
  fanInteractions: avg(runs.map((r) => r.counters.fanInteractions ?? 0)),
  songwritingSessions: avg(runs.map((r) => r.counters.songwritingSessions ?? 0)),
  turn22CreativityProtection: avg(runs.map((r) => r.counters.turn22CreativityProtection ?? 0)),
};

const checkpointTurns = [36, 84, 120, 144];
const checkpointSummary = checkpointTurns.map((turn) => {
  const points = runs
    .map((r) => r.snapshots.find((s) => s.turn === turn))
    .filter((x): x is Snapshot => Boolean(x));
  return {
    turn,
    count: points.length,
    stats: {
      creativity: avg(points.map((p) => p.stats.creativity)),
      stage: avg(points.map((p) => p.stats.stage)),
      popularity: avg(points.map((p) => p.stats.popularity)),
      resilience: avg(points.map((p) => p.stats.resilience)),
      bond: avg(points.map((p) => p.stats.bond)),
      authority: avg(points.map((p) => p.stats.authority)),
      reputation: avg(points.map((p) => p.stats.reputation)),
      tacit: avg(points.map((p) => p.stats.tacit)),
    },
    counters: {
      fanInteractions: avg(points.map((p) => p.counters.fanInteractions ?? 0)),
      songwritingSessions: avg(points.map((p) => p.counters.songwritingSessions ?? 0)),
    },
  };
});

const keyEndingIds = [
  "ending_branch_label_leader",
  "ending_official_topstar",
  "ending_branch_culture_export",
  "ending_branch_gold_producer",
  "ending_hidden_echo",
];

const keyEndingRates = keyEndingIds.map((id) => ({
  id,
  count: unlockedEndingFrequency[id] ?? 0,
  rate: ((unlockedEndingFrequency[id] ?? 0) / runs.length) * 100,
}));

const hiddenEnding = topstarData.endings.find((ending) => ending.id === "ending_hidden_echo");
const hiddenMinStats = hiddenEnding?.conditions.minStats ?? {};
const hiddenEndingFanThresholdSensitivity = [50, 55, 60, 65, 70, 72, 75, 80].map(
  (fanInteractions) => {
    const count = runs.filter(
      (run) =>
        run.success &&
        (run.counters.fanInteractions ?? 0) >= fanInteractions &&
        Object.entries(hiddenMinStats).every(
          ([key, minimum]) =>
            run.stats[key as keyof Stats] >= (minimum ?? Number.POSITIVE_INFINITY)
        )
    ).length;
    return {
      fanInteractions,
      count,
      rate: (count / runs.length) * 100,
    };
  }
);

console.log(
  JSON.stringify(
    {
      totalRuns: runs.length,
      runsPerPolicy: RUNS_PER_POLICY,
      successRuns: runs.filter((r) => r.success).length,
      failByEnding,
      unlockedEndingFrequency: Object.entries(unlockedEndingFrequency).sort((a, b) => b[1] - a[1]),
      keyEndingRates,
      hiddenEndingFanThresholdSensitivity,
      finalAvgStats,
      finalAvgCounters,
      checkpointSummary,
    },
    null,
    2
  )
);
