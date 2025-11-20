# 消息事件处理云函数

## 功能说明

消息事件处理云函数，负责业务事件监听和处理，自动触发消息通知。

## 接口说明

### 1. handleTenantCertApply - 处理租户认证申请事件

**功能：** 当新租户提交入驻申请时，自动创建消息并推送给运营人员。

**调用方式：**

```javascript
await cloud.callFunction({
  name: 'message-event',
  data: {
    action: 'handleTenantCertApply',
    data: {
      tenantId: 'tenant-123',
      tenantName: '测试租户',
      applyTime: new Date()
    }
  }
});
```

---

### 2. handleRestaurantCertApply - 处理餐厅认证申请事件

**功能：** 当餐厅提交认证申请时，自动创建消息并推送给运营人员。

**调用方式：**

```javascript
await cloud.callFunction({
  name: 'message-event',
  data: {
    action: 'handleRestaurantCertApply',
    data: {
      restaurantId: 'restaurant-123',
      restaurantName: '测试餐厅',
      tenantId: 'tenant-123',
      applyTime: new Date()
    }
  }
});
```

---

### 3. handleAuditTaskThreshold - 处理待审核任务阈值事件

**功能：** 当待审核任务数量达到阈值时，创建提醒消息。

**调用方式：**

```javascript
await cloud.callFunction({
  name: 'message-event',
  data: {
    action: 'handleAuditTaskThreshold',
    data: {
      pendingCount: 15,
      threshold: 10
    }
  }
});
```

---

### 4. checkAuditTasks - 检查待审核任务数量（定时任务）

**功能：** 统计待审核任务数量，达到阈值时自动触发消息。

**调用方式：**

```javascript
// 定时触发器调用（每小时）
await cloud.callFunction({
  name: 'message-event',
  data: {
    action: 'checkAuditTasks',
    data: {
      threshold: 10  // 可选，默认10
    }
  }
});
```

**统计范围：**

- 租户申请：`tenant_applications` 集合中 `status = 'pending'` 的记录
- 餐厅认证申请：`restaurants` 集合中 `certificationStatus = 'pending'` 的记录

---

## 定时触发器配置

### 配置步骤

1. **在腾讯云开发控制台配置定时触发器：**

   - 进入云函数管理
   - 找到 `message-event` 云函数
   - 点击「触发器」→「创建触发器」
   - 选择「定时触发器」
   - 配置 Cron 表达式：`0 * * * *`（每小时执行一次）
   - 配置触发参数：

   ```json
   {
     "action": "checkAuditTasks",
     "data": {
       "threshold": 10
     }
   }
   ```

2. **Cron 表达式说明：**

   - `0 * * * *` - 每小时的第 0 分钟执行（即每小时执行一次）
   - `0 */2 * * *` - 每 2 小时执行一次
   - `0 9,18 * * *` - 每天 9 点和 18 点执行
   - `0 9 * * 1-5` - 工作日上午 9 点执行

### 推荐配置

- **检查频率：** 每小时一次（`0 * * * *`）
- **阈值：** 10 个待审核任务
- **执行时间：** 工作时间（9:00-18:00）可考虑更频繁，非工作时间可降低频率

---

## 事件规则配置

确保在 `message_event_rules` 集合中已配置相应的事件规则：

### 租户认证申请规则

```javascript
{
  eventType: 'tenant_cert_apply',
  eventName: '租户认证申请',
  messageTemplate: {
    title: '新租户认证申请：{tenantName}',
    content: '租户"{tenantName}"提交了认证申请，请及时审核。'
  },
  targetRoles: ['platform_operator'],
  enabled: true,
  priority: 'important'
}
```

### 餐厅认证申请规则

```javascript
{
  eventType: 'restaurant_cert_apply',
  eventName: '餐厅认证申请',
  messageTemplate: {
    title: '新餐厅认证申请：{restaurantName}',
    content: '餐厅"{restaurantName}"提交了认证申请，请及时审核。'
  },
  targetRoles: ['platform_operator'],
  enabled: true,
  priority: 'important'
}
```

### 待审核任务阈值规则

```javascript
{
  eventType: 'audit_task_threshold',
  eventName: '待审核任务阈值提醒',
  messageTemplate: {
    title: '待审核任务提醒',
    content: '当前有 {pendingCount} 个认证申请待审核，请及时处理。'
  },
  targetRoles: ['platform_operator'],
  enabled: true,
  priority: 'normal'
}
```

---

## 使用示例

### 在业务代码中触发消息

```javascript
// 在 tenant 云函数的 applyForOnboarding 中
const res = await db.collection('tenant_applications').add({ data: appData })

// 触发消息通知
try {
  await cloud.callFunction({
    name: 'message-event',
    data: {
      action: 'handleTenantCertApply',
      data: {
        tenantId: res._id,
        tenantName: data.organizationName,
        applyTime: new Date()
      }
    }
  })
} catch (error) {
  console.error('触发消息失败:', error)
  // 消息失败不影响业务操作
}
```

---

## 注意事项

1. **容错处理：** 消息触发失败不应影响业务操作，使用 try-catch 包裹
2. **去重机制：** 定时检查可能重复触发，需要在 `handleAuditTaskThreshold` 中实现去重（可基于时间窗口）
3. **性能考虑：** 定时检查使用 count() 查询，性能较好，但大量数据时建议使用索引
4. **事件规则：** 确保事件规则已启用，否则不会发送消息

---

## 相关文档

- [MVP 精简版方案](../../Docs/消息管理/平台消息管理策划方案-MVP精简版.md)
- [Week 1 开发进度报告](../../Docs/消息管理/Week1-开发进度报告.md)
- [Week 3 开发进度报告](../../Docs/消息管理/Week3-开发进度报告.md)

