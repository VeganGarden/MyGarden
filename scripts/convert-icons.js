const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * SVG转PNG图标转换脚本
 * 需要安装ImageMagick: brew install imagemagick
 */
async function convertIcons() {
  console.log('🔄 开始转换图标格式...');
  
  const icons = [
    { svg: 'home.svg', png: 'home.png' },
    { svg: 'home-active.svg', png: 'home-active.png' },
    { svg: 'garden.svg', png: 'garden.png' },
    { svg: 'garden-active.svg', png: 'garden-active.png' },
    { svg: 'profile.svg', png: 'profile.png' },
    { svg: 'profile-active.svg', png: 'profile-active.png' }
  ];
  
  const iconsDir = path.join(__dirname, '../assets/icons');
  
  for (const icon of icons) {
    const svgPath = path.join(iconsDir, icon.svg);
    const pngPath = path.join(iconsDir, icon.png);
    
    if (fs.existsSync(svgPath)) {
      console.log(`🔧 转换图标: ${icon.svg} -> ${icon.png}`);
      
      try {
        // 使用ImageMagick转换SVG到PNG
        await execCommand(`convert -background none -resize 81x81 "${svgPath}" "${pngPath}"`);
        console.log(`✅ ${icon.png} 创建成功`);
      } catch (error) {
        console.log(`⚠️ 无法转换 ${icon.svg}, 请手动转换或使用在线工具`);
        console.log(`💡 建议: 将 ${icon.svg} 上传到 https://convertio.co/zh/svg-png/ 转换为PNG格式`);
      }
    } else {
      console.log(`❌ SVG文件不存在: ${svgPath}`);
    }
  }
  
  console.log('🎉 图标转换完成！');
}

function execCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
}

// 如果是直接运行此脚本
if (require.main === module) {
  convertIcons().catch(console.error);
}

module.exports = convertIcons;