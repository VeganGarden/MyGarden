# 菜谱管理云函数

## 功能说明

菜谱管理云函数用于处理菜谱的创建、查询、更新、删除等操作，支持菜谱的完整生命周期管理。

## 支持的操作

### 1. 创建菜谱 (create)

**请求参数：**

```javascript
{
  action: 'create',
  recipe: {
    name: '菜谱名称',
    description: '菜谱描述',
    category: 'hot',  // 分类：hot/cold/soup/staple/dessert/drink
    cookingMethod: 'stir_fried',  // 烹饪方式
    ingredients: [
      {
        ingredientId: '食材ID',
        name: '食材名称',
        quantity: 100,  // 数量
        unit: 'g',  // 单位：g/kg/ml/l
        carbonCoefficient: 1.0  // 碳系数（可选）
      }
    ],
    carbonFootprint: 0.5,  // 碳足迹（kg CO₂e）
    carbonLabel: 'low',  // 碳标签：low/medium/high
    carbonScore: 80,  // 碳评分（0-100）
    status: 'draft',  // 状态：draft/published/archived
    channels: ['dine_in', 'take_out'],  // 渠道：dine_in/take_out/promotion
    version: 1  // 版本号
  }
}
```

**返回结果：**

```javascript
{
  code: 0,
  message: '菜谱创建成功',
  data: {
    _id: '菜谱ID',
    ...recipe
  }
}
```

### 2. 更新菜谱 (update)

**请求参数：**

```javascript
{
  action: 'update',
  recipeId: '菜谱ID',
  recipe: {
    // 要更新的字段
    name: '新名称',
    ...
  }
}
```

### 3. 删除菜谱 (delete)

**请求参数：**

```javascript
{
  action: 'delete',
  recipeId: '菜谱ID'
}
```

### 4. 获取菜谱详情 (get)

**请求参数：**

```javascript
{
  action: 'get',
  recipeId: '菜谱ID'
}
```

### 5. 获取菜谱列表 (list)

**请求参数：**

```javascript
{
  action: 'list',
  keyword: '搜索关键词',  // 可选
  page: 1,  // 页码，默认1
  pageSize: 20  // 每页数量，默认20
}
```

**返回结果：**

```javascript
{
  code: 0,
  data: [
    {
      _id: '菜谱ID',
      name: '菜谱名称',
      ...
    }
  ],
  pagination: {
    page: 1,
    pageSize: 20,
    total: 100,
    totalPages: 5
  }
}
```

### 6. 批量导入菜谱 (batchImport)

**请求参数：**

```javascript
{
  action: 'batchImport',
  recipes: [
    {
      name: '菜谱1',
      ...
    },
    {
      name: '菜谱2',
      ...
    }
  ]
}
```

**返回结果：**

```javascript
{
  code: 0,
  message: '批量导入完成：成功 2 条，失败 0 条',
  data: {
    success: [
      {
        index: 0,
        recipe: '菜谱1',
        _id: '菜谱ID1'
      }
    ],
    failed: []
  }
}
```

## 权限控制

- 只有菜谱的创建者（`createdBy`）可以更新和删除菜谱
- 使用微信 openid 作为用户标识
- 支持多租户隔离（通过 `tenantId` 字段）

## 数据模型

### 菜谱数据模型

```javascript
{
  _id: String,  // 菜谱ID
  name: String,  // 菜谱名称（必填）
  description: String,  // 菜谱描述
  category: String,  // 分类（必填）
  cookingMethod: String,  // 烹饪方式（必填）
  ingredients: Array,  // 食材列表（必填）
  carbonFootprint: Number,  // 碳足迹（kg CO₂e）
  carbonLabel: String,  // 碳标签：low/medium/high
  carbonScore: Number,  // 碳评分（0-100）
  status: String,  // 状态：draft/published/archived
  channels: Array,  // 渠道列表
  version: Number,  // 版本号
  tenantId: String,  // 租户ID
  createdBy: String,  // 创建者openid
  createdAt: Date,  // 创建时间
  updatedAt: Date  // 更新时间
}
```

## 使用示例

### 在小程序中调用

```javascript
// 创建菜谱
const res = await Taro.cloud.callFunction({
  name: "recipe",
  data: {
    action: "create",
    recipe: {
      name: "素炒青菜",
      category: "hot",
      cookingMethod: "stir_fried",
      ingredients: [
        {
          ingredientId: "ingredient_id_1",
          name: "青菜",
          quantity: 200,
          unit: "g",
        },
      ],
    },
  },
});

// 获取菜谱列表
const listRes = await Taro.cloud.callFunction({
  name: "recipe",
  data: {
    action: "list",
    keyword: "素炒",
    page: 1,
    pageSize: 20,
  },
});
```

## 部署说明

1. 安装依赖：

```bash
cd cloudfunctions/recipe
npm install
```

2. 部署云函数：

```bash
tcb fn deploy recipe --env your-env-id
```

## 注意事项

1. 菜谱名称、分类、烹饪方式、食材列表为必填项
2. 至少需要添加一种食材
3. 删除操作实际上是软删除，将状态更新为 `archived`
4. 版本号在更新时自动递增
5. 批量导入时，如果某条数据失败，不会影响其他数据的导入
