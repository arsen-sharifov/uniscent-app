'use client';

import { useState } from 'react';

import type { TTheme } from '@interfaces';

import { COLOR_GROUPS } from '../../consts';
import { findActiveTheme } from '../../utils';
import { ColorsGroup } from '../cards';
import { AtlasFrame } from '../layout';
import { FilterInput } from '../widgets';

interface IColorsAtlasProps {
  activeTheme: TTheme;
}

export const ColorsAtlas = ({ activeTheme }: IColorsAtlasProps) => {
  const [query, setQuery] = useState('');

  const sections = COLOR_GROUPS.map((group) => ({ id: group.id, label: group.title }));

  return (
    <AtlasFrame
      tag="Color"
      title="Semantic tokens, theme-bound."
      intro="One token vocabulary, six rebindings. Every chip below resolves against your active toolbar theme — switch the theme and the entire atlas retunes."
      sections={sections}
      utilities={
        <div className="flex flex-wrap items-center gap-3">
          <FilterInput value={query} onChange={setQuery} placeholder="--accent, status, ref…" />
          <div className="flex flex-col items-end gap-0.5">
            <span className="font-mono-ui text-[9.5px] tracking-[0.22em] text-[color:var(--text-subtle)] uppercase">
              {COLOR_GROUPS.reduce((accumulator, group) => accumulator + group.tokens.length, 0)} tokens ·{' '}
              {findActiveTheme(activeTheme).name}
            </span>
          </div>
        </div>
      }
    >
      {COLOR_GROUPS.map((group, index) => (
        <ColorsGroup
          key={group.id}
          id={group.id}
          index={`§ ${String(index + 1).padStart(2, '0')}`}
          title={group.title}
          description={group.description}
          tokens={group.tokens}
          query={query}
        />
      ))}
    </AtlasFrame>
  );
};
