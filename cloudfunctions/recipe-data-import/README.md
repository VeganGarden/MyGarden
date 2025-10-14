# 食谱数据导入云函数

## 📋 功能概述

这个云函数用于导入和管理素食食谱数据，支持：

- 批量导入食谱数据
- 自动计算碳足迹和营养成分
- 食谱查询和搜索
- 智能推荐
- 分类浏览

## 📊 数据内容

### 当前数据规模

- **总食谱数**: 20 道（首批）
- **分类数**: 6 大类
- **菜系**: 中餐、西餐、日韩、泰式等

### 食谱分类

| 分类         | 代码          | 数量 | 特点           |
| ------------ | ------------- | ---- | -------------- |
| 中式经典素食 | chinese_vegan | 3 道 | 传统名菜素食化 |
| 快手简餐     | quick_meal    | 3 道 | 15 分钟内完成  |
| 高蛋白食谱   | high_protein  | 3 道 | 针对运动人群   |
| 节气食谱     | seasonal      | 3 道 | 顺应 24 节气   |
| 西式素食     | western       | 3 道 | 西餐本土化     |
| 亚洲融合     | asian_fusion  | 3 道 | 日韩东南亚     |

## 🚀 使用方法

### 1. 导入食谱数据

```bash
# 使用腾讯云CLI调用
tcb functions:invoke recipe-data-import -e my-garden-app-env-4e0h762923be2f -p '{"action":"importRecipes"}'
```

**返回示例**:

```json
{
  "code": 0,
  "message": "食谱数据导入完成",
  "summary": {
    "total": 20,
    "inserted": 20,
    "skipped": 0,
    "failed": 0
  }
}
```

### 2. 查询统计信息

```bash
tcb functions:invoke recipe-data-import -e my-garden-app-env-4e0h762923be2f -p '{"action":"countRecipes"}'
```

**返回示例**:

```json
{
  "code": 0,
  "data": {
    "total": 20,
    "byCategory": [
      { "_id": "chinese_vegan", "count": 3 },
      { "_id": "quick_meal", "count": 3 },
      { "_id": "high_protein", "count": 3 }
    ],
    "byCuisine": [
      { "_id": "sichuan", "count": 2 },
      { "_id": "chinese", "count": 5 }
    ]
  }
}
```

### 3. 根据 ID 获取食谱

```bash
tcb functions:invoke recipe-data-import -e my-garden-app-env-4e0h762923be2f -p '{"action":"getRecipeById","recipeId":"chinese_vegan_001"}'
```

### 4. 搜索食谱

```bash
# 搜索"豆腐"相关食谱
tcb functions:invoke recipe-data-import -e my-garden-app-env-4e0h762923be2f -p '{"action":"searchRecipes","keyword":"豆腐","limit":10}'

# 按分类搜索
tcb functions:invoke recipe-data-import -e my-garden-app-env-4e0h762923be2f -p '{"action":"searchRecipes","category":"high_protein"}'

# 按难度搜索
tcb functions:invoke recipe-data-import -e my-garden-app-env-4e0h762923be2f -p '{"action":"searchRecipes","difficulty":"easy"}'

# 按烹饪时间搜索（30分钟内）
tcb functions:invoke recipe-data-import -e my-garden-app-env-4e0h762923be2f -p '{"action":"searchRecipes","maxTime":30}'
```

### 5. 推荐食谱

```bash
# 推荐高蛋白食谱
tcb functions:invoke recipe-data-import -e my-garden-app-env-4e0h762923be2f -p '{"action":"recommendRecipes","preference":"high_protein","limit":5}'

# 推荐快手简餐
tcb functions:invoke recipe-data-import -e my-garden-app-env-4e0h762923be2f -p '{"action":"recommendRecipes","preference":"quick","limit":5}'

# 推荐应季食谱
tcb functions:invoke recipe-data-import -e my-garden-app-env-4e0h762923be2f -p '{"action":"recommendRecipes","season":"spring","limit":5}'
```

### 6. 按分类获取食谱

```bash
tcb functions:invoke recipe-data-import -e my-garden-app-env-4e0h762923be2f -p '{"action":"getRecipesByCategory","category":"chinese_vegan"}'
```

### 7. 计算食谱碳足迹

```bash
tcb functions:invoke recipe-data-import -e my-garden-app-env-4e0h762923be2f -p '{"action":"calculateRecipeCarbon","recipeId":"chinese_vegan_001"}'
```

## 📖 API 说明

### 支持的操作 (action)

| Action                | 说明         | 必需参数 | 可选参数                                                                     |
| --------------------- | ------------ | -------- | ---------------------------------------------------------------------------- |
| importRecipes         | 导入食谱数据 | -        | -                                                                            |
| countRecipes          | 统计食谱数据 | -        | -                                                                            |
| getRecipeById         | 获取单个食谱 | recipeId | -                                                                            |
| searchRecipes         | 搜索食谱     | -        | keyword, category, cuisine, difficulty, maxTime, season, tags, limit, offset |
| recommendRecipes      | 推荐食谱     | -        | userId, season, preference, limit                                            |
| getRecipesByCategory  | 按分类获取   | category | -                                                                            |
| calculateRecipeCarbon | 计算碳足迹   | recipeId | -                                                                            |

## 🌟 食谱数据结构

```javascript
{
  recipeId: "chinese_vegan_001",
  name: "麻婆豆腐",
  nameEn: "Mapo Tofu",
  category: "chinese_vegan",
  cuisine: "sichuan",
  difficulty: "medium",
  cookingTime: 25,
  servings: 2,

  ingredients: [
    {
      ingredientId: "xxx",
      name: "豆腐",
      amount: 400,
      unit: "g",
      carbon: 0.48,
      carbonFootprint: 1.2
    }
  ],

  totalCarbon: 0.5,
  totalNutrition: {
    calories: 180,
    protein: 16.5,
    carbs: 8.3,
    fat: 10.2
  },

  cookingMethod: "炒",
  cookingSteps: [...],
  tags: ["素食", "低碳", "川菜"],

  carbonComparison: {
    meatVersion: "肉末豆腐",
    meatCarbon: 3.2,
    veganCarbon: 0.5,
    savingsPercent: 84.4
  },

  season: "all",
  nutritionHighlight: "高蛋白、低脂",
  tips: "提示信息",
  status: "active"
}
```

## 💡 核心特性

### 1. 自动碳足迹计算

- 从 `ingredients` 集合查询食材碳系数
- 根据用量自动计算每份食材的碳足迹
- 汇总为食谱总碳足迹

### 2. 营养成分计算

- 自动计算热量、蛋白质、碳水、脂肪
- 基于食材数据库的营养信息
- 支持按人份调整

### 3. 素食 vs 肉食对比

- 每道食谱都标注对应的肉食版本
- 展示碳减排量和百分比
- 教育用户素食的环保价值

### 4. 智能推荐

- 根据季节推荐应季食谱
- 根据用户偏好推荐
- 按热度排序

### 5. 多维度搜索

- 关键词搜索
- 分类筛选
- 难度筛选
- 时间筛选
- 季节筛选

## 📁 文件结构

```
recipe-data-import/
├── index.js              # 云函数主代码
├── recipe-data.json      # 食谱数据文件（20道）
├── package.json          # 依赖配置
└── README.md             # 本文档
```

## 🔄 后续扩展计划

### 第二批（目标 100 道）

- [ ] 中式经典素食：扩展至 40 道
- [ ] 快手简餐：扩展至 25 道
- [ ] 高蛋白食谱：扩展至 20 道
- [ ] 节气食谱：补充至 24 道（覆盖 24 节气）
- [ ] 西式素食：扩展至 15 道
- [ ] 亚洲融合：扩展至 10 道

### 功能增强

- [ ] 用户自定义食谱
- [ ] 食谱评分系统
- [ ] 收藏功能
- [ ] 社区分享
- [ ] 智能配菜建议
- [ ] 购物清单生成

## ⚠️ 注意事项

1. **依赖关系**：

   - 需要先导入 `ingredients` 数据（素食食材库）
   - 碳足迹和营养计算依赖食材数据

2. **数据一致性**：

   - 食材名称必须与 `ingredients` 集合中的名称一致
   - 如果找不到食材，会使用默认估算值

3. **性能优化**：

   - 导入数据时控制了速度（100ms 间隔）
   - 避免触发云函数频率限制

4. **索引建议**：
   - 在 `recipes` 集合创建以下索引：
     - `recipeId` (唯一索引)
     - `category` + `usageCount`
     - `name` (文本索引)
     - `status`

## 🎯 使用场景

### 场景 1：用户浏览食谱

```javascript
// 按分类浏览
wx.cloud.callFunction({
  name: "recipe-data-import",
  data: {
    action: "getRecipesByCategory",
    category: "chinese_vegan",
  },
});
```

### 场景 2：搜索食谱

```javascript
// 搜索快手简餐
wx.cloud.callFunction({
  name: "recipe-data-import",
  data: {
    action: "searchRecipes",
    category: "quick_meal",
    maxTime: 15,
  },
});
```

### 场景 3：推荐食谱

```javascript
// 推荐春季食谱
wx.cloud.callFunction({
  name: "recipe-data-import",
  data: {
    action: "recommendRecipes",
    season: "spring",
    limit: 10,
  },
});
```

### 场景 4：查看食谱详情

```javascript
// 获取单个食谱
wx.cloud.callFunction({
  name: "recipe-data-import",
  data: {
    action: "getRecipeById",
    recipeId: "chinese_vegan_001",
  },
});
```

## 📞 技术支持

如有问题，请查看：

- 数据库架构文档：`Docs/数据库架构设计文档.md`
- 系统化数据构建策略：`Docs/基于"素食-减碳"理念的系统化数据构建策略.md`

---

**版本**: v1.0  
**创建时间**: 2025-10-14  
**最后更新**: 2025-10-14
