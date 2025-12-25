# 食材标准库管理云函数

## 功能说明

这个云函数用于管理食材标准库，包括标准名称和别名映射的增删改查操作。

## Actions 列表

### 标准名称管理

- `standard.list` / `listStandards` - 获取标准名称列表
- `standard.get` / `getStandard` - 获取标准名称详情
- `standard.create` / `addStandard` - 添加新的标准名称
- `standard.update` / `updateStandard` - 更新标准名称
- `standard.deprecate` / `deprecateStandard` - 废弃标准名称
- `standard.merge` / `mergeStandards` - 合并两个标准名称

### 别名管理

- `alias.list` / `listAliases` - 获取别名列表
- `alias.add` / `addAlias` - 添加别名映射
- `alias.remove` / `removeAlias` - 删除别名映射
- `alias.batchAdd` / `batchAddAliases` - 批量添加别名

### 同步操作

- `sync.toFactors` / `syncStandardAliasesToFactors` - 同步别名到因子库
- `sync.toIngredients` / `syncStandardNameToIngredients` - 同步标准名称到 ingredients 库

## 调用示例

### 获取标准名称列表

```javascript
wx.cloud.callFunction({
  name: "ingredient-standard-manage",
  data: {
    action: "standard.list",
    data: {
      keyword: "白菜",
      category: "vegetables",
      status: "active",
      page: 1,
      pageSize: 20,
    },
  },
});
```

### 添加标准名称

```javascript
wx.cloud.callFunction({
  name: "ingredient-standard-manage",
  data: {
    action: "standard.create",
    data: {
      standardName: "白菜",
      category: "vegetables",
      defaultUnit: "g",
    },
  },
});
```

### 添加别名

```javascript
wx.cloud.callFunction({
  name: "ingredient-standard-manage",
  data: {
    action: "alias.add",
    data: {
      standardName: "白菜",
      alias: "大白菜",
    },
  },
});
```

## 权限说明

- 所有操作需要平台运营者权限（platform_operator）
- 前端已通过 RouteGuard 进行权限控制

## 相关云函数

- `database` - 数据库初始化操作（集合创建、数据迁移等）
- `ingredient` - 食材业务操作（查询、创建基础食材等）
