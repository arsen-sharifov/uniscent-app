import { describe, expect, test } from 'vitest';

import { renderShortcut, toAriaShortcut, toShortcutKey } from '@/components/Toolbar/utils';

describe('renderShortcut', () => {
  describe('GIVEN a shortcut with modifiers', () => {
    describe('WHEN it is rendered into tokens', () => {
      test('THEN each modifier and the key become separate tokens', () => {
        expect(renderShortcut('⌘⇧Z')).toEqual(['⌘', '⇧', 'Z']);
      });
    });
  });

  describe('GIVEN a multi-character key', () => {
    describe('WHEN it is rendered into tokens', () => {
      test('THEN the characters merge into one token', () => {
        expect(renderShortcut('F2')).toEqual(['F2']);
      });
    });
  });

  describe('GIVEN a single key', () => {
    describe('WHEN it is rendered into tokens', () => {
      test('THEN a single token is produced', () => {
        expect(renderShortcut('V')).toEqual(['V']);
      });
    });
  });
});

describe('toAriaShortcut', () => {
  describe('GIVEN a shortcut with modifiers', () => {
    describe('WHEN it is converted for aria', () => {
      test('THEN symbols expand to key names joined by plus signs', () => {
        expect(toAriaShortcut('⌘⇧Z')).toBe('Meta+Shift+Z');
      });
    });
  });

  describe('GIVEN a plain letter shortcut', () => {
    describe('WHEN it is converted for aria', () => {
      test('THEN it passes through unchanged', () => {
        expect(toAriaShortcut('V')).toBe('V');
      });
    });
  });

  describe('GIVEN the plus key on its own', () => {
    describe('WHEN it is converted for aria', () => {
      test('THEN it is named Plus instead of vanishing', () => {
        expect(toAriaShortcut('+')).toBe('Plus');
      });
    });
  });

  describe('GIVEN the plus key behind a modifier', () => {
    describe('WHEN it is converted for aria', () => {
      test('THEN the modifier and the Plus key name are joined', () => {
        expect(toAriaShortcut('⌘+')).toBe('Meta+Plus');
      });
    });
  });

  describe('GIVEN a lone modifier', () => {
    describe('WHEN it is converted for aria', () => {
      test('THEN no trailing plus is left', () => {
        expect(toAriaShortcut('⌘')).toBe('Meta');
      });
    });
  });

  describe('GIVEN no shortcut', () => {
    describe('WHEN it is converted for aria', () => {
      test('THEN nothing is produced', () => {
        expect(toAriaShortcut(undefined)).toBeUndefined();
      });
    });
  });
});

describe('toShortcutKey', () => {
  describe('GIVEN a Latin letter typed on any layout', () => {
    describe('WHEN the pressed key is resolved', () => {
      test('THEN the printed letter wins, lower-cased', () => {
        expect(toShortcutKey({ key: 'Z', code: 'KeyZ' })).toBe('z');
        expect(toShortcutKey({ key: 'a', code: 'KeyQ' })).toBe('a');
      });
    });
  });

  describe('GIVEN a letter of another script typed on a letter key', () => {
    describe('WHEN the pressed key is resolved', () => {
      test('THEN the Latin letter of the physical key is used', () => {
        expect(toShortcutKey({ key: 'я', code: 'KeyZ' })).toBe('z');
        expect(toShortcutKey({ key: 'Р', code: 'KeyH' })).toBe('h');
      });
    });
  });

  describe('GIVEN a letter of another script outside the letter keys', () => {
    describe('WHEN the pressed key is resolved', () => {
      test('THEN the typed letter is kept', () => {
        expect(toShortcutKey({ key: 'х', code: 'BracketLeft' })).toBe('х');
      });
    });
  });

  describe('GIVEN a symbol typed on a letter key', () => {
    describe('WHEN the pressed key is resolved', () => {
      test('THEN the symbol is kept instead of the physical letter', () => {
        expect(toShortcutKey({ key: ';', code: 'KeyZ' })).toBe(';');
        expect(toShortcutKey({ key: '+', code: 'Equal' })).toBe('+');
      });
    });
  });
});
