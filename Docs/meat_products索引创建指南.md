# meat_products 集合索引创建指南

> **快速创建 meat_products 集合的 4 个索引**
> 
> **预计时间**：3 分钟  
> **优先级**：高（对比功能必需）

---

## 📋 索引清单

meat_products 集合需要创建 **4 个索引**：

| 序号 | 索引名称 | 字段 | 优先级 | 用途 |
|------|---------|------|--------|------|
| 29 | name_unique | name (唯一) | ⭐⭐⭐⭐⭐ | 查询肉类、确保唯一 |
| 30 | category_subcategory_index | category + subcategory | ⭐⭐⭐⭐ | 分类统计 |
| 31 | carbonFootprint_index | carbonFootprint | ⭐⭐⭐ | 碳足迹排序 |
| 32 | status_index | status | ⭐⭐⭐ | 过滤活跃数据 |

---

## 🚀 创建步骤

### 前置条件

- [ ] 已执行 `database` 云函数创建 `meat_products` 集合
- [ ] 已执行 `meat-data-import` 云函数导入81种肉类数据

### 操作流程

1. 登录云开发控制台：https://console.cloud.tencent.com/tcb
2. 选择环境：`my-garden-app-env-4e0h762923be2f`
3. 左侧菜单：数据库
4. 找到并点击 `meat_products` 集合
5. 点击"索引管理"标签
6. 按下面的配置创建4个索引

---

## 📝 索引配置（复制粘贴）

### 索引 1/4：name_unique ⭐⭐⭐⭐⭐

**点击"新建索引"，填写：**

```
索引名称: name_unique
```

**字段配置：**
```
字段名: name
排序: 升序 (1)
☑️ 勾选"唯一索引"
```

**说明**：
- 用于查询特定肉类产品（如"牛肉"）
- 确保肉类名称唯一，避免重复数据
- 支持 `getMeatAlternatives` 功能

**创建完成打钩**：□

---

### 索引 2/4：category_subcategory_index ⭐⭐⭐⭐

**点击"新建索引"，填写：**

```
索引名称: category_subcategory_index
```

**字段配置：**
```
字段1名称: category
字段1排序: 升序 (1)

字段2名称: subcategory
字段2排序: 升序 (1)
```

**说明**：
- 用于分类统计（red_meat、poultry、seafood、processed_meat）
- 支持子分类查询（beef、pork、lamb、chicken等）
- 优化聚合查询性能

**创建完成打钩**：□

---

### 索引 3/4：carbonFootprint_index ⭐⭐⭐

**点击"新建索引"，填写：**

```
索引名称: carbonFootprint_index
```

**字段配置：**
```
字段名: carbonFootprint
排序: 降序 (-1)
```

**说明**：
- 用于按碳足迹从高到低排序
- 支持教育展示页面（碳排放排行榜）
- 可选索引，但建议创建

**创建完成打钩**：□

---

### 索引 4/4：status_index ⭐⭐⭐

**点击"新建索引"，填写：**

```
索引名称: status_index
```

**字段配置：**
```
字段名: status
排序: 升序 (1)
```

**说明**：
- 用于过滤活跃状态的肉类数据
- 支持数据管理
- 可选索引

**创建完成打钩**：□

---

## ✅ 验证索引创建

创建完成后，在 `meat_products` 集合的索引管理页面应该看到：

```
✓ _id_                           (系统默认)
✓ name_unique                    (您创建的) ← 唯一索引
✓ category_subcategory_index     (您创建的) ← 复合索引
✓ carbonFootprint_index          (您创建的) ← 降序索引
✓ status_index                   (您创建的)
```

**总计**：5 个索引（1个系统默认 + 4个手动创建）

---

## 🧪 测试索引效果

创建索引后，测试查询性能：

### 测试1：名称查询

在 `meat-data-import` 云函数测试：

```json
{
  "action": "getMeatAlternatives",
  "meatName": "牛肉"
}
```

**预期**：响应时间 < 100ms

### 测试2：分类统计

```json
{
  "action": "countMeatData"
}
```

**预期**：
- 响应时间 < 200ms
- 返回按category和subcategory的统计

---

## 📊 索引详细说明

### 索引 29：name_unique

**JSON配置**：
```json
{
  "name": 1
}
```

**索引类型**：唯一索引  
**优先级**：最高  
**预计耗时**：30秒  
**查询优化**：
- 查询肉类产品时从 O(n) 优化到 O(log n)
- 插入时自动检查重复

---

### 索引 30：category_subcategory_index

**JSON配置**：
```json
{
  "category": 1,
  "subcategory": 1
}
```

**索引类型**：复合索引  
**优先级**：高  
**预计耗时**：45秒  
**查询优化**：
- 聚合统计查询性能提升 10-50倍
- 支持分类筛选

---

### 索引 31：carbonFootprint_index

**JSON配置**：
```json
{
  "carbonFootprint": -1
}
```

**索引类型**：降序索引  
**优先级**：中  
**预计耗时**：30秒  
**查询优化**：
- 支持碳足迹排序（高到低）
- 教育页面展示优化

---

### 索引 32：status_index

**JSON配置**：
```json
{
  "status": 1
}
```

**索引类型**：普通索引  
**优先级**：中  
**预计耗时**：30秒  
**查询优化**：
- 过滤活跃状态数据
- 数据管理优化

---

## 🎯 推荐创建优先级

### 必须创建（立即）

✅ **索引29：name_unique**
- 对比功能必需
- 查询肉类替代品必需

### 建议创建（本周内）

✅ **索引30：category_subcategory_index**
- 分类统计功能需要
- 数据分析必需

### 可选创建（有时间再做）

⚪ **索引31：carbonFootprint_index**
- 教育展示优化
- 影响较小

⚪ **索引32：status_index**
- 数据管理优化
- 影响较小

---

## 🆘 常见问题

### Q: 必须全部创建吗？

**A**: 至少创建索引29（name_unique），其他根据需要创建。

### Q: 创建顺序有要求吗？

**A**: 建议按29→30→31→32的顺序，但顺序不影响功能。

### Q: 创建失败怎么办？

**A**: 
- 检查字段名是否正确（区分大小写）
- 确认集合中已有数据
- 查看错误提示信息

### Q: 可以删除索引重新创建吗？

**A**: 可以，但会短暂影响查询性能。

---

## 📚 相关文档

- [索引配置表.csv](./索引配置表.csv) - 完整索引列表
- [索引创建-复制粘贴版.md](./索引创建-复制粘贴版.md) - 所有索引详细配置
- [肉类碳足迹数据库-使用指南.md](./肉类碳足迹数据库-使用指南.md) - 肉类数据库使用文档

---

**版本**: v1.0  
**创建日期**: 2025-10-14  
**预计完成时间**: 3 分钟  

🎉 **创建完成后，对比计算功能将获得最佳性能！**

