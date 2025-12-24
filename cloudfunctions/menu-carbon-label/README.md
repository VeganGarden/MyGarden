# menu-carbon-label 云函数

## 功能说明

菜单环保信息标签查询云函数，提供菜单项和订单的碳标签信息查询接口。

## 支持的 Actions

### 1. getMenuItemCarbonLabel - 获取单个菜单项的碳标签信息

**请求参数**:
```javascript
{
  action: 'getMenuItemCarbonLabel',
  data: {
    restaurantId: 'rest_123456',
    menuItemId: 'menu_001',
    media: 'mobileApp',  // 可选：physicalMenu | digitalMenu | mobileApp | onlineMenu | posSystem | receipt
    language: 'zh_CN'    // 可选：zh_CN | en_US
  }
}
```

**返回数据**:
```javascript
{
  code: 0,
  message: '成功',
  data: {
    menuItemId: 'menu_001',
    itemName: '素麻婆豆腐',
    category: '主菜',
    price: 38.0,
    carbonLabel: {
      level: 'low',
      icon: { /* ... */ },
      text: { /* ... */ },
      fullData: { /* ... */ }
    },
    displaySuggestion: { /* ... */ }
  }
}
```

### 2. getMenuItemsCarbonLabels - 批量获取菜单项的碳标签信息

**请求参数**:
```javascript
{
  action: 'getMenuItemsCarbonLabels',
  data: {
    restaurantId: 'rest_123456',
    menuItemIds: ['menu_001', 'menu_002'],  // 可选
    media: 'digitalMenu',
    language: 'zh_CN',
    filter: {
      carbonLevel: 'low'  // 可选
    },
    sort: {
      field: 'carbonFootprint',  // carbonFootprint | reductionPercent | price
      order: 'asc'  // asc | desc
    },
    page: 1,
    pageSize: 20
  }
}
```

### 3. getOrderCarbonLabel - 获取订单的碳足迹标签信息

**请求参数**:
```javascript
{
  action: 'getOrderCarbonLabel',
  data: {
    orderId: 'ORDER_001',
    media: 'receipt',
    language: 'zh_CN'
  }
}
```

### 4. getMenuDisplayConfig - 获取餐厅的菜单展示配置

**请求参数**:
```javascript
{
  action: 'getMenuDisplayConfig',
  data: {
    restaurantId: 'rest_123456',
    version: 2  // 可选，指定版本号
  }
}
```

## 使用示例

### 小程序中调用

```javascript
const cloud = require('wx-server-sdk');

// 获取单个菜单项标签
const result = await cloud.callFunction({
  name: 'menu-carbon-label',
  data: {
    action: 'getMenuItemCarbonLabel',
    data: {
      restaurantId: 'rest_123456',
      menuItemId: 'menu_001',
      media: 'mobileApp',
      language: 'zh_CN'
    }
  }
});

console.log(result.result);
```

## 依赖的数据库集合

- `restaurant_menu_items` - 餐厅菜单项
- `restaurant_orders` - 餐厅订单
- `restaurant_menu_display_configs` - 菜单展示配置

## 注意事项

1. 如果餐厅没有配置展示配置，将使用默认配置
2. 标签信息根据配置自动格式化，不同媒介可能显示不同的内容
3. 配置数据有1小时缓存，配置更新后最多1小时生效

