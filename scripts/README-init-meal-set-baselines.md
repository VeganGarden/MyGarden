# 一餐饭基准值数据库初始化执行指南

## 快速执行

### 方法一：使用脚本（推荐）

```bash
# 只初始化集合和索引
./scripts/init-meal-set-baselines.sh

# 初始化集合、索引，并生成示例数据
./scripts/init-meal-set-baselines.sh --with-sample-data
```

### 方法二：通过控制台执行

1. 登录腾讯云开发控制台
2. 进入「云函数」管理
3. 找到 `database` 函数
4. 点击「测试」
5. 输入测试参数并执行：

**初始化集合和索引**：
```json
{
  "action": "initMealSetBaselinesCollection"
}
```

**生成示例数据**（可选）：
```json
{
  "action": "initMealSetBaselineSampleData"
}
```

## 执行结果说明

### 成功情况

如果索引创建成功，会看到：
```
✅ 索引创建成功: 主查询索引
✅ 索引创建成功: 区域饮食习惯索引
...
索引创建完成
成功: 8 个
```

### 需要手动创建索引

如果索引创建失败（腾讯云限制），会看到：
```
⚠️  索引创建失败（可能需要手动创建）: 主查询索引
   错误: [错误信息]
...
⚠️  重要提示：
   8 个索引需要在控制台手动创建
```

**解决方法**：
1. 登录腾讯云开发控制台
2. 进入「数据库」管理
3. 找到 `meal_set_baselines` 集合
4. 点击「索引管理」
5. 参考「索引配置表.csv」中的配置手动创建索引

## 索引配置参考

所有索引配置已记录在「索引配置表.csv」中，搜索 `meal_set_baselines` 即可找到。

主要索引：
1. 主查询索引：category.mealTime + category.region + category.energyType + status
2. baselineId唯一索引：baselineId（唯一）
3. 区域饮食习惯索引：category.region + category.hasSoup + status
4. 餐次类型索引：category.mealTime + category.mealStructure + status
5. 版本查询索引：version + status
6. 时间范围查询索引：effectiveDate + expiryDate
7. 使用状态索引：usage.isForCalculation + usage.researchStatus + status
8. 创建时间索引：createdAt（降序）

## 验证初始化结果

### 1. 验证集合

在控制台「数据库」管理中，确认 `meal_set_baselines` 集合已创建。

### 2. 验证索引

进入集合的「索引管理」，确认所有8个索引已创建（或按照提示手动创建）。

### 3. 验证数据（如果生成了示例数据）

查询集合，确认有数据记录（如果执行了示例数据生成）。

## 注意事项

1. **索引创建**：如果代码创建索引失败，必须在控制台手动创建，否则会影响查询性能
2. **示例数据**：示例数据会生成216条记录，如果集合已有数据会跳过
3. **数据状态**：所有初始数据的 `usage.isForCalculation = false`，不用于实际计算

