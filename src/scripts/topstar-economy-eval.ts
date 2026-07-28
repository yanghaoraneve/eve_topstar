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
import type {
  ChoiceDef,
  EffectDef,
  GameState,
  RoutineEventDef,
  ShopItemDef,
} from "@/lib/topstar/types";

type Policy = "direct_training" | "balanced" | "economy_stable" | "economy_aggressive";
type Metrics = {
  incomeActions: number;
  incomeCoins: number;
  paidRoutineActions: number;
  paidRoutineSpend: number;
  shopPurchases: number;
  shopSpend: number;
};
type Run = {
  policy: Policy;
  success: boolean;
  gameOverEndingId?: string;
  unlockedEndingIds: string[];
  finalCoins: number;
  totalStats: number;
  songwritingSessions: number;
  stats: GameState["stats"];
  metrics: Metrics;
};

const policies: Policy[] = [
  "direct_training",
  "balanced",
  "economy_stable",
  "economy_aggressive",
];
const RUNS_PER_POLICY = 60;

function rand(seed: { value: number }): number {
  seed.value = (seed.value * 1103515245 + 12345) % 2147483648;
  return seed.value / 2147483648;
}

function statDelta(effects: EffectDef[]): number {
  return effects.reduce(
    (total, effect) => total + (effect.type === "stat" ? Math.max(0, effect.delta) : 0),
    0
  );
}

function weightedGrowth(effects: EffectDef[]): number {
  return effects.reduce((total, effect) => {
    if (effect.type === "stat") {
      const weight =
        effect.key === "tacit"
          ? 1.35
          : effect.key === "authority" || effect.key === "reputation"
            ? 1.2
            : 1;
      return total + Math.max(0, effect.delta) * weight;
    }
    if (effect.type === "counter") {
      return total + Math.max(0, effect.delta) * 0.8;
    }
    return total;
  }, 0);
}

function coinIncome(event: RoutineEventDef): number {
  return event.effects.reduce(
    (total, effect) => total + (effect.type === "coin" && effect.delta > 0 ? effect.delta : 0),
    0
  );
}

function storyChoiceScore(choice: ChoiceDef): number {
  const flagProgress = choice.effects.filter(
    (effect) =>
      effect.type === "flag:set" ||
      effect.type === "event:complete" ||
      effect.type === "codex:unlock"
  ).length;
  const penalties = choice.effects.reduce((total, effect) => {
    if (effect.type === "event:lock") return total + 20;
    if (effect.type === "stat" && effect.delta < 0) return total + Math.abs(effect.delta) * 4;
    return total;
  }, 0);
  return weightedGrowth(choice.effects) + flagProgress * 0.25 - penalties;
}

function candidatesByLocation(
  state: GameState
): { event: RoutineEventDef; locationId: string }[] {
  return getUnlockedLocations(state).flatMap((location) => {
    const moved = moveToLocation(state, location.id);
    return getAvailableRoutineEvents(moved).map((event) => ({
      event,
      locationId: location.id,
    }));
  });
}

function pickNearBest<T>(
  items: T[],
  score: (item: T) => number,
  seed: { value: number },
  width = 3
): T {
  const ranked = items
    .map((item) => ({ item, score: score(item) }))
    .sort((left, right) => right.score - left.score);
  const pool = ranked.slice(0, Math.min(width, ranked.length));
  return pool[Math.floor(rand(seed) * pool.length)]!.item;
}

function applyRoutine(
  state: GameState,
  candidate: { event: RoutineEventDef; locationId: string },
  metrics: Metrics
): GameState {
  const beforeCoins = state.coins;
  const moved = moveToLocation(state, candidate.locationId);
  const next = playRoutineEvent(moved, candidate.event.id);
  if (next === moved) return state;

  const coinChange = next.coins - beforeCoins;
  if (candidate.event.id.startsWith("routine_income_")) {
    metrics.incomeActions += 1;
    metrics.incomeCoins += Math.max(0, coinChange);
  }
  if ((candidate.event.goldCost ?? 0) > 0) {
    metrics.paidRoutineActions += 1;
    metrics.paidRoutineSpend += candidate.event.goldCost ?? 0;
  }
  return next;
}

function takeIncomeActions(
  state: GameState,
  policy: Policy,
  seed: { value: number },
  metrics: Metrics
): GameState {
  const desiredCount =
    policy === "economy_aggressive"
      ? 2
      : policy === "economy_stable"
        ? 1
        : policy === "balanced" && (state.coins < 100 || state.currentTurn % 4 === 0)
          ? 1
          : 0;
  let next = state;

  for (let used = 0; used < desiredCount; used += 1) {
    const incomeCandidates = candidatesByLocation(next).filter((candidate) =>
      candidate.event.id.startsWith("routine_income_")
    );
    if (!incomeCandidates.length) break;

    const picked =
      policy === "economy_aggressive"
        ? pickNearBest(
            incomeCandidates,
            (candidate) =>
              coinIncome(candidate.event) +
              weightedGrowth(candidate.event.effects) * 4 -
              candidate.event.staminaCost,
            seed,
            2
          )
        : pickNearBest(
            incomeCandidates,
            (candidate) =>
              coinIncome(candidate.event) / Math.max(1, candidate.event.staminaCost) -
              candidate.event.staminaCost * 0.25,
            seed,
            2
          );
    const applied = applyRoutine(next, picked, metrics);
    if (applied === next) break;
    next = applied;
  }

  return next;
}

function takePaidRoutine(
  state: GameState,
  policy: Policy,
  seed: { value: number },
  metrics: Metrics
): GameState {
  if (policy === "direct_training") return state;
  const candidates = candidatesByLocation(state).filter(
    (candidate) => (candidate.event.goldCost ?? 0) > 0
  );
  if (!candidates.length) return state;

  const reserve = policy === "balanced" ? 80 : policy === "economy_stable" ? 50 : 20;
  const affordable = candidates.filter(
    (candidate) => state.coins - (candidate.event.goldCost ?? 0) >= reserve
  );
  if (!affordable.length) return state;
  const picked = pickNearBest(
    affordable,
    (candidate) =>
      weightedGrowth(candidate.event.effects) /
      Math.max(1, (candidate.event.goldCost ?? 0) / 30),
    seed,
    2
  );
  return applyRoutine(state, picked, metrics);
}

function takeTrainingActions(
  state: GameState,
  seed: { value: number },
  metrics: Metrics
): GameState {
  let next = state;
  for (let index = 0; index < 20; index += 1) {
    const candidates = candidatesByLocation(next).filter(
      (candidate) =>
        !candidate.event.id.startsWith("routine_income_") &&
        (candidate.event.goldCost ?? 0) === 0 &&
        candidate.event.staminaCost > 0
    );
    if (!candidates.length) break;
    const picked = pickNearBest(
      candidates,
      (candidate) =>
        weightedGrowth(candidate.event.effects) /
          Math.max(1, candidate.event.staminaCost) +
        statDelta(candidate.event.effects) * 0.04,
      seed,
      3
    );
    const beforeStamina = next.staminaCurrent;
    const applied = applyRoutine(next, picked, metrics);
    if (applied === next || applied.staminaCurrent === beforeStamina) break;
    next = applied;
  }
  return next;
}

function shopItemScore(item: ShopItemDef): number {
  return weightedGrowth(item.effects) / Math.max(1, item.price / 30);
}

function buyShopItems(
  state: GameState,
  policy: Policy,
  metrics: Metrics
): GameState {
  const maxPurchases =
    policy === "economy_aggressive" ? 3 : policy === "economy_stable" ? 2 : 1;
  const reserve = policy === "direct_training" ? 90 : policy === "balanced" ? 60 : 20;
  let next = state;

  for (let index = 0; index < maxPurchases; index += 1) {
    const buyable = topstarData.shopItems
      .filter((item) => canPurchaseShopItem(next, item.id))
      .filter((item) => next.coins - item.price >= reserve)
      .sort((left, right) => shopItemScore(right) - shopItemScore(left));
    const item = buyable[0];
    if (!item) break;
    const beforeCoins = next.coins;
    const purchased = purchaseShopItem(next, item.id);
    if (purchased === next) break;
    next = purchased;
    metrics.shopPurchases += 1;
    metrics.shopSpend += beforeCoins - next.coins;
  }
  return next;
}

function run(policy: Policy, seedValue: number): Run {
  const seed = { value: seedValue };
  const metrics: Metrics = {
    incomeActions: 0,
    incomeCoins: 0,
    paidRoutineActions: 0,
    paidRoutineSpend: 0,
    shopPurchases: 0,
    shopSpend: 0,
  };
  let state = createInitialGameState();
  let guard = 0;

  while (state.currentTurn <= 144 && !state.gameOverEndingId) {
    guard += 1;
    if (guard > 5000) break;

    while (true) {
      const story = getActiveStoryEvent(state);
      if (!story) break;
      if (!story.choices?.length) {
        state = completeStoryWithoutChoice(state);
        continue;
      }
      const affordable = story.choices.filter(
        (choice) => (choice.staminaCost ?? 0) <= state.staminaCurrent
      );
      if (!affordable.length) break;
      const choice = affordable
        .map((item) => ({ item, score: storyChoiceScore(item) }))
        .sort((left, right) => right.score - left.score)[0]!.item;
      if (choice.id === "choice_turn114_accept") {
        state = { ...state, chunwanSongTitle: "慢慢" };
      }
      state = resolveStoryChoice(state, choice);
    }

    state = takeIncomeActions(state, policy, seed, metrics);
    state = takePaidRoutine(state, policy, seed, metrics);
    state = takeTrainingActions(state, seed, metrics);
    state = buyShopItems(state, policy, metrics);

    if (!canEndTurn(state) || state.currentTurn >= 144) break;
    state = endTurn(state);
  }

  return {
    policy,
    success: state.currentTurn >= 144 && !state.gameOverEndingId,
    gameOverEndingId: state.gameOverEndingId,
    unlockedEndingIds: state.unlockedEndingIds,
    finalCoins: state.coins,
    totalStats: Object.values(state.stats).reduce((total, value) => total + value, 0),
    songwritingSessions: state.counters.songwritingSessions ?? 0,
    stats: state.stats,
    metrics,
  };
}

function average(values: number[]): number {
  return values.reduce((total, value) => total + value, 0) / Math.max(1, values.length);
}

let seed = 20260726;
const runs: Run[] = [];
for (const policy of policies) {
  for (let index = 0; index < RUNS_PER_POLICY; index += 1) {
    runs.push(run(policy, seed));
    seed += 97;
  }
}

const summary = policies.map((policy) => {
  const group = runs.filter((run) => run.policy === policy);
  const endingRates = Object.fromEntries(
    topstarData.endings.map((ending) => [
      ending.id,
      Number(
        (
          (group.filter((run) => run.unlockedEndingIds.includes(ending.id)).length /
            group.length) *
          100
        ).toFixed(1)
      ),
    ])
  );
  return {
    policy,
    runs: group.length,
    successRate: Number(
      ((group.filter((run) => run.success).length / group.length) * 100).toFixed(1)
    ),
    avgFinalCoins: Number(average(group.map((run) => run.finalCoins)).toFixed(1)),
    avgTotalStats: Number(average(group.map((run) => run.totalStats)).toFixed(1)),
    avgSongwritingSessions: Number(
      average(group.map((run) => run.songwritingSessions)).toFixed(1)
    ),
    maxSongwritingSessions: Math.max(...group.map((run) => run.songwritingSessions)),
    avgIncomeActions: Number(
      average(group.map((run) => run.metrics.incomeActions)).toFixed(1)
    ),
    avgIncomeCoins: Number(
      average(group.map((run) => run.metrics.incomeCoins)).toFixed(1)
    ),
    avgPaidRoutineActions: Number(
      average(group.map((run) => run.metrics.paidRoutineActions)).toFixed(1)
    ),
    avgPaidRoutineSpend: Number(
      average(group.map((run) => run.metrics.paidRoutineSpend)).toFixed(1)
    ),
    avgShopPurchases: Number(
      average(group.map((run) => run.metrics.shopPurchases)).toFixed(1)
    ),
    avgShopSpend: Number(
      average(group.map((run) => run.metrics.shopSpend)).toFixed(1)
    ),
    officialEndingRate: endingRates.ending_official_topstar,
    hiddenEndingRate: endingRates.ending_hidden_echo,
    goldProducerRate: endingRates.ending_branch_gold_producer,
  };
});

console.log(JSON.stringify({ runs: runs.length, runsPerPolicy: RUNS_PER_POLICY, summary }, null, 2));
