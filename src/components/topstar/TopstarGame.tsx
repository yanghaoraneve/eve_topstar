"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { topstarData } from "@/lib/topstar/data";
import {
  canEndTurn,
  canPurchaseShopItem,
  completeStoryWithoutChoice,
  createInitialGameState,
  dismissAchievementCard,
  dismissGameOverAndRestart,
  dismissNewPlayerGuide,
  dismissRoutineFeedback,
  dismissStoryFeedback,
  dismissTurnSummary,
  endTurn,
  getActiveStoryEvent,
  getAvailableRoutineEvents,
  getCodexEntries,
  getEndingProgress,
  getCurrentLocation,
  getCurrentMap,
  getTurnEntry,
  getTurnGuidance,
  getUnlockedLocations,
  getUnlockedEndings,
  goToNextLine,
  hydrateState,
  moveToLocation,
  normalizeChunwanSongTitle,
  playRoutineEvent,
  purchaseShopItem,
  resolveStoryChoice,
  statLabelMap,
  updatePlayerName,
  updateChunwanSongTitle,
  updateSelectedView,
  updateSettings,
} from "@/lib/topstar/game";
import {
  clearManualSlot,
  loadAutosave,
  loadManualSlot,
  saveAutosave,
  saveManualSlot,
} from "@/lib/topstar/storage";
import { resolveBackgroundUrl, resolvePortraitUrl } from "@/lib/topstar/visuals";
import type {
  ChoiceDef,
  GameState,
  RoutineEventDef,
  SaveSlotId,
  TurnGuidance,
} from "@/lib/topstar/types";
import { useTopstarGameAudio } from "@/components/topstar/useTopstarGameAudio";
import { TopstarMapBoard } from "@/components/topstar/TopstarMapBoard";

function substName(text: string, name: string): string {
  return text.replace(/【自定义昵称】/g, name).replace(/最佳企划/g, name);
}

function formatChunwanSongTitle(raw: string | undefined): string {
  const title = normalizeChunwanSongTitle(raw);
  return title ? `《${title}》` : "所选歌曲";
}

function substStoryText(text: string, state: GameState): string {
  return substName(text, state.playerName).replace(
    /【春晚曲目】/g,
    formatChunwanSongTitle(state.chunwanSongTitle)
  );
}

const tierLabel: Record<string, string> = {
  light: "日常",
  medium: "进阶",
  heavy: "核心",
};

function getRoutineCoinIncome(event: RoutineEventDef): number {
  return event.effects.reduce(
    (total, effect) => total + (effect.type === "coin" && effect.delta > 0 ? effect.delta : 0),
    0
  );
}

function withoutTurnPrefix(title: string): string {
  return title.replace(/^回合\s*\d+\s*·?\s*/, "");
}

export function TopstarGame() {
  const [state, setState] = useState<GameState | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [settingsPageOpen, setSettingsPageOpen] = useState(false);
  /** 地点事件面板不入存档：点击当前地点才展开 */
  const [locationPanelOpen, setLocationPanelOpen] = useState(false);
  const [pendingLocationId, setPendingLocationId] = useState<string | null>(null);
  /** 企划商店浮层（顶栏「商店」） */
  const [shopPanelOpen, setShopPanelOpen] = useState(false);
  /** 月度交接后的单次提示；关闭后不写入地图或存档 */
  const [turnGuidance, setTurnGuidance] = useState<TurnGuidance | null>(null);

  useEffect(() => {
    const saved = loadAutosave();
    setState(hydrateState(saved ?? createInitialGameState()));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || !state) return;
    saveAutosave(state);
  }, [state, hydrated]);

  /** 强制剧情开始时：收起地点/商店面板；若正在图鉴则退回 training 视图 */
  useEffect(() => {
    if (!state) return;
    const blocking =
      Boolean(getActiveStoryEvent(state)) || Boolean(state.gameOverEndingId);
    if (blocking) {
      setLocationPanelOpen(false);
      setPendingLocationId(null);
      setShopPanelOpen(false);
      setTurnGuidance(null);
      if (state.selectedView === "codex") {
        setState((s) => (s ? updateSelectedView(s, "training") : s));
      }
    }
  }, [state]);

  const set = useCallback((updater: (s: GameState) => GameState) => {
    setState((prev) => (prev ? updater(prev) : prev));
  }, []);

  const activeStory = state ? getActiveStoryEvent(state) : undefined;
  const turnEntry = state ? getTurnEntry(state) : null;

  const stageBackgroundUrl = useMemo(
    () => (state ? resolveBackgroundUrl(state) : topstarData.assets.backgrounds.bg_campus),
    [state]
  );
  const portraitUrl = useMemo(
    () => (state ? resolvePortraitUrl(state) : topstarData.assets.portraits.eve_campus),
    [state]
  );

  const lastLineIndex = activeStory ? activeStory.dialogue.length - 1 : 0;
  const atLastLine = activeStory && state && state.lineIndex >= lastLineIndex;
  const showChoices =
    Boolean(activeStory && atLastLine && activeStory.choices && activeStory.choices.length > 0);

  const routineByTier = useMemo(() => {
    const empty: RoutineEventDef[] = [];
    if (!state) {
      return { light: empty, medium: empty, heavy: empty };
    }
    const all = getAvailableRoutineEvents(state);
    return {
      light: all.filter((e) => e.tier === "light"),
      medium: all.filter((e) => e.tier === "medium"),
      heavy: all.filter((e) => e.tier === "heavy"),
    };
  }, [state]);

  const [trainingTier, setTrainingTier] = useState<"light" | "medium" | "heavy">("light");

  const currentMap = state ? getCurrentMap(state) : undefined;
  const currentLocation = state ? getCurrentLocation(state) : undefined;
  const unlockedLocations = useMemo(
    () => (state ? getUnlockedLocations(state) : []),
    [state]
  );
  const unlockedLocationIds = useMemo(
    () => new Set(unlockedLocations.map((location) => location.id)),
    [unlockedLocations]
  );
  const actionableLocationIds = useMemo(() => {
    if (!state) return new Set<string>();
    return new Set(
      topstarData.routineEvents
        .filter((event) => event.unlockTurn <= state.currentTurn)
        .map((event) => event.locationId)
    );
  }, [state]);

  const chapterIdForAudio =
    hydrated && state ? getTurnEntry(state).chapterId : undefined;
  const topstarAudio = useTopstarGameAudio({
    chapterId: chapterIdForAudio,
    bgmOn: state?.settings.bgmOn !== false,
    sfxOn: state?.settings.sfxOn !== false,
    bgmVolume: state?.settings.bgmVolume ?? 0.75,
    sfxVolume: state?.settings.sfxVolume ?? 0.85,
  });

  if (!state || !hydrated) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-[#F8F5F2] text-[#333333]">
        <p className="text-sm">载入中…</p>
      </div>
    );
  }

  function handleDialogueTap() {
    topstarAudio.playClick();
    set((current) => {
      const story = getActiveStoryEvent(current);
      if (!story) return current;
      const last = story.dialogue.length - 1;
      const atChoice =
        current.lineIndex >= last &&
        Boolean(story.choices && story.choices.length > 0);
      if (atChoice) return current;
      if (current.lineIndex < last) return goToNextLine(current);
      return current;
    });
  }

  function handleChoice(choice: ChoiceDef) {
    topstarAudio.playClick();
    topstarAudio.playUnlock();
    const cost = choice.staminaCost ?? 0;
    set((current) => {
      if (current.gameOverEndingId) return current;
      if (cost > current.staminaCurrent) return current;
      return resolveStoryChoice(current, choice);
    });
  }

  function handleEndTurn() {
    topstarAudio.playClick();
    setLocationPanelOpen(false);
    setPendingLocationId(null);
    setTurnGuidance(null);
    set((current) => {
      if (!current || !canEndTurn(current)) return current;
      return endTurn(current);
    });
  }

  function dismissRoutinePanel() {
    topstarAudio.playClick();
    set((s) => dismissRoutineFeedback(s));
  }

  function dismissStoryPanel() {
    topstarAudio.playClick();
    set((s) => dismissStoryFeedback(s));
  }

  function dismissAchievementPanel() {
    topstarAudio.playClick();
    set((s) => dismissAchievementCard(s));
  }

  function dismissNewPlayerGuidePanel() {
    topstarAudio.playClick();
    set((s) => dismissNewPlayerGuide(s));
  }

  function dismissTurnPanel() {
    topstarAudio.playClick();
    if (!state) return;
    const next = dismissTurnSummary(state);
    setState(next);
    setTurnGuidance(getTurnGuidance(next));
  }

  function openGuidanceRecommendation(
    recommendation: TurnGuidance["recommendations"][number]
  ) {
    topstarAudio.playClick();
    setTurnGuidance(null);
    setShopPanelOpen(false);
    setPendingLocationId(null);
    setTrainingTier(recommendation.tier);
    setState((current) => {
      if (!current) return current;
      return moveToLocation(
        updateSelectedView(current, "training"),
        recommendation.locationId
      );
    });
    setLocationPanelOpen(true);
  }

  function openCurrentLocationPanel() {
    topstarAudio.playClick();
    setShopPanelOpen(false);
    setPendingLocationId(null);
    set((s) => (s ? updateSelectedView(s, "training") : s));
    setLocationPanelOpen((open) => !open);
  }

  function requestMoveToLocation(locationId: string) {
    topstarAudio.playClick();
    setShopPanelOpen(false);
    setLocationPanelOpen(false);
    set((s) => (s ? updateSelectedView(s, "training") : s));
    setPendingLocationId(locationId);
  }

  function confirmMoveToLocation(locationId: string) {
    topstarAudio.playClick();
    setPendingLocationId(null);
    setLocationPanelOpen(true);
    set((s) => moveToLocation(s, locationId));
  }

  /** 有强制主线时锁定剧情层，完成后自动消失 */
  const storyBlocking = Boolean(activeStory);
  const gameOverEndingId = state.gameOverEndingId;
  const pendingAchievementId = state.pendingAchievementIds[0];
  const pendingAchievement = pendingAchievementId
    ? topstarData.endings.find((ending) => ending.id === pendingAchievementId)
    : undefined;
  const showNewPlayerGuide = Boolean(
    state.newPlayerGuidePending &&
      !state.storyFeedback &&
      !state.routineFeedback &&
      !state.turnSummary &&
      !gameOverEndingId
  );
  const showAchievementCard = Boolean(
    pendingAchievement &&
      !state.storyFeedback &&
      !state.routineFeedback &&
      !state.turnSummary
  );
  const uiBlocked =
    storyBlocking ||
    Boolean(gameOverEndingId) ||
    showNewPlayerGuide ||
    showAchievementCard;
  const gameOverEnding = gameOverEndingId
    ? topstarData.endings.find((e) => e.id === gameOverEndingId)
    : undefined;
  const achievementCategoryLabel =
    pendingAchievement?.category === "official"
      ? "官方结局"
      : pendingAchievement?.category === "hidden"
        ? "隐藏结局"
        : pendingAchievement?.category === "failure"
          ? "遗憾结局"
          : "支线结局";

  return (
    <div
      className="relative mx-auto flex min-h-dvh max-w-md flex-col overflow-hidden text-base text-[#333333] shadow-inner"
    >
      {/* 统一全幅背景（整页视觉底层） */}
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${stageBackgroundUrl})` }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/30 via-black/10 to-black/25"
        aria-hidden
      />

      {/* 顶栏：通栏贴边，实心底 + 字色保证可读（非卡片，无左右上缝隙） */}
      <header
        className="relative z-30 flex w-full shrink-0 items-center justify-between gap-2 border-b border-[#B88A4B]/70 bg-[#150912]/95 px-3 py-2.5 shadow-[0_5px_18px_rgba(0,0,0,0.26)] backdrop-blur-sm"
      >
        <div className="min-w-0 pr-1">
          <p className="truncate text-xs font-semibold tracking-wide text-[#F7DFC0]">
            回合 {state.currentTurn} · {turnEntry?.dateLabel ?? ""}
          </p>
          <p className="mt-0.5 text-[11px] font-medium text-[#CDB6C2]">
            体力{" "}
            <span className="font-semibold tabular-nums text-[#E573B7]">
              {state.staminaCurrent}/{state.staminaMax}
            </span>
            <span className="mx-1.5 text-[#8F7483]">
              ·
            </span>
            企划金{" "}
            <span className="font-semibold tabular-nums text-[#E5BE73]">
              {state.coins}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              topstarAudio.playClick();
              setStatsOpen((o) => !o);
            }}
            className="rounded-lg border border-[#C99B52]/75 bg-[#2C0D23] px-2 py-1.5 text-xs font-semibold text-[#F6DEC0] shadow-sm"
          >
            属性
          </button>
          <button
            type="button"
            disabled={uiBlocked}
            title={
              gameOverEndingId
                ? "本局已结束"
                : storyBlocking
                  ? "请先完成本回合主线剧情"
                  : undefined
            }
            onClick={() => {
              if (uiBlocked) return;
              topstarAudio.playClick();
              setLocationPanelOpen(false);
              setPendingLocationId(null);
              setShopPanelOpen((o) => !o);
            }}
            className={`rounded-lg border px-2 py-1.5 text-xs font-semibold shadow-sm ${
              uiBlocked
                ? "cursor-not-allowed border-[#7F6544]/55 bg-[#24131F]/90 text-[#8F7A70]"
                : shopPanelOpen
                  ? "border-[#E1B96F] bg-[#8A175F] text-white"
                  : "border-[#C99B52]/75 bg-[#2C0D23] text-[#F6DEC0]"
            }`}
          >
            商店
          </button>
          <button
            type="button"
            disabled={uiBlocked}
            title={
              gameOverEndingId
                ? "本局已结束"
                : storyBlocking
                  ? "请先完成本回合主线剧情"
                  : undefined
            }
            onClick={() => {
              if (uiBlocked) return;
              topstarAudio.playClick();
              set((s) => {
                if (!s) return s;
                if (s.selectedView === "codex") {
                  return updateSelectedView(s, "training");
                }
                return updateSelectedView(s, "codex");
              });
              setLocationPanelOpen(false);
              setPendingLocationId(null);
              setShopPanelOpen(false);
            }}
            className={`rounded-lg border px-2 py-1.5 text-xs font-semibold shadow-sm ${
              uiBlocked
                ? "cursor-not-allowed border-[#7F6544]/55 bg-[#24131F]/90 text-[#8F7A70]"
                : state.selectedView === "codex"
                  ? "border-[#6B0F52] bg-[#8A1874] text-white"
                  : "border-[#C99B52]/75 bg-[#2C0D23] text-[#F6DEC0]"
            }`}
          >
            图鉴
          </button>
          <button
            type="button"
            onClick={() => {
              topstarAudio.playClick();
              setSettingsPageOpen(true);
            }}
            className="rounded-lg border border-[#C99B52]/75 bg-[#2C0D23] px-2 py-1.5 text-xs font-semibold text-[#F6DEC0]"
            aria-label="设置"
          >
            ⚙
          </button>
        </div>
      </header>

      {/* 舞台层：统一背景已在底层；自由探索显示地图地点，剧情时显示立绘 */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        {storyBlocking ? (
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 z-[5] flex w-[70%] items-end justify-center bg-transparent pb-[12dvh]">
            <img
              src={portraitUrl}
              alt="EVE 立绘"
              className="max-h-full w-full max-w-full -translate-y-[2dvh] object-contain object-bottom"
            />
          </div>
        ) : null}

        {!uiBlocked && state.selectedView !== "codex" && currentMap ? (
          <div className="absolute inset-0 z-[12]">
            <TopstarMapBoard
              map={currentMap}
              backgroundUrl={stageBackgroundUrl}
              currentLocationId={state.currentLocationId}
              pendingLocationId={pendingLocationId}
              unlockedLocationIds={unlockedLocationIds}
              actionableLocationIds={actionableLocationIds}
              onSelectLocation={(locationId) => {
                if (locationId === state.currentLocationId) {
                  openCurrentLocationPanel();
                  return;
                }
                requestMoveToLocation(locationId);
              }}
            />
          </div>
        ) : null}

        {pendingLocationId && !uiBlocked && state.selectedView !== "codex" ? (
          <div
            className="absolute inset-0 z-[22] flex items-end bg-black/55 backdrop-blur-[2px]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="topstar-move-title"
          >
            <button
              type="button"
              className="absolute inset-0 cursor-default"
              aria-label="取消前往"
              onClick={() => setPendingLocationId(null)}
            />
            <div className="relative z-10 w-full overflow-hidden rounded-t-[1.75rem] border border-b-0 border-[#D3A55D]/65 bg-[#1D0A18] px-4 pb-4 pt-2 text-[#F4E3D6] shadow-[0_-18px_42px_rgba(0,0,0,0.48),inset_0_0_28px_rgba(122,15,92,0.18)]">
              {(() => {
                const pending = unlockedLocations.find(
                  (location) => location.id === pendingLocationId
                );
                if (!pending) return null;
                return (
                  <>
                    <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#9A6E86]" aria-hidden />
                    <div className="flex items-start gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#D3A55D]/45 bg-[#7A0F5C]/55 text-lg text-[#F2CB79]">
                        ↗
                      </div>
                      <div className="min-w-0">
                        <p
                          id="topstar-move-title"
                          className="font-display text-base font-semibold text-[#F2D3A0]"
                        >
                          前往 {pending.name}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-[#CDB7C3]">
                          {pending.description}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 rounded-xl border border-[#D3A55D]/15 bg-white/[0.05] px-3 py-2 text-[11px] text-[#D3BFC9]">
                      地点移动不消耗体力，抵达后可查看这里的养成事项。
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPendingLocationId(null)}
                        className="min-h-11 rounded-xl border border-[#B88A4B]/55 bg-white/[0.04] py-2 text-sm font-medium text-[#E4CFD9]"
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        onClick={() => confirmMoveToLocation(pending.id)}
                        className="min-h-11 rounded-xl border border-[#E0B667] bg-[linear-gradient(135deg,#6B0D49,#A51B71)] py-2 text-sm font-medium text-white shadow-[0_5px_16px_rgba(142,18,94,0.36)]"
                      >
                        确认前往
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        ) : null}

        {/* 强制剧情：有 activeStory 时自动出现，完成后消失；无剧情时不渲染 */}
        {storyBlocking ? (
          <>
            <button
              type="button"
              onClick={handleDialogueTap}
              className="absolute inset-0 z-[8] cursor-default bg-transparent"
              aria-label="点击继续对话"
            />
            <div className="relative z-20 flex min-h-0 flex-1 flex-col pointer-events-none">
              <div className="mt-auto w-full pointer-events-auto px-2 pb-2">
                <div className="rounded-2xl border border-[#B88A4B]/75 bg-[#1D0A18]/95 px-3 py-3.5 shadow-[0_8px_28px_rgba(0,0,0,0.52)] backdrop-blur-md ring-1 ring-black/60">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#F2D3A0] [text-shadow:0_1px_2px_rgba(0,0,0,0.9)]">
                    {activeStory!.title}
                  </p>
                  <p className="text-[15px] leading-relaxed tracking-wide [text-shadow:0_2px_6px_rgba(0,0,0,0.95),0_0_1px_rgba(0,0,0,0.9)]">
                    {(() => {
                      const line = activeStory!.dialogue[state.lineIndex];
                      if (!line) return null;
                      const raw = substStoryText(line.text, state);
                      if (line.speaker === "narrator") {
                        return <span className="text-[#FFFDF9]">【旁白】{raw}</span>;
                      }
                      if (line.speaker === "eve") {
                        return (
                          <span className="font-semibold text-[#FFC8EF]">
                            【EVE】{raw}
                          </span>
                        );
                      }
                      return (
                        <span className="text-[#FFF9F5]">
                          【{line.speakerName ?? "NPC"}】{raw}
                        </span>
                      );
                    })()}
                  </p>
                  {!showChoices && state.lineIndex < lastLineIndex ? (
                    <p className="mt-3 text-center text-xs font-medium text-[#EDE4E8] [text-shadow:0_1px_4px_rgba(0,0,0,0.95)]">
                      点击空白处继续
                    </p>
                  ) : null}
                  {showChoices ? (
                    <>
                      {activeStory!.id === "story_turn_114_chunwan" ? (
                        <label
                          htmlFor="topstar-chunwan-song"
                          className="mt-3 block rounded-xl border border-[#D3A55D]/45 bg-[#310D26]/85 px-3 py-3"
                        >
                          <span className="text-[11px] font-semibold tracking-wide text-[#E7C47D]">
                            春晚演唱曲目
                          </span>
                          <input
                            id="topstar-chunwan-song"
                            type="text"
                            value={state.chunwanSongTitle ?? ""}
                            maxLength={32}
                            placeholder="输入歌曲名，不需要填写书名号"
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) =>
                              set((current) =>
                                updateChunwanSongTitle(current, e.target.value)
                              )
                            }
                            className="mt-2 w-full rounded-lg border border-[#B88A4B]/55 bg-[#130810]/90 px-3 py-2.5 text-sm text-[#FFF2E4] outline-none placeholder:text-[#806C76] focus:border-[#E1B96F]"
                          />
                          <span className="mt-1.5 block text-[10px] leading-relaxed text-[#BDA7B3]">
                            {normalizeChunwanSongTitle(state.chunwanSongTitle)
                              ? `回函将写为：${formatChunwanSongTitle(state.chunwanSongTitle)}`
                              : "填写后才能接受邀约；婉拒不受影响。"}
                          </span>
                        </label>
                      ) : null}
                      <div className="mt-3 space-y-2">
                        {activeStory!.choices!.map((c) => {
                          const need = c.staminaCost ?? 0;
                          const missingChunwanSong =
                            c.id === "choice_turn114_accept" &&
                            !normalizeChunwanSongTitle(state.chunwanSongTitle);
                          const disabled =
                            need > state.staminaCurrent || missingChunwanSong;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              disabled={disabled}
                              title={
                                missingChunwanSong
                                  ? "请先填写春晚演唱曲目"
                                  : undefined
                              }
                              onClick={(e) => {
                                e.stopPropagation();
                                handleChoice(c);
                              }}
                              className="w-full rounded-xl border border-[#D3A55D]/55 bg-[#8A1874] px-3 py-3 text-left text-sm font-medium text-white disabled:border-[#705A45]/45 disabled:bg-[#2A1725] disabled:text-[#8F7A70]"
                            >
                              {substStoryText(c.label, state)}
                              {need > 0 ? (
                                <span className="ml-2 text-xs opacity-90">
                                  体力 {need}
                                </span>
                              ) : null}
                              {missingChunwanSong ? (
                                <span className="mt-1 block text-[10px]">
                                  请先填写歌名
                                </span>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  ) : null}
                  {atLastLine && !showChoices ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        topstarAudio.playClick();
                        topstarAudio.playUnlock();
                        set((s) => completeStoryWithoutChoice(s));
                      }}
                      className="mt-3 w-full rounded-xl border border-[#D3A55D]/65 bg-[#8A1874] py-3 text-sm font-medium text-white"
                    >
                      继续
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </>
        ) : null}

        {/* 当前地点事项：点击当前地点后展开 */}
        {locationPanelOpen && !uiBlocked && state.selectedView !== "codex" && currentLocation ? (
          <div
            className="absolute inset-0 z-20 flex items-end bg-black/55 backdrop-blur-[2px]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="topstar-location-title"
          >
            <button
              type="button"
              className="absolute inset-0 cursor-default"
              aria-label="收起地点事项"
              onClick={() => setLocationPanelOpen(false)}
            />
            <div className="relative z-10 flex max-h-[68%] w-full flex-col overflow-hidden rounded-t-[1.75rem] border border-b-0 border-[#D3A55D]/65 bg-[#1D0A18] text-[#F4E3D6] shadow-[0_-18px_42px_rgba(0,0,0,0.48),inset_0_0_28px_rgba(122,15,92,0.18)]">
              <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-[#9A6E86]" aria-hidden />
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#D3A55D]/20 px-4 pb-3 pt-2">
                <div className="min-w-0">
                  <p
                    id="topstar-location-title"
                    className="font-display truncate text-sm font-semibold text-[#F2D3A0]"
                  >
                    {currentLocation.name} · 可进行事项
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-[#CDB7C3]">
                    {currentLocation.description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setLocationPanelOpen(false)}
                  className="min-h-10 shrink-0 rounded-xl border border-[#B88A4B]/55 bg-white/[0.04] px-3 py-2 text-xs font-medium text-[#E4CFD9]"
                >
                  收起
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-3">
                <div className="mb-3 grid grid-cols-3 gap-2 rounded-2xl border border-[#D3A55D]/15 bg-white/[0.05] p-1">
                  {(["light", "medium", "heavy"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTrainingTier(t)}
                      aria-pressed={trainingTier === t}
                      className={`min-h-10 rounded-xl py-2 text-xs font-medium transition ${
                        trainingTier === t
                          ? "border border-[#D3A55D]/60 bg-[#84145A] text-white shadow-sm"
                          : "text-[#D7C3CD]"
                      }`}
                    >
                      {tierLabel[t]}
                    </button>
                  ))}
                </div>
                <ul className="space-y-2">
                  {routineByTier[trainingTier].map((ev) => {
                    const coinIncome = getRoutineCoinIncome(ev);
                    return (
                      <li key={ev.id}>
                        <button
                          type="button"
                          onClick={() => {
                            topstarAudio.playClick();
                            setLocationPanelOpen(false);
                            set((s) => playRoutineEvent(s, ev.id));
                          }}
                          className="min-h-11 w-full rounded-2xl border border-[#D3A55D]/25 bg-white/[0.055] p-3 text-left text-sm shadow-[0_5px_14px_rgba(0,0,0,0.16)] transition active:scale-[0.99]"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1 font-medium leading-snug text-[#F3DFD1]">
                              {ev.title}
                            </div>
                            <div className="shrink-0 whitespace-nowrap rounded-full border border-[#D3A55D]/20 bg-[#7A0F5C]/35 px-2 py-1 text-[10px] font-medium leading-none text-[#F0C977]">
                              体力 {ev.staminaCost}
                              {(ev.goldCost ?? 0) > 0
                                ? ` · 企划金 -${ev.goldCost}`
                                : coinIncome > 0
                                  ? ` · 企划金 +${coinIncome}`
                                  : null}
                              {(ev.cooldownTurns ?? 1) > 1
                                ? ` · ${ev.cooldownTurns}回合1次`
                                : null}
                            </div>
                          </div>
                          <div className="mt-1 text-[11px] leading-relaxed text-[#C8B2BE]">
                            {ev.description}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {routineByTier[trainingTier].length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-[#D3A55D]/30 bg-white/[0.04] px-4 py-6 text-center text-xs leading-relaxed text-[#BDA7B3]">
                    {currentLocation.shortLabel} 当前暂无此类事项（体力或企划金不足、收入项目尚在冷却、本回合付费企划已用过，或已达次数上限）
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {/* 企划商店：卡片尺寸与图鉴一致（按内容高度 + 区域滚动），双列仅排版不分摊行高 */}
        {shopPanelOpen && !uiBlocked ? (
          <div className="absolute inset-0 z-20 flex items-stretch justify-center p-2 sm:p-3 pointer-events-none">
            <div className="pointer-events-auto flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/20 bg-[#F8F5F2]/95 text-sm shadow-xl backdrop-blur-md">
              <div className="shrink-0 border-b border-[#E5E5E5] px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-display text-sm font-semibold text-[#8A1874]">企划商店</p>
                  <button
                    type="button"
                    onClick={() => setShopPanelOpen(false)}
                    className="rounded-md px-2 py-0.5 text-xs text-[#666] hover:bg-[#E5E5E5]/80"
                  >
                    收起
                  </button>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                <ul className="grid grid-cols-2 gap-2">
                  {[...topstarData.shopItems]
                    .sort(
                      (left, right) =>
                        left.unlockTurn - right.unlockTurn ||
                        left.price - right.price
                    )
                    .map((item) => {
                    const unlocked = item.unlockTurn <= state.currentTurn;
                    const canBuy = canPurchaseShopItem(state, item.id);
                    const limitHint =
                      item.limit === "once"
                        ? "限购一次"
                        : item.limit === "perTurn"
                          ? "每回合 1 次"
                          : "每三回合 1 次";
                    const lockHint = !unlocked ? `第${item.unlockTurn}回合起` : "";
                    return (
                      <li
                        key={item.id}
                        className="flex flex-col rounded-lg border border-[#E5E5E5] bg-white p-2 text-left"
                      >
                        <div className="flex min-w-0 items-start justify-between gap-1">
                          <span className="min-w-0 truncate font-medium text-[#333]">{item.name}</span>
                          <span className="shrink-0 font-semibold tabular-nums text-[#7A0F5C]">
                            {item.price}
                            <span className="ml-px font-medium opacity-90">金</span>
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-3 text-xs leading-snug text-[#666]">
                          {item.description}
                        </p>
                        <p className="mt-2 truncate text-xs leading-tight text-[#999]">
                          {limitHint}
                          {lockHint ? <span className="text-[#C45A2A]"> · {lockHint}</span> : null}
                        </p>
                        <button
                          type="button"
                          disabled={!unlocked || !canBuy}
                          onClick={() => {
                            if (!canBuy || !unlocked) return;
                            topstarAudio.playClick();
                            setShopPanelOpen(false);
                            set((s) => purchaseShopItem(s, item.id));
                          }}
                          className="mt-2 w-full rounded-md bg-[#8A1874] py-1.5 text-xs font-medium leading-none text-white disabled:bg-[#E5E5E5] disabled:text-[#999]"
                        >
                          {unlocked ? (canBuy ? "购买" : "不可购") : "未解锁"}
                        </button>
                      </li>
                    );
                    })}
                </ul>
              </div>
            </div>
          </div>
        ) : null}

        {/* 图鉴：无强制剧情时才能打开（与顶栏一致，此处仅渲染面板） */}
        {state.selectedView === "codex" && !uiBlocked ? (
          <div className="absolute inset-0 z-20 flex items-stretch justify-center p-2 sm:p-3 pointer-events-none">
            <div className="pointer-events-auto flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/20 bg-[#F8F5F2]/95 text-sm shadow-xl backdrop-blur-md">
              <div className="shrink-0 border-b border-[#E5E5E5] px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-display text-sm font-semibold text-[#8A1874]">图鉴</p>
                  <button
                    type="button"
                    onClick={() => {
                      topstarAudio.playClick();
                      set((s) => updateSelectedView(s, "training"));
                    }}
                    className="rounded-md px-2 py-0.5 text-xs text-[#666] hover:bg-[#E5E5E5]/80"
                  >
                    收起
                  </button>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="font-semibold text-[#8A1874]">剧情节点</p>
                  <span className="text-[10px] text-[#999]">
                    已解锁 {getCodexEntries(state).length}
                  </span>
                </div>
                <ul className="grid grid-cols-2 gap-2">
                  {getCodexEntries(state).map((ev) => (
                    <li
                      key={ev.id}
                      className="rounded-lg border border-[#E5E5E5] bg-white p-2 text-left"
                    >
                      <div className="line-clamp-2 font-medium leading-snug text-[#333]">
                        {ev.title}
                      </div>
                      <div className="mt-1 line-clamp-3 text-xs leading-snug text-[#666]">
                        {substStoryText(ev.summary, state)}
                      </div>
                    </li>
                  ))}
                </ul>
                {getCodexEntries(state).length === 0 ? (
                  <p className="rounded-lg border border-dashed border-[#D8D0CB] bg-white/60 px-3 py-5 text-center text-xs text-[#999]">
                    暂无可展示条目
                  </p>
                ) : null}
                <div className="mb-2 mt-5 flex items-center justify-between gap-2">
                  <p className="font-semibold text-[#8A1874]">结局</p>
                  <span className="text-[10px] text-[#999]">
                    已解锁 {getUnlockedEndings(state).length}/{getEndingProgress(state).length}
                  </span>
                </div>
                <ul className="grid grid-cols-2 gap-2">
                  {getEndingProgress(state).map((e) => {
                    const unlocked = getUnlockedEndings(state).some((u) => u.id === e.id);
                    const tag =
                      e.category === "failure"
                        ? "遗憾终局"
                        : e.category === "hidden"
                          ? "隐藏"
                          : e.category === "branch"
                            ? "支线"
                            : "官方";
                    return (
                      <li
                        key={e.id}
                        className={`rounded-lg border p-2 text-left ${
                          unlocked
                            ? "border-[#D5AE70]/70 bg-[#FFFBF0]"
                            : "border-[#E5E5E5] bg-white/60 opacity-70"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="line-clamp-2 min-w-0 font-medium leading-snug text-[#333]">
                            {e.title}
                          </span>
                          <span className="shrink-0 rounded bg-[#8A1874]/10 px-1.5 py-0.5 text-[10px] text-[#8A1874]">
                            {tag}
                          </span>
                        </div>
                        <div className="mt-1 line-clamp-3 text-xs leading-snug text-[#666]">
                          {e.description}
                        </div>
                        <div className="mt-2 text-[10px] leading-tight text-[#999]">
                          {unlocked ? "已达成条件" : "未解锁"}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* 底部：结束回合（地点直接在背景上操作） */}
      <footer
        className="sticky bottom-0 z-30 border-t border-[#B88A4B]/55 bg-[#150912]/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-sm"
      >
        <div className="grid grid-cols-1 gap-1">
          <button
            type="button"
            disabled={!canEndTurn(state)}
            onClick={handleEndTurn}
            title={!canEndTurn(state) ? "请先完成本回合主线剧情" : ""}
            className={`min-h-[2.75rem] rounded-lg px-1 py-2 text-center text-[11px] font-semibold leading-tight transition active:scale-[0.99] sm:text-xs ${
              canEndTurn(state)
                ? "border border-[#D3A55D]/75 bg-[linear-gradient(135deg,#6B0D49,#A51B71)] text-white shadow-[0_6px_18px_rgba(142,18,94,0.34)]"
                : "cursor-not-allowed border border-[#7F6544]/45 bg-[#2A1423]/95 text-[#8F7A70]"
            }`}
          >
            {gameOverEndingId
              ? "本局已结束"
              : state.currentTurn >= 144
                ? "已至终章回合"
                : "结束回合"}
          </button>
        </div>
      </footer>

      {/* 属性：覆盖在主画面上方，不占顶栏流式高度 */}
      {statsOpen ? (
        <div
          className="fixed inset-0 z-40 flex items-start justify-center bg-black/40 px-3 pt-[4.5rem] pb-8 backdrop-blur-[2px]"
          role="presentation"
          onClick={() => setStatsOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[#E5E5E5] bg-[#FDFCFA] p-4 shadow-xl"
            role="dialog"
            aria-labelledby="topstar-stats-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <p id="topstar-stats-title" className="font-semibold text-[#8A1874]">
                EVE 属性
              </p>
              <button
                type="button"
                onClick={() => setStatsOpen(false)}
                className="rounded-lg px-2 py-1 text-xs text-[#666]"
              >
                关闭
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {(Object.keys(statLabelMap) as (keyof typeof statLabelMap)[]).map((key) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-2 rounded-xl bg-[#F0EBE6]/80 px-3 py-2"
                >
                  <span className="text-[#666]">{statLabelMap[key]}</span>
                  <span className="shrink-0 font-semibold tabular-nums text-[#8A1874]">
                    {state.stats[key]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* 设置：悬浮在当前层之上（半透明遮罩 + 卡片） */}
      {settingsPageOpen ? (
        <div
          className="absolute inset-0 z-50 flex flex-col justify-end bg-black/45 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-[2px] sm:justify-center sm:p-4"
          role="presentation"
          onClick={() => setSettingsPageOpen(false)}
        >
          <div
            className="mx-auto flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/20 bg-[#F8F5F2] text-[#333333] shadow-2xl"
            role="dialog"
            aria-labelledby="topstar-settings-title"
            onClick={(e) => e.stopPropagation()}
          >
          <header className="flex shrink-0 items-center gap-3 border-b border-[#E5E5E5] px-3 py-3">
            <button
              type="button"
              onClick={() => setSettingsPageOpen(false)}
              className="rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm text-[#333]"
            >
              返回
            </button>
            <h2 id="topstar-settings-title" className="font-display text-lg font-semibold text-[#8A1874]">
              游戏设置
            </h2>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 text-xs space-y-4">
            <label className="block">
              <span className="text-[#555]">企划合伙人昵称（NPC 称呼用）</span>
              <input
                className="mt-1 w-full rounded-lg border border-[#E5E5E5] px-2 py-2"
                value={state.playerName}
                onChange={(e) => set((s) => updatePlayerName(s, e.target.value))}
                maxLength={20}
              />
            </label>
            <label className="flex items-start gap-2 rounded-xl border border-[#E5E5E5] bg-white/75 px-3 py-3">
              <input
                className="mt-0.5"
                type="checkbox"
                checked={state.settings.turnGuidanceOn !== false}
                onChange={(e) => {
                  const enabled = e.target.checked;
                  set((s) => updateSettings(s, { turnGuidanceOn: enabled }));
                  if (!enabled) setTurnGuidance(null);
                }}
              />
              <span>
                <span className="block font-medium text-[#444]">新回合企划提示</span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-[#777]">
                  无剧情月份在月度交接后提示一次，关闭卡片后不再常驻。
                </span>
              </span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={state.settings.bgmOn !== false}
                onChange={(e) => set((s) => updateSettings(s, { bgmOn: e.target.checked }))}
              />
              背景音乐（按章节切换）
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={state.settings.sfxOn !== false}
                onChange={(e) => set((s) => updateSettings(s, { sfxOn: e.target.checked }))}
              />
              音效（点击、提示等）
            </label>
            <div className="space-y-1 rounded-xl border border-[#E5E5E5] bg-white/80 px-3 py-3">
              <label className="block">
                <div className="flex items-center justify-between gap-2 text-[#555]">
                  <span>音乐音量</span>
                  <span className="tabular-nums text-[#8A1874]">
                    {Math.round((state.settings.bgmVolume ?? 0.75) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round((state.settings.bgmVolume ?? 0.75) * 100)}
                  onChange={(e) =>
                    set((s) =>
                      updateSettings(s, { bgmVolume: Math.min(1, Math.max(0, Number(e.target.value) / 100)) })
                    )
                  }
                  className="mt-2 w-full accent-[#8A1874]"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round((state.settings.bgmVolume ?? 0.75) * 100)}
                  aria-label="背景音乐音量"
                />
              </label>
              <label className="mt-3 block">
                <div className="flex items-center justify-between gap-2 text-[#555]">
                  <span>音效音量</span>
                  <span className="tabular-nums text-[#8A1874]">
                    {Math.round((state.settings.sfxVolume ?? 0.85) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round((state.settings.sfxVolume ?? 0.85) * 100)}
                  onChange={(e) =>
                    set((s) =>
                      updateSettings(s, { sfxVolume: Math.min(1, Math.max(0, Number(e.target.value) / 100)) })
                    )
                  }
                  className="mt-2 w-full accent-[#8A1874]"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round((state.settings.sfxVolume ?? 0.85) * 100)}
                  aria-label="音效音量"
                />
              </label>
            </div>
            <div className="border-t border-[#E5E5E5] pt-4">
              <p className="mb-2 font-semibold text-[#8A1874]">存档</p>
              <p className="mb-3 text-[11px] leading-relaxed text-[#666]">
                进度会自动保存到本机浏览器；手动存档位便于在关键抉择前备份。清除站点数据会丢失存档。
              </p>
              {(["slot1", "slot2", "slot3"] as SaveSlotId[]).map((slot) => {
                const file = loadManualSlot(slot);
                return (
                  <div
                    key={slot}
                    className="mb-3 rounded-xl border border-[#E5E5E5] bg-white p-3 last:mb-0"
                  >
                    <div className="font-medium text-[#333]">存档位 {slot.slice(-1)}</div>
                    <div className="mt-1 text-[11px] text-[#666]">
                      {file ? `${file.savedAt} · 回合 ${file.state.currentTurn}` : "空"}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => saveManualSlot(slot, state)}
                        className="rounded-lg bg-[#8A1874] px-3 py-2 text-xs text-white"
                      >
                        存档
                      </button>
                      <button
                        type="button"
                        disabled={!file}
                        onClick={() => {
                          if (!file) return;
                          setTurnGuidance(null);
                          setLocationPanelOpen(false);
                          setPendingLocationId(null);
                          setState(hydrateState(file.state));
                        }}
                        className="rounded-lg border border-[#8A1874] px-3 py-2 text-xs text-[#8A1874] disabled:opacity-40"
                      >
                        读档
                      </button>
                      <button
                        type="button"
                        onClick={() => clearManualSlot(slot)}
                        className="rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs"
                      >
                        清除
                      </button>
                    </div>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  if (!confirm("确定要重置进度吗？将清除自动存档。")) return;
                  const fresh = hydrateState(createInitialGameState());
                  setTurnGuidance(null);
                  setLocationPanelOpen(false);
                  setPendingLocationId(null);
                  setState(fresh);
                  saveAutosave(fresh);
                }}
                className="mt-2 w-full rounded-xl border border-red-300 py-2 text-sm text-red-700"
              >
                重置游戏进度
              </button>
            </div>
          </div>
          </div>
        </div>
      ) : null}

      {/* 养成事件结果：剧情框样式（非回合结算） */}
      {state.routineFeedback ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[55] mx-auto flex max-w-md justify-center px-2 pb-[calc(3.75rem+env(safe-area-inset-bottom))] pt-8">
          <div
            className="pointer-events-auto w-full rounded-2xl border border-white/30 bg-[#18141a] px-3 py-4 shadow-xl backdrop-blur-md ring-1 ring-black/50"
            role="dialog"
            aria-labelledby="routine-feedback-title"
          >
            <p
              id="routine-feedback-title"
              className="font-display text-sm font-semibold text-[#F0C8E8]"
            >
              {state.routineFeedback.title}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[#F0E8E4] [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">
              {substName(state.routineFeedback.narrative, state.playerName)}
            </p>
            <p className="mt-4 text-[10px] font-medium uppercase tracking-wide text-[#A8989C]">
              状态与数值小结
            </p>
            <ul className="mt-2 space-y-1.5 text-xs text-[#EDCFE0]">
              {state.routineFeedback.appliedEffects.map((line, i) => (
                <li key={i} className="flex gap-2 [text-shadow:0_1px_2px_rgba(0,0,0,0.85)]">
                  <span className="text-[#8A787C]">·</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={dismissRoutinePanel}
              className="mt-4 w-full rounded-xl bg-[#8A1874] py-3 text-sm font-medium text-white"
            >
              知道了
            </button>
          </div>
        </div>
      ) : null}

      {/* 主线选项 / 无选项继续后的摘要 */}
      {state.storyFeedback ? (
        <div className="fixed inset-0 z-[58] flex items-end justify-center bg-black/35 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-[#E5E5E5] bg-[#F8F5F2] p-5 shadow-xl">
            <p className="font-display text-sm font-semibold text-[#8A1874]">
              {withoutTurnPrefix(state.storyFeedback.title)}
            </p>
            {state.storyFeedback.transition ? (
              <p className="mt-2 text-[11px] leading-relaxed text-[#666]">
                {substStoryText(state.storyFeedback.transition, state)}
              </p>
            ) : null}
            <ul className="mt-3 max-h-48 overflow-y-auto text-xs leading-relaxed text-[#333]">
              {state.storyFeedback.appliedEffects.map((line, i) => (
                <li key={i}>· {substStoryText(line, state)}</li>
              ))}
            </ul>
            <button
              type="button"
              onClick={dismissStoryPanel}
              className="mt-4 w-full rounded-xl bg-[#8A1874] py-3 text-sm font-medium text-white"
            >
              确认
            </button>
          </div>
        </div>
      ) : null}

      {/* 回合结算：仅结束回合后 */}
      {state.turnSummary ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl bg-[#F8F5F2] p-5 shadow-xl">
            <ul className="max-h-40 space-y-1 overflow-y-auto text-xs leading-relaxed text-[#333]">
              {state.turnSummary.appliedEffects.map((line, i) => (
                <li key={i}>· {line}</li>
              ))}
            </ul>
            <button
              type="button"
              onClick={dismissTurnPanel}
              className="mt-4 w-full rounded-xl bg-[#8A1874] py-3 text-sm font-medium text-white"
            >
              确认
            </button>
          </div>
        </div>
      ) : null}

      {turnGuidance && !state.turnSummary && !activeStory ? (
        <div className="fixed inset-0 z-[61] flex items-end justify-center bg-black/50 p-3 sm:items-center sm:p-4">
          <div
            className="w-full max-w-md overflow-hidden rounded-[1.35rem] border border-[#C99B52]/70 bg-[#1B0A16] text-[#F8ECDF] shadow-[0_24px_70px_rgba(15,3,12,0.58)]"
            role="dialog"
            aria-label="月度企划便笺"
          >
            <div className="border-b border-[#B88A4B]/35 bg-gradient-to-r from-[#371028] to-[#210A1A] px-5 py-3.5">
              <p className="text-[10px] font-semibold tracking-[0.2em] text-[#D9B471]">
                {turnGuidance.dateLabel} · 企划便笺
              </p>
            </div>

            <div className="px-5 py-4">
              <p className="text-sm leading-relaxed text-[#E6D6DC]">
                {turnGuidance.goal}
              </p>

              {turnGuidance.recommendations.length > 0 ? (
                <div className="mt-4 space-y-2.5">
                  {turnGuidance.recommendations
                    .slice(0, turnGuidance.mode === "full" ? 2 : 1)
                    .map((recommendation, index) => (
                      <div
                        key={recommendation.eventId}
                        className={`rounded-xl border px-3.5 py-3 ${
                          index === 0
                            ? "border-[#D6A84F]/75 bg-[#45112F]/80"
                            : "border-white/10 bg-white/[0.045]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[10px] font-medium tracking-wide text-[#D9B471]">
                              {index === 0 ? "首选安排" : "备选安排"} · {recommendation.locationName}
                            </p>
                            <p className="mt-1 text-sm font-semibold leading-snug text-[#FFF2E4]">
                              {recommendation.title}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full border border-[#D6A84F]/45 bg-[#2A0C20] px-2 py-1 text-[9px] text-[#E8C57E]">
                            {tierLabel[recommendation.tier]}
                          </span>
                        </div>
                        <p className="mt-2 text-[11px] leading-relaxed text-[#CDBCC3]">
                          {recommendation.reason}
                        </p>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.045] px-3 py-3 text-xs text-[#CDBCC3]">
                  当前没有合适的可安排事项，可以先查看属性与图鉴，再自由结束本月。
                </p>
              )}

              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setTurnGuidance(null)}
                  className="rounded-xl border border-[#C99B52]/55 bg-transparent py-3 text-sm font-medium text-[#E9CFB1]"
                >
                  自由安排
                </button>
                {turnGuidance.recommendations[0] ? (
                  <button
                    type="button"
                    onClick={() =>
                      openGuidanceRecommendation(turnGuidance.recommendations[0])
                    }
                    className="rounded-xl border border-[#E1B96F] bg-[#8A175F] py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(138,23,95,0.35)]"
                  >
                    前往{turnGuidance.recommendations[0].locationName}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setTurnGuidance(null)}
                    className="rounded-xl border border-[#E1B96F] bg-[#8A175F] py-3 text-sm font-semibold text-white"
                  >
                    我知道了
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showNewPlayerGuide ? (
        <div className="fixed inset-0 z-[62] flex items-end justify-center bg-[#090307]/65 p-3 backdrop-blur-[3px] sm:items-center sm:p-4">
          <div
            className="w-full max-w-md overflow-hidden rounded-[1.4rem] border border-[#D3A55D]/70 bg-[#1B0A16] text-[#F8ECDF] shadow-[0_24px_70px_rgba(15,3,12,0.65)]"
            role="dialog"
            aria-labelledby="topstar-new-player-guide-title"
          >
            <div className="border-b border-[#D3A55D]/35 bg-[linear-gradient(135deg,#4A1036,#270B20)] px-5 py-4">
              <p className="text-[10px] font-semibold tracking-[0.24em] text-[#DDB76D]">
                新手引导
              </p>
              <h2
                id="topstar-new-player-guide-title"
                className="mt-1 font-display text-xl font-semibold text-[#FFF0D6]"
              >
                接下来，由你安排这个月
              </h2>
            </div>
            <div className="space-y-3 px-5 py-4 text-sm leading-relaxed text-[#E8D8DF]">
              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#D3A55D]/60 text-xs font-semibold text-[#F2CE8D]">
                  1
                </span>
                <p>
                  点击地图上的地点前往，再点击当前地点查看
                  <span className="font-semibold text-[#FFDFA3]">可进行事项</span>
                  。地点之间移动不消耗体力。
                </p>
              </div>
              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#D3A55D]/60 text-xs font-semibold text-[#F2CE8D]">
                  2
                </span>
                <p>
                  安排事项会消耗体力，并提升属性、联结或赚取企划金；可以按照本月目标自由取舍。
                </p>
              </div>
              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#D3A55D]/60 text-xs font-semibold text-[#F2CE8D]">
                  3
                </span>
                <p>
                  安排完成后点击
                  <span className="font-semibold text-[#FFDFA3]">结束回合</span>
                  ，进入下个月并恢复体力。商店可用企划金购买长期成长物品。
                </p>
              </div>
            </div>
            <div className="px-5 pb-5">
              <button
                type="button"
                onClick={dismissNewPlayerGuidePanel}
                className="w-full rounded-xl border border-[#E1B96F] bg-[linear-gradient(135deg,#82115B,#B51D7B)] py-3 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(138,23,95,0.36)]"
              >
                开始安排本月行程
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showAchievementCard && pendingAchievement ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#090307]/75 p-4 backdrop-blur-[3px] sm:items-center">
          <div
            className="relative w-full max-w-md overflow-hidden rounded-[1.4rem] border border-[#D3A55D]/75 bg-[radial-gradient(circle_at_top,#52113B_0%,#260C20_45%,#160912_100%)] px-5 pb-5 pt-6 text-[#F8ECDF] shadow-[0_28px_90px_rgba(8,1,6,0.72)]"
            role="dialog"
            aria-labelledby="topstar-achievement-title"
            aria-describedby="topstar-achievement-description"
          >
            <div
              className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full border border-[#D3A55D]/20"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rotate-45 border border-[#D3A55D]/15"
              aria-hidden
            />
            <div className="relative">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold tracking-[0.28em] text-[#E6BD72]">
                  成就达成
                </p>
                <span className="rounded-full border border-[#D3A55D]/45 bg-[#D3A55D]/10 px-2.5 py-1 text-[10px] text-[#F0CB89]">
                  {achievementCategoryLabel}
                </span>
              </div>
              <div className="mt-5 flex items-center gap-3">
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#E6BD72]/70 bg-[#8A175F]/55 text-xl text-[#FFE3A8] shadow-[0_0_26px_rgba(230,189,114,0.26)]"
                  aria-hidden
                >
                  ◆
                </span>
                <h2
                  id="topstar-achievement-title"
                  className="font-display text-xl font-semibold leading-snug text-[#FFF0D6]"
                >
                  {pendingAchievement.title}
                </h2>
              </div>
              <p
                id="topstar-achievement-description"
                className="mt-4 text-sm leading-relaxed text-[#E8D5DD]"
              >
                {substName(pendingAchievement.description, state.playerName)}
              </p>
              {state.pendingAchievementIds.length > 1 ? (
                <p className="mt-5 text-center text-[11px] text-[#BFA7B2]">
                  还有 {state.pendingAchievementIds.length - 1} 项成就等待揭晓
                </p>
              ) : null}
              <button
                type="button"
                onClick={dismissAchievementPanel}
                className="mt-4 w-full rounded-xl border border-[#E1B96F] bg-[linear-gradient(135deg,#82115B,#B51D7B)] py-3 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(138,23,95,0.38)]"
              >
                {state.pendingAchievementIds.length > 1
                  ? "查看下一个成就"
                  : gameOverEndingId
                    ? "查看结局"
                    : "收下成就"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {gameOverEndingId && !showAchievementCard ? (
        <div className="fixed inset-0 z-[65] flex items-end justify-center bg-black/55 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-[#5c2848] bg-[#1a1216] p-5 text-[#f2e4ea] shadow-xl">
            <p className="text-[11px] font-medium uppercase tracking-wide text-[#b88aa8]">本局结束</p>
            <p className="mt-2 font-display text-base font-semibold text-[#ffc8e8]">
              {gameOverEnding ? gameOverEnding.title : "遗憾结局"}
            </p>
            <p className="mt-3 max-h-[42vh] overflow-y-auto text-sm leading-relaxed text-[#dcc8d0]">
              {gameOverEnding
                ? substName(gameOverEnding.description, state.playerName)
                : "本局星途在此画上句点。"}
            </p>
            <button
              type="button"
              onClick={() => set(() => dismissGameOverAndRestart())}
              className="mt-5 w-full rounded-xl bg-[#8A1874] py-3 text-sm font-medium text-white"
            >
              重新开始
            </button>
          </div>
        </div>
      ) : null}

      <p
        className="relative z-30 border-t border-[#B88A4B]/35 bg-[#11070E]/95 px-2 py-1 text-center text-[9px] leading-tight text-[#927E89] backdrop-blur-sm"
      >
        《顶流企划：与EVE并肩》粉丝向演示 · 非官方 · 与艺人及工作室无关
      </p>
    </div>
  );
}
