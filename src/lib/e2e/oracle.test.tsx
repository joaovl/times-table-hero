// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { E2EOracle } from './oracle';

afterEach(cleanup);

const data = { questionId: 'q1', expected: '56', inputMode: 'typed' as const };

describe('E2EOracle', () => {
  it('renders nothing when disabled', () => {
    const { container } = render(<E2EOracle data={data} enabled={false} />);
    expect(container.querySelector('[data-testid="e2e-oracle"]')).toBeNull();
  });
  it('renders a hidden node carrying the JSON payload when enabled', () => {
    render(<E2EOracle data={data} enabled />);
    const node = screen.getByTestId('e2e-oracle');
    expect(JSON.parse(node.getAttribute('data-oracle') ?? '{}')).toEqual(data);
    expect(node).not.toBeVisible();
  });
});
