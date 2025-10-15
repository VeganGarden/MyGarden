# CHANGELOG - v4.0

## [4.0.0] - 2025-10-15

### 🚀 重大升级: 气候餐厅版

从"生态闭环"升级为"社会化减碳行动平台"

---

## Added (新增)

### 数据库

**新增 15 个集合 (+50%)**:

**餐厅域** (8 个):

- `restaurants` - 气候餐厅主表
- `restaurant_menus` - 餐厅菜单管理
- `restaurant_menu_items` - 低碳菜品明细
- `restaurant_orders` - 餐厅订单 (堂食+外卖)
- `restaurant_reservations` - 餐厅预订系统
- `restaurant_members` - 餐厅会员体系
- `restaurant_campaigns` - 餐厅营销活动
- `restaurant_reviews` - 餐厅评价系统

**碳普惠域** (4 个):

- `carbon_credits` - 统一碳积分账户
- `carbon_transactions` - 碳积分交易流水
- `carbon_exchange_records` - 碳交易所对接
- `carbon_milestones` - 碳减排里程碑

**政府合作域** (3 个):

- `government_programs` - 政府激励项目管理
- `public_participation` - 公众参与记录
- `esg_reports` - ESG 影响力报告

### 云函数

**新增 2 个云函数**:

- `restaurant-order-sync` - 餐厅订单同步到花园
- `restaurant-recommend` - 气候餐厅智能推荐

### 核心功能

1. **气候餐厅认证体系**

   - 四级认证 (铜牌/银牌/金牌/钻石)
   - 低碳菜品占比评估
   - 年度碳减排承诺追踪

2. **低碳菜品碳标识**

   - 三种标识方式 (红绿灯/碳评分/碳数值)
   - 完整碳足迹计算
   - 与肉类对比数据

3. **餐厅订单自动同步**

   - 订单 → meals 记录
   - 碳减排计算
   - 碳积分自动发放
   - 公众参与记录

4. **碳积分统一账户**

   - 花园 + 商城 + 餐厅三源合一
   - 等级体系 (新手 → 冠军)
   - 里程碑奖励机制

5. **政府碳普惠对接**
   - 政府项目管理
   - 用户激励机制
   - 餐厅补贴机制
   - 碳交易所数据上报

### 示例数据

**导入 12 条测试数据**:

- 3 家气候餐厅 (不同认证等级)
- 3 个低碳菜品 (完整碳数据)
- 3 个碳减排里程碑
- 1 个政府项目 (杭州碳普惠)
- 1 条餐厅订单
- 1 个碳积分账户

---

## Changed (变更)

### 数据库

**扩展 4 个现有集合**:

1. **users** - 新增字段

   - `restaurant` - 餐厅偏好与历史
   - `carbonProfile` - 碳减排画像
   - `publicParticipation` - 公众参与数据

2. **daily_stats** - 新增字段

   - `restaurant` - 餐厅就餐统计
   - `carbonCredits` - 每日碳积分变动

3. **data_dashboard** - 新增字段

   - `restaurantMetrics` - 餐厅业务指标
   - `carbonInclusiveMetrics` - 碳普惠指标
   - `governmentMetrics` - 政府项目指标

4. **practitioners** - 新增字段
   - `restaurantEndorsements` - 餐厅推荐数据

### 云函数

**更新 database 云函数**:

- 新增 `init-v4` action
- 新增 `migrate-v4` action
- 新增 `seed-v4-data` action
- 更新 `get-status` 支持 v4.0 检测

### 业务模式

**收入模式升级**:

- v3.0: B2C 电商为主
- v4.0: B2C + B2B + G2B 多元化

**服务对象扩展**:

- v3.0: C 端个人用户
- v4.0: C 端 + B 端餐厅 + G 端政府

---

## Technical Details (技术细节)

### 索引策略

**新增约 56 个索引**:

- P0 唯一索引: 15 个
- P1 常用索引: 39 个
- P2 优化索引: 2 个

**索引总数**: 93 个 (v3.0:37 + v4.0:56)

### 性能优化

- 地理位置查询 (2dsphere 索引)
- 复合索引优化高频查询
- 碳标签和节气查询优化

### 数据安全

- 餐厅财务数据加密
- 政府项目数据权限控制
- 碳交易记录审计日志

---

## Migration Guide (迁移指南)

### 从 v3.0 升级到 v4.0

**Step 1**: 部署更新的 database 云函数

```bash
tcb fn deploy database --dir ./cloudfunctions/database -e my-garden-app-env-4e0h762923be2f --force
```

**Step 2**: 创建新集合

```bash
tcb fn invoke database -e my-garden-app-env-4e0h762923be2f --params '{"action":"init-v4"}'
```

**Step 3**: 扩展现有集合

```bash
tcb fn invoke database -e my-garden-app-env-4e0h762923be2f --params '{"action":"migrate-v4"}'
```

**Step 4**: 导入示例数据

```bash
tcb fn invoke database -e my-garden-app-env-4e0h762923be2f --params '{"action":"seed-v4-data"}'
```

**Step 5**: 配置索引

- 参考: `Docs/数据库索引配置v4.0.md`

### 回滚方案

如需回滚到 v3.0:

```bash
# 手动删除 v4.0 新建的 15 个集合
# 在云开发控制台删除以下集合:
# restaurants, restaurant_*, carbon_*, government_*, public_*, esg_*
```

---

## Breaking Changes (破坏性变更)

### 无破坏性变更

v4.0 是**完全向后兼容**的:

- ✅ v3.0 所有功能保持不变
- ✅ v3.0 所有数据保持不变
- ✅ v3.0 所有 API 保持不变

v4.0 是**纯增量升级**:

- ✨ 新增餐厅业态
- ✨ 新增碳普惠功能
- ✨ 新增政府对接能力

---

## Contributors (贡献者)

- MyGarden 技术团队
- 九悦素供业务团队
- AI 编码助手

---

## Documentation (文档)

**新增文档** (7 份):

1. 数据库架构升级方案 v4.0-气候餐厅版.md
2. 数据库 v4.0 升级-执行指南.md
3. 数据库索引配置 v4.0.md
4. v4.0 示例数据说明.md
5. 🎉 数据库 v4.0 升级完成.md
6. 🌍 数据库 v4.0 升级-完全完成报告.md
7. README-数据库 v4.0.md

**更新文档** (1 份):

- 数据库架构设计文档-完整版.md

---

## Comparison (版本对比)

| 特性   | v3.0     | v4.0            |
| ------ | -------- | --------------- |
| 集合数 | 30       | 45 (+50%)       |
| 域数   | 8        | 11 (+38%)       |
| 业态   | 2        | 4 (+100%)       |
| 年收入 | ¥320 万  | ¥720 万 (+125%) |
| 壁垒   | 3-5 年   | 5-10 年         |
| 定位   | 生态闭环 | 社会平台        |

---

## Roadmap (路线图)

### Q4 2025

- [x] v4.0 技术开发 ✅
- [ ] 索引配置
- [ ] 功能测试
- [ ] 试点餐厅招募

### Q1 2026

- [ ] 20-50 家餐厅上线
- [ ] 政府项目对接
- [ ] 用户突破 5,000

### Q2 2026

- [ ] 扩展至 100 家餐厅
- [ ] 用户突破 20,000
- [ ] 首份 ESG 报告

### Q3-Q4 2026

- [ ] 多城市扩展
- [ ] 餐厅突破 500 家
- [ ] 用户突破 100,000
- [ ] 年收入 ¥720 万

---

## 🌱 结束语

> **v4.0, 不只是版本号的升级**  
> **更是战略的升维, 使命的升华**
>
> **从"做生意"到"做事业"**  
> **从"追求利润"到"创造价值"**  
> **从"服务用户"到"推动社会变革"**
>
> **Let's Change the World!** 🌍

---

**发布日期**: 2025-10-15  
**版本**: 4.0.0  
**代号**: Climate Restaurant (气候餐厅)  
**状态**: Released ✅
