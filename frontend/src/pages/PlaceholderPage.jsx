import React from 'react';
import { Card, Typography } from 'antd';

const { Title } = Typography;

const PlaceholderPage = ({ title = '页面开发中' }) => {
  return (
    <Card>
      <Title level={3}>{title}</Title>
      <p>该功能正在开发中，敬请期待。</p>
    </Card>
  );
};

export default PlaceholderPage;
