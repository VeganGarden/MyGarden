# 肉类碳足迹数据导入云函数 (meat-data-import)

## 📖 功能说明

批量导入肉类碳足迹数据到云开发数据库，为"素食 vs 肉食"对比计算提供基础数据支持。

## 🎯 数据内容

### 肉类产品库（81 种）

| 分类     | 数量  | 碳足迹范围      | 示例                       |
| -------- | ----- | --------------- | -------------------------- |
| 红肉类   | 20 种 | 7-64 kg CO₂e/kg | 牛肉、羊肉、猪肉各部位     |
| 禽肉类   | 12 种 | 4-7 kg CO₂e/kg  | 鸡肉、鸭肉、鹅肉、火鸡     |
| 水产类   | 27 种 | 3-14 kg CO₂e/kg | 鱼类、虾蟹、贝类、软体动物 |
| 加工肉类 | 15 种 | 8-64 kg CO₂e/kg | 香肠、腊肉、火腿、培根     |
| 乳制品   | 7 种  | 2-12 kg CO₂e/kg | 已包含在 ingredients 中    |

**总计**：81 种（包含重复去除后）

### 数据完整性

每种肉类产品包含：

- ✅ 中文名称 (name)
- ✅ 英文名称 (nameEn)
- ✅ 分类 (category) - red_meat/poultry/seafood/processed_meat
- ✅ 子分类 (subcategory) - 更细致的分类
- ✅ 碳足迹 (carbonFootprint) - kg CO₂e/kg
- ✅ 营养成分 (nutrition) - 热量/蛋白质/碳水/脂肪
- ✅ 生产方式 (productionMethod) - conventional/organic/farmed/wild_caught/processed
- ✅ 产地 (region) - china_average/import
- ✅ 数据来源 (sources) - 权威文献引用
- ✅ 对比组 (comparisonGroup) - 用于对比分析
- ✅ 素食替代品 (veganAlternatives) - 推荐的素食替代
- ✅ 状态 (status)

## 🚀 支持的操作

### 1. 导入肉类数据 (`importMeatData`)

批量导入肉类到 `meat_products` 集合。

**参数：**

```json
{
  "action": "importMeatData"
}
```

**返回示例：**

```json
{
  "code": 0,
  "message": "肉类数据导入完成",
  "summary": {
    "total": 81,
    "inserted": 81,
    "skipped": 0,
    "failed": 0
  }
}
```

### 2. 统计肉类数量 (`countMeatData`)

查看当前肉类库统计信息。

**参数：**

```json
{
  "action": "countMeatData"
}
```

**返回示例：**

```json
{
  "code": 0,
  "data": {
    "total": 81,
    "byCategory": [
      { "_id": "red_meat", "count": 20, "avgCarbon": 25.3 },
      { "_id": "poultry", "count": 12, "avgCarbon": 6.2 },
      { "_id": "seafood", "count": 27, "avgCarbon": 6.5 },
      { "_id": "processed_meat", "count": 15, "avgCarbon": 15.8 }
    ],
    "bySubcategory": [...]
  }
}
```

### 3. 获取素食替代品 (`getMeatAlternatives`)

查询特定肉类的素食替代品及减排数据。

**参数：**

```json
{
  "action": "getMeatAlternatives",
  "meatName": "牛肉"
}
```

**返回示例：**

```json
{
  "code": 0,
  "data": {
    "meatProduct": {
      "name": "牛肉（牛腩）",
      "carbonFootprint": 60.5,
      "nutrition": {...}
    },
    "alternatives": [
      {
        "name": "豆腐",
        "carbonFootprint": 1.2,
        "reduction": 59.3,
        "reductionPercent": 98
      },
      {
        "name": "香菇",
        "carbonFootprint": 0.6,
        "reduction": 59.9,
        "reductionPercent": 99
      }
    ],
    "message": "用豆腐替代牛肉（牛腩），可减排59.3kg CO₂（减少98%）"
  }
}
```

### 4. 清空肉类库 (`clearMeatData`)

**⚠️ 危险操作** - 删除所有肉类数据，需要确认参数。

**参数：**

```json
{
  "action": "clearMeatData",
  "confirm": "YES_I_AM_SURE"
}
```

## 📊 碳足迹对比

### 典型对比数据

| 肉类   | 碳足迹 | 素食替代 | 替代品碳足迹 | 减排量 | 减排比例 |
| ------ | ------ | -------- | ------------ | ------ | -------- |
| 牛肉   | 60.5   | 豆腐     | 1.2          | 59.3   | 98%      |
| 羊肉   | 24.5   | 香菇     | 0.6          | 23.9   | 98%      |
| 猪肉   | 7.2    | 豆腐干   | 1.5          | 5.7    | 79%      |
| 鸡肉   | 6.1    | 大豆蛋白 | 1.0          | 5.1    | 84%      |
| 三文鱼 | 11.9   | 魔芋     | 0.3          | 11.6   | 97%      |
| 虾     | 11.8   | 魔芋虾   | 0.3          | 11.5   | 97%      |

### 关键发现

- 🥩 **牛肉是碳排放最高的食物**：60.5 kg CO₂e/kg（是豆腐的 50 倍）
- 🐑 **羊肉次之**：24.5 kg CO₂e/kg
- 🐷 **猪肉相对较低**：7.2 kg CO₂e/kg（但仍是豆腐的 6 倍）
- 🐔 **鸡肉是肉类中最低碳的选择**：6.1 kg CO₂e/kg
- 🦐 **养殖虾的碳足迹很高**：11.8 kg CO₂e/kg（接近三文鱼）
- 🐚 **贝类是海鲜中的低碳选择**：2.9-3.7 kg CO₂e/kg

**素食替代可减排 79%-99%！**

## 🚀 使用方法

### 方法 1：云开发控制台测试

1. 登录腾讯云开发控制台
2. 进入云函数 → `meat-data-import`
3. 点击"测试"
4. 输入参数：
   ```json
   {
     "action": "importMeatData"
   }
   ```
5. 点击"测试运行"

### 方法 2：命令行调用

```bash
# 导入肉类数据
tcb fn invoke meat-data-import --params '{"action":"importMeatData"}'

# 查看统计
tcb fn invoke meat-data-import --params '{"action":"countMeatData"}'

# 查询素食替代品
tcb fn invoke meat-data-import --params '{"action":"getMeatAlternatives","meatName":"牛肉"}'
```

## ⏱️ 执行时间

- **首次导入**：约 30-40 秒（81 种肉类）
- **重复导入**：约 5-10 秒（全部跳过）
- **超时设置**：建议 60 秒

## 📝 数据来源

### 权威数据源

1. **FAO (2021)**：联合国粮农组织食品碳足迹数据库
2. **Our World in Data**：基于 Poore & Nemecek (2018) Science 研究
3. **IPCC (2019)**：气候变化与土地特别报告
4. **中国食物成分表（第 6 版）**：营养成分数据

### 计算范围

碳足迹包括：

- 养殖/种植阶段
- 饲料生产
- 加工阶段
- 运输（平均值）
- 包装（对于加工产品）

**单位**：kg CO₂e / kg（二氧化碳当量）

## 🔍 注意事项

1. **重复导入处理**

   - 根据肉类名称（`name`）判断是否已存在
   - 已存在的记录会自动跳过
   - 不会更新已有数据

2. **性能优化**

   - 每 10 条数据暂停 100ms，避免超时
   - 适合批量导入场景

3. **数据准确性**

   - 所有数据来自权威研究
   - 标注了数据来源和更新时间
   - 定期复核和更新

4. **与素食数据的配合**
   - 素食替代品需在 `ingredients` 集合中存在
   - `getMeatAlternatives` 功能会自动关联查询

## 📦 部署说明

在 `cloudbaserc.json` 中配置：

```json
{
  "name": "meat-data-import",
  "timeout": 60,
  "envVariables": {},
  "runtime": "Nodejs16.13",
  "memorySize": 256
}
```

**部署命令：**

```bash
cd /Users/zhangshichao/WeChatProjects/MyGarden
tcb fn deploy meat-data-import --force
```

## 🎯 执行流程

```
1. 部署云函数
   ↓
2. 在控制台测试导入
   ↓
3. 查看返回结果和日志
   ↓
4. 验证数据库（meat_products集合）
   ↓
5. 测试替代品查询功能
   ↓
6. 完成！可在碳足迹对比功能中使用
```

## 🆘 常见问题

**Q: 导入失败，提示"集合不存在"**
A: 集合会在首次插入数据时自动创建，无需预先创建。

**Q: 某些肉类的碳足迹数据差异很大？**
A: 是的，不同生产方式、产地、饲养方式都会影响碳足迹。我们使用的是中国平均值。

**Q: 为什么要导入肉类数据？**
A: 用于对比计算。只有知道肉食的碳足迹，才能准确展示素食的减排效果。

**Q: 数据是否会定期更新？**
A: 建议每年复核一次，参考最新的碳足迹研究数据。

## 🔮 未来计划

- [ ] 支持有机肉类 vs 普通肉类对比
- [ ] 添加不同产地的碳足迹差异
- [ ] 支持季节性碳足迹调整
- [ ] 增加更多素食替代品映射

---

**版本**: v1.0.0  
**最后更新**: 2025-10-14  
**维护**: MyGarden Team
