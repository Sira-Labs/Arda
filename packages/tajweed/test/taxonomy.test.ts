import { describe, expect, it } from 'vitest';
import {
  LETTERS,
  NUN_SAKINA_RULES,
  RULE_FAMILIES,
  RULE_IDS,
  RULES,
  isQalqalaLetter,
  mimSakinaRule,
  nunSakinaRule,
} from '../src/index';

describe('the nūn sākina rules', () => {
  const count = (id: (typeof NUN_SAKINA_RULES)[number]) => RULES[id].letters.length;

  it('teach 6 + 6 + 1 + 15 = 28 letters', () => {
    expect(LETTERS).toHaveLength(28);
    expect(count('izhar')).toBe(6);
    expect(count('idgham-ghunna') + count('idgham-no-ghunna')).toBe(6);
    expect(count('iqlab')).toBe(1);
    expect(count('ikhfa')).toBe(15);
  });

  it('give every letter exactly one rule', () => {
    for (const letter of LETTERS) {
      const rules = NUN_SAKINA_RULES.filter((id) => RULES[id].letters.includes(letter));
      expect(rules, letter).toHaveLength(1);
      expect(nunSakinaRule(letter)).toBe(rules[0]);
    }
  });

  it('hold the ghunna for yanmū, iqlāb and ikhfāʾ, not for lām and rāʾ', () => {
    expect(RULES['idgham-ghunna'].letters).toEqual(['ي', 'ن', 'م', 'و']);
    expect(RULES['idgham-no-ghunna'].letters).toEqual(['ل', 'ر']);
    expect(NUN_SAKINA_RULES.filter((id) => RULES[id].ghunna)).toEqual([
      'idgham-ghunna',
      'iqlab',
      'ikhfa',
    ]);
  });
});

describe('the taxonomy', () => {
  it('keys every rule by its id and colours it with a known family or none', () => {
    for (const id of RULE_IDS) {
      expect(RULES[id].id).toBe(id);
      const family = RULES[id].family;
      if (family !== null) expect(RULE_FAMILIES).toContain(family);
    }
  });

  it('leaves the clear rules uncoloured', () => {
    expect(RULES.izhar.family).toBeNull();
    expect(RULES['izhar-shafawi'].family).toBeNull();
  });
});

describe('mīm sākina', () => {
  it('is hidden before bāʾ, merged into mīm and clear before the rest', () => {
    expect(mimSakinaRule('ب')).toBe('ikhfa-shafawi');
    expect(mimSakinaRule('م')).toBe('idgham-shafawi');
    for (const letter of LETTERS.filter((l) => l !== 'ب' && l !== 'م')) {
      expect(mimSakinaRule(letter)).toBe('izhar-shafawi');
    }
  });
});

describe('qalqala', () => {
  it('is quṭbu jadd', () => {
    expect(LETTERS.filter(isQalqalaLetter)).toEqual(['ب', 'ج', 'د', 'ط', 'ق']);
  });
});
