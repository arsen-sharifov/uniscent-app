import type { IColorToken } from '@story-interfaces';

import { useFiltered } from '../../hooks';
import { Section } from '../layout';
import { ColorChip } from './ColorChip';

interface IColorsGroupProps {
  id: string;
  index: string;
  title: string;
  description: string;
  tokens: readonly IColorToken[];
  query: string;
}

export const ColorsGroup = ({ id, index, title, description, tokens, query }: IColorsGroupProps) => {
  const filtered = useFiltered(tokens, query, (token) => `${token.variable} ${token.label} ${token.role}`);

  if (filtered.length === 0) {
    return null;
  }

  return (
    <Section
      id={id}
      index={index}
      title={title}
      description={description}
      trailing={
        <span className="font-mono-ui text-[9.5px] tracking-[0.18em] text-[color:var(--text-subtle)] uppercase">
          {filtered.length}/{tokens.length}
        </span>
      }
    >
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((token) => (
          <ColorChip key={token.variable} variable={token.variable} label={token.label} role={token.role} />
        ))}
      </div>
    </Section>
  );
};
