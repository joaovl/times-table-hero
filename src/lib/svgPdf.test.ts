import { describe, it, expect, beforeEach } from 'vitest';
import { drawArcPolyline, drawFilledSector, drawPolygon } from './svgPdf';

// Hand-rolled jsPDF mock. We only care about the call sequence each helper
// makes and the arguments it passes, so we collect each method's invocation
// into a typed log.

type Call = {
  method: string;
  args: unknown[];
};

class FakeDoc {
  calls: Call[] = [];
  setFillColor = (...args: unknown[]) => this.push('setFillColor', args);
  setDrawColor = (...args: unknown[]) => this.push('setDrawColor', args);
  setLineWidth = (...args: unknown[]) => this.push('setLineWidth', args);
  triangle = (...args: unknown[]) => this.push('triangle', args);
  line = (...args: unknown[]) => this.push('line', args);
  lines = (...args: unknown[]) => this.push('lines', args);
  rect = (...args: unknown[]) => this.push('rect', args);
  circle = (...args: unknown[]) => this.push('circle', args);
  push(method: string, args: unknown[]) {
    this.calls.push({ method, args });
  }
}

// Helpers expect a real jsPDF instance, but only invoke the methods FakeDoc
// implements. We cast via unknown to satisfy the type checker without
// pulling jsPDF into the test.
const asDoc = (d: FakeDoc) => d as unknown as Parameters<typeof drawFilledSector>[0];

let doc: FakeDoc;
beforeEach(() => {
  doc = new FakeDoc();
});

describe('drawFilledSector', () => {
  it('emits exactly one setFillColor and one triangle when segments=1 (default)', () => {
    drawFilledSector(asDoc(doc), 50, 60, 10, 0, Math.PI / 2, [180, 180, 180]);
    const fillCalls = doc.calls.filter(c => c.method === 'setFillColor');
    const triCalls = doc.calls.filter(c => c.method === 'triangle');
    expect(fillCalls).toHaveLength(1);
    expect(fillCalls[0].args).toEqual([180, 180, 180]);
    expect(triCalls).toHaveLength(1);
    // First triangle vertex must be the centre.
    expect(triCalls[0].args.slice(0, 2)).toEqual([50, 60]);
    // Last triangle arg must be the 'F' style flag.
    expect(triCalls[0].args[triCalls[0].args.length - 1]).toBe('F');
  });

  it('subdivides into N triangles when segments=N', () => {
    drawFilledSector(asDoc(doc), 0, 0, 5, 0, Math.PI * 2, [10, 20, 30], 4);
    const triCalls = doc.calls.filter(c => c.method === 'triangle');
    expect(triCalls).toHaveLength(4);
    // Every triangle still anchors on the centre (0, 0).
    for (const t of triCalls) {
      expect(t.args[0]).toBe(0);
      expect(t.args[1]).toBe(0);
    }
  });

  it('clamps segments below 1 up to 1 — does not skip the fill', () => {
    drawFilledSector(asDoc(doc), 0, 0, 1, 0, 1, [0, 0, 0], 0);
    expect(doc.calls.filter(c => c.method === 'triangle')).toHaveLength(1);
  });
});

describe('drawArcPolyline', () => {
  it('emits exactly N line() calls for N segments', () => {
    drawArcPolyline(asDoc(doc), 0, 0, 10, 0, Math.PI / 2, 8);
    expect(doc.calls.filter(c => c.method === 'line')).toHaveLength(8);
  });

  it('uses the default of 16 segments when omitted', () => {
    drawArcPolyline(asDoc(doc), 0, 0, 10, 0, Math.PI);
    expect(doc.calls.filter(c => c.method === 'line')).toHaveLength(16);
  });

  it('first line starts at the arc-start point (r·cos(start), r·sin(start))', () => {
    drawArcPolyline(asDoc(doc), 100, 200, 10, 0, Math.PI / 2, 2);
    const lineCalls = doc.calls.filter(c => c.method === 'line');
    // First line: from (cx + r·cos(0), cy + r·sin(0)) = (110, 200)
    //                  to (cx + r·cos(π/4), cy + r·sin(π/4))
    expect(lineCalls[0].args[0]).toBeCloseTo(110, 5);
    expect(lineCalls[0].args[1]).toBeCloseTo(200, 5);
  });
});

describe('drawPolygon', () => {
  it('emits one lines() call with deltas and the requested style/closed=true', () => {
    drawPolygon(
      asDoc(doc),
      [
        [0, 0],
        [10, 0],
        [10, 10],
      ],
      'FD',
    );
    const callsList = doc.calls.filter(c => c.method === 'lines');
    expect(callsList).toHaveLength(1);
    const [deltas, x, y, scale, style, closed] = callsList[0].args as [
      number[][],
      number,
      number,
      [number, number],
      'F' | 'S' | 'FD',
      boolean,
    ];
    expect(x).toBe(0);
    expect(y).toBe(0);
    expect(scale).toEqual([1, 1]);
    expect(style).toBe('FD');
    expect(closed).toBe(true);
    // Deltas: (10, 0) and (0, 10).
    expect(deltas).toEqual([
      [10, 0],
      [0, 10],
    ]);
  });

  it("defaults to style='S' (stroke only) when style is omitted", () => {
    drawPolygon(asDoc(doc), [
      [0, 0],
      [1, 0],
      [0, 1],
    ]);
    const styleArg = (doc.calls.find(c => c.method === 'lines')!.args as unknown[])[4];
    expect(styleArg).toBe('S');
  });

  it('renders nothing when fewer than 2 points are supplied (early return)', () => {
    drawPolygon(asDoc(doc), []);
    drawPolygon(asDoc(doc), [[3, 4]]);
    expect(doc.calls.filter(c => c.method === 'lines')).toHaveLength(0);
  });
});
