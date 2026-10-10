import type { IInitialsCase, IMemberRow } from '@story-interfaces';

export const NAME_CASES: IInitialsCase[] = [
  { label: 'Two words', name: 'John Doe', description: 'Initials of the first two tokens.' },
  { label: 'Single word', name: 'Alice', description: 'First letter only.' },
  { label: 'Long name', name: 'Maximilian Theophilus Brackenridge', description: 'Only the first two tokens count.' },
  { label: 'Cyrillic', name: 'Олександр Коваленко', description: 'Non-Latin scripts uppercase correctly.' },
  { label: 'Diacritics', name: 'Étienne Müller', description: 'Accented characters are preserved.' },
  { label: 'Whitespace only', name: '   ', description: 'Falls back to "U".' },
];

export const SCRIPT_CASES: IInitialsCase[] = [
  { label: 'Ukrainian', name: 'Олександр Коваленко', description: 'Cyrillic letters uppercase via locale rules.' },
  { label: 'French', name: 'Étienne Dubois', description: 'Latin diacritics preserved in the rendered initials.' },
  { label: 'German', name: 'Jürgen Müller', description: 'Umlauts survive the slice/toUpperCase pipeline.' },
  { label: 'Greek', name: 'Δημήτρης Παππάς', description: 'Greek capital letters render at full weight.' },
  { label: 'Chinese', name: '张伟', description: 'Single CJK token yields one wide initial; slice keeps it intact.' },
  { label: 'Japanese', name: '佐藤 健', description: 'Two CJK tokens become two initials side by side.' },
  {
    label: 'Arabic',
    name: 'محمد علي',
    description: 'Right-to-left script renders inside the LTR circle without mirroring.',
  },
  { label: 'Mixed scripts', name: 'Anna Δημήτρης', description: 'Latin + Greek tokens combine in token order.' },
];

export const MEMBER_ROWS: IMemberRow[] = [
  { name: 'Dana Park', role: 'Owner', tone: 'owner' },
  { name: 'Hiro Tanaka', role: 'Editor', tone: 'editor' },
  { name: 'Sofia Reyes', role: 'Viewer', tone: 'viewer' },
];
