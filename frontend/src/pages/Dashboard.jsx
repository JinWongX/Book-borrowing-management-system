import React from 'react';
import { Card, Typography } from 'antd';
import { useAuth } from '../hooks/useAuth';

const { Title, Paragraph } = Typography;

const WELCOME_TEXT = {
  employee: '欢迎进入企业图书借阅系统，您可以浏览图书、发起借阅申请并查看个人借阅记录。',
  librarian:
    '欢迎进入企业图书借阅系统，您可以管理图书、审核借阅、登记借还、查看逾期与统计报表。',
  admin: '欢迎进入企业图书借阅系统，您可以管理用户、配置角色与权限。',
};

const Dashboard = () => {
  const { user, role } = useAuth();

  return (
    <Card>
      <Title level={2}>您好，{user?.username || '用户'}</Title>
      <Paragraph>
        {WELCOME_TEXT[role] || '欢迎进入企业图书借阅系统。'}
      </Paragraph>
    </Card>
  );
};

export default Dashboard;
