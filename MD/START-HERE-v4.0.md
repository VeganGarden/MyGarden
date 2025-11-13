# 🌍 START HERE - v4.0 使用指南

> **👋 欢迎使用数据库 v4.0 - 社会化减碳行动平台！**  
> **📅 更新时间**: 2025-10-15  
> **✨ 当前状态**: 数据库 ready, 索引待配置

---

## 🎯 v4.0 是什么？

### 一句话概括

**让健康文明的日常善行, 变成可见、可得、可复制的社会价值**

### 核心业态

```
v4.0 = 我的花园 + 九悦商城 + 气候餐厅 + 碳普惠平台
```

| 业态            | 场景            | 用户      | 核心功能           |
| --------------- | --------------- | --------- | ------------------ |
| 我的花园        | 知识学习+碳追踪 | C 端      | 虚拟花园+碳足迹    |
| 九悦商城        | 家庭购物        | C 端      | 精准推荐+供应链    |
| **气候餐厅** ✨ | 外出就餐        | C 端+B 端 | 低碳菜单+认证      |
| **碳普惠** ✨   | 社会激励        | 政府+公众 | 积分 → 补贴 → 权益 |

---

## 🚀 快速开始 (3 步)

### Step 1: 配置索引 (必做, 1 小时)

**为什么必须**: 保证数据完整性和查询性能

**操作**:

1. 打开: https://console.cloud.tencent.com/tcb
2. 参考: `Docs/数据库索引配置v4.0.md`
3. 创建 15 个 P0 核心索引 (v4.0)

**核心索引**:

- restaurants.restaurantId
- restaurant_menu_items.menuItemId
- restaurant_orders.orderId
- carbon_credits.userId
- carbon_transactions.transactionId
- carbon_milestones.milestoneId
- government_programs.programId
- public_participation.recordId
- esg_reports.reportId
- (+ 其他 6 个)

### Step 2: 部署云函数 (10 分钟)

```bash
export CLOUDBASE_ENVID=my-garden-app-env-4e0h762923be2f

# 餐厅订单同步
tcb fn deploy restaurant-order-sync --dir ./cloudfunctions/restaurant-order-sync -e $CLOUDBASE_ENVID --force

# 餐厅推荐引擎
tcb fn deploy restaurant-recommend --dir ./cloudfunctions/restaurant-recommend -e $CLOUDBASE_ENVID --force
```

### Step 3: 测试功能 (15 分钟)

```bash
# 测试餐厅推荐
tcb fn invoke restaurant-recommend -e $CLOUDBASE_ENVID --params '{"scene":"nearby","latitude":30.27,"longitude":120.15}'

# 测试订单同步
tcb fn invoke restaurant-order-sync -e $CLOUDBASE_ENVID --params '{"orderId":"RO-20251015001"}'

# 查看示例餐厅
# 在云开发控制台执行:
db.collection('restaurants').get()
```

---

## 📊 v4.0 有什么？

### 数据库

- ✅ **45 个集合** (v3.0 的 30 个 + v4.0 新增 15 个)
- ✅ **465 条数据** (包括 12 条 v4.0 示例数据)
- ✅ **4 大业态** (花园 + 商城 + 餐厅 + 碳普惠)

### 示例数据 (可立即测试)

**气候餐厅** (3 家):

- 悦素堂 (金牌, 人均 ¥88, 减排 12.5 吨)
- 本来素食 (银牌, 人均 ¥45, 减排 6.8 吨)
- 绿意小厨 (铜牌, 人均 ¥38, 减排 2.3 吨)

**低碳菜品** (3 个):

- 寒露时蔬养生煲 ¥48 (碳足迹 0.65kg, 减排 84.5%)
- 九悦有机豆腐家常菜 ¥28 (碳足迹 0.48kg, 减排 93.3%)
- 素食盖浇饭(糙米) ¥22 (碳足迹 0.52kg, 减排 93.9%)

**政府项目** (1 个):

- 杭州市碳普惠试点 (预算 ¥50 万, 3250 人参与)

### 核心功能

**气候餐厅**:

- ✅ 四级认证 (铜牌/银牌/金牌/钻石)
- ✅ 低碳菜单标识
- ✅ 碳减排数据追踪
- ✅ 与九悦供应链打通

**碳普惠**:

- ✅ 统一碳积分账户
- ✅ 等级体系 (新手 → 冠军)
- ✅ 里程碑奖励
- ✅ 政府补贴机制

**数据闭环**:

- ✅ 餐厅订单 → 花园同步
- ✅ 碳积分自动发放
- ✅ 公众参与记录
- ✅ 植物成长激励

---

## 🔥 立即可测试

### 测试 1: 查询气候餐厅

```javascript
db.collection("restaurants")
  .where({ "climateCertification.isCertified": true })
  .get();
```

**预期**: 返回 3 家餐厅

---

### 测试 2: 查询金牌餐厅

```javascript
db.collection("restaurants")
  .where({ "climateCertification.certificationLevel": "gold" })
  .get();
```

**预期**: 返回悦素堂

---

### 测试 3: 查询超低碳菜品

```javascript
db.collection("restaurant_menu_items")
  .where({ "carbonData.carbonLabel": "ultra_low" })
  .get();
```

**预期**: 返回豆腐家常菜 (碳评分 95 分)

---

### 测试 4: 节气推荐菜品

```javascript
db.collection("restaurant_menu_items")
  .where({ "tags.solarTerms": "寒露" })
  .get();
```

**预期**: 返回时蔬养生煲

---

### 测试 5: 查看碳积分账户

```javascript
db.collection("carbon_credits").get();
```

**预期**: 返回 1 个账户, 总积分 1520

---

### 测试 6: 查看里程碑

```javascript
db.collection("carbon_milestones").where({ isActive: true }).get();
```

**预期**: 返回 3 个里程碑

---

### 测试 7: 查看政府项目

```javascript
db.collection("government_programs").where({ status: "active" }).get();
```

**预期**: 返回杭州碳普惠项目

---

## 📚 文档导航

### 🔴 必读 (立即查看)

1. **START-HERE-v4.0.md** (本文档) ⭐⭐⭐⭐⭐
2. **数据库 v4.0 升级-执行指南.md** ⭐⭐⭐⭐⭐
3. **v4.0 示例数据说明.md** ⭐⭐⭐⭐

### 🟡 推荐 (本周阅读)

4. **数据库索引配置 v4.0.md** ⭐⭐⭐⭐
5. **🎉 数据库 v4.0 升级完成.md** ⭐⭐⭐⭐
6. **README-数据库 v4.0.md** ⭐⭐⭐

### 🟢 深入 (深入了解)

7. **数据库架构升级方案 v4.0-气候餐厅版.md** ⭐⭐⭐⭐⭐
8. **数据库架构设计文档-完整版.md** ⭐⭐⭐⭐
9. **CHANGELOG-v4.0.md** ⭐⭐⭐

---

## 💡 常见问题

### Q: v4.0 与 v3.0 的主要区别？

**A**:

- v3.0: 花园 + 商城 (个人层面生态闭环)
- v4.0: 花园 + 商城 + **气候餐厅** + **碳普惠** (社会层面减碳平台)

核心扩展:

- ✨ 外出就餐场景
- ✨ 政府碳普惠对接
- ✨ B2B 餐饮供应链
- ✨ 社会化激励体系

---

### Q: 气候餐厅是什么？

**A**:

- 经过认证的低碳餐厅
- 提供低碳菜单, 标注碳足迹
- 用户就餐可获得碳积分
- 参与政府碳普惠项目

---

### Q: 碳普惠是什么？

**A**:

- 政府主导的碳减排激励机制
- 个人减排行为 → 碳积分
- 碳积分 → 政府补贴 + 公共权益
- 示例: 地铁 8 折, 景区 7 折

---

### Q: 现在可以使用 v4.0 功能吗？

**A**: 部分可用

- ✅ 可以查询数据 (餐厅、菜品、碳积分)
- ⏳ 配置索引后可使用全部功能
- ⏳ 部署云函数后可测试推荐和同步

---

### Q: 如何回滚到 v3.0？

**A**:
手动删除 v4.0 新建的 15 个集合即可, v3.0 数据不受影响

---

## 🎁 核心价值

### 对用户

- 📚 在花园学习素食知识
- 🛒 在商城购买优质食材
- 🍽️ 在餐厅享用低碳美食 ✨
- 🎁 积分可用于餐厅、地铁、景区 ✨
- 🌱 每一餐都浇灌虚拟花园

### 对餐厅

- 🏅 获得气候餐厅认证
- 📊 提升品牌形象
- 🎯 精准获客
- 💰 政府补贴 + 九悦供货

### 对政府

- 🌍 可量化的"双碳"成果
- 📋 ESG 披露真实案例
- 👥 社会动员机制
- 🏆 绿色城市名片

### 对九悦

- 💼 B2B 餐饮供应链 (+¥200 万)
- 📦 餐厅食材配送
- 🔗 会员数据打通

---

## 📞 获取帮助

**技术问题**: 查看 `数据库v4.0升级-执行指南.md`  
**业务问题**: 查看 `Docs/数据库架构升级方案v4.0-气候餐厅版.md`  
**索引配置**: 查看 `Docs/数据库索引配置v4.0.md`

---

## 🎊 Let's Go!

**数据库已 ready, 示例数据已导入, 云函数已准备！**

**现在就开始配置索引, 开启社会化减碳行动的新时代！**

**目标: 打造中国第一个社会化减碳行动平台！**

---

**创建时间**: 2025-10-15  
**状态**: ✅ Ready  
**下一步**: 配置索引 → 部署云函数 → 招募餐厅 → 对接政府

---

**🌍 让每一餐都成为改变世界的力量！🌱**
