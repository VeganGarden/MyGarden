# 中文字体安装说明

为了确保 PDF 证书中的中文正常显示，需要下载并安装中文字体文件。

## 推荐字体

推荐使用 **思源黑体（Source Han Sans）**，这是一个开源的中文字体，支持简体中文、繁体中文等多种语言。

## 下载方式

### 方式 1：从 GitHub 下载（推荐）

1. 访问思源黑体 GitHub 仓库：https://github.com/adobe-fonts/source-han-sans
2. 下载 `SourceHanSansCN-Regular.ttf` 文件
3. 将文件放置在此目录（`cloudfunctions/restaurant-certification/fonts/`）中

### 方式 2：使用命令行下载

```bash
cd cloudfunctions/restaurant-certification/fonts

# 下载思源黑体（简体中文，常规）
curl -L -o SourceHanSansCN-Regular.ttf \
  "https://github.com/adobe-fonts/source-han-sans/raw/release/SubsetOTF/CN/SourceHanSansCN-Regular.otf"

# 如果下载的是.otf文件，需要转换为.ttf（可选）
# 或者直接使用.otf文件，修改代码中的字体路径
```

### 方式 3：使用其他中文字体

您也可以使用其他中文字体，如：

- 文泉驿正黑体
- 微软雅黑
- 宋体

只需将字体文件重命名为 `SourceHanSansCN-Regular.ttf` 或修改代码中的字体路径即可。

## 验证

字体文件安装后，重新部署云函数：

```bash
tcb fn deploy restaurant-certification --force
```

然后测试证书生成功能，确认中文显示正常。
