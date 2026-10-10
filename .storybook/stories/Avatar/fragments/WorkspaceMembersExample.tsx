import { clsx } from 'clsx';

import { Avatar } from '@/components';

import { MEMBER_ROWS } from '../consts';

export const WorkspaceMembersExample = () => (
  <ul className="flex w-[300px] flex-col gap-1 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-elevated)] p-2">
    {MEMBER_ROWS.map((member) => (
      <li
        key={member.name}
        className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-[color:var(--surface-overlay)]"
      >
        <Avatar name={member.name} />
        <span className="flex-1 truncate text-[12px] font-medium text-[color:var(--text-strong)]">{member.name}</span>
        <span
          className={clsx(
            'shrink-0 rounded-full px-2 py-0.5 font-mono-ui text-[9px] tracking-[0.08em] uppercase',
            member.tone === 'owner' && 'bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]',
            member.tone === 'editor' && 'bg-[color:var(--surface-overlay)] text-[color:var(--text-strong)]',
            member.tone === 'viewer' && 'bg-[color:var(--surface-overlay)] text-[color:var(--text-muted)]',
          )}
        >
          {member.role}
        </span>
      </li>
    ))}
  </ul>
);
