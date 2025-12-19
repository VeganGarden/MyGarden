---
name: 一餐饭基准值管理全面研究与设计方案
overview: 深入研究一餐饭碳排放基准值管理的所有影响因素，设计完整的数据模型和管理系统。考虑区域饮食习惯差异、一日三餐差异、一餐饭结构等因素，暂时作为参考数据而非直接用于计算。
todos:
  - id: research-factors
    content: 完成影响因素全面分析：区域饮食习惯、一日三餐、一餐饭结构等
    status: completed
  - id: design-data-model
    content: 设计一餐饭基准值数据模型：包含所有维度的完整数据结构
    status: completed
    dependencies:
      - research-factors
  - id: design-ui
    content: 设计独立管理页面：列表页、详情页、添加/编辑页
    status: completed
    dependencies:
      - design-data-model
  - id: research-regional-diet
    content: 区域饮食习惯差异研究：收集各区域典型一餐饭结构数据
    status: pending
  - id: research-meal-time
    content: 一日三餐差异研究：分析早餐、午餐、晚餐的碳排放差异
    status: pending
  - id: research-meal-structure
    content: 一餐饭结构类型研究：确定结构类型划分标准和典型结构
    status: pending
  - id: research-soup-impact
    content: 汤类碳排放影响研究：分析汤类对一餐饭碳排放的影响程度
    status: pending
  - id: estimate-baselines
    content: 初始基准值估算：基于研究结果估算各维度组合的基准值
    status: pending
    dependencies:
      - research-regional-diet
      - research-meal-time
      - research-meal-structure
      - research-soup-impact
  - id: implement-database
    content: 实现数据库模型：创建数据结构和索引
    status: completed
    dependencies:
      - design-data-model
  - id: implement-backend
    content: 实现后端功能：查询、管理、导入等云函数
    status: completed
    dependencies:
      - implement-database
  - id: implement-frontend
    content: 实现前端页面：独立的一餐饭基准值管理页面
    status: completed
    dependencies:
      - design-ui
      - implement-backend
  - id: data-entry
    content: 数据录入与验证：录入初始基准值数据并验证合理性
    status: pending
    dependencies:
      - estimate-baselines
      - implement-frontend
  - id: documentation
    content: 编写文档：研究报告、使用指南、技术文档
    status: pending
    dependencies:
      - data-entry
---

# 一

餐饭基准值管理全面研究与设计方案

## 研究背景与目标

### 1.1 问题识别

当前基准值管理针对**单道菜**（`meat_simple` / `meat_full`），主要考虑**区域电网因子差异**。但实际用餐场景更加复杂：

1. **一餐饭包含多个组成部分**：多道菜、主食、甜点、汤等
2. **区域饮食习惯差异大**：如广东人吃饭一定有汤，北方地区主食量大
3. **一日三餐差异明显**：早餐、午餐、晚餐的菜品结构和分量不同
4. **其他影响因素**：餐厅类型、消费场景、季节等

这些因素都可能造成碳排放数值差异很大，需要在基准值管理中全面考虑。

### 1.2 研究目标

1. **全面梳理影响因素**：识别所有影响一餐饭碳排放的因素
2. **设计完整数据模型**：支持多维度、多层次的基准值管理
3. **建立独立管理体系**：设计专门的页面和功能管理一餐饭基准值
4. **暂时作为参考数据**：初期不作为计算依据，而是用于分析和参考

## 影响因素全面分析

### 2.1 核心维度（必选）

#### 维度1：基准值类型

- `dish` - 单道菜级别（现有，保持不变）
- `meal_set` - 一餐饭级别（新增）

#### 维度2：餐次类型（Meal Time）

**新增维度**，区分一日三餐：| 餐次类型 | 代码 | 说明 | 典型结构 ||---------|------|------|---------|| 早餐 | `breakfast` | 早餐 | 主食+配菜+饮品（通常无汤） || 午餐 | `lunch` | 午餐 | 主食+多道菜+汤（可选） || 晚餐 | `dinner` | 晚餐 | 主食+多道菜+汤（部分地区必选） |**研究问题**：

- 早餐、午餐、晚餐的碳排放差异有多大？
- 不同区域的一日三餐结构差异如何？

#### 维度3：区域（Region）

**现有维度**，但需要考虑区域饮食习惯：| 区域 | 代码 | 饮食习惯特点 | 可能影响 ||-----|------|------------|---------|| 华北 | `north_china` | 主食量大，面食为主 | 主食碳排放占比高 || 东北 | `northeast` | 菜品分量大，炖菜多 | 烹饪时间较长 || 华东 | `east_china` | 菜品种类多，清淡 | 烹饪方式多样 || 华中 | `central_china` | 口味重，汤菜多 | 汤类碳排放 || 华南（广东） | `south_china` | **必喝汤**，菜品种类多 | 汤类碳排放明显 || 西北 | `northwest` | 面食为主，肉类多 | 食材和烹饪差异 || 西南 | `southwest` | 口味重，火锅多 | 特殊烹饪方式 |**研究问题**：

- 区域饮食习惯对碳排放的影响程度？
- 需要按区域细分还是用"是否有汤"等属性描述？

#### 维度4：用能方式（Energy Type）

**现有维度**：

- `electric` - 全电厨房
- `gas` - 燃气厨房
- `mixed` - 混合用能

### 2.2 扩展维度（可选，用于精细化）

#### 维度5：一餐饭结构类型（Meal Structure）

**新增维度**，描述一餐饭的典型结构：| 结构类型 | 代码 | 说明 | 典型菜品数量 ||---------|------|------|------------|| 简餐 | `simple` | 1-2道菜+主食 | 2-3个菜品 || 标准餐 | `standard` | 2-3道菜+主食+汤（可选） | 3-5个菜品 || 正餐 | `full` | 3-4道菜+主食+汤+甜点（可选） | 5-7个菜品 || 宴席 | `banquet` | 多道菜+主食+汤+甜点+水果 | 8+个菜品 |**研究问题**：

- 一餐饭结构类型与现有 `meat_simple`/`meat_full` 的关系？
- 是否需要新增这个维度，还是可以映射到现有类型？

#### 维度6：是否有汤（Has Soup）

**新增属性**，针对区域饮食习惯差异：| 属性值 | 代码 | 说明 | 影响 ||-------|------|------|------|| 有汤 | `with_soup` | 一餐包含汤类 | 增加汤类碳排放 || 无汤 | `without_soup` | 一餐不包含汤类 | 无额外汤类碳排放 |**研究问题**：

- 是否需要单独记录"是否有汤"，还是通过区域自动判断？
- 汤类对一餐饭碳排放的影响程度？

#### 维度7：餐厅类型（Restaurant Type）

**现有可选维度**，考虑是否需要细化：| 餐厅类型 | 代码 | 特点 | 可能影响 ||---------|------|------|---------|| 快餐店 | `fast_food` | 标准化，包装多 | 包装碳排放占比高 || 正餐厅 | `formal` | 现做现卖，菜品多样 | 烹饪能耗高 || 自助餐 | `buffet` | 菜品多，浪费可能高 | 食物浪费碳排放 || 火锅店 | `hotpot` | 特殊烹饪方式，用餐时间长 | 能源消耗特殊 |

#### 维度8：消费场景（Consumption Scenario）

**新增维度**：| 消费场景 | 代码 | 说明 | 影响 ||---------|------|------|------|| 堂食 | `dine_in` | 在餐厅用餐 | 无额外包装和配送 || 外卖 | `takeaway` | 外卖配送 | 增加包装和配送碳排放 || 打包 | `packaged` | 打包带走 | 增加包装碳排放 |

### 2.3 其他可能影响因素

#### 季节因素（Season）

- **研究问题**：不同季节的菜品选择和烹饪方式是否有差异？
- **影响程度**：可能较小，是否需要在基准值中体现？

#### 人均消费水平（Consumption Level）

- **研究问题**：消费水平与碳排放是否相关？
- **影响程度**：可能通过菜品结构间接体现，是否单独记录？

#### 用餐人数（Party Size）

- **研究问题**：多人用餐时人均碳排放是否不同（共享菜品）？
- **影响程度**：需要研究，但可能通过订单结构体现。

## 数据模型设计

### 3.1 一餐饭基准值数据结构

```typescript
// 基准值类型
enum BaselineType {
  DISH = 'dish',           // 单道菜级别
  MEAL_SET = 'meal_set'    // 一餐饭级别
}

// 餐次类型
enum MealTime {
  BREAKFAST = 'breakfast',  // 早餐
  LUNCH = 'lunch',          // 午餐
  DINNER = 'dinner'         // 晚餐
}

// 一餐饭结构类型
enum MealStructure {
  SIMPLE = 'simple',        // 简餐
  STANDARD = 'standard',    // 标准餐
  FULL = 'full',            // 正餐
  BANQUET = 'banquet'       // 宴席
}

// 是否有汤
enum HasSoup {
  WITH_SOUP = 'with_soup',
  WITHOUT_SOUP = 'without_soup',
  OPTIONAL = 'optional'     // 可选
}

// 消费场景
enum ConsumptionScenario {
  DINE_IN = 'dine_in',      // 堂食
  TAKEAWAY = 'takeaway',    // 外卖
  PACKAGED = 'packaged'     // 打包
}

// 一餐饭基准值分类信息（包含所有可能维度）
interface MealSetBaselineCategory {
  // 核心维度（必填）
  mealTime: MealTime                    // 餐次类型（必填）
  region: Region                        // 区域（必填）
  energyType: EnergyType                // 用能方式（必填）
  
  // 扩展维度（可选，但建议填写以提高数据可信度）
  mealStructure?: MealStructure         // 一餐饭结构类型（可选）
  hasSoup?: HasSoup                     // 是否有汤（可选，默认根据区域判断）
  restaurantType?: RestaurantType       // 餐厅类型（可选）
  consumptionScenario?: ConsumptionScenario  // 消费场景（可选）
  city?: string                         // 城市（可选，用于进一步细分）
  season?: 'spring' | 'summer' | 'autumn' | 'winter' | 'all_year'  // 季节（可选）
  consumptionLevel?: 'low' | 'medium' | 'high'  // 人均消费水平（可选）
}

// 一餐饭基准值分解数据（更详细）
interface MealSetBreakdown {
  // 主要组成部分
  mainDishes: number          // 主菜碳排放（kg CO₂e）
  stapleFood: number          // 主食碳排放（kg CO₂e）
  soup: number                // 汤类碳排放（kg CO₂e）
  dessert: number             // 甜点碳排放（kg CO₂e）
  beverage: number            // 饮品碳排放（kg CO₂e）
  
  // 其他组成部分
  sideDishes: number          // 配菜碳排放（kg CO₂e）
  condiments: number          // 调料碳排放（kg CO₂e）
  
  // 加工环节
  cookingEnergy: number       // 烹饪能耗碳排放（kg CO₂e）
  packaging: number           // 包装碳排放（kg CO₂e）
  transport: number           // 运输碳排放（kg CO₂e，外卖场景）
  other: number               // 其他碳排放（kg CO₂e）
}

// 完整的一餐饭基准值数据结构
interface MealSetBaseline {
  _id?: string
  baselineId: string          // 唯一标识，包含所有维度
  
  // 分类信息（包含所有可能维度）
  category: MealSetBaselineCategory
  
  // 基准值数据
  carbonFootprint: {
    value: number             // 总基准值（kg CO₂e）
    uncertainty: number       // 不确定性（±kg CO₂e）
    confidenceInterval: {
      lower: number
      upper: number
    }
    unit: 'kg CO₂e'
  }
  
  // 分解数据（更详细的一餐饭结构）
  breakdown: MealSetBreakdown
  
  // 一餐饭典型结构描述（用于展示和参考）
  typicalStructure: {
    mainDishesCount: number   // 主菜数量
    stapleFoodType: string    // 主食类型（米饭/面食等）
    hasSoup: boolean          // 是否有汤
    hasDessert: boolean       // 是否有甜点
    totalItems: number        // 总菜品数量
    description: string       // 结构描述（如："2道主菜+米饭+汤"）
  }
  
  // 数据来源
  source: BaselineSource
  
  // 版本管理
  version: string
  effectiveDate: Date
  expiryDate: Date
  status: 'active' | 'archived' | 'draft'
  
  // 使用说明（重要：默认不用于计算）
  usage: {
    isForCalculation: boolean    // 是否用于计算（默认false，仅参考）
    enabledAt?: Date             // 启用计算的时间（当isForCalculation=true时）
    enabledBy?: string           // 启用计算的操作人
    notes: string                // 使用说明
    researchStatus: 'researching' | 'completed' | 'validated'  // 研究状态
    observationPeriod?: {        // 观察期信息
      startDate: Date            // 观察期开始时间
      endDate?: Date             // 观察期结束时间（如果已完成观察）
      notes: string              // 观察期说明
    }
  }
  
  // 元数据
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy: string
  notes?: string
  
  // 使用统计
  usageCount: number
  lastUsedAt?: Date
}
```



### 3.2 BaselineId 生成规则

一餐饭基准值的 `baselineId` 需要包含所有关键维度：

```javascript
// 格式：meal_set_{mealTime}_{region}_{energyType}_{mealStructure}_{hasSoup}_{restaurantType}_{consumptionScenario}_{city}_{season}_{consumptionLevel}
// 示例：meal_set_lunch_south_china_electric_standard_with_soup_formal_dine_in_guangzhou_all_year_medium

function generateMealSetBaselineId(category) {
  const parts = [
    'meal_set',
    category.mealTime,
    category.region,
    category.energyType,
    category.mealStructure || 'default',
    category.hasSoup || 'default',
    category.restaurantType || 'default',
    category.consumptionScenario || 'default',
    category.city || 'default',
    category.season || 'default',
    category.consumptionLevel || 'default'
  ];
  return parts.join('_');
}
```



### 3.3 数据库集合设计

**重要决策**：使用**独立的数据库集合** `meal_set_baselines`，避免对现有 `carbon_baselines` 集合和业务运行造成影响。**集合名称**：`meal_set_baselines`**与现有集合的关系**：

- 与 `carbon_baselines`（单道菜基准值）完全独立
- 数据结构相似但不完全相同（包含更多维度）
- 可以通过 `baselineType` 字段区分，但不混用数据

### 3.4 数据库索引设计

```javascript
// 主查询索引（复合索引）
db.meal_set_baselines.createIndex({
  'category.mealTime': 1,               // 餐次类型
  'category.region': 1,                 // 区域
  'category.energyType': 1,             // 用能方式
  status: 1
});

// 区域饮食习惯索引
db.meal_set_baselines.createIndex({
  'category.region': 1,
  'category.hasSoup': 1,
  status: 1
});

// 餐次类型索引
db.meal_set_baselines.createIndex({
  'category.mealTime': 1,
  'category.mealStructure': 1,
  status: 1
});

// 唯一性索引（baselineId）
db.meal_set_baselines.createIndex({
  baselineId: 1
}, { unique: true });

// 版本查询索引
db.meal_set_baselines.createIndex({
  version: 1,
  status: 1
});

// 时间范围查询索引
db.meal_set_baselines.createIndex({
  effectiveDate: 1,
  expiryDate: 1
});
```



## 管理功能设计

### 4.1 独立管理页面

#### 4.1.1 一餐饭基准值列表页

**路径**: `/admin-web/src/pages/carbon/MealSetBaselineList.tsx`**功能特性**：

- **多维度筛选**：
- 餐次类型（早餐/午餐/晚餐）
- 区域（6大区域+全国平均）
- 用能方式（全电/燃气/混合）
- 一餐饭结构类型（简餐/标准餐/正餐/宴席）
- 是否有汤（有汤/无汤/可选）
- 消费场景（堂食/外卖/打包）
- 状态（active/archived/draft）
- **列表展示**：
- 显示关键维度：餐次类型、区域、结构类型、是否有汤
- 显示基准值、不确定性、置信区间
- 显示典型结构描述
- 显示研究状态（研究中/已完成/已验证）
- 显示是否用于计算
- **操作按钮**：
- 查看详情（展示完整的一餐饭结构）
- 编辑
- 归档/激活
- 标记为"用于计算"（当数据验证完成后）

#### 4.1.2 一餐饭基准值详情页

**路径**: `/admin-web/src/pages/carbon/MealSetBaselineDetail.tsx`**功能特性**：

- **分类信息展示**：
- 基准值类型（固定为"一餐饭"）
- 餐次类型、区域、用能方式
- 一餐饭结构类型、是否有汤
- 消费场景、餐厅类型
- **基准值数据展示**：
- 总基准值、不确定性、置信区间
- 详细分解数据（主菜、主食、汤、甜点、饮品等）
- **典型结构展示**：
- 主菜数量、主食类型
- 是否有汤、是否有甜点
- 总菜品数量
- 结构描述
- **研究信息展示**：
- 数据来源
- 研究状态
- 是否用于计算
- 研究说明和备注

#### 4.1.3 一餐饭基准值添加/编辑页

**路径**: `/admin-web/src/pages/carbon/MealSetBaselineAdd.tsx` / `MealSetBaselineEdit.tsx`**功能特性**：

- **分类信息表单**：
- 餐次类型（必选）
- 区域（必选）
- 用能方式（必选）
- 一餐饭结构类型（可选）
- 是否有汤（可选，支持根据区域自动填充）
- 消费场景（可选）
- 餐厅类型（可选）
- **基准值数据表单**：
- 总基准值（必填）
- 不确定性（必填）
- 置信区间（自动计算或手动输入）
- **分解数据表单**（更详细）：
- 主菜碳排放
- 主食碳排放
- 汤类碳排放
- 甜点碳排放
- 饮品碳排放
- 配菜碳排放
- 调料碳排放
- 烹饪能耗碳排放
- 包装碳排放
- 运输碳排放（外卖场景）
- 其他碳排放
- **典型结构表单**：
- 主菜数量
- 主食类型
- 是否有汤（复选框）
- 是否有甜点（复选框）
- 总菜品数量
- 结构描述（自动生成或手动输入）
- **使用设置**：
- 是否用于计算（默认false）
- 研究状态（研究中/已完成/已验证）
- 研究说明

### 4.2 数据导入功能

支持批量导入一餐饭基准值数据：

- **CSV/Excel 模板**：包含所有维度字段
- **数据验证**：验证分解数据总和是否等于基准值
- **区域自动填充**：根据区域自动判断"是否有汤"等属性

### 4.3 数据分析功能

- **对比分析**：对比不同区域、不同餐次的一餐饭基准值
- **结构分析**：分析一餐饭中各个组成部分的碳排放占比
- **趋势分析**：分析基准值的变化趋势（如果有历史数据）

## 研究任务清单

### 5.1 数据收集研究

#### 任务1：区域饮食习惯差异研究

- **目标**：研究不同区域的饮食习惯对一餐饭碳排放的影响
- **方法**：
- 收集各区域典型一餐饭结构数据
- 分析是否有汤、主食类型、菜品数量等差异
- 估算这些差异对碳排放的影响程度
- **输出**：区域饮食习惯差异研究报告

#### 任务2：一日三餐差异研究

- **目标**：研究早餐、午餐、晚餐的碳排放差异
- **方法**：
- 收集典型早餐、午餐、晚餐的结构数据
- 分析菜品类型、分量、烹饪方式差异
- 计算一日三餐的碳排放差异
- **输出**：一日三餐碳排放差异研究报告

#### 任务3：一餐饭结构类型研究

- **目标**：确定一餐饭结构类型的划分标准
- **方法**：
- 研究简餐、标准餐、正餐、宴席的典型结构
- 确定每种结构的典型菜品数量和类型
- 估算每种结构的基准碳排放值
- **输出**：一餐饭结构类型划分标准

#### 任务4：汤类碳排放影响研究

- **目标**：研究汤类对一餐饭碳排放的影响程度
- **方法**：
- 收集典型汤类的碳排放数据
- 分析不同区域汤类的差异
- 计算汤类对总碳排放的占比
- **输出**：汤类碳排放影响分析报告

### 5.2 基准值估算研究

#### 任务5：初始基准值估算

- **目标**：基于现有数据和研究成果，估算初始基准值
- **方法**：
- 基于现有单道菜基准值，估算一餐饭基准值
- 考虑一餐饭结构、区域差异、餐次差异
- 标注不确定性范围
- **输出**：初始基准值估算表

### 5.3 数据验证研究

#### 任务6：数据合理性验证

- **目标**：验证估算的基准值是否合理
- **方法**：
- 对比行业统计数据
- 对比学术研究数据
- 进行敏感性分析
- **输出**：数据合理性验证报告

## 实施路线图

### Phase 1：研究与设计（2-3周）

- [ ] 完成影响因素分析
- [ ] 完成数据模型设计
- [ ] 完成管理功能设计
- [ ] 输出研究报告

### Phase 2：数据收集与研究（3-4周）

- [ ] 区域饮食习惯差异研究
- [ ] 一日三餐差异研究
- [ ] 一餐饭结构类型研究
- [ ] 汤类碳排放影响研究
- [ ] 初始基准值估算

### Phase 3：系统开发（2-3周）

- [ ] **创建独立的数据库集合** `meal_set_baselines`
- [ ] 数据库模型实现（包含所有维度）
- [ ] 管理后台页面开发（独立的页面和路由）
- [ ] 数据导入功能开发（支持所有维度字段）
- [ ] 数据分析功能开发
- [ ] 查询云函数开发（独立的查询接口）

### Phase 4：数据录入与验证（1-2周）

- [ ] 录入初始基准值数据
- [ ] 数据验证和校准
- [ ] 完善研究说明

### Phase 5：测试与文档（1周）

- [ ] 功能测试
- [ ] 文档编写
- [ ] 用户培训

## 关键决策（已确定）

### 决策1：数据库集合设计 ✅

**已确定**：使用**独立的数据库集合** `meal_set_baselines`**理由**：

- ✅ 避免对现有 `carbon_baselines` 集合和业务运行造成影响
- ✅ 数据结构不同（包含更多维度），独立管理更清晰
- ✅ 便于独立开发和测试，降低风险
- ✅ 便于后续维护和扩展

### 决策2：维度设计颗粒度 ✅

**已确定**：系统建设时**包含所有可能维度理由**：

- ✅ 数据可信度更高：记录完整的维度信息，便于后续分析
- ✅ 灵活性更好：可以根据实际使用情况调整哪些维度真正重要
- ✅ 可扩展性强：未来需要新增维度时，已有结构支持
- ✅ 研究价值：完整的数据有助于研究各维度对碳排放的影响

**所有维度清单**：

1. 餐次类型（Meal Time）- 必填
2. 区域（Region）- 必填
3. 用能方式（Energy Type）- 必填
4. 一餐饭结构类型（Meal Structure）- 可选
5. 是否有汤（Has Soup）- 可选
6. 餐厅类型（Restaurant Type）- 可选
7. 消费场景（Consumption Scenario）- 可选
8. 城市（City）- 可选（用于进一步细分）
9. 季节（Season）- 可选（如需要）
10. 人均消费水平（Consumption Level）- 可选（如需要）

### 决策3：使用策略 ✅

**已确定**：暂时**不用于计算**，先观察一段时间**理由**：

- ✅ 降低风险：避免不准确的数据影响现有计算逻辑
- ✅ 数据积累：先积累真实数据，验证基准值的准确性
- ✅ 研究完善：在研究过程中不断完善数据模型和基准值
- ✅ 逐步验证：通过对比分析，逐步验证数据的合理性

**使用状态管理**：

- 所有一餐饭基准值默认 `usage.isForCalculation = false`
- 当数据验证完成且观察期结束后，可以手动标记为 `true`
- 系统提供"标记为可用于计算"的功能，需要管理员权限

## 预期成果

1. **完整的研究报告**：覆盖所有影响因素的分析报告
2. **独立的数据模型**：支持所有可能维度的一餐饭基准值数据模型（`meal_set_baselines` 集合）
3. **独立的管理系统**：完全独立的一餐饭基准值管理页面和功能，不影响现有业务
4. **初始基准值数据**：基于研究估算的初始基准值数据（包含所有维度）
5. **使用指南**：如何使用一餐饭基准值的指南文档