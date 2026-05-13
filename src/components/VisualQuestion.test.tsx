// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { VisualQuestion } from './VisualQuestion';

afterEach(cleanup);

// Renders a fixed minimal tree we can assert on. Tests below probe each
// feedback state and the document order of figure / prompt / children.

describe('<VisualQuestion>', () => {
  it("renders the 'none' feedback state without success/error classes or messages", () => {
    const { container } = render(
      <VisualQuestion feedback="none" promptText={<span>Q</span>}>
        <button type="button">submit</button>
      </VisualQuestion>
    );
    const card = container.querySelector('.shadow-card');
    expect(card).not.toBeNull();
    expect(card!.className).not.toContain('animate-pop');
    expect(card!.className).not.toContain('bg-success/10');
    expect(card!.className).not.toContain('animate-shake');
    expect(card!.className).not.toContain('bg-destructive/10');
    expect(screen.queryByText('Brilliant!')).toBeNull();
  });

  it("applies 'animate-pop bg-success/10' and shows 'Brilliant!' on correct feedback", () => {
    const { container } = render(
      <VisualQuestion feedback="correct" promptText={<span>Q</span>}>
        <button type="button">submit</button>
      </VisualQuestion>
    );
    const card = container.querySelector('.shadow-card');
    expect(card!.className).toContain('animate-pop');
    expect(card!.className).toContain('bg-success/10');
    expect(screen.getByText('Brilliant!')).toBeInTheDocument();
  });

  it("applies 'animate-shake bg-destructive/10' and renders the hint on incorrect feedback", () => {
    const { container } = render(
      <VisualQuestion
        feedback="incorrect"
        promptText={<span>Q</span>}
        correctAnswerHint={<span>= 42</span>}
      >
        <button type="button">submit</button>
      </VisualQuestion>
    );
    const card = container.querySelector('.shadow-card');
    expect(card!.className).toContain('animate-shake');
    expect(card!.className).toContain('bg-destructive/10');
    expect(screen.getByText('= 42')).toBeInTheDocument();
    // The success copy must not leak in.
    expect(screen.queryByText('Brilliant!')).toBeNull();
  });

  it('renders figure, prompt, and children in document order', () => {
    const { container } = render(
      <VisualQuestion
        feedback="none"
        figure={<svg data-testid="fig" />}
        promptText={<span data-testid="prompt">prompt-text</span>}
      >
        <button type="button" data-testid="child">
          submit
        </button>
      </VisualQuestion>
    );
    const fig = screen.getByTestId('fig');
    const prompt = screen.getByTestId('prompt');
    const child = screen.getByTestId('child');
    // Build the visit order with a TreeWalker so we don't depend on the
    // internal DOM shape of <Card> — only on the relative ordering.
    const root = container;
    const order: Element[] = [];
    const walk = (n: Node) => {
      if (n.nodeType === 1) order.push(n as Element);
      n.childNodes.forEach(walk);
    };
    walk(root);
    expect(order.indexOf(fig)).toBeLessThan(order.indexOf(prompt));
    expect(order.indexOf(prompt)).toBeLessThan(order.indexOf(child));
  });

  it('omits the figure block when no figure is provided', () => {
    const { container } = render(
      <VisualQuestion feedback="none" promptText={<span data-testid="prompt">just text</span>}>
        <span />
      </VisualQuestion>
    );
    expect(screen.getByTestId('prompt')).toBeInTheDocument();
    // No figure container means the prompt is not preceded by the
    // `flex justify-center text-foreground` wrapper.
    const figWrap = container.querySelector('.flex.justify-center.text-foreground');
    expect(figWrap).toBeNull();
  });
});
