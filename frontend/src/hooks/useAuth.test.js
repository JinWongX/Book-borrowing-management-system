import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

function TestConsumer() {
  const auth = useAuth();
  return React.createElement('div', null, React.createElement('span', { 'data-testid': 'value' }, auth === null ? 'null' : 'object'));
}

describe('useAuth hook', () => {
  it('returns auth context value inside AuthProvider', async () => {
    render(
      React.createElement(
        MemoryRouter,
        { future: { v7_startTransition: true, v7_relativeSplatPath: true } },
        React.createElement(
          AuthProvider,
          null,
          React.createElement(TestConsumer, null)
        )
      )
    );

    expect(await screen.findByText('object')).toBeInTheDocument();
  });
});
