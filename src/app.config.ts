export default {
  pages: [
    'pages/index/index',
    'pages/garden/index',
    'pages/carbon/index',
    'pages/profile/index',
    'pages/login/index',
    'pages/recipe-design/index',
    'pages/recipe-design/create',
    'pages/restaurant/orders/index',
    'pages/restaurant/orders/detail',
    'pages/restaurant/data/index',
    'pages/restaurant/coupon/index',
    'pages/restaurant/review/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#4CAF50',
    navigationBarTitleText: '我的花园',
    navigationBarTextStyle: 'white',
    backgroundColor: '#f5f5f5'
  },
  tabBar: {
    color: '#666666',
    selectedColor: '#4CAF50',
    backgroundColor: '#ffffff',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '首页',
        iconPath: 'static/images/tabbar/home.png',
        selectedIconPath: 'static/images/tabbar/home-active.png'
      },
      {
        pagePath: 'pages/garden/index',
        text: '我的花园',
        iconPath: 'static/images/tabbar/garden.png',
        selectedIconPath: 'static/images/tabbar/garden-active.png'
      },
      {
        pagePath: 'pages/carbon/index',
        text: '碳足迹',
        iconPath: 'static/images/tabbar/carbon.png',
        selectedIconPath: 'static/images/tabbar/carbon-active.png'
      },
      {
        pagePath: 'pages/profile/index',
        text: '个人中心',
        iconPath: 'static/images/tabbar/profile.png',
        selectedIconPath: 'static/images/tabbar/profile-active.png'
      }
    ]
  },
  networkTimeout: {
    request: 10000,
    downloadFile: 10000
  },
  debug: true
}