# 植物模板数据云函数

## 📋 功能概述

这个云函数用于导入和管理虚拟花园的植物模板数据，包含 60 种植物的完整属性、成长阶段、解锁条件等。

## 📊 数据内容

### 植物总览

- **总数**: 60 种植物
- **分级**: 4 级稀有度系统
- **分类**: 仙人掌、多肉、灌木、绿植、乔木、花卉、珍稀、概念

### 稀有度分级

| 级别   | 稀有度    | 数量  | 代表植物               |
| ------ | --------- | ----- | ---------------------- |
| 青铜级 | common    | 15 种 | 仙人掌、多肉植物       |
| 白银级 | rare      | 20 种 | 薰衣草、玫瑰、发财树   |
| 黄金级 | epic      | 15 种 | 樱花树、银杏、牡丹     |
| 钻石级 | legendary | 10 种 | 蝴蝶兰、发光树、浮空花 |

## 🚀 使用方法

### 1. 导入植物模板数据

```bash
tcb fn invoke plant-templates --params '{"action":"importPlants"}'
```

### 2. 统计植物数据

```bash
tcb fn invoke plant-templates --params '{"action":"countPlants"}'
```

### 3. 获取单个植物信息

```bash
tcb fn invoke plant-templates --params '{"action":"getPlantById","plantId":"cactus_001"}'
```

### 4. 按稀有度获取植物列表

```bash
# 获取所有青铜级植物
tcb fn invoke plant-templates --params '{"action":"getPlantsByRarity","rarity":"common"}'

# 获取所有钻石级植物
tcb fn invoke plant-templates --params '{"action":"getPlantsByRarity","rarity":"legendary"}'
```

### 5. 检查植物解锁状态

```bash
tcb fn invoke plant-templates --params '{"action":"checkUnlockStatus","userId":"user_xxx","plantId":"tree_001"}'
```

### 6. 获取用户已解锁的植物

```bash
tcb fn invoke plant-templates --params '{"action":"getUnlockedPlants","userId":"user_xxx"}'
```

## 🌱 植物数据结构

```javascript
{
  plantId: "cherry_blossom_001",
  name: "樱花树",
  nameEn: "Cherry Blossom",
  category: "tree",
  rarity: "epic",

  unlockRequirements: {
    userLevel: "gold",
    totalPoints: 3000,
    totalCarbon: 300,
    prerequisitePlants: ["桃树"]
  },

  growthStages: [
    {
      stage: 1,
      name: "种子",
      duration: 7,
      requiredWater: 10,
      requiredCarbon: 15,
      visual: "seed.png"
    },
    // ... 更多阶段
  ],

  symbolism: {
    meaning: "生命短暂而美好",
    story: "樱花7日，提醒珍惜当下"
  },

  carbonAbsorption: 0.05,
  pointsPerDay: 10,
  status: "active"
}
```

## 📖 API 说明

| Action              | 说明           | 必需参数        | 可选参数 |
| ------------------- | -------------- | --------------- | -------- |
| importPlants        | 导入植物数据   | -               | -        |
| countPlants         | 统计植物数据   | -               | -        |
| getPlantById        | 获取单个植物   | plantId         | -        |
| getPlantsByRarity   | 按稀有度获取   | rarity          | -        |
| getPlantsByCategory | 按分类获取     | category        | -        |
| checkUnlockStatus   | 检查解锁状态   | userId, plantId | -        |
| getUnlockedPlants   | 获取已解锁植物 | userId          | -        |

## 🎯 植物分类详情

### 青铜级（15 种）

**仙人掌系列（5 种）**：

- 金琥仙人掌、玉翁仙人掌、令箭荷花、仙人球、仙人柱

**多肉植物（10 种）**：

- 石莲花、生石花、芦荟、玉露、黑法师、熊童子、虹之玉、姬胧月、白牡丹、桃蛋

### 白银级（20 种）

**灌木花卉（10 种）**：

- 薰衣草、玫瑰、茉莉花、栀子花、桂花、月季、杜鹃、迎春花、山茶花、紫薇

**常见绿植（10 种）**：

- 发财树、绿萝、富贵竹、吊兰、龟背竹、虎皮兰、常春藤、橡皮树、琴叶榕、散尾葵

### 黄金级（15 种）

**乔木树木（10 种）**：

- 樱花树、银杏树、枫树、梧桐树、柳树、桃树、梅树、松树、竹子、桂树

**名贵花卉（5 种）**：

- 牡丹、兰花、荷花、梅花、菊花

### 钻石级（10 种）

**珍稀物种（5 种）**：

- 蝴蝶兰、铁树、千岁兰、龙血树、巨型向日葵

**概念植物（5 种）**：

- 发光树、浮空花、时光藤、星辰草、彩虹蘑菇

## 💡 核心特性

### 1. 分级解锁系统

- 青铜级：0 积分即可种植
- 白银级：需要 500-850 积分
- 黄金级：需要 2800-4500 积分
- 钻石级：需要 9000-30000 积分

### 2. 成长阶段系统

每个植物 3-4 个成长阶段：

- 种子 → 发芽 → 成长 → 开花/成熟

### 3. 碳减排关联

- 成长需要碳减排量
- 不同阶段需要不同减排目标
- 激励用户持续减排

### 4. 象征意义系统

每个植物都有：

- 象征意义
- 背景故事
- 文化内涵

## ⚠️ 注意事项

1. **数据依赖**：

   - 需要 users 集合（用户积分和减排量）
   - 需要 gardens 集合（用户种植记录）

2. **解锁逻辑**：

   - 积分要求
   - 减排量要求
   - 前置植物要求（如樱花需先种桃树）

3. **性能建议**：
   - 建议创建索引：plantId、rarity、category

---

**版本**: v1.0  
**创建时间**: 2025-10-14  
**植物总数**: 60 种
