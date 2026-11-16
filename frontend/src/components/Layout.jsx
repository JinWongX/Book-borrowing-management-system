import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Layout as AntLayout, Menu, Button, Space, Typography, Avatar } from 'antd';
import { useAuth } from '../hooks/useAuth';
import { getMenuByRole } from '../utils/menu';

const { Header, Sider, Content } = AntLayout;
const { Text } = Typography;

const ROLE_TEXT = {
  employee: '员工',
  librarian: '图书管理员',
  admin: '系统管理员',
};

const Layout = () => {
  const { user, logout, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const menuItems = getMenuByRole(role);

  const handleMenuClick = ({ key }) => {
    navigate(key);
  };

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          background: '#001529',
        }}
      >
        <div style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
          企业图书借阅管理系统
        </div>
        <Space>
          <Avatar style={{ backgroundColor: '#1890ff' }}>
            {user?.username?.charAt(0).toUpperCase()}
          </Avatar>
          <Text style={{ color: '#fff' }}>{user?.username}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.65)' }}>
            ({ROLE_TEXT[role] || role})
          </Text>
          <Button type="link" onClick={logout} style={{ color: '#fff' }}>
            退出登录
          </Button>
        </Space>
      </Header>
      <AntLayout>
        <Sider width={200} theme="light">
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems.map((item) => ({ key: item.key, label: item.label }))}
            onClick={handleMenuClick}
          />
        </Sider>
        <Content style={{ margin: 24, padding: 24, background: '#fff' }}>
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default Layout;
