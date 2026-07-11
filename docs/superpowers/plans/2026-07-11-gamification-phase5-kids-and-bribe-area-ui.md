# Gamification Phase 5 — Kids & Bribe-Area UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. Checkbox (`- [ ]`) steps.

**Goal:** Surface the Phase 3 kids and reward-rules endpoints in the parent area: a kids-management screen (add / list / delete) and the three-level "bribe area" rules editor, scoped to all-kids or a specific kid.

**Architecture:** Extend the API client with kids/rules calls. Add three React screens under `src/pages/parent/`: `ParentKids` (CRUD), `RewardRulesForm` (a controlled editor for one `RewardRulesConfig`), and `BribeArea` (scope selector + form + save). Route them under `/parent/*` behind `RequireAuth`, linked from `ParentHome`. All additive; no module or Hub changes.

**Tech Stack:** React 18 + TS, react-router-dom, Vitest + @testing-library/react (jsdom), Phase 3 Functions.

## Global Constraints

- All new screens live behind `RequireAuth`; they assume an authenticated parent.
- Reward numbers (minutes/exercises/sessions/minPercent/n/successDaysRequired) are **parent-editable**; rewards are **free-text**. Nothing hardcoded beyond sensible defaults for a *new* rule.
- Rule scope: **"All kids"** (`kidId: null`) or a **specific kid**. Saving posts one scope at a time to `PUT /api/rules`.
- The rules payload sent to the API must pass the Phase 3 validator (`level1/level2/level3` each well-formed; level1 goal has ≥1 field set). The form guarantees this by construction (a new rule starts from a valid default and always keeps at least the time goal).
- `weakTopics` is intentionally **not** exposed in this form yet (advanced; the engine + API support it, the UI defers it). Documented, not a gap.
- Component tests use the `// @vitest-environment jsdom` first-line pragma + Testing Library. New files only, plus small edits to `ParentHome.tsx` (links) and `App.tsx` (routes).

---

### Task 1: API client — kids & rules calls

**Files:**
- Modify: `src/lib/api/client.ts`
- Test: `src/lib/api/client.kids-rules.test.ts`

**Interfaces (added to client.ts):**
- `interface Kid { id: string; name: string; color: string; icon: string }`
- `interface KidInput { name: string; color: string; icon: string }`
- `kidsList(): Promise<Kid[]>`
- `kidsCreate(input: KidInput): Promise<Kid>`
- `kidsDelete(id: string): Promise<void>`
- `interface RewardRulesConfig` (re-exported shape: `{ level1; level2; level3 }` — imported from a shared web type below)
- `interface RulesRow { kidId: string | null; config: RewardRulesConfig; updatedAt: string }`
- `rulesList(): Promise<RulesRow[]>`
- `rulesPut(kidId: string | null, config: RewardRulesConfig): Promise<void>`

Because the engine types live in `functions/`, define the web-side rule types in `src/lib/rewards-types.ts` (structural copies) to avoid importing across the app/functions boundary.

- [ ] **Step 1: Create `src/lib/rewards-types.ts`** (web-side mirror of the engine rule config)

```ts
export interface Level1Rule {
  goal: { minutes?: number; exercises?: number; sessions?: number };
  score: { kind: 'dailyPercent'; minPercent: number } | { kind: 'lastNAverage'; n: number; minPercent: number };
  weakTopics?: { topics: string[]; minPercent: number };
  dailyReward: string;
}
export interface Level2Rule { successDaysRequired: number; weeklyReward: string }
export interface Level3Rule { enabled: boolean; target: '2weeks' | 'month'; reward: string }
export interface RewardRulesConfig { level1: Level1Rule; level2: Level2Rule; level3: Level3Rule }

export const DEFAULT_RULES: RewardRulesConfig = {
  level1: { goal: { minutes: 15 }, score: { kind: 'dailyPercent', minPercent: 80 }, dailyReward: '' },
  level2: { successDaysRequired: 5, weeklyReward: '' },
  level3: { enabled: false, target: '2weeks', reward: '' },
};
```

- [ ] **Step 2: Write the failing test** `src/lib/api/client.kids-rules.test.ts`

```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { kidsList, kidsCreate, kidsDelete, rulesList, rulesPut, ApiError, tokenStore } from './client';
import { DEFAULT_RULES } from '@/lib/rewards-types';

const okJson = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

beforeEach(() => { localStorage.clear(); tokenStore.set('t'); vi.restoreAllMocks(); });
afterEach(() => vi.restoreAllMocks());

describe('kids client', () => {
  it('lists kids', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(okJson(200, { kids: [{ id: 'k1', name: 'Sam', color: 'blue', icon: 'star' }] }));
    expect((await kidsList()).map(k => k.name)).toEqual(['Sam']);
  });

  it('creates a kid', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(okJson(201, { kid: { id: 'k1', name: 'Sam', color: 'blue', icon: 'star' } }));
    expect((await kidsCreate({ name: 'Sam', color: 'blue', icon: 'star' })).id).toBe('k1');
  });

  it('throws ApiError on a bad create', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(okJson(400, { error: 'invalid_input' }));
    await expect(kidsCreate({ name: '', color: 'blue', icon: 'star' })).rejects.toMatchObject({ code: 'invalid_input' });
  });

  it('deletes a kid', async () => {
    const f = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okJson(200, { ok: true }));
    await kidsDelete('k1');
    expect(f).toHaveBeenCalledWith('/api/kids/k1', expect.objectContaining({ method: 'DELETE' }));
  });
});

describe('rules client', () => {
  it('lists rules', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(okJson(200, { rules: [{ kidId: null, config: DEFAULT_RULES, updatedAt: 't' }] }));
    expect((await rulesList())[0].kidId).toBeNull();
  });

  it('puts rules', async () => {
    const f = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okJson(200, { ok: true }));
    await rulesPut('k1', DEFAULT_RULES);
    expect(f).toHaveBeenCalledWith('/api/rules', expect.objectContaining({ method: 'PUT' }));
  });
});
```

- [ ] **Step 3: Run to verify it fails** — `npx vitest run src/lib/api/client.kids-rules.test.ts` → FAIL (exports missing).

- [ ] **Step 4: Append to `src/lib/api/client.ts`** (after the existing exports; reuse the private `apiFetch`/`codeOf`):

```ts
import type { RewardRulesConfig } from '@/lib/rewards-types';

export interface Kid { id: string; name: string; color: string; icon: string }
export interface KidInput { name: string; color: string; icon: string }
export interface RulesRow { kidId: string | null; config: RewardRulesConfig; updatedAt: string }

export async function kidsList(): Promise<Kid[]> {
  const { status, data } = await apiFetch<{ kids: Kid[] }>('/api/kids');
  if (status !== 200 || !data) throw new ApiError(codeOf(data), status);
  return data.kids;
}

export async function kidsCreate(input: KidInput): Promise<Kid> {
  const { status, data } = await apiFetch<{ kid: Kid }>('/api/kids', { method: 'POST', body: input });
  if (status >= 400 || !data) throw new ApiError(codeOf(data), status);
  return data.kid;
}

export async function kidsDelete(id: string): Promise<void> {
  const { status, data } = await apiFetch<{ ok: true }>(`/api/kids/${id}`, { method: 'DELETE' });
  if (status >= 400) throw new ApiError(codeOf(data), status);
}

export async function rulesList(): Promise<RulesRow[]> {
  const { status, data } = await apiFetch<{ rules: RulesRow[] }>('/api/rules');
  if (status !== 200 || !data) throw new ApiError(codeOf(data), status);
  return data.rules;
}

export async function rulesPut(kidId: string | null, config: RewardRulesConfig): Promise<void> {
  const { status, data } = await apiFetch<{ ok: true }>('/api/rules', { method: 'PUT', body: { kidId, rules: config } });
  if (status >= 400) throw new ApiError(codeOf(data), status);
}
```

Note: `apiFetch` and `codeOf` are module-private already; these functions live in the same file so they can call them directly.

- [ ] **Step 5: Run to verify it passes** — `npx vitest run src/lib/api/client.kids-rules.test.ts` → PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/rewards-types.ts src/lib/api/client.ts src/lib/api/client.kids-rules.test.ts
git commit -m "feat(web): API client for kids and reward rules"
```

---

### Task 2: Kids management screen

**Files:**
- Create: `src/pages/parent/ParentKids.tsx`
- Test: `src/pages/parent/ParentKids.test.tsx`

**Interfaces:**
- Consumes: `kidsList`, `kidsCreate`, `kidsDelete`, `Kid`, `ApiError` from `@/lib/api/client`.
- Produces: `ParentKids` (default export) — loads kids on mount, shows a list with delete buttons, and an add form (name + color + icon selects).

- [ ] **Step 1: Write the failing test** `src/pages/parent/ParentKids.test.tsx`

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

const kidsList = vi.fn();
const kidsCreate = vi.fn();
const kidsDelete = vi.fn();
vi.mock('@/lib/api/client', () => ({
  kidsList: (...a: unknown[]) => kidsList(...a),
  kidsCreate: (...a: unknown[]) => kidsCreate(...a),
  kidsDelete: (...a: unknown[]) => kidsDelete(...a),
  ApiError: class extends Error { code = 'x'; },
}));

import ParentKids from './ParentKids';

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

describe('ParentKids', () => {
  it('lists existing kids', async () => {
    kidsList.mockResolvedValue([{ id: 'k1', name: 'Sam', color: 'blue', icon: 'star' }]);
    render(<ParentKids />);
    await waitFor(() => expect(screen.getByText('Sam')).toBeInTheDocument());
  });

  it('adds a kid', async () => {
    kidsList.mockResolvedValue([]);
    kidsCreate.mockResolvedValue({ id: 'k2', name: 'Alex', color: 'green', icon: 'rocket' });
    render(<ParentKids />);
    await waitFor(() => expect(kidsList).toHaveBeenCalled());
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Alex' } });
    fireEvent.click(screen.getByRole('button', { name: /add kid/i }));
    await waitFor(() => expect(kidsCreate).toHaveBeenCalledWith(expect.objectContaining({ name: 'Alex' })));
    await waitFor(() => expect(screen.getByText('Alex')).toBeInTheDocument());
  });

  it('deletes a kid', async () => {
    kidsList.mockResolvedValue([{ id: 'k1', name: 'Sam', color: 'blue', icon: 'star' }]);
    kidsDelete.mockResolvedValue(undefined);
    render(<ParentKids />);
    await waitFor(() => expect(screen.getByText('Sam')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /remove sam/i }));
    await waitFor(() => expect(kidsDelete).toHaveBeenCalledWith('k1'));
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `npx vitest run src/pages/parent/ParentKids.test.tsx` → FAIL.

- [ ] **Step 3: Implement `src/pages/parent/ParentKids.tsx`**

```tsx
import { useEffect, useState, type FormEvent } from 'react';
import { kidsList, kidsCreate, kidsDelete, type Kid } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const COLORS = ['red', 'blue', 'green', 'purple'];
const ICONS = ['star', 'heart', 'rocket', 'flower'];

export default function ParentKids() {
  const [kids, setKids] = useState<Kid[]>([]);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[1]);
  const [icon, setIcon] = useState(ICONS[0]);
  const [error, setError] = useState('');

  useEffect(() => { kidsList().then(setKids).catch(() => setError('Could not load kids.')); }, []);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmed = name.trim();
    if (!trimmed) { setError('Please enter a name.'); return; }
    try {
      const kid = await kidsCreate({ name: trimmed, color, icon });
      setKids(prev => [...prev, kid]);
      setName('');
    } catch { setError('Could not add that kid.'); }
  };

  const remove = async (id: string) => {
    await kidsDelete(id);
    setKids(prev => prev.filter(k => k.id !== id));
  };

  return (
    <Card className="p-5 space-y-4">
      <h2 className="text-xl font-bold">Kids</h2>
      <ul className="space-y-2">
        {kids.map(k => (
          <li key={k.id} className="flex items-center justify-between border rounded-lg px-3 py-2">
            <span className="font-semibold">{k.name}</span>
            <Button variant="outline" aria-label={`Remove ${k.name}`} onClick={() => remove(k.id)}>Remove</Button>
          </li>
        ))}
        {kids.length === 0 && <li className="text-sm text-muted-foreground">No kids yet.</li>}
      </ul>
      <form onSubmit={add} className="space-y-2 border-t pt-4">
        <label className="block text-sm font-medium" htmlFor="kid-name">Name</label>
        <Input id="kid-name" value={name} onChange={e => setName(e.target.value)} />
        <div className="flex gap-2">
          <select aria-label="Colour" value={color} onChange={e => setColor(e.target.value)} className="border rounded-md px-2 py-1">
            {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select aria-label="Icon" value={icon} onChange={e => setIcon(e.target.value)} className="border rounded-md px-2 py-1">
            {ICONS.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit">Add kid</Button>
      </form>
    </Card>
  );
}
```

- [ ] **Step 4: Run to verify it passes** — `npx vitest run src/pages/parent/ParentKids.test.tsx` → PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/pages/parent/ParentKids.tsx src/pages/parent/ParentKids.test.tsx
git commit -m "feat(web): kids management screen"
```

---

### Task 3: Reward-rules form (controlled)

**Files:**
- Create: `src/pages/parent/RewardRulesForm.tsx`
- Test: `src/pages/parent/RewardRulesForm.test.tsx`

**Interfaces:**
- Consumes: `RewardRulesConfig` from `@/lib/rewards-types`.
- Produces: `RewardRulesForm({ value, onChange }: { value: RewardRulesConfig; onChange: (c: RewardRulesConfig) => void })` — a controlled editor. Numeric inputs update the config; a blank goal-minutes coerces to keeping the field but the form guarantees at least `minutes` stays set (defaults to 1 if cleared) so the payload stays valid.

- [ ] **Step 1: Write the failing test** `src/pages/parent/RewardRulesForm.test.tsx`

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import RewardRulesForm from './RewardRulesForm';
import { DEFAULT_RULES, type RewardRulesConfig } from '@/lib/rewards-types';

afterEach(() => cleanup());

function setup(initial: RewardRulesConfig = DEFAULT_RULES) {
  const onChange = vi.fn();
  let current = initial;
  const rerender = (c: RewardRulesConfig) => { current = c; };
  onChange.mockImplementation(rerender);
  render(<RewardRulesForm value={current} onChange={onChange} />);
  return { onChange };
}

describe('RewardRulesForm', () => {
  it('edits the daily reward text', () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByLabelText(/daily reward/i), { target: { value: '1 pound' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      level1: expect.objectContaining({ dailyReward: '1 pound' }),
    }));
  });

  it('edits the weekly success-days number', () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByLabelText(/successful days per week/i), { target: { value: '6' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      level2: expect.objectContaining({ successDaysRequired: 6 }),
    }));
  });

  it('toggles the extended reward on', () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByLabelText(/enable a bigger reward/i));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      level3: expect.objectContaining({ enabled: true }),
    }));
  });

  it('switches the score type to a rolling average', () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByLabelText(/score requirement/i), { target: { value: 'lastNAverage' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      level1: expect.objectContaining({ score: expect.objectContaining({ kind: 'lastNAverage' }) }),
    }));
  });
});
```

- [ ] **Step 2: Run to verify it fails** — FAIL.

- [ ] **Step 3: Implement `src/pages/parent/RewardRulesForm.tsx`**

```tsx
import type { RewardRulesConfig, Level1Rule } from '@/lib/rewards-types';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

interface Props { value: RewardRulesConfig; onChange: (c: RewardRulesConfig) => void }

// Parse a numeric input, keeping a minimum so required fields never go invalid.
const num = (raw: string, min: number): number => {
  const n = Number(raw);
  return Number.isFinite(n) && n >= min ? n : min;
};

export default function RewardRulesForm({ value, onChange }: Props) {
  const setL1 = (patch: Partial<Level1Rule>) => onChange({ ...value, level1: { ...value.level1, ...patch } });
  const setScore = (kind: 'dailyPercent' | 'lastNAverage') =>
    setL1({ score: kind === 'dailyPercent' ? { kind, minPercent: 80 } : { kind, n: 2, minPercent: 100 } });

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <h3 className="font-bold">Level 1 — daily goal</h3>
        <label className="block text-sm font-medium" htmlFor="min">Minutes of practice per day</label>
        <Input id="min" type="number" inputMode="numeric" min={1}
          value={value.level1.goal.minutes ?? 1}
          onChange={e => setL1({ goal: { ...value.level1.goal, minutes: num(e.target.value, 1) } })} />

        <label className="block text-sm font-medium" htmlFor="score">Score requirement</label>
        <select id="score" aria-label="Score requirement" className="border rounded-md px-2 py-1 w-full"
          value={value.level1.score.kind} onChange={e => setScore(e.target.value as 'dailyPercent' | 'lastNAverage')}>
          <option value="dailyPercent">Minimum percent correct for the day</option>
          <option value="lastNAverage">Average of the last few exercises</option>
        </select>
        <label className="block text-sm font-medium" htmlFor="minpct">Minimum percent</label>
        <Input id="minpct" type="number" inputMode="numeric" min={0}
          value={value.level1.score.minPercent}
          onChange={e => setL1({ score: { ...value.level1.score, minPercent: num(e.target.value, 0) } })} />

        <label className="block text-sm font-medium" htmlFor="daily">Daily reward</label>
        <Input id="daily" placeholder="e.g. 1 pound or 2 Pokemon cards"
          value={value.level1.dailyReward}
          onChange={e => setL1({ dailyReward: e.target.value })} />
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="font-bold">Level 2 — weekly streak</h3>
        <label className="block text-sm font-medium" htmlFor="days">Successful days per week</label>
        <Input id="days" type="number" inputMode="numeric" min={1} max={7}
          value={value.level2.successDaysRequired}
          onChange={e => onChange({ ...value, level2: { ...value.level2, successDaysRequired: num(e.target.value, 1) } })} />
        <label className="block text-sm font-medium" htmlFor="weekly">Weekly reward</label>
        <Input id="weekly" placeholder="e.g. 10 pounds or a toy"
          value={value.level2.weeklyReward}
          onChange={e => onChange({ ...value, level2: { ...value.level2, weeklyReward: e.target.value } })} />
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="font-bold">Level 3 — bigger reward</h3>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" aria-label="Enable a bigger reward"
            checked={value.level3.enabled}
            onChange={e => onChange({ ...value, level3: { ...value.level3, enabled: e.target.checked } })} />
          Enable a bigger reward
        </label>
        <label className="block text-sm font-medium" htmlFor="target">Earned after</label>
        <select id="target" aria-label="Extended target" className="border rounded-md px-2 py-1 w-full"
          value={value.level3.target}
          onChange={e => onChange({ ...value, level3: { ...value.level3, target: e.target.value as '2weeks' | 'month' } })}>
          <option value="2weeks">2 weeks in a row</option>
          <option value="month">A whole month</option>
        </select>
        <label className="block text-sm font-medium" htmlFor="big">Bigger reward</label>
        <Input id="big" placeholder="e.g. shoes or a day out"
          value={value.level3.reward}
          onChange={e => onChange({ ...value, level3: { ...value.level3, reward: e.target.value } })} />
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes** — PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/pages/parent/RewardRulesForm.tsx src/pages/parent/RewardRulesForm.test.tsx
git commit -m "feat(web): three-level reward-rules form"
```

---

### Task 4: Bribe-area page + routes + home links

**Files:**
- Create: `src/pages/parent/BribeArea.tsx`
- Modify: `src/pages/parent/ParentHome.tsx` (add links to `/parent/kids` and `/parent/rewards`)
- Modify: `src/App.tsx` (routes for the two screens)
- Test: `src/pages/parent/BribeArea.test.tsx`

**Interfaces:**
- Consumes: `kidsList`, `rulesList`, `rulesPut`, `Kid`, `RulesRow` from client; `DEFAULT_RULES`, `RewardRulesConfig` from rewards-types; `RewardRulesForm`.
- Produces: `BribeArea` (default export) — a scope `<select>` (All kids + each kid), the `RewardRulesForm` seeded from the stored rule for that scope (or `DEFAULT_RULES`), and a Save button calling `rulesPut(scope, config)`.

- [ ] **Step 1: Write the failing test** `src/pages/parent/BribeArea.test.tsx`

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

const kidsList = vi.fn();
const rulesList = vi.fn();
const rulesPut = vi.fn();
vi.mock('@/lib/api/client', () => ({
  kidsList: (...a: unknown[]) => kidsList(...a),
  rulesList: (...a: unknown[]) => rulesList(...a),
  rulesPut: (...a: unknown[]) => rulesPut(...a),
}));

import BribeArea from './BribeArea';

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

describe('BribeArea', () => {
  it('loads existing all-kids rules and saves edits', async () => {
    kidsList.mockResolvedValue([]);
    rulesList.mockResolvedValue([]);
    rulesPut.mockResolvedValue(undefined);
    render(<BribeArea />);
    await waitFor(() => expect(rulesList).toHaveBeenCalled());
    fireEvent.change(screen.getByLabelText(/daily reward/i), { target: { value: '2 stickers' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(rulesPut).toHaveBeenCalledWith(null, expect.objectContaining({
      level1: expect.objectContaining({ dailyReward: '2 stickers' }),
    })));
  });

  it('lists kids as scope options', async () => {
    kidsList.mockResolvedValue([{ id: 'k1', name: 'Sam', color: 'blue', icon: 'star' }]);
    rulesList.mockResolvedValue([]);
    render(<BribeArea />);
    await waitFor(() => expect(screen.getByRole('option', { name: 'Sam' })).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run to verify it fails** — FAIL.

- [ ] **Step 3: Implement `src/pages/parent/BribeArea.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { kidsList, rulesList, rulesPut, type Kid, type RulesRow } from '@/lib/api/client';
import { DEFAULT_RULES, type RewardRulesConfig } from '@/lib/rewards-types';
import RewardRulesForm from './RewardRulesForm';
import { Button } from '@/components/ui/button';

export default function BribeArea() {
  const [kids, setKids] = useState<Kid[]>([]);
  const [rules, setRules] = useState<RulesRow[]>([]);
  const [scope, setScope] = useState<string>(''); // '' = all kids; else kidId
  const [config, setConfig] = useState<RewardRulesConfig>(DEFAULT_RULES);
  const [status, setStatus] = useState('');

  useEffect(() => {
    Promise.all([kidsList(), rulesList()]).then(([k, r]) => { setKids(k); setRules(r); }).catch(() => setStatus('Could not load.'));
  }, []);

  // Seed the form from the stored rule for the selected scope (or defaults).
  useEffect(() => {
    const kidId = scope === '' ? null : scope;
    const found = rules.find(r => r.kidId === kidId);
    setConfig(found ? found.config : DEFAULT_RULES);
  }, [scope, rules]);

  const save = async () => {
    setStatus('');
    try {
      await rulesPut(scope === '' ? null : scope, config);
      setStatus('Saved.');
      const r = await rulesList();
      setRules(r);
    } catch { setStatus('Could not save.'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium" htmlFor="scope">These rules apply to</label>
        <select id="scope" aria-label="Rules apply to" className="border rounded-md px-2 py-1"
          value={scope} onChange={e => setScope(e.target.value)}>
          <option value="">All kids</option>
          {kids.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
        </select>
      </div>
      <RewardRulesForm value={config} onChange={setConfig} />
      <div className="flex items-center gap-3">
        <Button onClick={save}>Save</Button>
        {status && <span className="text-sm text-muted-foreground">{status}</span>}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Wire routes + links.** In `src/App.tsx`, add imports and routes:

```tsx
import ParentKids from './pages/parent/ParentKids';
import BribeArea from './pages/parent/BribeArea';
```
```tsx
          <Route path="/parent/kids" element={<RequireAuth><ParentKids /></RequireAuth>} />
          <Route path="/parent/rewards" element={<RequireAuth><BribeArea /></RequireAuth>} />
```

In `src/pages/parent/ParentHome.tsx`, add links inside the Card (using react-router `Link`):

```tsx
import { Link } from 'react-router-dom';
// ...inside the Card, replace the "will appear here" paragraph with:
<div className="flex flex-col gap-2 mt-3">
  <Link className="underline text-primary" to="/parent/kids">Manage kids</Link>
  <Link className="underline text-primary" to="/parent/rewards">Reward settings (the bribe area)</Link>
</div>
```

- [ ] **Step 5: Run to verify it passes** — `npx vitest run src/pages/parent/BribeArea.test.tsx` → PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/pages/parent/BribeArea.tsx src/pages/parent/ParentHome.tsx src/App.tsx src/pages/parent/BribeArea.test.tsx
git commit -m "feat(web): bribe-area page with scope selector, routes, and home links"
```

---

### Task 5: Full-suite green + build

- [ ] **Step 1:** `npx vitest run` → all pass (new web tests + everything prior).
- [ ] **Step 2:** `npm run build` → succeeds.
- [ ] **Step 3:** If a pre-existing test flakes, re-run once to confirm green. No commit.

---

## Self-Review

**Spec coverage:** `/api/kids` + `/api/rules` surfaced in UI (Tasks 1–4); three-level rules editor with editable numbers + free-text rewards (Task 3); per-kid or all-kids scope (Task 4). ✅
Deferred (documented): `weakTopics` UI; dashboard; session logging; kid indicator; privacy rewrite.

**Placeholder scan:** none.

**Type consistency:** `Kid`, `KidInput`, `RulesRow` (client), `RewardRulesConfig`/`Level1-3Rule`/`DEFAULT_RULES` (rewards-types) are used identically across Tasks 1–4. `RewardRulesForm`'s `{ value, onChange }` contract matches `BribeArea`'s usage. Scope encoding (`'' → null`) is consistent between the select and `rulesPut`.
