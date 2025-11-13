# 食材管理云函数

## 功能说明

食材管理云函数用于处理食材的查询、列表等操作，支持从标准食材库中查询食材信息。

## 支持的操作

### 1. 获取食材详情 (get)

**请求参数：**
```javascript
{
  action: 'get',
  ingredientId: '食材ID'
}
```

**返回结果：**
```javascript
{
  code: 0,
  data: {
    _id: '食材ID',
    name: '食材名称',
    nameEn: '英文名称',
    category: 'vegetables',  // 分类
    carbonCoefficient: 1.0,  // 碳系数（kg CO₂e/kg）
    carbonFootprint: 1.0,  // 碳足迹
    unit: 'g',  // 单位
    ...
  }
}
```

### 2. 获取食材列表 (list)

**请求参数：**
```javascript
{
  action: 'list',
  keyword: '搜索关键词',  // 可选
  category: 'vegetables',  // 分类筛选，可选
  page: 1,  // 页码，默认1
  pageSize: 100  // 每页数量，默认100
}
```

**返回结果：**
```javascript
{
  code: 0,
  data: [
    {
      _id: '食材ID',
      name: '食材名称',
      category: 'vegetables',
      carbonCoefficient: 1.0,
      ...
    }
  ],
  pagination: {
    page: 1,
    pageSize: 100,
    total: 500,
    totalPages: 5
  }
}
```

### 3. 搜索食材 (search)

**请求参数：**
```javascript
{
  action: 'search',
  keyword: '搜索关键词',  // 必填
  page: 1,  // 页码，默认1
  pageSize: 100  // 每页数量，默认100
}
```

**返回结果：**
```javascript
{
  code: 0,
  data: [
    {
      _id: '食材ID',
      name: '食材名称',
      nameEn: '英文名称',
      ...
    }
  ],
  pagination: {
    page: 1,
    pageSize: 100,
    total: 50,
    totalPages: 1
  }
}
```

## 数据模型

### 食材数据模型

```javascript
{
  _id: String,  // 食材ID
  name: String,  // 食材名称
  nameEn: String,  // 英文名称
  category: String,  // 分类：vegetables/beans/grains等
  carbonCoefficient: Number,  // 碳系数（kg CO₂e/kg）
  carbonFootprint: Number,  // 碳足迹
  unit: String,  // 单位：g/kg/ml/l
  ...
}
```

## 使用示例

### 在小程序中调用

```javascript
// 获取食材列表
const res = await Taro.cloud.callFunction({
  name: 'ingredient',
  data: {
    action: 'list',
    keyword: '青菜',
    page: 1,
    pageSize: 100
  }
})

// 搜索食材
const searchRes = await Taro.cloud.callFunction({
  name: 'ingredient',
  data: {
    action: 'search',
    keyword: 'tomato',
    page: 1,
    pageSize: 100
  }
})

// 获取食材详情
const detailRes = await Taro.cloud.callFunction({
  name: 'ingredient',
  data: {
    action: 'get',
    ingredientId: 'ingredient_id_1'
  }
})
```

## 部署说明

1. 安装依赖：
```bash
cd cloudfunctions/ingredient
npm install
```

2. 部署云函数：
```bash
tcb fn deploy ingredient --env your-env-id
```

## 注意事项

1. 搜索功能支持中文名称和英文名称的模糊搜索
2. 列表查询支持按分类筛选
3. 食材数据需要提前在数据库中初始化
4. 碳系数（carbonCoefficient）用于计算菜谱的碳足迹

