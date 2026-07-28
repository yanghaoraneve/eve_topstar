# 《顶流企划：与 EVE 并肩》

一款以音乐企划与艺人成长为核心的回合制粉丝向游戏。玩家将作为企划合伙人，在不同地点安排行程、培养属性、管理企划金，并陪伴 EVE 从校园走向最终舞台。

> 粉丝向非官方作品，仅供娱乐，与艺人及工作室无关。

## 本地运行

```bash
npm install
npm run dev
```

打开 [http://localhost:3000/topstar](http://localhost:3000/topstar)。

## 常用命令

```bash
npm run typecheck
npm run build
npm run eval:content
npm run eval:economy
```

## 项目结构

- `src/app/topstar/`：游戏页面入口
- `src/components/topstar/`：游戏界面与地图组件
- `src/lib/topstar/`：剧情数据、规则、存档与资源解析
- `public/topstar/`：背景、地图地点、人物立绘与音频资源
