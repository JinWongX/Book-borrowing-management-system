import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PlaceholderPage from './PlaceholderPage';

describe('PlaceholderPage', () => {
  it('renders custom title', () => {
    render(<PlaceholderPage title="用户管理" />);

    expect(screen.getByText('用户管理')).toBeInTheDocument();
    expect(screen.getByText('该功能正在开发中，敬请期待。')).toBeInTheDocument();
  });

  it('renders default title when not provided', () => {
    render(<PlaceholderPage />);

    expect(screen.getByText('页面开发中')).toBeInTheDocument();
  });
});
