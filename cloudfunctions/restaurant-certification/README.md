# 气候餐厅认证管理云函数

## 功能说明

本云函数提供气候餐厅认证的完整管理功能，包括：

- ✅ 认证申请提交
- ✅ 草稿保存
- ✅ 系统自动评估（基于五大维度评分）
- ✅ 认证状态查询
- ✅ 证书管理
- ✅ 认证资料维护（修改、历史版本、导出）
- ✅ 审核操作（平台运营）

## 支持的 Actions

### 1. apply - 提交认证申请

```javascript
{
  action: 'apply',
  data: {
    restaurantId: 'restaurant_id',
    tenantId: 'tenant_id',
    basicInfo: { ... },
    menuInfo: { ... },
    supplyChainInfo: { ... },
    operationData: { ... },
    documents: [ ... ]
  }
}
```

### 2. saveDraft - 保存草稿

```javascript
{
  action: 'saveDraft',
  data: {
    restaurantId: 'restaurant_id',
    tenantId: 'tenant_id',
    draftData: { ... },
    draftName: '草稿名称（可选）'
  }
}
```

### 3. systemEvaluate - 系统自动评估

```javascript
{
  action: 'systemEvaluate',
  data: {
    applicationId: 'application_id'
  }
}
```

**评估维度**（权重）：
- 低碳菜品占比：40%
- 本地食材占比：20%
- 有机食材占比：15%
- 食物浪费减少：15%
- 能源效率：10%

### 4. getStatus - 获取认证状态

```javascript
{
  action: 'getStatus',
  data: {
    restaurantId: 'restaurant_id',
    applicationId: 'application_id' // 可选
  }
}
```

### 5. getCertificate - 获取证书信息

```javascript
{
  action: 'getCertificate',
  data: {
    restaurantId: 'restaurant_id',
    certificateId: 'certificate_id' // 可选
  }
}
```

### 6. updateMaterials - 更新认证资料

```javascript
{
  action: 'updateMaterials',
  data: {
    restaurantId: 'restaurant_id',
    materialType: 'basicInfo|menuInfo|supplyChainInfo|operationData',
    materialData: { ... },
    changeReason: '变更原因'
  }
}
```

### 7. getMaterialHistory - 获取资料历史版本

```javascript
{
  action: 'getMaterialHistory',
  data: {
    restaurantId: 'restaurant_id',
    materialType: 'basicInfo|menuInfo|supplyChainInfo|operationData'
  }
}
```

### 8. exportMaterials - 导出认证资料

```javascript
{
  action: 'exportMaterials',
  data: {
    restaurantId: 'restaurant_id',
    format: 'pdf|excel',
    fields: [ ... ] // 可选
  }
}
```

### 9. review - 审核操作（平台运营）

```javascript
{
  action: 'review',
  data: {
    applicationId: 'application_id',
    stage: 'documentReview|onSiteInspection|review',
    result: 'approved|rejected|pending',
    comment: '审核意见',
    attachments: [ ... ], // 可选
    reviewerId: 'reviewer_id',
    reviewerName: 'reviewer_name'
  }
}
```

### 10. generateCertificate - 生成证书

```javascript
{
  action: 'generateCertificate',
  data: {
    applicationId: 'application_id'
  }
}
```

## 认证流程

1. **资料提交** → 餐厅提交认证申请
2. **系统评估** → 平台自动评估（五大维度评分）
3. **资料审查** → 平台运营进行资料审查
4. **现场核查** → 对高风险项进行现场核查（可选）
5. **复评** → 综合评审，最终决定认证结果
6. **认证发布** → 生成证书，更新餐厅认证状态

## 数据库集合

- `certification_applications` - 认证申请主表
- `certification_stages` - 认证阶段记录
- `certification_badges` - 认证证书
- `certification_documents` - 认证资料文件
- `certification_materials` - 认证资料维护记录

## 部署说明

```bash
cd cloudfunctions/restaurant-certification
npm install
tcb fn deploy restaurant-certification --envId your-env-id
```

## 注意事项

1. 系统评估会自动在提交申请后触发
2. 系统评估通过后会自动进入资料审查阶段
3. 证书生成后会自动更新餐厅的认证状态
4. 所有操作都会记录审核历史

