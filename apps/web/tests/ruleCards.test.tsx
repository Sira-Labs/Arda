import { IZHAR_EXCEPTIONS, RULES, SHEET_EXAMPLES, detect } from '@arda/tajweed';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { UNIT2, UNIT2_CARDS } from '@/content/unit2';
import { Path } from '@/modules/path/Path';
import { RuleCardPage } from '@/modules/path/RuleCard';
import { segmentsOf } from '@/tajweed/segments';
import { fakeApi, Providers } from './render';

const NUN_RULES = new Set([
  'izhar',
  'idgham-ghunna',
  'idgham-no-ghunna',
  'iqlab',
  'ikhfa',
]);

function renderAt(path: string) {
  const { client } = fakeApi({});
  return render(
    <Providers client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/pfad" element={<Path />} />
          <Route path="/pfad/2/:rule" element={<RuleCardPage />} />
        </Routes>
      </MemoryRouter>
    </Providers>
  );
}

describe('unit 2 content (S1.3, F2)', () => {
  it('puts every nūn sākina example of the sheet on a card, and the four exceptions', () => {
    const onCards = UNIT2_CARDS.flatMap((id) =>
      UNIT2[id].groups.flatMap((group) => group.examples.map((example) => example.text))
    );
    const fromSheet = SHEET_EXAMPLES.filter((e) => NUN_RULES.has(e.expectedRule)).map(
      (e) => e.text
    );
    expect(onCards.sort()).toEqual(fromSheet.sort());
    expect(UNIT2.idgham.exceptions).toEqual(IZHAR_EXCEPTIONS.map((e) => e.text));
  });

  it('shows on each card only examples the engine reads as that card’s rule', () => {
    for (const id of UNIT2_CARDS) {
      for (const group of UNIT2[id].groups) {
        for (const example of group.examples) {
          expect(
            detect(example.text).map((o) => o.rule),
            example.text
          ).toContain(group.rule);
        }
      }
    }
  });

  it('names the case of each example: inside a word, across words, after tanwīn', () => {
    const cases = Object.fromEntries(
      UNIT2.iqlab.groups[0]!.examples.map((example) => [example.text, example.case])
    );
    expect(cases['مِنْ بَعْدِ']).toBe('across');
    expect(cases['سَمِيعٌ بَصِيرٌ']).toBe('tanwin');
    expect(UNIT2.ikhfa.groups[0]!.examples.find((e) => e.text === 'مِنْكُمْ')?.case).toBe(
      'inside'
    );
  });

  it('keeps every card a draft until the sheikh has reviewed it', () => {
    for (const id of UNIT2_CARDS) expect(UNIT2[id].review.status).toBe('draft');
  });
});

describe('segmentsOf', () => {
  it('keeps the text, colours the carrier and marks the letter that decides', () => {
    const segments = segmentsOf('مِنۢ بَعْدِ');
    expect(segments.map((s) => s.text).join('')).toBe('مِنۢ بَعْدِ');
    expect(segments.find((s) => s.role === 'carrier')).toMatchObject({
      text: 'نۢ',
      rule: RULES.iqlab.family,
      ruleId: 'iqlab',
    });
    expect(segments.find((s) => s.role === 'follower')?.text).toBe('بَ');
  });

  it('leaves iẓhār uncoloured but still marks it', () => {
    const carrier = segmentsOf('مِنْ هَادٍ').find((s) => s.role === 'carrier');
    expect(carrier).toMatchObject({ text: 'نْ', ruleId: 'izhar' });
    expect(carrier?.rule).toBeUndefined();
  });
});

describe('the rule card', () => {
  beforeEach(() => {
    localStorage.setItem('arda.language', 'de');
  });

  it('shows the rule, its draft state, the examples in IndoPak and a label for each colour', () => {
    renderAt('/pfad/2/iqlab');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Iqlāb – Nūn wird zu Mīm vor Bāʾ' })
    ).toBeInTheDocument();
    expect(screen.getAllByText('Entwurf').length).toBeGreaterThan(0);
    const examples = screen.getByLabelText('Beispiele aus deinem Blatt');
    const quran = examples.querySelectorAll('p.quran');
    expect(quran).toHaveLength(4);
    for (const p of quran) {
      expect(p).toHaveAttribute('lang', 'ar');
      expect(p).toHaveAttribute('dir', 'rtl');
      expect(p).toHaveAttribute('data-script', 'indopak');
    }
    expect(within(examples).getAllByTitle('Iqlāb · Ghunna').length).toBe(4);
    expect(
      screen.getByText(/grün = Ghunna, Nasenklang, 2 Zählzeiten/)
    ).toBeInTheDocument();
    expect(screen.getByText('Quellen unterscheiden sich')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '75');
    expect(screen.getByRole('link', { name: 'Weiter: Ikhfāʾ' })).toHaveAttribute(
      'href',
      '/pfad/2/ikhfa'
    );
  });

  it('teaches idghām with and without ghunna and the four exceptions', () => {
    renderAt('/pfad/2/idgham');
    expect(screen.getByText('mit Ghunna')).toBeInTheDocument();
    expect(screen.getByText('ohne Ghunna')).toBeInTheDocument();
    expect(screen.getByText(/grau = Stumm/)).toBeInTheDocument();
    const exceptions = screen.getByRole('heading', {
      name: 'Ausnahme: in einem Wort bleibt es klar (Iẓhār)',
    }).parentElement!;
    expect(exceptions.querySelectorAll('p.quran')).toHaveLength(4);
  });

  it('reads in Arabic with the Arabic rule names', () => {
    localStorage.setItem('arda.language', 'ar');
    renderAt('/pfad/2/ikhfa');
    expect(
      screen.getByRole('heading', { level: 1, name: 'إِخْفَاء – تُخفى النون مع الغنة' })
    ).toBeInTheDocument();
    expect(screen.getByText('البطاقة ٤ من ٤')).toBeInTheDocument();
  });

  it('answers an unknown rule with “not found”', () => {
    renderAt('/pfad/2/madd');
    expect(screen.getByRole('heading', { name: 'Nicht gefunden' })).toBeInTheDocument();
  });
});

describe('the path', () => {
  it('lists the four cards of unit 2 in the order of the sheet', () => {
    localStorage.setItem('arda.language', 'en');
    renderAt('/pfad');
    const links = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(links).toEqual([
      '/pfad/2/izhar',
      '/pfad/2/idgham',
      '/pfad/2/iqlab',
      '/pfad/2/ikhfa',
    ]);
    expect(screen.getByText('15 letters')).toBeInTheDocument();
  });
});

describe('accessible names', () => {
  it('tell the two idghām groups apart', () => {
    localStorage.setItem('arda.language', 'de');
    renderAt('/pfad/2/idgham');
    expect(
      screen.getByRole('region', { name: 'Idghām · mit Ghunna' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Idghām · ohne Ghunna' })
    ).toBeInTheDocument();
  });
});
