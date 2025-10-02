
# 图标创建说明

## 方法一：在线转换（推荐）
1. 访问 https://convertio.co/zh/svg-png/
2. 上传SVG文件，选择PNG格式
3. 下载转换后的PNG文件
4. 将PNG文件放入 assets/icons/ 目录

## 方法二：使用微信内置图标路径
修改 src/app.config.ts 中的图标路径：
```typescript
iconPath: "static/images/tabbar/home.png",
selectedIconPath: "static/images/tabbar/home-active.png"
```

## 方法三：创建简单文本图标
可以使用简单的emoji或文字作为临时图标。

当前已创建的SVG图标文件：
- home.svg / home-active.svg - 首页图标
- garden.svg / garden-active.svg - 花园图标  
- profile.svg / profile-active.svg - 个人中心图标
