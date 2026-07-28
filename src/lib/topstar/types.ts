export type StatKey =
  | "creativity"
  | "stage"
  | "popularity"
  | "resilience"
  | "bond"
  | "authority"
  | "reputation"
  | "tacit";

/** 养成 / 图鉴；主线剧情由 activeStory 自动控制，不再使用独立「剧情」页 */
export type ViewKey = "training" | "codex";

export type Speaker = "narrator" | "eve" | "npc";

export type ConditionDef = {
  minTurn?: number;
  maxTurn?: number;
  requiredFlags?: string[];
  forbiddenFlags?: string[];
  requiredEvents?: string[];
  requiredCounters?: Record<string, number>;
  minStats?: Partial<Record<StatKey, number>>;
};

export type EffectDef =
  | { type: "stat"; key: StatKey; delta: number }
  | { type: "coin"; delta: number }
  | { type: "flag:set"; key: string }
  | { type: "flag:clear"; key: string }
  | { type: "counter"; key: string; delta: number }
  | { type: "event:complete"; id: string }
  | { type: "event:lock"; id: string }
  | { type: "codex:unlock"; id: string };

export type DialogueLine = {
  id: string;
  speaker: Speaker;
  speakerName?: string;
  text: string;
};

export type ChoiceDef = {
  id: string;
  label: string;
  description?: string;
  staminaCost?: number;
  effects: EffectDef[];
};

export type StoryEventDef = {
  id: string;
  turn: number;
  chapterId: string;
  title: string;
  summary: string;
  /** 未填则使用当前章节默认背景（见 `visuals.ts` → `defaultBackgroundByChapter`） */
  backgroundId?: string;
  /** 可选：本段剧情专用立绘（如舞台麦克风、民乐竹笛）；未填则按章节默认 */
  portraitId?: string;
  codexId: string;
  conditions?: ConditionDef;
  dialogue: DialogueLine[];
  choices?: ChoiceDef[];
};

/** 月间随机轶事：无固定 turn，由 game 在 R1 候选月注入；无选项时用 completionEffects 结算属性 */
export type FillerStoryDef = Omit<StoryEventDef, "turn"> & {
  completionEffects?: EffectDef[];
};

export type RoutineEventDef = {
  id: string;
  title: string;
  /** 每个养成事件只属于一个地点；地点由当前章节地图提供 */
  locationId: string;
  tier: "light" | "medium" | "heavy";
  staminaCost: number;
  /** 企划金消耗（B 类花钱养成）；与体力独立判断 */
  goldCost?: number;
  /** 列表卡片上的简短说明 */
  description: string;
  /** 完成后弹层随机展示其一，减轻重复感（均可用【自定义昵称】） */
  outcomeNarratives: readonly [string, string, string];
  unlockTurn: number;
  /** 跨回合冷却；2 表示完成后隔 1 回合才能再次进行 */
  cooldownTurns?: number;
  maxPerTurn?: number;
  effects: EffectDef[];
};

/** 企划商店 · 礼物 / 大装；限购由程序按 limit 字段处理 */
export type ShopItemLimit = "once" | "perTurn" | "every3Turns";

export type ShopItemDef = {
  id: string;
  name: string;
  price: number;
  description: string;
  effects: EffectDef[];
  unlockTurn: number;
  limit: ShopItemLimit;
};

export type RecurringEventDef = {
  id: string;
  title: string;
  turns: number[];
  type: "mandatory" | "conditional";
  description: string;
};

export type EndingDef = {
  id: string;
  category: "official" | "branch" | "hidden" | "failure";
  title: string;
  description: string;
  conditions: ConditionDef;
};

export type ChapterDef = {
  id: string;
  title: string;
  turnRange: [number, number];
  timeline: string;
  summary: string;
};

export type TopstarLocationDef = {
  id: string;
  chapterId: string;
  name: string;
  shortLabel: string;
  description: string;
  /** 0-100 百分比坐标，用于把地点按钮定位到背景图上方 */
  position: { x: number; y: number };
  conditions?: ConditionDef;
};

export type TopstarMapDef = {
  id: string;
  chapterId: string;
  title: string;
  summary: string;
  defaultLocationId: string;
  locations: TopstarLocationDef[];
};

export type TurnIndexEntry = {
  turn: number;
  id: string;
  chapterId: string;
  dateLabel: string;
  keyEventId?: string;
  recurringEventIds: string[];
};

export type AssetManifest = {
  backgrounds: Record<string, string>;
  portraits: Record<string, string>;
  bgm: Record<string, string>;
  sfx: Record<string, string>;
};

export type TopstarGameData = {
  chapters: ChapterDef[];
  chapterMaps: TopstarMapDef[];
  storyEvents: StoryEventDef[];
  /** 章节池随机轶事（R1 候选月、与主线同月则跳过） */
  fillerStories: FillerStoryDef[];
  routineEvents: RoutineEventDef[];
  shopItems: ShopItemDef[];
  recurringEvents: RecurringEventDef[];
  endings: EndingDef[];
  assets: AssetManifest;
};

export type GameSettings = {
  skipRead: boolean;
  /** 无剧情月份在月度交接后显示一次企划方向提示 */
  turnGuidanceOn: boolean;
  /** 背景音乐（章节 BGM） */
  bgmOn: boolean;
  /** 点击 / 解锁等音效 */
  sfxOn: boolean;
  /** 背景音乐音量 0～1（对应 HTMLAudioElement.volume） */
  bgmVolume: number;
  /** 音效音量 0～1 */
  sfxVolume: number;
};

export type TurnGuidance = {
  mode: "full" | "compact";
  dateLabel: string;
  goal: string;
  recommendations: {
    eventId: string;
    locationId: string;
    locationName: string;
    tier: RoutineEventDef["tier"];
    title: string;
    reason: string;
  }[];
};

export type GameState = {
  playerName: string;
  /** 接受央视春晚邀约时由玩家填写的演唱曲目 */
  chunwanSongTitle?: string;
  currentTurn: number;
  staminaCurrent: number;
  staminaMax: number;
  /** 企划金（商店与企划金养成） */
  coins: number;
  /** 商店终身限购商品已购 id */
  purchasedShopItemIds: string[];
  stats: Record<StatKey, number>;
  flags: Record<string, boolean>;
  counters: Record<string, number>;
  completedEventIds: string[];
  lockedEventIds: string[];
  unlockedCodexIds: string[];
  unlockedEndingIds: string[];
  /** 终局时按顺序展示的成就卡片队列 */
  pendingAchievementIds: string[];
  /** 已经向玩家展示过的结局成就，防止读档或刷新后重复弹出 */
  acknowledgedAchievementIds: string[];
  /** 第一回合剧情结算后等待展示的新手引导 */
  newPlayerGuidePending: boolean;
  /** 新手引导已经确认，避免刷新或读档后重复出现 */
  newPlayerGuideSeen: boolean;
  seenStoryIds: string[];
  routineUsageByTurn: Record<string, number>;
  currentLocationId: string;
  activeStoryEventId?: string;
  lineIndex: number;
  selectedView: ViewKey;
  /** 养成事件完成：剧情式反馈（非回合结算） */
  routineFeedback?: {
    title: string;
    narrative: string;
    appliedEffects: string[];
  };
  /** 主线选项 / 继续推进后的效果摘要 */
  storyFeedback?: {
    title: string;
    /** 与该段剧情匹配的过渡旁白（展示在标题下） */
    transition?: string;
    appliedEffects: string[];
  };
  /** 仅点击「结束回合」后出现 */
  turnSummary?: {
    turn: number;
    title: string;
    appliedEffects: string[];
  };
  /** 提前遗憾终局：有值时本局结束，不可继续养成 / 推进回合 */
  gameOverEndingId?: string;
  settings: GameSettings;
};

export type SaveSlotId = "slot1" | "slot2" | "slot3";

export type SaveFile = {
  version: number;
  savedAt: string;
  slotId?: SaveSlotId;
  state: GameState;
};
