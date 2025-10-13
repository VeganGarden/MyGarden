# 数据导入云函数 (data-import)

## 📖 功能说明

批量导入基础数据到云开发数据库，目前支持：

- **食材库导入**：191 种常见食材（含营养成分和碳足迹数据）

## 🎯 支持的操作

### 1. 导入食材数据 (`importIngredients`)

批量导入食材到 `ingredients` 集合。

**参数：**

```json
{
  "action": "importIngredients"
}
```

**返回示例：**

```json
{
  "code": 0,
  "message": "食材数据导入完成",
  "summary": {
    "total": 191,
    "inserted": 191,
    "skipped": 0,
    "failed": 0
  },
  "details": [...]
}
```

**特性：**

- ✅ 自动检测重复（根据食材名称）
- ✅ 自动添加时间戳
- ✅ 批量处理优化
- ✅ 详细的导入日志

### 2. 统计食材数量 (`countIngredients`)

查看当前食材库统计信息。

**参数：**

```json
{
  "action": "countIngredients"
}
```

**返回示例：**

```json
{
  "code": 0,
  "data": {
    "total": 191,
    "byCategory": [
      { "_id": "vegetables", "count": 95 },
      { "_id": "beans", "count": 25 },
      { "_id": "fruits", "count": 35 },
      { "_id": "grains", "count": 13 },
      { "_id": "nuts", "count": 18 },
      { "_id": "oils", "count": 8 },
      { "_id": "dairy", "count": 7 },
      { "_id": "eggs", "count": 3 },
      { "_id": "sweeteners", "count": 5 }
    ]
  }
}
```

### 3. 清空食材库 (`clearIngredients`)

**⚠️ 危险操作** - 删除所有食材数据，需要确认参数。

**参数：**

```json
{
  "action": "clearIngredients",
  "confirm": "YES_I_AM_SURE"
}
```

## 📊 食材数据覆盖

当前包含 **191 种** 常见食材：

| 分类                | 数量   | 说明                           |
| ------------------- | ------ | ------------------------------ |
| 蔬菜类 (vegetables) | ~95 种 | 叶菜、根茎、瓜果、菌菇、香料等 |
| 豆制品 (beans)      | ~25 种 | 豆腐、豆浆、豆干、各种豆类     |
| 水果类 (fruits)     | ~35 种 | 新鲜水果、干果                 |
| 谷物类 (grains)     | ~13 种 | 大米、面粉、燕麦、藜麦等       |
| 坚果种子 (nuts)     | ~18 种 | 核桃、杏仁、各种种子           |
| 食用油 (oils)       | 8 种   | 植物油类                       |
| 乳制品 (dairy)      | 7 种   | 牛奶、酸奶、植物奶             |
| 蛋类 (eggs)         | 3 种   | 鸡蛋、鸭蛋、鹌鹑蛋             |
| 甜味剂 (sweeteners) | 5 种   | 蜂蜜、糖类                     |

## 🚀 使用方法

### 方法 1：云开发控制台测试

1. 登录腾讯云开发控制台
2. 进入云函数 → `data-import`
3. 点击"测试"
4. 输入参数：
   ```json
   {
     "action": "importIngredients"
   }
   ```
5. 点击"测试运行"

### 方法 2：命令行调用

```bash
# 导入食材数据
tcb fn invoke data-import --params '{"action":"importIngredients"}'

# 查看统计
tcb fn invoke data-import --params '{"action":"countIngredients"}'
```

### 方法 3：前端调用

```javascript
const result = await wx.cloud.callFunction({
  name: "data-import",
  data: {
    action: "importIngredients",
  },
});

console.log("导入结果:", result.result);
```

## ⏱️ 执行时间

- **首次导入**：约 20-30 秒（191 种食材）
- **重复导入**：约 5-10 秒（全部跳过）
- **超时设置**：建议 60 秒

## 📝 数据结构

每条食材记录包含：

```javascript
{
  "name": "豆腐",              // 中文名称
  "nameEn": "Tofu",            // 英文名称
  "category": "beans",         // 分类
  "carbonFootprint": 1.2,      // 碳足迹 (kg CO₂e/kg)
  "nutrition": {               // 营养成分 (每100g)
    "calories": 76,            // 热量 (kcal)
    "protein": 8.1,            // 蛋白质 (g)
    "carbs": 1.9,              // 碳水化合物 (g)
    "fat": 4.8                 // 脂肪 (g)
  },
  "platformMappings": {},      // 第三方平台映射
  "status": "active",          // 状态
  "createdAt": Date,           // 创建时间（自动添加）
  "updatedAt": Date            // 更新时间（自动添加）
}
```

## 🔍 注意事项

1. **重复导入处理**

   - 根据食材名称（`name`）判断是否已存在
   - 已存在的记录会自动跳过
   - 不会更新已有数据

2. **性能优化**

   - 每 10 条数据暂停 100ms，避免超时
   - 适合批量导入场景

3. **错误处理**

   - 单条失败不影响整体
   - 返回详细的成功/失败列表

4. **数据来源**
   - 营养数据参考《中国食物成分表》
   - 碳足迹数据参考国际研究报告

## 📦 部署说明

在 `cloudbaserc.json` 中配置：

```json
{
  "name": "data-import",
  "timeout": 60,
  "envVariables": {},
  "runtime": "Nodejs16.13",
  "memorySize": 256
}
```

**部署命令：**

```bash
cd /Users/zhangshichao/WeChatProjects/MyGarden
tcb fn deploy data-import --force
```

## 🎯 执行流程

```
1. 部署云函数
   ↓
2. 在控制台测试导入
   ↓
3. 查看返回结果和日志
   ↓
4. 验证数据库（ingredients集合）
   ↓
5. 完成！可以在小程序中使用
```

## 🆘 常见问题

**Q: 导入失败，提示"集合不存在"**
A: 请先运行 `database` 云函数创建集合。

**Q: 导入很慢**
A: 正常现象，191 条数据需要 20-30 秒。可在日志中看到进度。

**Q: 如何删除所有数据重新导入？**
A: 使用 `clearIngredients` 操作，必须传入确认参数。

**Q: 数据来源是否权威？**
A: 基于公开的营养数据库和碳足迹研究整理，供参考使用。

## 🔮 未来计划

- [ ] 支持食谱数据导入
- [ ] 支持测试用户数据导入
- [ ] 支持 CSV 文件导入
- [ ] 支持增量更新
- [ ] 支持数据导出

---

**版本**: v1.0.0  
**最后更新**: 2025-10-13  
**维护**: MyGarden Team
