import { ClockCircleOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons'
import { Card, Tabs } from 'antd'
import React from 'react'
import Activity from './Activity'
import Profile from './Profile'
import Settings from './Settings'

const { TabPane } = Tabs

const ProfilePage: React.FC = () => {
  return (
    <div>
      <Card>
        <Tabs defaultActiveKey="profile" size="large">
          <TabPane
            tab={
              <span>
                <UserOutlined />
                个人信息
              </span>
            }
            key="profile"
          >
            <Profile />
          </TabPane>
          <TabPane
            tab={
              <span>
                <SettingOutlined />
                账户设置
              </span>
            }
            key="settings"
          >
            <Settings />
          </TabPane>
          <TabPane
            tab={
              <span>
                <ClockCircleOutlined />
                活动日志
              </span>
            }
            key="activity"
          >
            <Activity />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  )
}

export default ProfilePage


