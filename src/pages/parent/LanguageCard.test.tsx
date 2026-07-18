// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LocaleProvider } from '@/lib/i18n/react';
import { setLocale, getLocale } from '@/lib/i18n/i18n';
import LanguageCard from './LanguageCard';

beforeEach(() => { localStorage.clear(); setLocale('en'); });

it('lists each language in its own name and switches instantly', () => {
  render(<LocaleProvider><LanguageCard /></LocaleProvider>);
  const select = screen.getByLabelText('Language');
  expect(screen.getByRole('option', { name: 'Português' })).toBeTruthy();
  fireEvent.change(select, { target: { value: 'fr' } });
  expect(getLocale()).toBe('fr');
  expect(localStorage.getItem('tth_lang')).toBe('fr');
});
