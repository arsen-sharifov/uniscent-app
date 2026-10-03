import type { AuthError, PostgrestError } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

import type { IWorkspaceInvitationRow, IWorkspaceRow } from '@interfaces';
import {
  HTTP_STATUS_BY_PG_CODE,
  WORKSPACE_INVITE_RATE_LIMIT_MAX_ATTEMPTS,
  WORKSPACE_INVITE_RATE_LIMIT_WINDOW_MS,
} from '@constants';
import { event } from '@/lib/events';

import { authenticateRequest, createRateLimiter, getAdminClient, normalizeEmail, toEmailText } from './utils';

const allowInviteEmail = createRateLimiter({
  maxAttempts: WORKSPACE_INVITE_RATE_LIMIT_MAX_ATTEMPTS,
  windowMs: WORKSPACE_INVITE_RATE_LIMIT_WINDOW_MS,
});

const toInvitationFailure = (error: PostgrestError) =>
  NextResponse.json(
    { error: { message: 'Invitation failed', code: error.code } },
    { status: HTTP_STATUS_BY_PG_CODE[error.code ?? ''] ?? 500 },
  );

export const handleWorkspaceInvite = async (request: Request) => {
  const { rejection, supabase, user } = await authenticateRequest(request);

  if (rejection) return rejection;

  const body = await request.json().catch(() => null);
  const workspaceId = body?.workspaceId;
  const email = normalizeEmail(body?.email);
  const roleId = body?.roleId;

  if (typeof workspaceId !== 'string' || !email || typeof roleId !== 'string') {
    return NextResponse.json({ error: { message: 'Invalid request' } }, { status: 400 });
  }

  if (!allowInviteEmail(user.id)) {
    return NextResponse.json({ error: { message: 'Too many invitations, try again later' } }, { status: 429 });
  }

  const { data: pendingInvitations, error: pendingError } = await supabase.rpc('get_workspace_invitations', {
    p_workspace_id: workspaceId,
  });

  if (pendingError) return toInvitationFailure(pendingError);

  const { data: invitationId, error } = await supabase.rpc('create_workspace_invitation', {
    p_workspace_id: workspaceId,
    p_email: email,
    p_role_id: roleId,
  });

  if (error) return toInvitationFailure(error);

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('name')
    .eq('id', workspaceId)
    .maybeSingle<Pick<IWorkspaceRow, 'name'>>();

  const workspaceName = toEmailText(workspace?.name ?? '');
  const metadataName: unknown = user.user_metadata?.name;
  const invitedByName =
    toEmailText(typeof metadataName === 'string' ? metadataName : '') || (user.email ?? '').split('@')[0];

  const failInvitationEmail = async (failure: PostgrestError | AuthError, context: string) => {
    event.error(failure, { toast: false, context });

    const isResend = ((pendingInvitations ?? []) as Pick<IWorkspaceInvitationRow, 'id'>[]).some(
      (invitation) => invitation.id === invitationId,
    );

    if (!isResend) {
      const { error: revokeError } = await supabase.rpc('revoke_workspace_invitation', {
        p_invitation_id: invitationId,
      });

      if (revokeError) event.error(revokeError, { toast: false, context: 'workspace.rollbackInvitation' });
    }

    return NextResponse.json({ error: { message: 'Invitation email failed', code: failure.code } }, { status: 502 });
  };

  const { error: allowanceError } = await getAdminClient().rpc('grant_signup_allowance', { p_email: email });

  if (allowanceError) return failInvitationEmail(allowanceError, 'workspace.grantSignupAllowance');

  const { error: inviteError } = await getAdminClient().auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/join`,
    data: {
      name: email.split('@')[0],
      workspaceName,
      workspaceInitial: [...workspaceName][0]?.toUpperCase() ?? '',
      invitedByName,
    },
  });

  if (inviteError && inviteError.code !== 'email_exists') {
    const { error: allowanceDeleteError } = await getAdminClient()
      .from('signup_allowances')
      .delete()
      .eq('email', email);

    if (allowanceDeleteError) {
      event.error(allowanceDeleteError, { toast: false, context: 'workspace.revokeSignupAllowance' });
    }

    return failInvitationEmail(inviteError, 'workspace.sendInviteEmail');
  }

  return NextResponse.json({ ok: true });
};
