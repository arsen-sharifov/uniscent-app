import { Tooltip } from '@/components';
import { useTranslations } from '@/i18n';

interface IInviteCodeFieldProps {
  text?: string;
  position?: 'top' | 'bottom';
}

export const InviteCodeField = ({ text, position }: IInviteCodeFieldProps) => {
  const t = useTranslations();

  return (
    <div className="flex items-center gap-1.5 text-[color:var(--text)]">
      <span className="text-[13px] font-medium">{t.auth.signUp.accountStep.inviteCode}</span>
      <Tooltip text={text ?? t.auth.signUp.accountStep.inviteCodeTooltip} position={position} />
    </div>
  );
};
