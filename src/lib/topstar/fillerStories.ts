import type { FillerStoryDef } from "@/lib/topstar/types";

function fillerCodex(id: string): string {
  return `codex_${id}`;
}

/** 第二章轶事：拒绝职业线时不进入池子 */
const ch2Career: Pick<FillerStoryDef, "conditions"> = {
  conditions: { forbiddenFlags: ["careerRouteRejected"] },
};

/** 月间轶事 26 条：章节池 + R1 候选月由 game.ts 调度 */
export const fillerStories: FillerStoryDef[] = [
  {
    id: "filler_ch1_library_hook",
    chapterId: "chapter1",
    title: "月间轶事 · 图书馆闭馆前",
    summary: "她在走廊里哼副歌，你帮她把噪音关进耳机。",
    codexId: fillerCodex("filler_ch1_library_hook"),
    backgroundId: "bg_campus",
    dialogue: [
      {
        id: "f1_lib_1",
        speaker: "narrator",
        text: "图书馆闭馆铃已经响过一轮，保安大叔的手电光从楼梯口扫上来。她把笔记本塞进书包，嘴里还在无声地咬字。",
      },
      {
        id: "f1_lib_2",
        speaker: "eve",
        speakerName: "王澳楠",
        text: "最后一句 hook……怎么唱都像在「求别人听懂」，我不想那么卑微。",
      },
      {
        id: "f1_lib_3",
        speaker: "narrator",
        text: "你把耳机递过去，替她按下播放键——工程里那段 loop 很轻，刚好盖住走廊回声。",
      },
      {
        id: "f1_lib_4",
        speaker: "eve",
        speakerName: "王澳楠",
        text: "……【自定义昵称】，如果从「求」改成「讲」呢？像把话说给同类听。",
      },
      {
        id: "f1_lib_5",
        speaker: "narrator",
        text: "你们在消防通道的应急灯下改了两版词，直到她的眼睛重新亮起来。",
      },
    ],
    completionEffects: [{ type: "stat", key: "creativity", delta: 2 }],
  },
  {
    id: "filler_ch1_mom_call",
    chapterId: "chapter1",
    title: "月间轶事 · 妈妈打来的视频",
    summary: "她在宿舍阳台接电话，你在门里帮她打手势对口径。",
    codexId: fillerCodex("filler_ch1_mom_call"),
    backgroundId: "bg_dorm_night",
    dialogue: [
      {
        id: "f1_mom_1",
        speaker: "narrator",
        text: "手机震得桌面嗡嗡响，来电显示「妈妈」。她深吸一口气，把卫衣帽子扣上才接。",
      },
      {
        id: "f1_mom_2",
        speaker: "npc",
        speakerName: "妈妈（视频）",
        text: "囡囡，吃饭了吗？别总熬夜……对了，你爸问你是不是又在搞那个说唱。",
      },
      {
        id: "f1_mom_3",
        speaker: "eve",
        speakerName: "王澳楠",
        text: "妈，我……有在写歌，也有上课。真的。",
      },
      {
        id: "f1_mom_4",
        speaker: "narrator",
        text: "镜头晃过书桌：一边是课本，一边是歌词本。她下意识想把歌词本盖住，又停住。",
      },
    ],
    choices: [
      {
        id: "filler_ch1_mom_call_a",
        label: "抢过手机半句：叔叔阿姨放心，我盯着她作息。",
        staminaCost: 0,
        effects: [
          { type: "stat", key: "bond", delta: 2 },
          { type: "stat", key: "resilience", delta: 1 },
          { type: "event:complete", id: "filler_ch1_mom_call" },
          { type: "codex:unlock", id: fillerCodex("filler_ch1_mom_call") },
        ],
      },
      {
        id: "filler_ch1_mom_call_b",
        label: "不出镜，只递纸条：说「下周给她看成绩单」。",
        staminaCost: 0,
        effects: [
          { type: "stat", key: "resilience", delta: 2 },
          { type: "stat", key: "tacit", delta: 1 },
          { type: "event:complete", id: "filler_ch1_mom_call" },
          { type: "codex:unlock", id: fillerCodex("filler_ch1_mom_call") },
        ],
      },
    ],
  },
  {
    id: "filler_ch1_subway_melody",
    chapterId: "chapter1",
    title: "月间轶事 · 地铁上的旋律",
    summary: "一号线摇晃，她在备忘录里敲 flow。",
    codexId: fillerCodex("filler_ch1_subway_melody"),
    backgroundId: "bg_campus",
    dialogue: [
      {
        id: "f1_sub_1",
        speaker: "narrator",
        text: "晚高峰的地铁挤得像压缩包，她抓着吊环，另一只手在备忘录里飞快敲字。",
      },
      {
        id: "f1_sub_2",
        speaker: "eve",
        speakerName: "王澳楠",
        text: "你听这个——哒哒哒哒空一拍，像心跳漏的那一下。",
      },
      {
        id: "f1_sub_3",
        speaker: "narrator",
        text: "她把手机举到你耳边，车厢噪音里那几小节居然很清楚。",
      },
      {
        id: "f1_sub_4",
        speaker: "eve",
        speakerName: "王澳楠",
        text: "我想把它写进《慢慢》的 bridge……不对，太贪心了，先记在「以后」那一页。",
      },
      {
        id: "f1_sub_5",
        speaker: "narrator",
        text: "到站提示音响起，她笑着把手机锁屏：「走，请你喝豆浆。」",
      },
    ],
    completionEffects: [
      { type: "stat", key: "creativity", delta: 1 },
      { type: "stat", key: "stage", delta: 1 },
    ],
  },
  {
    id: "filler_ch1_club_snack",
    chapterId: "chapter1",
    title: "月间轶事 · 社团活动室宵夜",
    summary: "排练散了，泡面香把几个人又黏回椅子。",
    codexId: fillerCodex("filler_ch1_club_snack"),
    backgroundId: "bg_club_room",
    dialogue: [
      {
        id: "f1_club_1",
        speaker: "narrator",
        text: "活动室的灯只开了一半，泡面热气把玻璃窗糊成毛玻璃。",
      },
      {
        id: "f1_club_2",
        speaker: "npc",
        speakerName: "社团好友",
        text: "楠楠，你今天那段 flow 顺多了，是不是偷偷练了？",
      },
      {
        id: "f1_club_3",
        speaker: "eve",
        speakerName: "王澳楠",
        text: "被【自定义昵称】抓着练的……还说再不顺就断我奶茶。",
      },
      {
        id: "f1_club_4",
        speaker: "narrator",
        text: "一群人起哄，你把调料包丢过去挡：「下周比赛，谁再熬夜谁请全社。」",
      },
      {
        id: "f1_club_5",
        speaker: "eve",
        speakerName: "王澳楠",
        text: "……行。那我也请得起。",
      },
    ],
    completionEffects: [
      { type: "stat", key: "bond", delta: 2 },
      { type: "stat", key: "popularity", delta: 1 },
    ],
  },
  {
    id: "filler_ch1_rain_campus",
    chapterId: "chapter1",
    title: "月间轶事 · 暴雨困在教学楼",
    summary: "雨声太大，反而敢唱大声一点。",
    codexId: fillerCodex("filler_ch1_rain_campus"),
    backgroundId: "bg_campus",
    dialogue: [
      {
        id: "f1_rain_1",
        speaker: "narrator",
        text: "暴雨把走廊变成瀑布帘，你们困在连廊尽头，远处雷声滚过屋顶。",
      },
      {
        id: "f1_rain_2",
        speaker: "eve",
        speakerName: "王澳楠",
        text: "这种天气……特别适合写痛的东西。",
      },
      {
        id: "f1_rain_3",
        speaker: "narrator",
        text: "她清唱了两句，声音被雨声吃掉一半，却意外地稳。",
      },
      {
        id: "f1_rain_4",
        speaker: "eve",
        speakerName: "王澳楠",
        text: "【自定义昵称】，你说痛的东西，最后一定要治愈吗？",
      },
      {
        id: "f1_rain_5",
        speaker: "narrator",
        text: "你还没回答，她已经自己接上：「……算了，我先唱完。」",
      },
    ],
    completionEffects: [
      { type: "stat", key: "resilience", delta: 2 },
      { type: "stat", key: "creativity", delta: 1 },
    ],
  },
  {
    id: "filler_ch1_midterm_crisis",
    chapterId: "chapter1",
    title: "月间轶事 · 期中周与排练撞车",
    summary: "时间表上两块红杠叠在一起。",
    codexId: fillerCodex("filler_ch1_midterm_crisis"),
    backgroundId: "bg_campus",
    dialogue: [
      {
        id: "f1_mid_1",
        speaker: "narrator",
        text: "她把两张时间表摊在桌上：期中复习 block 和社团联排 block 完全重叠。",
      },
      {
        id: "f1_mid_2",
        speaker: "eve",
        speakerName: "王澳楠",
        text: "我不能退排练……也不想挂科。怎么办啊。",
      },
      {
        id: "f1_mid_3",
        speaker: "narrator",
        text: "她眼圈有点红，但还在笑，像怕你觉得她矫情。",
      },
    ],
    choices: [
      {
        id: "filler_ch1_midterm_a",
        label: "拆成碎片：早读前写词，晚自习后练一小时。",
        staminaCost: 1,
        effects: [
          { type: "stat", key: "resilience", delta: 2 },
          { type: "stat", key: "creativity", delta: 1 },
          { type: "event:complete", id: "filler_ch1_midterm_crisis" },
          { type: "codex:unlock", id: fillerCodex("filler_ch1_midterm_crisis") },
        ],
      },
      {
        id: "filler_ch1_midterm_b",
        label: "我去跟社长请假，你先扛过考试周。",
        staminaCost: 0,
        effects: [
          { type: "stat", key: "bond", delta: 2 },
          { type: "stat", key: "stage", delta: 1 },
          { type: "event:complete", id: "filler_ch1_midterm_crisis" },
          { type: "codex:unlock", id: fillerCodex("filler_ch1_midterm_crisis") },
        ],
      },
    ],
  },
  {
    id: "filler_ch1_fan_dm",
    chapterId: "chapter1",
    title: "月间轶事 · 陌生人的私信",
    summary: "一条很长的感谢，来自「听过现场的路人」。",
    codexId: fillerCodex("filler_ch1_fan_dm"),
    backgroundId: "bg_dorm_night",
    dialogue: [
      {
        id: "f1_fan_1",
        speaker: "narrator",
        text: "她盯着私信界面看了很久，指尖悬在回复键上。",
      },
      {
        id: "f1_fan_2",
        speaker: "eve",
        speakerName: "王澳楠",
        text: "她说……她那天心情很差，路过社团活动听到我在唱，站在窗外听完才走。",
      },
      {
        id: "f1_fan_3",
        speaker: "narrator",
        text: "她把那条私信读给你听，声音越读越轻。",
      },
      {
        id: "f1_fan_4",
        speaker: "eve",
        speakerName: "王澳楠",
        text: "我以前觉得舞台是「我要赢」。现在发现也可能是「我想陪」。",
      },
      {
        id: "f1_fan_5",
        speaker: "narrator",
        text: "最后她只回了一句：谢谢你愿意听。发送成功后，她把脸埋进臂弯里几秒。",
      },
    ],
    completionEffects: [
      { type: "stat", key: "popularity", delta: 1 },
      { type: "stat", key: "tacit", delta: 2 },
    ],
  },
  {
    id: "filler_ch1_night_run",
    chapterId: "chapter1",
    title: "月间轶事 · 操场夜跑三圈",
    summary: "她说脑子太吵，想用身体累一点。",
    codexId: fillerCodex("filler_ch1_night_run"),
    backgroundId: "bg_campus",
    dialogue: [
      {
        id: "f1_run_1",
        speaker: "narrator",
        text: "操场夜灯把跑道切成一段段金色，她系鞋带系了两遍。",
      },
      {
        id: "f1_run_2",
        speaker: "eve",
        speakerName: "王澳楠",
        text: "你陪我跑吗？我跑不动的时候……不许笑我。",
      },
      {
        id: "f1_run_3",
        speaker: "narrator",
        text: "第一圈她还在哼拍子，第二圈只剩呼吸声，第三圈她抓住你的袖子角。",
      },
    ],
    choices: [
      {
        id: "filler_ch1_night_run_a",
        label: "放慢，走完也算。",
        staminaCost: 0,
        effects: [
          { type: "stat", key: "resilience", delta: 2 },
          { type: "stat", key: "tacit", delta: 1 },
          { type: "event:complete", id: "filler_ch1_night_run" },
          { type: "codex:unlock", id: fillerCodex("filler_ch1_night_run") },
        ],
      },
      {
        id: "filler_ch1_night_run_b",
        label: "陪跑到底，冲最后五十米。",
        staminaCost: 1,
        effects: [
          { type: "stat", key: "stage", delta: 2 },
          { type: "stat", key: "resilience", delta: 1 },
          { type: "event:complete", id: "filler_ch1_night_run" },
          { type: "codex:unlock", id: fillerCodex("filler_ch1_night_run") },
        ],
      },
    ],
  },
  {
    id: "filler_ch2_studio_3am",
    chapterId: "chapter2",
    ...ch2Career,
    title: "月间轶事 · 凌晨三点的录音棚",
    summary: "修气口修到彼此沉默。",
    codexId: fillerCodex("filler_ch2_studio_3am"),
    backgroundId: "bg_recording_studio",
    dialogue: [
      {
        id: "f2_st_1",
        speaker: "narrator",
        text: "监听里同一句循环第二十遍，混音师揉着眼睛说「真的听不出差别了」。",
      },
      {
        id: "f2_st_2",
        speaker: "eve",
        speakerName: "王澳楠",
        text: "我听得出来……这里有个气口，像心里顿了一下。",
      },
      {
        id: "f2_st_3",
        speaker: "narrator",
        text: "你看她侧脸，突然明白她不是挑剔，是怕「差一点」就等于「我不配」。",
      },
      {
        id: "f2_st_4",
        speaker: "eve",
        speakerName: "王澳楠",
        text: "【自定义昵称】，你说实话：是不是太轴了？",
      },
      {
        id: "f2_st_5",
        speaker: "narrator",
        text: "你说「轴得对」。她愣住，然后笑出一点眼泪：「你就会哄我。」",
      },
    ],
    completionEffects: [
      { type: "stat", key: "creativity", delta: 2 },
      { type: "stat", key: "authority", delta: 1 },
    ],
  },
  {
    id: "filler_ch2_collab_tease",
    chapterId: "chapter2",
    ...ch2Career,
    title: "月间轶事 · 合作歌手的语音条",
    summary: "对方发来一段哼唱，她当场外放给你听。",
    codexId: fillerCodex("filler_ch2_collab_tease"),
    backgroundId: "bg_recording_studio",
    dialogue: [
      {
        id: "f2_co_1",
        speaker: "narrator",
        text: "微信语音条连着跳出来，她一边听一边记关键词。",
      },
      {
        id: "f2_co_2",
        speaker: "eve",
        speakerName: "王澳楠",
        text: "他说想加一段方言 hook……我觉得好玩，但怕喧宾夺主。",
      },
      {
        id: "f2_co_3",
        speaker: "narrator",
        text: "你把两段 demo 并排放，像拼图一样找咬合点。",
      },
      {
        id: "f2_co_4",
        speaker: "eve",
        speakerName: "王澳楠",
        text: "……我好像找到「我们一起玩」而不是「谁压谁」的位置了。",
      },
    ],
    completionEffects: [
      { type: "stat", key: "bond", delta: 2 },
      { type: "stat", key: "creativity", delta: 1 },
    ],
  },
  {
    id: "filler_ch2_brand_sample",
    chapterId: "chapter2",
    ...ch2Career,
    title: "月间轶事 · 品牌寄来的样品衣",
    summary: "镜子里像陌生人，她问你哪套更像她。",
    codexId: fillerCodex("filler_ch2_brand_sample"),
    backgroundId: "bg_hotel",
    dialogue: [
      {
        id: "f2_br_1",
        speaker: "narrator",
        text: "床上摊着三套造型，标签还没剪，像三套不同的人生。",
      },
      {
        id: "f2_br_2",
        speaker: "eve",
        speakerName: "王澳楠",
        text: "商务姐姐说都要拍返图……可我觉得这套太甜，这套太冷。",
      },
      {
        id: "f2_br_3",
        speaker: "narrator",
        text: "她站在镜前捏着衣角，等一个不会敷衍的答案。",
      },
    ],
    choices: [
      {
        id: "filler_ch2_brand_a",
        label: "选最像「日常的你」那套，别为镜头演别人。",
        staminaCost: 0,
        effects: [
          { type: "stat", key: "reputation", delta: 2 },
          { type: "stat", key: "tacit", delta: 1 },
          { type: "event:complete", id: "filler_ch2_brand_sample" },
          { type: "codex:unlock", id: fillerCodex("filler_ch2_brand_sample") },
        ],
      },
      {
        id: "filler_ch2_brand_b",
        label: "三套都拍，但发你最自在的那套。",
        staminaCost: 1,
        effects: [
          { type: "stat", key: "popularity", delta: 2 },
          { type: "stat", key: "authority", delta: 1 },
          { type: "event:complete", id: "filler_ch2_brand_sample" },
          { type: "codex:unlock", id: fillerCodex("filler_ch2_brand_sample") },
        ],
      },
    ],
  },
  {
    id: "filler_ch2_fan_letter",
    chapterId: "chapter2",
    ...ch2Career,
    title: "月间轶事 · 一沓手写信",
    summary: "后援会转来厚厚信封，她不敢当场拆。",
    codexId: fillerCodex("filler_ch2_fan_letter"),
    backgroundId: "bg_hotel",
    dialogue: [
      {
        id: "f2_let_1",
        speaker: "narrator",
        text: "酒店桌上堆着一沓信，她洗了手才拆第一封。",
      },
      {
        id: "f2_let_2",
        speaker: "eve",
        speakerName: "王澳楠",
        text: "这个字……好认真。她画了我之前在节目里吹笛子的样子，丑萌丑萌的。",
      },
      {
        id: "f2_let_3",
        speaker: "narrator",
        text: "她一封封读，读到第三封突然停住，把信纸按在胸口。",
      },
      {
        id: "f2_let_4",
        speaker: "eve",
        speakerName: "王澳楠",
        text: "【自定义昵称】，我以后一定不能对不起她们。",
      },
      {
        id: "f2_let_5",
        speaker: "narrator",
        text: "你说「先对得起今天的自己」。她用力点头。",
      },
    ],
    completionEffects: [
      { type: "stat", key: "bond", delta: 2 },
      { type: "stat", key: "popularity", delta: 1 },
    ],
  },
  {
    id: "filler_ch2_let_him_go_echo",
    chapterId: "chapter2",
    conditions: {
      minTurn: 43,
      forbiddenFlags: ["careerRouteRejected"],
      requiredFlags: ["releasedLetHimGo"],
      requiredEvents: ["story_turn_042_let_him_go"],
    },
    title: "月间轶事 · 便利店外放《让他走》",
    summary: "店员没认出她，歌在货架间轻轻荡。",
    codexId: fillerCodex("filler_ch2_let_him_go_echo"),
    backgroundId: "bg_recording_studio",
    dialogue: [
      {
        id: "f2_lh_1",
        speaker: "narrator",
        text: "便利店喇叭在播热歌榜，《让他走》的前奏一出来，她僵在关东煮前。",
      },
      {
        id: "f2_lh_2",
        speaker: "npc",
        speakerName: "店员",
        text: "哎这首歌最近超火，你也会唱吗？",
      },
      {
        id: "f2_lh_3",
        speaker: "eve",
        speakerName: "王澳楠",
        text: "……会一点点。",
      },
    ],
    choices: [
      {
        id: "filler_ch2_lh_a",
        label: "笑着接：她唱得比原唱好。",
        staminaCost: 0,
        effects: [
          { type: "stat", key: "popularity", delta: 2 },
          { type: "stat", key: "tacit", delta: 1 },
          { type: "event:complete", id: "filler_ch2_let_him_go_echo" },
          { type: "codex:unlock", id: fillerCodex("filler_ch2_let_him_go_echo") },
        ],
      },
      {
        id: "filler_ch2_lh_b",
        label: "轻轻摇头，拉她出去透气。",
        staminaCost: 0,
        effects: [
          { type: "stat", key: "resilience", delta: 2 },
          { type: "stat", key: "reputation", delta: 1 },
          { type: "event:complete", id: "filler_ch2_let_him_go_echo" },
          { type: "codex:unlock", id: fillerCodex("filler_ch2_let_him_go_echo") },
        ],
      },
    ],
  },
  {
    id: "filler_ch3_mastering_anxiety",
    chapterId: "chapter3",
    title: "月间轶事 · 母带前的最后一次犹豫",
    summary: "她在「再磨一版」和「放手」之间摇摆。",
    codexId: fillerCodex("filler_ch3_mastering_anxiety"),
    backgroundId: "bg_studio",
    dialogue: [
      {
        id: "f3_ma_1",
        speaker: "narrator",
        text: "母带工程打开，她盯着 EQ 曲线像盯心电图。",
      },
      {
        id: "f3_ma_2",
        speaker: "eve",
        speakerName: "王澳楠",
        text: "我总觉得还能再亮一点……再狠一点……",
      },
      {
        id: "f3_ma_3",
        speaker: "npc",
        speakerName: "制作人",
        text: "楠姐，再亮就刺了。你要的是「锋利」不是「疼」。",
      },
    ],
    choices: [
      {
        id: "filler_ch3_ma_a",
        label: "拍板：今天就封版。",
        staminaCost: 0,
        effects: [
          { type: "stat", key: "authority", delta: 1 },
          { type: "stat", key: "resilience", delta: 2 },
          { type: "event:complete", id: "filler_ch3_mastering_anxiety" },
          { type: "codex:unlock", id: fillerCodex("filler_ch3_mastering_anxiety") },
        ],
      },
      {
        id: "filler_ch3_ma_b",
        label: "只改一处：人声气口，其余不动。",
        staminaCost: 1,
        effects: [
          { type: "stat", key: "creativity", delta: 2 },
          { type: "stat", key: "reputation", delta: 1 },
          { type: "event:complete", id: "filler_ch3_mastering_anxiety" },
          { type: "codex:unlock", id: fillerCodex("filler_ch3_mastering_anxiety") },
        ],
      },
    ],
  },
  {
    id: "filler_ch3_photo_shoot",
    chapterId: "chapter3",
    title: "月间轶事 · 专辑封面拍摄日",
    summary: "风吹乱造型，她反而笑了。",
    codexId: fillerCodex("filler_ch3_photo_shoot"),
    backgroundId: "bg_studio",
    dialogue: [
      {
        id: "f3_ph_1",
        speaker: "narrator",
        text: "天台风很大，摄影师喊「再冷一点眼神」。",
      },
      {
        id: "f3_ph_2",
        speaker: "eve",
        speakerName: "王澳楠",
        text: "冷眼神我会啊……我怕的是「假冷」。",
      },
      {
        id: "f3_ph_3",
        speaker: "narrator",
        text: "你把外套搭在她肩上暖了三秒再拿走：「记住刚才那三秒。」",
      },
      {
        id: "f3_ph_4",
        speaker: "eve",
        speakerName: "王澳楠",
        text: "……你是会教的。",
      },
      {
        id: "f3_ph_5",
        speaker: "narrator",
        text: "快门声里，她眼神落下来，像终于踩在实地。",
      },
    ],
    completionEffects: [
      { type: "stat", key: "stage", delta: 2 },
      { type: "stat", key: "popularity", delta: 1 },
    ],
  },
  {
    id: "filler_ch3_charity_song",
    chapterId: "chapter3",
    title: "月间轶事 · 公益曲邀约",
    summary: "酬劳不高，但传播路径很长。",
    codexId: fillerCodex("filler_ch3_charity_song"),
    backgroundId: "bg_studio",
    dialogue: [
      {
        id: "f3_ch_1",
        speaker: "npc",
        speakerName: "项目方",
        text: "楠姐，这首公益曲希望简单、真诚，不要炫技太多。",
      },
      {
        id: "f3_ch_2",
        speaker: "eve",
        speakerName: "王澳楠",
        text: "我可以少拿一点……但我想参与词曲。",
      },
      {
        id: "f3_ch_3",
        speaker: "narrator",
        text: "她看向你，等一个「值不值得」的共谋。",
      },
    ],
    choices: [
      {
        id: "filler_ch3_ch_a",
        label: "接。用作品说话。",
        staminaCost: 1,
        effects: [
          { type: "stat", key: "reputation", delta: 2 },
          { type: "stat", key: "bond", delta: 1 },
          { type: "event:complete", id: "filler_ch3_charity_song" },
          { type: "codex:unlock", id: fillerCodex("filler_ch3_charity_song") },
        ],
      },
      {
        id: "filler_ch3_ch_b",
        label: "接，但限定制作周期，别拖专辑后腿。",
        staminaCost: 0,
        effects: [
          { type: "stat", key: "reputation", delta: 1 },
          { type: "stat", key: "resilience", delta: 2 },
          { type: "event:complete", id: "filler_ch3_charity_song" },
          { type: "codex:unlock", id: fillerCodex("filler_ch3_charity_song") },
        ],
      },
    ],
  },
  {
    id: "filler_ch3_family_video",
    chapterId: "chapter3",
    title: "月间轶事 · 爸妈发来的长语音",
    summary: "她转文字转到一半就停。",
    codexId: fillerCodex("filler_ch3_family_video"),
    backgroundId: "bg_hotel",
    dialogue: [
      {
        id: "f3_fv_1",
        speaker: "narrator",
        text: "微信里爸妈的语音条叠成一串小红点，她转文字转到一半停住。",
      },
      {
        id: "f3_fv_2",
        speaker: "eve",
        speakerName: "王澳楠",
        text: "他们说……看到我在电视上，又高兴又担心。",
      },
      {
        id: "f3_fv_3",
        speaker: "narrator",
        text: "她把手机扣在桌上，手背青筋起了一瞬又松开。",
      },
      {
        id: "f3_fv_4",
        speaker: "eve",
        speakerName: "王澳楠",
        text: "【自定义昵称】，我是不是该回家吃顿饭？",
      },
      {
        id: "f3_fv_5",
        speaker: "narrator",
        text: "你说「该」。她笑：「你就不能骗我说不用吗？」",
      },
    ],
    completionEffects: [
      { type: "stat", key: "bond", delta: 2 },
      { type: "stat", key: "resilience", delta: 1 },
    ],
  },
  {
    id: "filler_ch3_sleep_collapse",
    chapterId: "chapter3",
    title: "月间轶事 · 连轴转后的昏睡",
    summary: "她在沙发上睡着，demo 还在循环。",
    codexId: fillerCodex("filler_ch3_sleep_collapse"),
    backgroundId: "bg_studio",
    dialogue: [
      {
        id: "f3_sl_1",
        speaker: "narrator",
        text: "沙发上她蜷得像问号，耳机还挂在耳朵上，demo 小声循环。",
      },
      {
        id: "f3_sl_2",
        speaker: "npc",
        speakerName: "助理",
        text: "要不要叫醒她？还有个采访……",
      },
      {
        id: "f3_sl_3",
        speaker: "narrator",
        text: "你抬手示意别出声，把采访改期备注发出去。",
      },
    ],
    choices: [
      {
        id: "filler_ch3_sl_a",
        label: "让她睡满两小时，采访推后。",
        staminaCost: 0,
        effects: [
          { type: "stat", key: "resilience", delta: 2 },
          { type: "stat", key: "tacit", delta: 1 },
          { type: "event:complete", id: "filler_ch3_sleep_collapse" },
          { type: "codex:unlock", id: fillerCodex("filler_ch3_sleep_collapse") },
        ],
      },
      {
        id: "filler_ch3_sl_b",
        label: "叫醒，但取消你这边一个会陪她吃饭。",
        staminaCost: 1,
        effects: [
          { type: "stat", key: "bond", delta: 2 },
          { type: "stat", key: "stage", delta: 1 },
          { type: "event:complete", id: "filler_ch3_sleep_collapse" },
          { type: "codex:unlock", id: fillerCodex("filler_ch3_sleep_collapse") },
        ],
      },
    ],
  },
  {
    id: "filler_ch3_lyric_debate",
    chapterId: "chapter3",
    title: "月间轶事 · 一句词吵了四十分钟",
    summary: "「离开」还是「留下」，两个字改来改去。",
    codexId: fillerCodex("filler_ch3_lyric_debate"),
    backgroundId: "bg_studio",
    dialogue: [
      {
        id: "f3_ld_1",
        speaker: "narrator",
        text: "白板上写着两句备选，底下画满叉和圈。",
      },
      {
        id: "f3_ld_2",
        speaker: "eve",
        speakerName: "王澳楠",
        text: "「离开」太决绝，「留下」又像示弱……",
      },
      {
        id: "f3_ld_3",
        speaker: "narrator",
        text: "你把第三选项写上去：「在场」。她盯着那两个字很久。",
      },
      {
        id: "f3_ld_4",
        speaker: "eve",
        speakerName: "王澳楠",
        text: "……就这个。你别改。",
      },
    ],
    completionEffects: [
      { type: "stat", key: "creativity", delta: 2 },
      { type: "stat", key: "tacit", delta: 1 },
    ],
  },
  {
    id: "filler_ch3_night_highway",
    chapterId: "chapter3",
    title: "月间轶事 · 收工夜车的高架桥",
    summary: "车窗外的灯像倒流的河。",
    codexId: fillerCodex("filler_ch3_night_highway"),
    backgroundId: "bg_studio",
    dialogue: [
      {
        id: "f3_nh_1",
        speaker: "narrator",
        text: "保姆车在高架上滑行，窗外灯河倒流。她额头抵着玻璃。",
      },
      {
        id: "f3_nh_2",
        speaker: "eve",
        speakerName: "王澳楠",
        text: "有时候我会想……如果我没走这条路，现在在干什么。",
      },
      {
        id: "f3_nh_3",
        speaker: "narrator",
        text: "你没有给答案，只把保温杯拧开递过去。",
      },
      {
        id: "f3_nh_4",
        speaker: "eve",
        speakerName: "王澳楠",
        text: "但我知道我会想「如果」。所以还是现在好。",
      },
    ],
    completionEffects: [
      { type: "stat", key: "resilience", delta: 2 },
      { type: "stat", key: "popularity", delta: 1 },
    ],
  },
  {
    id: "filler_ch4_rehearsal_note",
    chapterId: "chapter4",
    title: "月间轶事 · 联排本上的红笔",
    summary: "你把风险点标红，她一条条打勾。",
    codexId: fillerCodex("filler_ch4_rehearsal_note"),
    backgroundId: "bg_birdnest",
    dialogue: [
      {
        id: "f4_rn_1",
        speaker: "narrator",
        text: "联排本厚得像砖，每一页边栏都有你的红笔批注。",
      },
      {
        id: "f4_rn_2",
        speaker: "eve",
        speakerName: "王澳楠",
        text: "我以前觉得红笔很吓人……现在觉得像有人替我先疼一遍。",
      },
      {
        id: "f4_rn_3",
        speaker: "narrator",
        text: "她把「升降台同步」那一条读了三次，像在背咒语。",
      },
      {
        id: "f4_rn_4",
        speaker: "eve",
        speakerName: "王澳楠",
        text: "【自定义昵称】，终场那天你别站太边，我想找得到你。",
      },
    ],
    completionEffects: [
      { type: "stat", key: "stage", delta: 2 },
      { type: "stat", key: "resilience", delta: 1 },
    ],
  },
  {
    id: "filler_ch4_voice_tea",
    chapterId: "chapter4",
    title: "月间轶事 · 嗓子发紧的早晨",
    summary: "雾化机嗡嗡响，她还在默词。",
    codexId: fillerCodex("filler_ch4_voice_tea"),
    backgroundId: "bg_birdnest",
    dialogue: [
      {
        id: "f4_vt_1",
        speaker: "npc",
        speakerName: "声乐老师",
        text: "楠楠，今天先别高音，把说话感找回来。",
      },
      {
        id: "f4_vt_2",
        speaker: "eve",
        speakerName: "王澳楠",
        text: "我睡不着……一闭眼就是鸟巢的空座。",
      },
      {
        id: "f4_vt_3",
        speaker: "narrator",
        text: "雾化机喷出白雾，她的声音在雾后面发闷。",
      },
    ],
    choices: [
      {
        id: "filler_ch4_vt_a",
        label: "停半天排练，只做恢复。",
        staminaCost: 0,
        effects: [
          { type: "stat", key: "resilience", delta: 2 },
          { type: "stat", key: "stage", delta: 1 },
          { type: "event:complete", id: "filler_ch4_voice_tea" },
          { type: "codex:unlock", id: fillerCodex("filler_ch4_voice_tea") },
        ],
      },
      {
        id: "filler_ch4_vt_b",
        label: "改排歌单：把最难段挪到后半，前面留热身。",
        staminaCost: 1,
        effects: [
          { type: "stat", key: "stage", delta: 2 },
          { type: "stat", key: "authority", delta: 1 },
          { type: "event:complete", id: "filler_ch4_voice_tea" },
          { type: "codex:unlock", id: fillerCodex("filler_ch4_voice_tea") },
        ],
      },
    ],
  },
  {
    id: "filler_ch4_old_lyric_book",
    chapterId: "chapter4",
    title: "月间轶事 · 十年前的歌词本",
    summary: "纸页发黄，她用指尖描自己的字迹。",
    codexId: fillerCodex("filler_ch4_old_lyric_book"),
    backgroundId: "bg_campus",
    dialogue: [
      {
        id: "f4_ob_1",
        speaker: "narrator",
        text: "旧歌词本摊开在第一页，稚嫩笔迹写着「想让更多人听到我写的歌」。",
      },
      {
        id: "f4_ob_2",
        speaker: "eve",
        speakerName: "王澳楠",
        text: "我当时……好敢写啊。现在反而会在心里删很多句。",
      },
      {
        id: "f4_ob_3",
        speaker: "narrator",
        text: "你把今天的企划封面放到旁边，两个标题并排。",
      },
      {
        id: "f4_ob_4",
        speaker: "eve",
        speakerName: "王澳楠",
        text: "……其实没变。只是换了一种「敢」。",
      },
    ],
    completionEffects: [
      { type: "stat", key: "creativity", delta: 2 },
      { type: "stat", key: "tacit", delta: 2 },
    ],
  },
  {
    id: "filler_ch4_lightstick_box",
    chapterId: "chapter4",
    title: "月间轶事 · 一万根应援棒的箱子",
    summary: "她蹲在地上拆样，像小孩拆礼物。",
    codexId: fillerCodex("filler_ch4_lightstick_box"),
    backgroundId: "bg_concert",
    dialogue: [
      {
        id: "f4_lb_1",
        speaker: "narrator",
        text: "仓库里堆着印着名字的应援棒样品，她蹲在地上拆第一箱。",
      },
      {
        id: "f4_lb_2",
        speaker: "eve",
        speakerName: "王澳楠",
        text: "颜色会不会太亮？我怕现场拍出来刺眼。",
      },
      {
        id: "f4_lb_3",
        speaker: "narrator",
        text: "你把样品举到灯光下对比，像在做一道很温柔的数学题。",
      },
      {
        id: "f4_lb_4",
        speaker: "eve",
        speakerName: "王澳楠",
        text: "我想让他们亮得舒服……像被接住，而不是被晃瞎。",
      },
    ],
    completionEffects: [
      { type: "stat", key: "popularity", delta: 2 },
      { type: "stat", key: "reputation", delta: 1 },
    ],
  },
  {
    id: "filler_ch4_interview_short",
    chapterId: "chapter4",
    title: "月间轶事 · 十五分钟的短采访",
    summary: "问题很常规，她答得很慢。",
    codexId: fillerCodex("filler_ch4_interview_short"),
    backgroundId: "bg_birdnest",
    dialogue: [
      {
        id: "f4_is_1",
        speaker: "npc",
        speakerName: "记者",
        text: "用一句话形容你和【自定义昵称】的关系？",
      },
      {
        id: "f4_is_2",
        speaker: "narrator",
        text: "她看向镜头，又移开，最后看向侧台的你。",
      },
      {
        id: "f4_is_3",
        speaker: "eve",
        speakerName: "王澳楠",
        text: "……并肩。不是谁牵着谁，是并排走。",
      },
      {
        id: "f4_is_4",
        speaker: "narrator",
        text: "记者愣了半秒，点头：「这句能用。」",
      },
    ],
    completionEffects: [
      { type: "stat", key: "tacit", delta: 2 },
      { type: "stat", key: "popularity", delta: 1 },
    ],
  },
  {
    id: "filler_ch4_final_hug",
    chapterId: "chapter4",
    title: "月间轶事 · 联排结束后的拥抱",
    summary: "后台只有鼓风机在响，她突然伸手。",
    codexId: fillerCodex("filler_ch4_final_hug"),
    backgroundId: "bg_birdnest",
    dialogue: [
      {
        id: "f4_fh_1",
        speaker: "narrator",
        text: "后台走廊空得能听见鼓风机，她把额头抵在你肩上零点五秒又弹开。",
      },
      {
        id: "f4_fh_2",
        speaker: "eve",
        speakerName: "王澳楠",
        text: "我就借一下……不算软弱吧？",
      },
    ],
    choices: [
      {
        id: "filler_ch4_fh_a",
        label: "算充电。",
        staminaCost: 0,
        effects: [
          { type: "stat", key: "tacit", delta: 2 },
          { type: "stat", key: "resilience", delta: 1 },
          { type: "event:complete", id: "filler_ch4_final_hug" },
          { type: "codex:unlock", id: fillerCodex("filler_ch4_final_hug") },
        ],
      },
      {
        id: "filler_ch4_fh_b",
        label: "算奖励。你今天那段完成度很高。",
        staminaCost: 0,
        effects: [
          { type: "stat", key: "stage", delta: 2 },
          { type: "stat", key: "bond", delta: 1 },
          { type: "event:complete", id: "filler_ch4_final_hug" },
          { type: "codex:unlock", id: fillerCodex("filler_ch4_final_hug") },
        ],
      },
    ],
  },
];
