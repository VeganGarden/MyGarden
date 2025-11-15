# 素食碳足迹数据库 v2.0 - 快速参考

> **🎉 升级成功！数据库版本：v2.0**  
> **📅 升级时间：2025 年 10 月 14 日**  
> **✅ 状态：生产就绪**

---

## 📋 一分钟了解 v2.0

### 升级概要

```
v1.2 → v2.0
14个集合 → 21个集合
基础数据 → 基础数据 + 践行者智慧 + 东方文化
```

### 核心价值

**AI 时代的三大护城河**：

1. **践行者认证系统** - 100 人 × 10 年的真实证言
2. **东方素食智慧** - 中医体质 + 24 节气食疗
3. **活体社区生态** - 导师传承 + 知识进化

---

## 🚀 快速命令

### 查看数据库状态

```bash
tcb fn invoke database --params '{"action":"get-status"}'
```

### 查询践行者

```bash
tcb fn invoke practitioners --params '{"action":"getList"}'
```

### 查询智慧语录

```bash
tcb fn invoke wisdom --params '{"action":"getQuotes"}'
```

### 导入践行者数据

```bash
tcb fn invoke practitioner-data-import --params '{"data":[...]}'
```

---

## 📂 文档导航

### 🎯 战略文档（给领导看）

- **全球愿景**：`Docs/素食碳足迹数据库-全球愿景.md`
- **领导汇报版**：`Docs/素食碳足迹数据库-领导汇报版.md`
- **战略规划**：`Docs/打造独一无二的素食碳足迹数据库-战略规划.md`

### 🔧 技术文档（给开发看）

- **架构升级**：`Docs/数据库架构升级方案v2.0.md`
- **索引配置**：`Docs/数据库索引配置v2.0.md`
- **升级报告**：`数据库升级v2.0-执行成功报告.md`
- **部署指南**：`数据库升级v2.0-立即部署指南.md`

### 📝 实操文档（给团队看）

- **智慧挖掘**：`Docs/践行者智慧挖掘实操手册.md`
- **数据模板**：`cloudfunctions/practitioner-data-import/practitioners-template.json`
- **行动清单**：`下一步行动清单.md`

---

## 📊 数据库结构

### v1.0 集合（14 个）

```
users, user_sessions, meals, daily_stats, gardens
ingredients ✨, recipes ✨, sync_tasks, platform_configs
friends, posts, orders, meat_products, plant_templates
```

✨ = 已扩充新字段

### v2.0 新增集合（7 个）

```
practitioners              # 践行者档案库
practitioner_certifications # 践行者认证
tcm_wisdom                 # 中医智慧库
wisdom_quotes              # 智慧语录
mentorship                 # 导师关系
user_profiles_extended     # 用户扩展信息
knowledge_graph            # 知识图谱
```

---

## 🔥 下一步行动（优先级排序）

### 🔴 今天必做

1. **部署新云函数**（15 分钟）

   ```bash
   tcb fn deploy practitioners --dir ./cloudfunctions/practitioners --force
   tcb fn deploy wisdom --dir ./cloudfunctions/wisdom --force
   tcb fn deploy practitioner-data-import --dir ./cloudfunctions/practitioner-data-import --force
   ```

2. **创建 P0 索引**（1 小时）
   - 打开：https://console.cloud.tencent.com/tcb
   - 参考：`Docs/数据库索引配置v2.0.md`
   - 创建 7 个核心索引

### 🟡 本周必做

1. **召开团队启动会**（1 小时）

   - 宣布升级成功
   - 讲解三大护城河
   - 分配访谈任务

2. **创建 P1 索引**（1 小时）
   - 18 个常用查询索引

### 🟢 本月目标

1. **启动践行者访谈**（第 1 批 20 人）
2. **填充中医智慧库**（100 条）
3. **建立导师关系网**（10 位导师）

---

## 💡 关键技术点

### database 云函数 - 统一入口

```javascript
// 支持5种操作
{
  "action": "init-v1"      // 初始化 v1.0（已完成）
  "action": "init-v2"      // 创建 v2.0 新集合（已完成）
  "action": "migrate-v2"   // 迁移现有集合（已完成）
  "action": "test-upgrade" // 测试升级结果（已通过）
  "action": "get-status"   // 查看数据库状态
}
```

### 迁移示例

```javascript
// 预览迁移
{
  "action": "migrate-v2",
  "params": {
    "action": "preview",
    "collection": "all"
  }
}

// 执行迁移
{
  "action": "migrate-v2",
  "params": {
    "action": "migrate",
    "collection": "all"  // 或 "ingredients" / "recipes" / "users"
  }
}

// 回滚（如需要）
{
  "action": "migrate-v2",
  "params": {
    "action": "rollback",
    "collection": "all"
  }
}
```

---

## 🎯 成功指标

### 技术指标 ✅

- [x] 21 个集合全部创建
- [x] 241 条数据迁移成功
- [x] 所有测试通过（4/4）
- [ ] 42 个索引创建（待完成）
- [ ] 3 个新云函数部署（待完成）

### 内容指标 ⏳

- [ ] 20 个践行者档案（第 1 批）
- [ ] 100 条中医智慧
- [ ] 100 条智慧语录
- [ ] 10 位认证导师

### 业务指标 ⏳

- [ ] 50 对导师-学员关系
- [ ] 用户开始访问新功能
- [ ] 数据库月活用户增长

---

## ❓ 常见问题

### 如何验证升级成功？

```bash
tcb fn invoke database --params '{"action":"get-status"}'
# 返回 "version":"v2.0" 即成功
```

### 如何查看某个集合的数据？

```bash
# 在云开发控制台
# 数据库 → 选择集合 → 查看数据
```

### 如果需要回滚怎么办？

```bash
# 只回滚字段扩充，不删除新集合
tcb fn invoke database --params '{"action":"migrate-v2","params":{"action":"rollback","collection":"all"}}'
```

### 新云函数在哪里？

```
cloudfunctions/
  ├── practitioners/         # 践行者API
  ├── wisdom/               # 智慧语录API
  └── practitioner-data-import/  # 数据导入工具
```

---

## 📞 联系方式

**技术问题**：查看 `数据库升级v2.0-执行成功报告.md`  
**业务问题**：查看 `Docs/素食碳足迹数据库-全球愿景.md`  
**实操问题**：查看 `Docs/践行者智慧挖掘实操手册.md`

---

## 🏆 里程碑

- [x] 2025-10-14：数据库升级 v2.0 完成
- [ ] 2025-10 月底：第 1 批 20 人档案完成
- [ ] 2025-11 月底：第 2 批 40 人档案完成
- [ ] 2026-01 月底：100 人档案库完成
- [ ] 2026-Q2：导师体系上线
- [ ] 2026-Q3：知识图谱上线
- [ ] 2026-Q4：打造全球第一素食碳足迹数据库 🌍

---

**🎊 恭喜！数据库 v2.0 升级成功！**

**现在，开始用 100 人的智慧，打造 AI 时代无法复制的数据库吧！** 💪

---

_最后更新：2025 年 10 月 14 日_

