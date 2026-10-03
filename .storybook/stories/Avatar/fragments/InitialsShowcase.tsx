import type { IInitialsCase } from '@story-interfaces';
import { Avatar, getInitials } from '@/components';

import { Showcase } from '../../../components';

interface IInitialsShowcaseProps {
  title: string;
  caption: string;
  cases: readonly IInitialsCase[];
}

export const InitialsShowcase = ({ title, caption, cases }: IInitialsShowcaseProps) => (
  <Showcase
    title={title}
    caption={caption}
    items={cases.map((initialsCase) => ({
      label: initialsCase.label,
      hint: getInitials(initialsCase.name),
      description: initialsCase.description,
      children: (
        <div className="flex items-center gap-3">
          <Avatar name={initialsCase.name} />
          <code className="font-mono-ui text-[11px] text-[color:var(--text-muted)]">{`"${initialsCase.name}"`}</code>
        </div>
      ),
    }))}
  />
);
