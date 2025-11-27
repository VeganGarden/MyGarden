#!/bin/bash

# 下载思源黑体字体文件
# 使用方法: ./download-font.sh

echo "正在下载思源黑体字体..."

# 创建fonts目录（如果不存在）
mkdir -p "$(dirname "$0")"

# 下载思源黑体（简体中文，常规）
# 注意：GitHub的raw链接可能需要调整
FONT_URL="https://github.com/adobe-fonts/source-han-sans/raw/release/SubsetOTF/CN/SourceHanSansCN-Regular.otf"
FONT_FILE="$(dirname "$0")/SourceHanSansCN-Regular.ttf"

# 尝试下载
if command -v curl &> /dev/null; then
    curl -L -o "$FONT_FILE" "$FONT_URL" 2>/dev/null
elif command -v wget &> /dev/null; then
    wget -O "$FONT_FILE" "$FONT_URL" 2>/dev/null
else
    echo "错误: 未找到 curl 或 wget，请手动下载字体文件"
    echo "下载地址: $FONT_URL"
    exit 1
fi

if [ -f "$FONT_FILE" ]; then
    echo "✅ 字体文件下载成功: $FONT_FILE"
    echo "注意: 如果下载的是.otf文件，PDFKit可能不支持，请使用.ttf格式的字体"
else
    echo "❌ 字体文件下载失败"
    echo "请手动从以下地址下载："
    echo "https://github.com/adobe-fonts/source-han-sans/releases"
    exit 1
fi


