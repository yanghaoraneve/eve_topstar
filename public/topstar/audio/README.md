# 顶流企划 · 音频资源

与 `src/lib/topstar/data.ts` → `assets.bgm` / `assets.sfx` 对应（当前为 **OGG**）。

| 文件 | 用途 |
|------|------|
| `bgm_chapter1.ogg` … `bgm_chapter4.ogg` | 四章背景音乐 |
| `sfx_click.ogg` | UI 点击等 |
| `sfx_unlock.ogg` | 剧情推进 / 选项等提示 |

## 替换方式

1. **同名覆盖**：保持扩展名与 `data.ts` 中 URL 一致（如 `.ogg`），直接覆盖文件。
2. **改格式**：若改为 `.mp3` / `.wav`，请同步修改 `data.ts` 里每条 URL 后缀。

程序会按当前回合章节自动切换 BGM；**空字符串** URL 表示不播放该轨。音量在**游戏设置**内调节。
