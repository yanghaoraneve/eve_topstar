import { getStaminaMaxForTurn, topstarData, turnIndex } from "@/lib/topstar/data";
import { getStoryRewardCard } from "@/lib/topstar/storyRewardCardCopy";
import type {
  ChoiceDef,
  ConditionDef,
  EffectDef,
  EndingDef,
  GameState,
  RoutineEventDef,
  SaveFile,
  ShopItemDef,
  StatKey,
  StoryEventDef,
  TopstarLocationDef,
  TopstarMapDef,
  TurnGuidance,
  TurnIndexEntry,
  ViewKey,
} from "@/lib/topstar/types";

const MAX_STAT: Record<StatKey, number> = {
  creativity: 500,
  stage: 500,
  popularity: 500,
  resilience: 500,
  bond: 500,
  authority: 500,
  reputation: 500,
  tacit: 500,
};

function clampStat(key: StatKey, value: number): number {
  return Math.max(0, Math.min(MAX_STAT[key], value));
}

function hasCompletedEvent(state: GameState, eventId: string): boolean {
  return state.completedEventIds.includes(eventId);
}

export function evaluateCondition(
  state: GameState,
  condition?: ConditionDef
): boolean {
  if (!condition) return true;
  if (condition.minTurn && state.currentTurn < condition.minTurn) return false;
  if (condition.maxTurn && state.currentTurn > condition.maxTurn) return false;
  if (
    condition.requiredFlags &&
    !condition.requiredFlags.every((flag) => state.flags[flag])
  ) {
    return false;
  }
  if (
    condition.forbiddenFlags &&
    condition.forbiddenFlags.some((flag) => state.flags[flag])
  ) {
    return false;
  }
  if (
    condition.requiredEvents &&
    !condition.requiredEvents.every((eventId) => hasCompletedEvent(state, eventId))
  ) {
    return false;
  }
  if (condition.requiredCounters) {
    for (const [key, value] of Object.entries(condition.requiredCounters)) {
      if ((state.counters[key] ?? 0) < value) return false;
    }
  }
  if (condition.minStats) {
    for (const [key, value] of Object.entries(condition.minStats)) {
      const statKey = key as StatKey;
      if (value !== undefined && state.stats[statKey] < value) return false;
    }
  }
  return true;
}

function getCurrentTurnEntry(turn: number): TurnIndexEntry {
  return turnIndex[turn - 1] ?? turnIndex[0];
}

function getMapForTurn(turn: number): TopstarMapDef {
  const chapterId = getCurrentTurnEntry(turn).chapterId;
  return (
    topstarData.chapterMaps.find((map) => map.chapterId === chapterId) ??
    topstarData.chapterMaps[0]
  );
}

function getDefaultLocationIdForTurn(turn: number): string {
  return getMapForTurn(turn)?.defaultLocationId ?? "";
}

function normalizeLocationIdForTurn(turn: number, locationId?: string): string {
  const map = getMapForTurn(turn);
  if (locationId && map.locations.some((loc) => loc.id === locationId)) {
    return locationId;
  }
  return map.defaultLocationId;
}

/** 回合结束 → 新回合开始时的结算文案（偏叙事、少机械感） */
function buildTurnTransitionSummary(
  completedTurn: number,
  nextTurn: number,
  leftEntry: TurnIndexEntry,
  rightEntry: TurnIndexEntry,
  prevStaminaCap: number,
  staminaCurrent: number,
  staminaMax: number,
  monthlyCoinIncome: number
): { title: string; appliedEffects: string[] } {
  const title = `「${leftEntry.dateLabel}」先写到这里`;
  const lines: string[] = [];

  lines.push(
    `${leftEntry.dateLabel}先写到这里，日历翻到 ${rightEntry.dateLabel}。`
  );
  lines.push(`体力条已回满，本月可用 ${staminaCurrent} 点。`);
  lines.push(`企划金入账 ${monthlyCoinIncome}。`);

  if (prevStaminaCap !== staminaMax) {
    lines.push(
      `从这一回合起，体力上限调至 ${staminaMax} 点，长线排期可以多铺几步了。`
    );
  }

  if (leftEntry.chapterId !== rightEntry.chapterId) {
    const key = `${leftEntry.chapterId}->${rightEntry.chapterId}`;
    const chapterBridge: Record<string, string> = {
      "chapter1->chapter2":
        "校园线渐渐收束，练习室与通告的地图一下子变大了——下一站的风，要和你们一起扛。",
      "chapter2->chapter3":
        "舞台与综艺成了日常底色，发行与破圈的主线该往日程中央挪一挪了。",
      "chapter3->chapter4":
        "作品与口碑都垫稳了一截，真正的顶流长跑，才刚把呼吸调匀。",
    };
    lines.push(chapterBridge[key] ?? "新的章节拉开序幕，节奏和权重都和以往不太一样。");
  }

  return { title, appliedEffects: lines };
}

function chapterContainingTurn(turn: number) {
  return (
    topstarData.chapters.find(
      (c) => turn >= c.turnRange[0] && turn <= c.turnRange[1]
    ) ?? topstarData.chapters[0]
  );
}

/** 该「日历月」是否有主线格子（与是否已解锁无关：有则本月不刷轶事） */
function hasMainStoryCalendarTurn(turn: number): boolean {
  return topstarData.storyEvents.some((e) => e.turn === turn);
}

/** R1：从章节首回合 S 起，候选月为 S+4, S+8, …（且 turn > S） */
function isFillerR1CandidateTurn(turn: number): boolean {
  const ch = chapterContainingTurn(turn);
  const S = ch.turnRange[0];
  if (turn <= S) return false;
  if (turn < ch.turnRange[0] || turn > ch.turnRange[1]) return false;
  return (turn - S) % 4 === 0;
}

function fillerSlotRoutineKey(turn: number): string {
  return `filler_slot_${turn}`;
}

function stableFillerPickIndex(seed: string, modulo: number): number {
  if (modulo <= 0) return 0;
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h % modulo;
}

function getFillerStoryDef(id: string) {
  return topstarData.fillerStories.find((f) => f.id === id);
}

function getAvailableStoryEventsForTurn(
  state: GameState,
  turn = state.currentTurn
): StoryEventDef[] {
  const mains = topstarData.storyEvents.filter(
    (event) =>
      event.turn === turn &&
      !state.lockedEventIds.includes(event.id) &&
      !state.completedEventIds.includes(event.id) &&
      evaluateCondition(state, event.conditions)
  );
  if (mains.length > 0) return mains;
  if (hasMainStoryCalendarTurn(turn)) return [];

  if (
    (state.routineUsageByTurn[fillerSlotRoutineKey(turn)] ?? 0) >= 1 ||
    !isFillerR1CandidateTurn(turn)
  ) {
    return [];
  }

  const ch = chapterContainingTurn(turn);
  const pool = topstarData.fillerStories.filter(
    (f) =>
      f.chapterId === ch.id &&
      !state.completedEventIds.includes(f.id) &&
      evaluateCondition(state, f.conditions)
  );
  if (pool.length === 0) return [];

  const seed = `${state.playerName}|${ch.id}|${turn}`;
  const idx = stableFillerPickIndex(seed, pool.length);
  const picked = pool[idx]!;
  return [{ ...picked, turn } as StoryEventDef];
}

/** 本回合「企划金养成」已执行次数（任意 goldCost 事件共用 1 次额度） */
function goldRoutineSlotUsageKey(turn: number): string {
  return `${turn}:__gold_routine_slot__`;
}

function isRoutineOnCooldown(state: GameState, event: RoutineEventDef): boolean {
  const cooldownTurns = Math.max(1, event.cooldownTurns ?? 1);
  for (let offset = 1; offset < cooldownTurns; offset += 1) {
    const previousTurn = state.currentTurn - offset;
    if (previousTurn < 1) break;
    if ((state.routineUsageByTurn[`${previousTurn}:${event.id}`] ?? 0) > 0) {
      return true;
    }
  }
  return false;
}

export function getAvailableRoutineEvents(state: GameState): RoutineEventDef[] {
  const goldRoutineUsedThisTurn =
    (state.routineUsageByTurn[goldRoutineSlotUsageKey(state.currentTurn)] ?? 0) >= 1;
  return topstarData.routineEvents.filter((event) => {
    if (event.unlockTurn > state.currentTurn) return false;
    if (event.locationId !== state.currentLocationId) return false;
    if (event.id === "routine_club_training" && !state.flags.joinedFigClub) return false;
    const gold = event.goldCost ?? 0;
    if (gold > 0 && state.coins < gold) return false;
    if (gold > 0 && goldRoutineUsedThisTurn) return false;
    if (state.staminaCurrent < event.staminaCost) return false;
    if (isRoutineOnCooldown(state, event)) return false;
    const usageKey = `${state.currentTurn}:${event.id}`;
    const usedCount = state.routineUsageByTurn[usageKey] ?? 0;
    const dynamicMaxPerTurn =
      event.id === "routine_songwriting" && state.currentTurn >= 37
        ? 1
        : event.maxPerTurn;
    if (dynamicMaxPerTurn && usedCount >= dynamicMaxPerTurn) return false;
    return true;
  });
}

function resolveRoutineEffects(state: GameState, event: RoutineEventDef): EffectDef[] {
  let effects = structuredClone(event.effects);
  const usedCount = state.routineUsageByTurn[`${state.currentTurn}:${event.id}`] ?? 0;

  if (event.id === "routine_fan_reply" && (state.counters.fanInteractions ?? 0) >= 60) {
    effects = effects.filter(
      (effect) => !(effect.type === "stat" && effect.key === "popularity")
    );
  }

  if (event.tier === "light") {
    const statEffects = effects.filter(
      (effect): effect is Extract<EffectDef, { type: "stat" }> => effect.type === "stat"
    );
    const keepCount = usedCount <= 1 ? statEffects.length : usedCount === 2 ? 1 : 0;
    let kept = 0;
    effects = effects.map((effect) => {
      if (effect.type !== "stat") return effect;
      kept += 1;
      if (kept <= keepCount) return effect;
      return { ...effect, delta: 0 };
    });
  }

  return effects;
}

const routineCounterLabels: Record<string, string> = {
  fanInteractions: "粉丝互动记录",
  songwritingSessions: "创作打磨场次",
};

function applyGameEffect(state: GameState, effect: EffectDef): void {
  switch (effect.type) {
    case "coin":
      state.coins = Math.max(0, state.coins + effect.delta);
      break;
    case "stat":
      state.stats[effect.key] = clampStat(
        effect.key,
        state.stats[effect.key] + effect.delta
      );
      break;
    case "flag:set":
      state.flags[effect.key] = true;
      break;
    case "flag:clear":
      delete state.flags[effect.key];
      break;
    case "counter":
      state.counters[effect.key] = (state.counters[effect.key] ?? 0) + effect.delta;
      break;
    case "event:complete":
      if (!state.completedEventIds.includes(effect.id)) {
        state.completedEventIds.push(effect.id);
      }
      break;
    case "event:lock":
      if (!state.lockedEventIds.includes(effect.id)) {
        state.lockedEventIds.push(effect.id);
      }
      break;
    case "codex:unlock":
      if (!state.unlockedCodexIds.includes(effect.id)) {
        state.unlockedCodexIds.push(effect.id);
      }
      break;
  }
}

/** 养成 / 剧情收束：数值型一行（属性、企划金、计数） */
function describeRoutineEffectLine(effect: EffectDef): string | null {
  switch (effect.type) {
    case "stat": {
      const label = statLabelMap[effect.key];
      const n = effect.delta;
      return `${label} ${n >= 0 ? "+" : ""}${n}`;
    }
    case "coin": {
      const n = effect.delta;
      return `企划金 ${n >= 0 ? "+" : ""}${n}`;
    }
    case "counter": {
      const name = routineCounterLabels[effect.key] ?? effect.key;
      const n = effect.delta;
      return `${name} ${n >= 0 ? "+" : ""}${n}`;
    }
    default:
      return null;
  }
}

function resolveEndingUnlocks(state: GameState): void {
  const fromRules = topstarData.endings
    .filter(
      (ending) =>
        ending.category !== "failure" && evaluateCondition(state, ending.conditions)
    )
    .map((ending) => ending.id);
  state.unlockedEndingIds = fromRules;
  if (state.gameOverEndingId && !state.unlockedEndingIds.includes(state.gameOverEndingId)) {
    state.unlockedEndingIds.push(state.gameOverEndingId);
  }
}

function queueEndingAchievements(state: GameState, endingIds: string[]): void {
  const knownEndingIds = new Set(topstarData.endings.map((ending) => ending.id));
  const alreadyHandled = new Set([
    ...state.acknowledgedAchievementIds,
    ...state.pendingAchievementIds,
  ]);
  endingIds.forEach((endingId) => {
    if (!knownEndingIds.has(endingId) || alreadyHandled.has(endingId)) return;
    state.pendingAchievementIds.push(endingId);
    alreadyHandled.add(endingId);
  });
}

/**
 * 回合推进后的提前失败判定（F1–F6）。按优先级只触发一条。
 * 在 currentTurn 已更新为新月份后调用。
 */
function applyFatalEndingAfterTurnAdvance(state: GameState): void {
  if (state.gameOverEndingId) return;
  const t = state.currentTurn;
  const f = state.flags;
  const s = state.stats;
  const done = state.completedEventIds;

  if ((t === 37 || t === 85 || t === 121) && s.tacit <= 5) {
    state.gameOverEndingId = "ending_failure_f6_trust_break";
    return;
  }
  if (t === 7 && f.clubRouteRejected && !f.joinedFigClub && s.tacit <= 8) {
    state.gameOverEndingId = "ending_failure_f1_unstarted_seventeen";
    return;
  }
  if (t === 9 && f.quitFigClub && s.bond < 15 && s.resilience < 20) {
    state.gameOverEndingId = "ending_failure_f2_mic_blank";
    return;
  }
  if (
    t === 22 &&
    !f.firstDemoPublished &&
    (Boolean(f.demoAbandoned) || Boolean(f.quitFigClub) || Boolean(f.clubRouteRejected))
  ) {
    if (s.creativity >= 55 && (state.counters.songwritingSessions ?? 0) >= 2) {
      state.counters.turn22CreativityProtection =
        (state.counters.turn22CreativityProtection ?? 0) + 1;
      return;
    }
    state.gameOverEndingId = "ending_failure_f3_draft_never_sent";
    return;
  }
  if (t === 35 && f.slowlyClubOnly && s.creativity < 35 && s.popularity < 25) {
    state.gameOverEndingId = "ending_failure_f4_slowly_unheard";
    return;
  }
  if (
    t === 41 &&
    f.firstStageFastSong &&
    done.includes("story_turn_037_first_stage") &&
    !done.includes("story_turn_039_finale") &&
    (s.creativity < 55 || s.stage < 45 || s.bond < 35)
  ) {
    state.gameOverEndingId = "ending_failure_f5_stage_eliminated";
  }
}

function ensureActiveStory(state: GameState): GameState {
  if (state.gameOverEndingId) {
    state.activeStoryEventId = undefined;
    state.lineIndex = 0;
    return state;
  }
  const currentEvents = getAvailableStoryEventsForTurn(state);
  if (currentEvents.length === 0) {
    state.activeStoryEventId = undefined;
    state.lineIndex = 0;
    return state;
  }
  if (
    state.activeStoryEventId &&
    currentEvents.some((event) => event.id === state.activeStoryEventId)
  ) {
    return state;
  }
  state.activeStoryEventId = currentEvents[0].id;
  state.lineIndex = 0;
  return state;
}

export function createInitialGameState(): GameState {
  const initialTurn = 1;
  const initialState: GameState = {
    playerName: "最佳企划",
    currentTurn: initialTurn,
    staminaCurrent: getStaminaMaxForTurn(initialTurn),
    staminaMax: getStaminaMaxForTurn(initialTurn),
    coins: 120,
    purchasedShopItemIds: [],
    stats: {
      creativity: 10,
      stage: 10,
      popularity: 10,
      resilience: 10,
      bond: 10,
      authority: 0,
      reputation: 60,
      tacit: 10,
    },
    flags: {},
    counters: {},
    completedEventIds: [],
    lockedEventIds: [],
    unlockedCodexIds: [],
    unlockedEndingIds: [],
    pendingAchievementIds: [],
    acknowledgedAchievementIds: [],
    newPlayerGuidePending: false,
    newPlayerGuideSeen: false,
    seenStoryIds: [],
    routineUsageByTurn: {},
    currentLocationId: getDefaultLocationIdForTurn(initialTurn),
    activeStoryEventId: undefined,
    lineIndex: 0,
    selectedView: "training",
    settings: {
      skipRead: false,
      turnGuidanceOn: true,
      bgmOn: true,
      sfxOn: true,
      bgmVolume: 0.75,
      sfxVolume: 0.85,
    },
  };
  return ensureActiveStory(initialState);
}

function normalizeViewKey(raw: string | undefined): ViewKey {
  if (raw === "codex") return "codex";
  if (raw === "training") return "training";
  /** 旧存档或 "story" 均归为养成页（剧情不再作为独立 Tab，由强制剧情自动控制） */
  return "training";
}

export function normalizeChunwanSongTitle(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw
    .trim()
    .replace(/^《+/, "")
    .replace(/》+$/, "")
    .trim()
    .slice(0, 30);
}

function clampUnitVolume(raw: unknown, fallback: number): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n));
}

export function hydrateState(state: GameState): GameState {
  const s = state.settings;
  const hasStoredGuideState =
    typeof state.newPlayerGuidePending === "boolean" ||
    typeof state.newPlayerGuideSeen === "boolean";
  const knownEndingIds = new Set(topstarData.endings.map((ending) => ending.id));
  const acknowledgedAchievementIds = Array.isArray(
    state.acknowledgedAchievementIds
  )
    ? state.acknowledgedAchievementIds.filter((id) => knownEndingIds.has(id))
    : [];
  const acknowledgedSet = new Set(acknowledgedAchievementIds);
  const pendingAchievementIds = Array.isArray(state.pendingAchievementIds)
    ? state.pendingAchievementIds.filter(
        (id, index, all) =>
          knownEndingIds.has(id) &&
          !acknowledgedSet.has(id) &&
          all.indexOf(id) === index
      )
    : [];
  const hydrated: GameState = {
    ...state,
    chunwanSongTitle:
      normalizeChunwanSongTitle(state.chunwanSongTitle) || undefined,
    coins: typeof state.coins === "number" ? state.coins : 120,
    purchasedShopItemIds: Array.isArray(state.purchasedShopItemIds)
      ? state.purchasedShopItemIds
      : [],
    pendingAchievementIds,
    acknowledgedAchievementIds,
    newPlayerGuidePending: hasStoredGuideState
      ? Boolean(state.newPlayerGuidePending)
      : false,
    newPlayerGuideSeen: hasStoredGuideState
      ? Boolean(state.newPlayerGuideSeen)
      : state.completedEventIds.includes("story_turn_001_join_club"),
    selectedView: normalizeViewKey(state.selectedView as string),
    currentLocationId: normalizeLocationIdForTurn(
      state.currentTurn,
      (state as Partial<GameState>).currentLocationId
    ),
    staminaMax: getStaminaMaxForTurn(state.currentTurn),
    staminaCurrent: Math.min(
      state.staminaCurrent,
      getStaminaMaxForTurn(state.currentTurn)
    ),
    settings: {
      skipRead: Boolean(s?.skipRead),
      turnGuidanceOn: s?.turnGuidanceOn !== false,
      bgmOn: s?.bgmOn !== false,
      sfxOn: s?.sfxOn !== false,
      bgmVolume: clampUnitVolume(s?.bgmVolume, 0.75),
      sfxVolume: clampUnitVolume(s?.sfxVolume, 0.85),
    },
  };
  resolveEndingUnlocks(hydrated);
  return ensureActiveStory(hydrated);
}

export function getActiveStoryEvent(
  state: GameState
): StoryEventDef | undefined {
  const id = state.activeStoryEventId;
  if (!id) return undefined;
  const main = topstarData.storyEvents.find((event) => event.id === id);
  if (main) return main;
  const filler = getFillerStoryDef(id);
  if (!filler) return undefined;
  return { ...filler, turn: state.currentTurn };
}

export function goToNextLine(state: GameState): GameState {
  const next = structuredClone(state);
  const activeStory = getActiveStoryEvent(next);
  if (!activeStory) return next;
  const lastIndex = activeStory.dialogue.length - 1;
  if (next.lineIndex < lastIndex) {
    next.lineIndex += 1;
  }
  return next;
}

export function resolveStoryChoice(state: GameState, choice: ChoiceDef): GameState {
  if (state.gameOverEndingId) return state;
  const next = structuredClone(state);
  const activeStory = getActiveStoryEvent(next);
  if (!activeStory) return next;
  if (choice.id === "choice_turn114_accept") {
    const songTitle = normalizeChunwanSongTitle(next.chunwanSongTitle);
    if (!songTitle) return state;
    next.chunwanSongTitle = songTitle;
  } else if (choice.id === "choice_turn114_decline") {
    delete next.chunwanSongTitle;
  }
  const totalCost = choice.staminaCost ?? 0;
  if (totalCost > next.staminaCurrent) return next;
  next.staminaCurrent -= totalCost;
  choice.effects.forEach((effect) => applyGameEffect(next, effect));
  const body = choice.effects
    .map((effect) => describeRoutineEffectLine(effect))
    .filter((l): l is string => Boolean(l && l.trim()));
  const card = getStoryRewardCard(activeStory.id);
  const transition =
    choice.id === "choice_turn114_accept" && next.chunwanSongTitle
      ? `你在回函的演唱曲目一栏写下《${next.chunwanSongTitle}》。从这一刻起，它不再只是歌单里的名字，而是要被带上除夕夜直播的正式承诺。`
      : card.transition;
  const appliedEffects = body.length > 0 ? body : [card.emptyEcho];
  if (!next.seenStoryIds.includes(activeStory.id)) {
    next.seenStoryIds.push(activeStory.id);
  }
  delete next.routineFeedback;
  next.storyFeedback = {
    title: activeStory.title,
    transition,
    appliedEffects,
  };
  if (
    activeStory.id === "story_turn_001_join_club" &&
    !next.newPlayerGuideSeen
  ) {
    next.newPlayerGuidePending = true;
  }
  if (getFillerStoryDef(activeStory.id)) {
    next.routineUsageByTurn[fillerSlotRoutineKey(next.currentTurn)] = 1;
  }
  resolveEndingUnlocks(next);
  if (activeStory.id === "story_turn_144_finale") {
    queueEndingAchievements(next, next.unlockedEndingIds);
  }
  return ensureActiveStory(next);
}

function shopItemStatHasRoom(state: GameState, item: ShopItemDef): boolean {
  const positiveStats = item.effects.filter(
    (e): e is Extract<EffectDef, { type: "stat" }> =>
      e.type === "stat" && e.delta > 0
  );
  if (positiveStats.length === 0) return true;
  return positiveStats.some((e) => state.stats[e.key] < MAX_STAT[e.key]);
}

function shopItemUsageKey(item: ShopItemDef, turn: number): string | null {
  if (item.limit === "perTurn") return `shopbuy:${turn}:${item.id}`;
  if (item.limit === "every3Turns") return `shopbuy3:${Math.floor((turn - 1) / 3)}:${item.id}`;
  return null;
}

export function canPurchaseShopItem(state: GameState, itemId: string): boolean {
  const item = topstarData.shopItems.find((x) => x.id === itemId);
  if (!item || item.unlockTurn > state.currentTurn) return false;
  if (item.limit === "once" && state.purchasedShopItemIds.includes(item.id)) return false;
  const ukey = shopItemUsageKey(item, state.currentTurn);
  if (ukey && (state.routineUsageByTurn[ukey] ?? 0) >= 1) return false;
  if (state.coins < item.price) return false;
  return shopItemStatHasRoom(state, item);
}

export function purchaseShopItem(state: GameState, itemId: string): GameState {
  if (!canPurchaseShopItem(state, itemId)) return state;
  const item = topstarData.shopItems.find((x) => x.id === itemId)!;
  const next = structuredClone(state);
  next.coins -= item.price;
  item.effects.forEach((e) => applyGameEffect(next, e));
  if (item.limit === "once" && !next.purchasedShopItemIds.includes(item.id)) {
    next.purchasedShopItemIds.push(item.id);
  }
  const ukey = shopItemUsageKey(item, state.currentTurn);
  if (ukey) {
    next.routineUsageByTurn[ukey] = (next.routineUsageByTurn[ukey] ?? 0) + 1;
  }
  delete next.storyFeedback;
  delete next.turnSummary;
  const lines = item.effects
    .map((e) => describeRoutineEffectLine(e))
    .filter((l): l is string => Boolean(l && l.trim()));
  const applied =
    lines.length > 0 ? [`企划金 -${item.price}`, ...lines] : [`企划金 -${item.price}`, "已入账并完成备货。"];
  next.routineFeedback = {
    title: `企划商店 · ${item.name}`,
    narrative: item.description,
    appliedEffects: applied,
  };
  next.selectedView = "training";
  resolveEndingUnlocks(next);
  return ensureActiveStory(next);
}

export function completeStoryWithoutChoice(state: GameState): GameState {
  if (state.gameOverEndingId) return state;
  const next = structuredClone(state);
  const activeStory = getActiveStoryEvent(next);
  if (!activeStory) return next;
  const fillerDef = getFillerStoryDef(activeStory.id);
  if (fillerDef?.completionEffects?.length) {
    fillerDef.completionEffects.forEach((e) => applyGameEffect(next, e));
  }
  if (!next.completedEventIds.includes(activeStory.id)) {
    next.completedEventIds.push(activeStory.id);
  }
  if (!next.unlockedCodexIds.includes(activeStory.codexId)) {
    next.unlockedCodexIds.push(activeStory.codexId);
  }
  if (!next.seenStoryIds.includes(activeStory.id)) {
    next.seenStoryIds.push(activeStory.id);
  }
  if (fillerDef) {
    next.routineUsageByTurn[fillerSlotRoutineKey(next.currentTurn)] = 1;
  }
  delete next.routineFeedback;
  const card = getStoryRewardCard(activeStory.id);
  const effectLines =
    fillerDef?.completionEffects
      ?.map((e) => describeRoutineEffectLine(e))
      .filter((l): l is string => Boolean(l && l.trim())) ?? [];
  const appliedEffects =
    effectLines.length > 0 ? [...effectLines, ...card.autoLines] : [card.autoLines[0], card.autoLines[1]];
  next.storyFeedback = {
    title: activeStory.title,
    transition: card.transition,
    appliedEffects,
  };
  resolveEndingUnlocks(next);
  return ensureActiveStory(next);
}

export function playRoutineEvent(state: GameState, eventId: string): GameState {
  if (state.gameOverEndingId) return state;
  const event = topstarData.routineEvents.find((item) => item.id === eventId);
  if (!event) return state;
  if (event.unlockTurn > state.currentTurn) return state;
  if (event.locationId !== state.currentLocationId) return state;
  const gold = event.goldCost ?? 0;
  if (gold > 0 && state.coins < gold) return state;
  if (gold > 0 && (state.routineUsageByTurn[goldRoutineSlotUsageKey(state.currentTurn)] ?? 0) >= 1) {
    return state;
  }
  if (isRoutineOnCooldown(state, event)) return state;
  const usageKey = `${state.currentTurn}:${event.id}`;
  const usedCount = state.routineUsageByTurn[usageKey] ?? 0;
  const dynamicMaxPerTurn =
    event.id === "routine_songwriting" && state.currentTurn >= 37
      ? 1
      : event.maxPerTurn;
  if (dynamicMaxPerTurn && usedCount >= dynamicMaxPerTurn) return state;
  if (state.staminaCurrent < event.staminaCost) return state;

  const next = structuredClone(state);
  next.coins -= gold;
  next.staminaCurrent -= event.staminaCost;
  next.routineUsageByTurn[usageKey] = usedCount + 1;
  if (gold > 0) {
    next.routineUsageByTurn[goldRoutineSlotUsageKey(next.currentTurn)] = 1;
  }
  let resolvedEffects = resolveRoutineEffects(next, event);
  if (event.id === "routine_songwriting" && next.currentTurn >= 37) {
    resolvedEffects.push({ type: "stat", key: "authority", delta: 1 });
  }
  if (event.id === "routine_live_show" && next.currentTurn >= 37) {
    resolvedEffects.push({ type: "stat", key: "reputation", delta: 1 });
  }
  if (event.id === "routine_release_single" && next.currentTurn >= 85) {
    resolvedEffects.push({ type: "stat", key: "authority", delta: 1 });
  }
  if (event.id === "routine_family_time" && next.stats.resilience < 40) {
    resolvedEffects.push({ type: "stat", key: "tacit", delta: 1 });
  }
  resolvedEffects.forEach((effect) => applyGameEffect(next, effect));
  const numericLines = resolvedEffects
    .map((effect) => describeRoutineEffectLine(effect))
    .filter((l): l is string => Boolean(l && l.trim()));
  let appliedEffects =
    numericLines.length > 0 ? numericLines : ["（本事件无属性或计数数值变化）"];
  if (gold > 0) {
    appliedEffects = [`企划金 -${gold}`, ...appliedEffects];
  }
  delete next.storyFeedback;
  delete next.turnSummary;
  const variants = event.outcomeNarratives;
  const narrativePick = variants[Math.floor(Math.random() * variants.length)];
  next.routineFeedback = {
    title: event.title,
    narrative: narrativePick,
    appliedEffects,
  };
  next.selectedView = "training";
  resolveEndingUnlocks(next);
  return ensureActiveStory(next);
}

export function isGameOver(state: GameState): boolean {
  return Boolean(state.gameOverEndingId);
}

export function canEndTurn(state: GameState): boolean {
  if (state.gameOverEndingId) return false;
  return !getActiveStoryEvent(state);
}

export function endTurn(state: GameState): GameState {
  if (!canEndTurn(state)) return state;
  const next = structuredClone(state);
  if (next.currentTurn >= 144) {
    resolveEndingUnlocks(next);
    return ensureActiveStory(next);
  }
  const completedTurn = next.currentTurn;
  const leftEntry = getCurrentTurnEntry(completedTurn);
  const prevStaminaCap = next.staminaMax;
  delete next.routineFeedback;
  delete next.storyFeedback;
  next.currentTurn += 1;
  next.staminaMax = getStaminaMaxForTurn(next.currentTurn);
  next.staminaCurrent = next.staminaMax;
  next.selectedView = "training";
  const entered = getCurrentTurnEntry(next.currentTurn);
  next.currentLocationId = normalizeLocationIdForTurn(next.currentTurn);
  next.lineIndex = 0;
  const monthlyCoin = 20 + Math.min(15, Math.floor(completedTurn / 12));
  next.coins += monthlyCoin;
  const { title, appliedEffects } = buildTurnTransitionSummary(
    completedTurn,
    next.currentTurn,
    leftEntry,
    entered,
    prevStaminaCap,
    next.staminaCurrent,
    next.staminaMax,
    monthlyCoin
  );
  next.turnSummary = {
    turn: completedTurn,
    title,
    appliedEffects,
  };
  resolveEndingUnlocks(next);
  applyFatalEndingAfterTurnAdvance(next);
  if (next.gameOverEndingId) {
    delete next.turnSummary;
    next.activeStoryEventId = undefined;
    next.lineIndex = 0;
    resolveEndingUnlocks(next);
    queueEndingAchievements(next, [next.gameOverEndingId]);
    return next;
  }
  return ensureActiveStory(next);
}

export function dismissGameOverAndRestart(): GameState {
  return createInitialGameState();
}

export function dismissAchievementCard(state: GameState): GameState {
  if (state.pendingAchievementIds.length === 0) return state;
  const next = structuredClone(state);
  const [acknowledgedId, ...remainingIds] = next.pendingAchievementIds;
  next.pendingAchievementIds = remainingIds;
  if (
    acknowledgedId &&
    !next.acknowledgedAchievementIds.includes(acknowledgedId)
  ) {
    next.acknowledgedAchievementIds.push(acknowledgedId);
  }
  return next;
}

export function dismissNewPlayerGuide(state: GameState): GameState {
  if (!state.newPlayerGuidePending) return state;
  return {
    ...state,
    newPlayerGuidePending: false,
    newPlayerGuideSeen: true,
  };
}

export function updatePlayerName(state: GameState, playerName: string): GameState {
  return {
    ...state,
    playerName,
  };
}

export function updateChunwanSongTitle(
  state: GameState,
  songTitle: string
): GameState {
  return {
    ...state,
    chunwanSongTitle: songTitle.slice(0, 32),
  };
}

export function updateSelectedView(state: GameState, selectedView: GameState["selectedView"]): GameState {
  return {
    ...state,
    selectedView,
  };
}

export function updateSettings(
  state: GameState,
  patch: Partial<GameState["settings"]>
): GameState {
  return {
    ...state,
    settings: {
      ...state.settings,
      ...patch,
    },
  };
}

export function getCurrentMap(state: GameState): TopstarMapDef {
  return getMapForTurn(state.currentTurn);
}

export function getUnlockedLocations(state: GameState): TopstarLocationDef[] {
  return getCurrentMap(state).locations.filter((location) =>
    evaluateCondition(state, location.conditions)
  );
}

export function getCurrentLocation(state: GameState): TopstarLocationDef {
  const locations = getUnlockedLocations(state);
  return (
    locations.find((location) => location.id === state.currentLocationId) ??
    getCurrentMap(state).locations.find((location) => location.id === getCurrentMap(state).defaultLocationId) ??
    getCurrentMap(state).locations[0]
  );
}

export function moveToLocation(state: GameState, locationId: string): GameState {
  if (state.gameOverEndingId || getActiveStoryEvent(state)) return state;
  const location = getUnlockedLocations(state).find((item) => item.id === locationId);
  if (!location) return state;
  if (location.id === state.currentLocationId) return state;
  const next = structuredClone(state);
  next.currentLocationId = location.id;
  delete next.routineFeedback;
  delete next.storyFeedback;
  return ensureActiveStory(next);
}

export function getTurnEntry(state: GameState): TurnIndexEntry {
  return getCurrentTurnEntry(state.currentTurn);
}

const guidanceGoalByStat: Record<StatKey, string> = {
  creativity: "先把新作品和表达打磨扎实，让下一次呈现有更清楚的内容支点。",
  stage: "下一阶段需要更稳定的现场表现，本月适合把时间留给排练和小舞台。",
  popularity: "让已经完成的作品被更多人听见，逐步扩大真实的听众反馈。",
  resilience: "行程开始变密，先把状态和节奏稳住，再安排更重的项目。",
  bond: "留一点时间维系彼此与团队的联结，让后面的合作更顺畅。",
  authority: "开始建立更成熟的行业判断，把合作边界和项目节奏掌握在自己手里。",
  reputation: "把作品和长期行动做得更扎实，让认可慢慢沉淀成可靠口碑。",
  tacit: "多安排需要共同完成的事项，把你和 EVE 并肩工作的节奏磨得更稳。",
};

const chapterGuidanceTargets: Record<
  string,
  Partial<Record<StatKey, number>>
> = {
  chapter1: {
    creativity: 45,
    stage: 38,
    popularity: 32,
    resilience: 35,
    bond: 35,
    tacit: 28,
  },
  chapter2: {
    creativity: 110,
    stage: 95,
    popularity: 105,
    resilience: 82,
    bond: 82,
    authority: 45,
    reputation: 82,
    tacit: 70,
  },
  chapter3: {
    creativity: 220,
    stage: 205,
    popularity: 225,
    resilience: 170,
    bond: 165,
    authority: 115,
    reputation: 150,
    tacit: 145,
  },
  chapter4: {
    creativity: 330,
    stage: 320,
    popularity: 345,
    resilience: 270,
    bond: 260,
    authority: 210,
    reputation: 235,
    tacit: 225,
  },
};

function getGuidanceFocus(
  state: GameState
): { key: StatKey; urgent: boolean } {
  const chapterId = getCurrentTurnEntry(state.currentTurn).chapterId;
  const upcoming = topstarData.storyEvents
    .filter(
      (event) =>
        event.chapterId === chapterId &&
        event.turn >= state.currentTurn &&
        event.turn <= state.currentTurn + 8 &&
        !state.completedEventIds.includes(event.id) &&
        !state.lockedEventIds.includes(event.id)
    )
    .sort((a, b) => a.turn - b.turn);

  let best:
    | { key: StatKey; score: number; urgent: boolean }
    | undefined;
  for (const event of upcoming) {
    for (const [rawKey, required] of Object.entries(
      event.conditions?.minStats ?? {}
    )) {
      const key = rawKey as StatKey;
      if (required === undefined || state.stats[key] >= required) continue;
      const gapRatio = (required - state.stats[key]) / Math.max(1, required);
      const distanceWeight = 1 / Math.max(1, event.turn - state.currentTurn + 1);
      const score = gapRatio * 2 + distanceWeight;
      if (!best || score > best.score) {
        best = {
          key,
          score,
          urgent: event.turn - state.currentTurn <= 3 && gapRatio >= 0.12,
        };
      }
    }
  }
  if (best) return { key: best.key, urgent: best.urgent };

  const targets = chapterGuidanceTargets[chapterId] ?? chapterGuidanceTargets.chapter1;
  const weakest = (Object.entries(targets) as [StatKey, number][])
    .map(([key, target]) => ({
      key,
      ratio: state.stats[key] / Math.max(1, target),
    }))
    .sort((a, b) => a.ratio - b.ratio)[0];
  return { key: weakest?.key ?? "creativity", urgent: false };
}

function hasRoutineActivityOnTurn(state: GameState, turn: number): boolean {
  return topstarData.routineEvents.some(
    (event) => (state.routineUsageByTurn[`${turn}:${event.id}`] ?? 0) > 0
  );
}

function getGuidanceReason(event: RoutineEventDef): string {
  const coinIncome = event.effects.reduce(
    (total, effect) =>
      total + (effect.type === "coin" && effect.delta > 0 ? effect.delta : 0),
    0
  );
  const statGains = event.effects
    .filter(
      (effect): effect is Extract<EffectDef, { type: "stat" }> =>
        effect.type === "stat" && effect.delta > 0
    )
    .slice(0, 2)
    .map((effect) => `${statLabelMap[effect.key]} +${effect.delta}`);
  const parts = [
    coinIncome > 0 ? `预计收入 ${coinIncome} 企划金` : "",
    statGains.length > 0 ? statGains.join("、") : "",
    `体力 ${event.staminaCost}`,
  ].filter(Boolean);
  return parts.join(" · ");
}

/**
 * 月度交接后的单次企划方向提示。
 * 只返回弹层所需内容，不向地图写入推荐状态或常驻标记。
 */
export function getTurnGuidance(state: GameState): TurnGuidance | null {
  if (
    state.settings.turnGuidanceOn === false ||
    state.gameOverEndingId ||
    getActiveStoryEvent(state)
  ) {
    return null;
  }

  const focus = getGuidanceFocus(state);
  const needsIncome = state.coins < 80;
  const candidates = getUnlockedLocations(state).flatMap((location) => {
    const locatedState =
      state.currentLocationId === location.id
        ? state
        : { ...state, currentLocationId: location.id };
    return getAvailableRoutineEvents(locatedState).map((event) => {
      const focusGain = event.effects.reduce(
        (total, effect) =>
          total +
          (effect.type === "stat" && effect.key === focus.key && effect.delta > 0
            ? effect.delta
            : 0),
        0
      );
      const totalStatGain = event.effects.reduce(
        (total, effect) =>
          total + (effect.type === "stat" && effect.delta > 0 ? effect.delta : 0),
        0
      );
      const coinIncome = event.effects.reduce(
        (total, effect) =>
          total + (effect.type === "coin" && effect.delta > 0 ? effect.delta : 0),
        0
      );
      const score =
        focusGain * 32 +
        totalStatGain * 2 +
        coinIncome * (needsIncome ? 1.5 : 0.025) -
        event.staminaCost * 0.35 -
        (needsIncome && coinIncome === 0 ? 120 : 0);
      return { event, location, score };
    });
  });

  const sorted = candidates.sort((a, b) => b.score - a.score);
  const preferred = sorted.length > 0
    ? sorted
    : candidates.sort(
        (a, b) => a.event.staminaCost - b.event.staminaCost
      );
  const recommendations = preferred.slice(0, 2).map(({ event, location }) => ({
    eventId: event.id,
    locationId: location.id,
    locationName: location.shortLabel,
    tier: event.tier,
    title: event.title,
    reason: getGuidanceReason(event),
  }));

  const previousTwoTurnsIdle =
    state.currentTurn >= 4 &&
    !hasRoutineActivityOnTurn(state, state.currentTurn - 1) &&
    !hasRoutineActivityOnTurn(state, state.currentTurn - 2);
  const fullMode =
    state.currentTurn <= 12 ||
    [37, 85, 121].includes(state.currentTurn) ||
    focus.urgent ||
    previousTwoTurnsIdle ||
    needsIncome;
  const goal = needsIncome
    ? "企划预算偏紧，本月先安排一项有明确收入的工作，再决定后续投入。"
    : previousTwoTurnsIdle
      ? "如果还没想好从哪里开始，可以先完成一项短安排，再把剩余体力投向当前短板。"
      : guidanceGoalByStat[focus.key];

  return {
    mode: fullMode ? "full" : "compact",
    dateLabel: getCurrentTurnEntry(state.currentTurn).dateLabel,
    goal,
    recommendations,
  };
}

export function getRecurringEventsForCurrentTurn(state: GameState) {
  const entry = getCurrentTurnEntry(state.currentTurn);
  return topstarData.recurringEvents.filter((event) =>
    entry.recurringEventIds.includes(event.id)
  );
}

export function getUnlockedEndings(state: GameState): EndingDef[] {
  return topstarData.endings.filter((ending) =>
    state.unlockedEndingIds.includes(ending.id)
  );
}

export function getEndingProgress(state: GameState): EndingDef[] {
  return topstarData.endings;
}

export function getCodexEntries(state: GameState): StoryEventDef[] {
  const mains = topstarData.storyEvents.filter(
    (event) =>
      state.unlockedCodexIds.includes(event.codexId) ||
      state.completedEventIds.includes(event.id)
  );
  const fillers = topstarData.fillerStories
    .filter(
      (f) =>
        state.unlockedCodexIds.includes(f.codexId) ||
        state.completedEventIds.includes(f.id)
    )
    .map((f) => ({ ...f, turn: state.currentTurn } as StoryEventDef));
  return [...mains, ...fillers];
}

export function createSaveFile(state: GameState): SaveFile {
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    state,
  };
}

export function dismissTurnSummary(state: GameState): GameState {
  const next = structuredClone(state);
  delete next.turnSummary;
  return next;
}

export function dismissRoutineFeedback(state: GameState): GameState {
  const n = structuredClone(state);
  delete n.routineFeedback;
  return n;
}

export function dismissStoryFeedback(state: GameState): GameState {
  const n = structuredClone(state);
  delete n.storyFeedback;
  return n;
}

export const statLabelMap: Record<StatKey, string> = {
  creativity: "创作力",
  stage: "舞台力",
  popularity: "人气值",
  resilience: "韧度值",
  bond: "联结值",
  authority: "行业话语权",
  reputation: "国民口碑值",
  tacit: "企划默契值",
};
