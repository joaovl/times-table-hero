// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { ShapeFigure } from './ShapeFigure';
import type { ShapeQuestion } from './logic';

afterEach(cleanup);

// Build a minimal ShapeQuestion for each branch. The figure renderer only
// reads a handful of fields per skill — anything else can be left undefined.
function rectQuestion(): ShapeQuestion {
  return {
    skill: 'area-rect',
    width: 5,
    height: 3,
    units: 'cm',
    answer: 15,
  };
}

function triangleQuestion(): ShapeQuestion {
  return {
    skill: 'area-tri',
    width: 5,
    height: 3,
    units: 'cm',
    answer: 7.5,
  };
}

function circleQuestion(): ShapeQuestion {
  return {
    skill: 'area-circle',
    radius: 4,
    units: 'cm',
    answer: 50,
  };
}

function angleQuestion(): ShapeQuestion {
  return {
    skill: 'angle-name',
    angle: 90,
    units: 'cm',
    answer: 0,
  };
}

function cubeQuestion(): ShapeQuestion {
  return {
    skill: 'name-3d',
    solid: 'cube',
    units: 'cm',
    answer: 0,
  };
}

describe('ShapeFigure accessibility', () => {
  it('rectangle figure exposes role="img" with a descriptive aria-label', () => {
    render(<ShapeFigure shape="rect-with-dims" question={rectQuestion()} />);
    const fig = screen.getByRole('img');
    expect(fig).toBeInTheDocument();
    expect(fig).toHaveAttribute('aria-label', 'Rectangle 5 by 3 cm');
  });

  it('right-triangle figure carries the base and height in its label', () => {
    render(<ShapeFigure shape="right-triangle" question={triangleQuestion()} />);
    const fig = screen.getByRole('img');
    expect(fig).toHaveAttribute(
      'aria-label',
      'Right triangle, base 5 cm, height 3 cm',
    );
  });

  it('circle-with-radius figure carries the radius in its label', () => {
    render(<ShapeFigure shape="circle-with-radius" question={circleQuestion()} />);
    const fig = screen.getByRole('img');
    expect(fig).toHaveAttribute('aria-label', 'Circle, radius 4 cm');
  });

  it('angle figure announces the angle in degrees', () => {
    render(<ShapeFigure shape="angle" question={angleQuestion()} />);
    const fig = screen.getByRole('img');
    expect(fig).toHaveAttribute('aria-label', 'Angle of 90 degrees');
  });

  it('solid figure announces the solid name', () => {
    render(<ShapeFigure shape="solid" question={cubeQuestion()} />);
    const fig = screen.getByRole('img');
    expect(fig).toHaveAttribute('aria-label', 'cube');
  });
});
