const fs = require('fs');
const path = require('path');
const https = require('https');

// 图标配置
const icons = {
  'home.png': 'https://img.icons8.com/ios-filled/81/666666/home.png',
  'home-active.png': 'https://img.icons8.com/ios-filled/81/4CAF50/home.png',
  'garden.png': 'https://img.icons8.com/ios-filled/81/666666/flower.png',
  'garden-active.png': 'https://img.icons8.com/ios-filled/81/4CAF50/flower.png',
  'profile.png': 'https://img.icons8.com/ios-filled/81/666666/user.png',
  'profile-active.png': 'https://img.icons8.com/ios-filled/81/4CAF50/user.png'
};

const iconDir = path.join(__dirname, '../src/static/images/tabbar');

// 确保目录存在
if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir, { recursive: true });
}

// 下载图标函数
function downloadIcon(url, filename) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(iconDir, filename);
    const file = fs.createWriteStream(filePath);
    
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`✅ 下载完成: ${filename}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {});
      console.log(`❌ 下载失败: ${filename}`, err.message);
      reject(err);
    });
  });
}

// 下载所有图标
async function downloadAllIcons() {
  console.log('📥 开始下载图标...');
  
  for (const [filename, url] of Object.entries(icons)) {
    try {
      await downloadIcon(url, filename);
    } catch (error) {
      console.log(`⚠️ 跳过 ${filename}，使用备用方案`);
      // 创建简单的占位符图标
      const placeholder = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
      fs.writeFileSync(path.join(iconDir, filename), placeholder);
      console.log(`✅ 创建占位符: ${filename}`);
    }
  }
  
  console.log('🎉 图标下载完成！');
}

downloadAllIcons().catch(console.error);