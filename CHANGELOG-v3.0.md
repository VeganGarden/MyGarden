# 变更日志 - v3.0

## [3.0.0] - 2025-10-15

### 🎉 重大升级 - 九悦融合版

#### 新增功能

##### 电商域 (7 个新集合)

- **products** - 商品主表

  - 支持践行者认证
  - 中医体质适配
  - 节气推荐标签
  - 完整规格管理

- **shopping_cart** - 购物车

  - 智能体质提示
  - 组合推荐

- **product_reviews** - 商品评价

  - 践行者标识
  - 详细评分

- **inventory** - 库存管理

  - 智能补货建议
  - 节气需求预测

- **promotions** - 营销活动

  - 体质定向营销
  - 节气营销
  - 碳减排激励

- **coupons** - 优惠券

  - 花园行为触发
  - 灵活发放规则

- **user_coupons** - 用户优惠券
  - 多渠道获取
  - 状态管理

##### 运营域 (2 个新集合)

- **data_dashboard** - 统一数据看板

  - 花园+商城融合指标
  - 智能洞察

- **business_rules** - 业务规则配置
  - 积分转换规则
  - 推荐规则
  - 营销规则

#### 字段扩展 (7 个集合)

##### users 扩展

- `+ ecommerce` - 商城关联数据

  - customerLevel (客户分层)
  - rfm (RFM 模型)
  - purchasePreferences (购物偏好)
  - vipLevel (会员等级)

- `+ pointsSystem` - 积分互通

  - gardenPoints (花园积分)
  - shopPoints (商城积分)
  - totalPoints (总积分)

- `+ jiuyue` - 九悦特有字段
  - dietaryNeeds (饮食需求)
  - purchaseScenarios (购买场景)
  - customerServiceRecords (客服记录)
  - referralInfo (推荐关系)

##### user_profiles_extended 扩展

- `+ jiuyueProfile` - 九悦客户画像
  - consumerPersona (消费画像)
  - valueLabels (价值观标签)
  - shoppingHabits (购物习惯)

##### ingredients 扩展

- `+ ecommerceLink` - 电商链接
  - availableProducts (可购买商品)
  - priceHistory (价格追踪)
  - purchaseStats (购买统计)

##### recipes 扩展

- `+ shoppingFeature` - 一键购买

  - purchaseList (购买清单)
  - oneClickBuy (一键购买)

- `+ monetization` - 商业化
  - isSponsored (冠名)
  - affiliateProducts (联营)

##### practitioners 扩展

- `+ commercialization` - 商业化能力
  - recommendedProducts (推荐商品)
  - earnings (收益统计)
  - influence (影响力)

##### daily_stats 扩展

- `+ shopping` - 购物数据
  - ordersCount (订单数)
  - totalSpent (消费金额)
  - shoppingCarbonFootprint (购物碳足迹)

##### orders 扩展

- `+ gardenIntegration` - 花园集成

  - carbonReductionEarned (碳减排)
  - pointsEarned (积分)
  - syncedToGarden (同步状态)

- `+ recommendation` - 推荐来源

  - practitionerReferralId (践行者推荐)
  - recipeId (食谱推荐)

- `+ userFeedback` - 用户反馈
  - satisfaction (满意度)
  - willRepurchase (复购意愿)

#### 新增云函数

- **product-recommend** - 商品推荐引擎

  - 多维度推荐 (体质/节气/践行者/个性化)
  - 智能排序

- **order-sync** - 订单同步

  - 自动同步到花园
  - 计算碳足迹
  - 更新积分

- **product-data-import** - 商品数据导入
  - 批量导入
  - 自动创建库存

#### 示例数据

- 5 个九悦示例商品
  - 有机豆腐、有机糙米、西兰花
  - 黑芝麻核桃粉、素食酱油

#### 文档更新

- `Docs/数据库架构升级方案v3.0-九悦融合版.md`
- `数据库v3.0升级-执行摘要.md`
- `数据库v3.0升级-执行指南.md`
- `Docs/数据库索引配置v3.0.md`
- `Docs/索引创建-复制粘贴版v3.0.md`
- `数据库v3.0升级-完成报告.md`
- `🎉数据库v3.0升级完成.md`
- `v3.0升级-下一步行动清单.md`
- `README-数据库v3.0.md`

### 技术改进

- 数据库管理云函数支持 init-v3 和 migrate-v3
- 完善的预览和回滚机制
- 详细的错误处理

### 性能优化

- 索引设计优化 (37 个新索引)
- 查询字段精简
- 分页加载策略

---

## [2.0.0] - 2025-10-14

### 新增 - 践行者智慧库

- 7 个智慧域集合
- 100 位践行者档案体系
- 中医智慧融合

---

## [1.2.0] - 2025-01

### 新增 - 基础功能

- 14 个核心集合
- 碳足迹追踪
- 虚拟花园
- 植物模板系统

---

## 升级指引

### 从 v2.0 升级到 v3.0

```bash
# 1. 部署云函数
tcb fn deploy database --dir ./cloudfunctions/database --force

# 2. 创建新集合
tcb fn invoke database --params '{"action":"init-v3"}'

# 3. 迁移现有集合
tcb fn invoke database --params '{"action":"migrate-v3","params":{"action":"migrate"}}'

# 4. 验证升级
tcb fn invoke database --params '{"action":"get-status"}'

# 5. 配置索引 (需在控制台手动完成)
参考: Docs/索引创建-复制粘贴版v3.0.md
```

---

**维护**: MyGarden × 九悦素供 联合团队  
**联系**: 查看项目文档
