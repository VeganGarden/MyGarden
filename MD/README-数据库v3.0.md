# 素食生态数据库 v3.0 - 快速参考

> **🎉 升级完成！数据库版本：v3.0 - 九悦融合版**  
> **📅 升级时间：2025 年 10 月 15 日**  
> **✅ 状态：集合已就绪,索引待配置**

---

## 📋 一分钟了解 v3.0

### 版本演进

```
v1.0 → v2.0 → v3.0
14个集合 → 21个集合 → 30个集合
基础数据 → 智慧库 → 生态闭环
```

### 核心升级

**v3.0 = 我的花园 + 九悦素供**

```
知识学习 (花园) + 精准购物 (商城) = 完整生态闭环
```

---

## 🚀 快速命令

### 查看数据库状态

```bash
tcb fn invoke database --params '{"action":"get-status"}'
```

**预期结果**:

```json
{
  "version": "v3.0",
  "summary": {
    "v1": { "total": 14, "complete": true },
    "v2": { "total": 7, "complete": true },
    "v3": { "total": 9, "complete": true }
  }
}
```

### 商品推荐 (需先配置索引)

```bash
tcb fn invoke product-recommend --params '{"userId":"用户ID","scene":"home"}'
```

### 订单同步到花园

```bash
tcb fn invoke order-sync --params '{"orderId":"订单ID"}'
```

### 导入示例商品

```bash
tcb fn invoke product-data-import --params '{"mode":"sample"}'
```

---

## 📂 数据库结构

### v3.0 完整集合 (30 个)

#### 用户域 (3 个)

```
users ✨                  - 用户主表 (已扩展)
user_sessions            - 会话表
user_profiles_extended ✨ - 用户扩展档案 (已扩展)
```

#### 碳足迹域 (2 个)

```
meals                    - 餐食记录
daily_stats ✨           - 每日统计 (已扩展)
```

#### 花园域 (2 个)

```
gardens                  - 花园表
plant_templates          - 植物模板
```

#### 基础数据域 (3 个)

```
ingredients ✨           - 食材库 (已扩展)
recipes ✨               - 食谱库 (已扩展)
meat_products            - 肉类对比库
```

#### 智慧域 (6 个)

```
practitioners ✨         - 践行者档案库 (已扩展)
practitioner_certifications - 践行者认证
tcm_wisdom              - 中医智慧库
wisdom_quotes           - 智慧语录库
mentorship              - 导师陪伴关系
knowledge_graph         - 知识图谱
```

#### 🆕 电商域 (7 个)

```
products                - 商品主表
shopping_cart           - 购物车
product_reviews         - 商品评价
inventory               - 库存管理
promotions              - 营销活动
coupons                 - 优惠券
user_coupons            - 用户优惠券
```

#### 🆕 运营域 (2 个)

```
data_dashboard          - 统一数据看板
business_rules          - 业务规则配置
```

#### 社交域 (2 个)

```
friends                 - 好友关系
posts                   - 动态表
```

#### 同步域 (2 个)

```
sync_tasks              - 同步任务
platform_configs        - 平台配置
```

#### 商城域 (1 个)

```
orders ✨               - 订单表 (已扩展)
```

✨ = v3.0 已扩展字段

---

## 🔥 核心功能

### 功能 1: 精准商品推荐

**多维度推荐引擎**:

- ✅ 中医体质匹配
- ✅ 24 节气推荐
- ✅ 践行者认证推荐
- ✅ 个性化历史推荐

**云函数**: product-recommend

### 功能 2: 订单自动同步花园

**数据流动**:

```
用户下单 → 计算碳足迹 → 创建meals记录 →
更新积分 → 浇灌植物 → 游戏化激励
```

**云函数**: order-sync

### 功能 3: 积分互通系统

**双向积分**:

- 花园碳减排 → 商城优惠
- 商城消费 → 花园积分
- 统一积分池,灵活转换

**数据表**: users.pointsSystem

### 功能 4: 践行者带货

**商业闭环**:

```
践行者认证商品 → 用户信任购买 →
践行者获得佣金 → 激励更多内容
```

**数据表**:

- products.linkedData.certifiedByPractitioners
- practitioners.commercialization

---

## ⏳ 待完成工作

### 🔴 P0 - 今天必做 (30 分钟)

**配置 7 个核心唯一索引**

| 集合           | 索引字段         | 说明           |
| -------------- | ---------------- | -------------- |
| products       | productId        | 商品唯一 ID    |
| shopping_cart  | userId           | 用户唯一购物车 |
| inventory      | productId+specId | 库存唯一标识   |
| promotions     | promotionId      | 活动唯一 ID    |
| coupons        | couponId         | 优惠券唯一 ID  |
| user_coupons   | code             | 券码唯一       |
| business_rules | ruleId           | 规则唯一 ID    |

**配置地址**: https://console.cloud.tencent.com/tcb

**参考文档**: `Docs/索引创建-复制粘贴版v3.0.md`

### 🟡 P1 - 本周完成 (1-2 小时)

配置其余 30 个索引,提升查询性能

### 🟢 P2 - 本月完成

1. 部署新云函数
2. 导入商品数据
3. 测试核心功能
4. 开发商城小程序

---

## 📊 数据库容量规划

### 当前状态

| 域             | 集合数 | 数据量 | 存储   |
| -------------- | ------ | ------ | ------ |
| v1.0 基础      | 14     | 401 条 | <1GB   |
| v2.0 智慧      | 7      | 30 条  | <100MB |
| v3.0 电商+运营 | 9      | 0 条   | 待导入 |

### 预期规模 (10 万用户)

| 项目       | v2.0        | v3.0         | 增量      |
| ---------- | ----------- | ------------ | --------- |
| 存储空间   | 80GB        | 120GB        | +40GB     |
| 月度成本   | ¥510        | ¥865         | +¥357     |
| 月度收入   | ¥8 万       | ¥27 万       | +¥19 万   |
| **净收益** | **¥7.5 万** | **¥26.1 万** | **+248%** |

---

## 💡 关键技术点

### 统一数据管理入口

**database 云函数** - 支持 8 种操作:

```bash
# v1.0 操作
{"action": "init-v1"}      # 初始化基础集合
{"action": "get-status"}   # 查看数据库状态

# v2.0 操作
{"action": "init-v2"}      # 创建智慧域集合
{"action": "migrate-v2"}   # 扩展v2.0字段

# v3.0 操作 (新增)
{"action": "init-v3"}      # 创建电商+运营域集合 ✅
{"action": "migrate-v3"}   # 扩展v3.0字段 ✅

# 通用操作
{"action": "test-upgrade"} # 测试升级结果
{"action": "seed-sample-data"} # 导入示例数据
```

### 数据打通机制

**订单 → 花园同步**:

1. 用户下单 (orders)
2. 云函数自动触发 (order-sync)
3. 创建 meals 记录
4. 更新 daily_stats
5. 增加积分
6. 浇灌植物

**花园 → 商城推荐**:

1. 用户体质测试 (user_profiles_extended)
2. 记录饮食偏好 (meals)
3. 智能推荐商品 (product-recommend)
4. 提升转化率 3-5 倍

---

## 🎁 示例数据

### 5 个示例商品

已准备在 `cloudfunctions/product-data-import/sample-products.json`

| 商品         | 体质适配       | 节气推荐  | 价格  |
| ------------ | -------------- | --------- | ----- |
| 有机豆腐     | 阴虚/燥热      | 立秋/白露 | ¥12.8 |
| 有机糙米     | 平和/气虚      | 谷雨/小满 | ¥38.8 |
| 西兰花       | 平和/气虚/阳虚 | 立春/清明 | ¥9.9  |
| 黑芝麻核桃粉 | 阳虚/气虚/血虚 | 立秋/立冬 | ¥58.0 |
| 素食酱油     | 全体质         | 四季      | ¥18.8 |

---

## 📖 完整文档导航

### 🎯 决策文档

- **执行摘要**: `数据库v3.0升级-执行摘要.md` (快速决策)
- **完整方案**: `Docs/数据库架构升级方案v3.0-九悦融合版.md` (详细设计)

### 🔧 技术文档

- **执行指南**: `数据库v3.0升级-执行指南.md` (逐步操作)
- **索引配置**: `Docs/数据库索引配置v3.0.md` (索引详解)
- **快速配置**: `Docs/索引创建-复制粘贴版v3.0.md` (快速清单)
- **CSV 表格**: `Docs/索引配置表v3.0.csv` (导入 Excel)

### 📝 总结报告

- **完成报告**: `数据库v3.0升级-完成报告.md` (升级总结)
- **庆祝页面**: `🎉数据库v3.0升级完成.md` (成果展示)

---

## 🎯 成功指标

### 技术指标

- [x] 30 个集合全部创建 ✅
- [x] 7 个集合字段扩展完成 ✅
- [x] 3 个新云函数创建 ✅
- [ ] 37 个索引配置完成 (⏳ 待完成)
- [ ] 5 个示例商品导入 (待配置索引后)

### 业务指标 (3 个月目标)

- [ ] 商城 GMV 突破 ¥50 万/月
- [ ] 推荐转化率 > 20%
- [ ] 用户留存率 > 60%
- [ ] 复购率 > 50%

---

## ❓ 常见问题

### Q: 如何验证升级成功？

```bash
tcb fn invoke database --params '{"action":"get-status"}'
# 返回 "version":"v3.0" 即成功
```

### Q: 索引必须全部创建吗？

不是。按优先级:

- P0 (7 个) - 必须,保证数据完整性
- P1 (28 个) - 重要,提升性能
- P2 (2 个) - 可选,优化体验

### Q: 如何导入九悦现有商品？

1. 准备商品数据 JSON 文件
2. 参考 `sample-products.json` 格式
3. 执行: `tcb fn invoke product-data-import --params '{"products":[...]}'`

### Q: 如何回滚到 v2.0？

```bash
# 回滚字段扩展
tcb fn invoke database --params '{"action":"migrate-v3","params":{"action":"rollback"}}'

# 手动删除v3.0新建的9个集合
```

---

## 📞 支持

**技术文档**: `Docs/` 目录  
**云函数**: `cloudfunctions/` 目录  
**数据模板**: `cloudfunctions/product-data-import/sample-products.json`

---

## 🏆 里程碑

- [x] 2025-10-14: v2.0 升级完成 (践行者智慧库)
- [x] 2025-10-15: v3.0 升级完成 (九悦融合) 🎉
- [ ] 2025-10-20: 索引配置完成
- [ ] 2025-10-31: 商城功能上线
- [ ] 2025-11-30: 数据打通验证
- [ ] 2026-01: 正式运营
- [ ] 2026-Q2: 月 GMV 突破 ¥50 万

---

## 🎊 恭喜!

**数据库 v3.0 核心升级已完成!**

**下一步**:

1. 配置 37 个索引 (参考: `Docs/索引创建-复制粘贴版v3.0.md`)
2. 导入示例商品测试
3. 开发商城小程序

**愿景**:

> **打造中国第一个"知识+购物"的素食生态平台**

---

_最后更新：2025 年 10 月 15 日_
