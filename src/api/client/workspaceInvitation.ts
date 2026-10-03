import type { IMyInvitation, IMyInvitationRow, IWorkspaceInvitation, IWorkspaceInvitationRow } from '@interfaces';

import { createClient } from '@/lib/supabase';

import { toMyInvitation, toResponseError, toWorkspaceInvitation } from './utils';

export const getWorkspaceInvitations = async (workspaceId: string): Promise<IWorkspaceInvitation[]> => {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('get_workspace_invitations', { p_workspace_id: workspaceId });

  if (error) throw error;

  return ((data ?? []) as IWorkspaceInvitationRow[]).map(toWorkspaceInvitation);
};

export const createWorkspaceInvitation = async (workspaceId: string, email: string, roleId: string): Promise<void> => {
  const response = await fetch('/auth/workspace-invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workspaceId, email, roleId }),
  });

  if (!response.ok) throw await toResponseError(response, 'Failed to create invitation');
};

export const revokeWorkspaceInvitation = async (invitationId: string): Promise<void> => {
  const supabase = createClient();

  const { error } = await supabase.rpc('revoke_workspace_invitation', { p_invitation_id: invitationId });

  if (error) throw error;
};

export const getMyInvitations = async (): Promise<IMyInvitation[]> => {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('get_my_invitations');

  if (error) throw error;

  return ((data ?? []) as IMyInvitationRow[]).map(toMyInvitation);
};

export const acceptWorkspaceInvitation = async (invitationId: string): Promise<void> => {
  const supabase = createClient();

  const { error } = await supabase.rpc('accept_workspace_invitation', { p_invitation_id: invitationId });

  if (error) throw error;
};

export const declineWorkspaceInvitation = async (invitationId: string): Promise<void> => {
  const supabase = createClient();

  const { error } = await supabase.rpc('decline_workspace_invitation', { p_invitation_id: invitationId });

  if (error) throw error;
};
