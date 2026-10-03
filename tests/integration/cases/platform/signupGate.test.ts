import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest';

import { INTEGRATION_ACCOUNT_DOMAIN, INTEGRATION_ACCOUNT_PASSWORD } from '../../consts';
import type { IIntegrationAccount, IIntegrationResponse } from '../../interfaces';
import {
  createAnonClient,
  deleteAccountByEmail,
  deleteAccounts,
  deleteSignupAllowance,
  getAdminClient,
  getRoleId,
  getUserClient,
  hasSignupAllowance,
  readAccountId,
  seedAccount,
  seedInvitation,
  seedSignupAllowance,
  seedWorkspace,
  uniqueLabel,
} from '../../utils';

const ALLOWANCE_TTL_MS = 10 * 60 * 1000;

let owner: IIntegrationAccount;
let ownerClient: SupabaseClient;
let email: string;

beforeAll(async () => {
  owner = await seedAccount('signup-owner');
  ownerClient = await getUserClient(owner);
});

afterAll(async () => {
  await deleteAccounts(owner);
});

beforeEach(() => {
  email = `${uniqueLabel('signup')}@${INTEGRATION_ACCOUNT_DOMAIN}`;
});

afterEach(async () => {
  await deleteAccountByEmail(email);
  await deleteSignupAllowance(email);
});

describe('hook_before_user_created', () => {
  describe('GIVEN an email with neither an allowance nor an invitation', () => {
    describe('WHEN a visitor signs up with it', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await createAnonClient().auth.signUp({ email, password: INTEGRATION_ACCOUNT_PASSWORD });
      });

      test('THEN the sign-up is refused and no account appears', async () => {
        expect(response.error?.status).toBe(403);
        expect(response.error?.message).toMatch(/invite code/);
        await expect(readAccountId(email)).resolves.toBeNull();
      });
    });
  });

  describe('GIVEN an unexpired sign-up allowance', () => {
    beforeEach(async () => {
      await seedSignupAllowance(email, new Date(Date.now() + ALLOWANCE_TTL_MS));
    });

    describe('WHEN a visitor signs up with the email', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await createAnonClient().auth.signUp({ email, password: INTEGRATION_ACCOUNT_PASSWORD });
      });

      test('THEN the account is created and the allowance is consumed', async () => {
        expect(response.error).toBeNull();
        await expect(readAccountId(email)).resolves.not.toBeNull();
        await expect(hasSignupAllowance(email)).resolves.toBe(false);
      });
    });
  });

  describe('GIVEN an allowance already spent by a sign-up whose account is gone', () => {
    beforeEach(async () => {
      await seedSignupAllowance(email, new Date(Date.now() + ALLOWANCE_TTL_MS));
      await createAnonClient().auth.signUp({ email, password: INTEGRATION_ACCOUNT_PASSWORD });
      await deleteAccountByEmail(email);
    });

    describe('WHEN the email signs up again', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await createAnonClient().auth.signUp({ email, password: INTEGRATION_ACCOUNT_PASSWORD });
      });

      test('THEN the second sign-up is refused', async () => {
        expect(response.error?.status).toBe(403);
        await expect(readAccountId(email)).resolves.toBeNull();
      });
    });
  });

  describe('GIVEN an expired sign-up allowance', () => {
    beforeEach(async () => {
      await seedSignupAllowance(email, new Date(Date.now() - ALLOWANCE_TTL_MS));
    });

    describe('WHEN a visitor signs up with the email', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await createAnonClient().auth.signUp({ email, password: INTEGRATION_ACCOUNT_PASSWORD });
      });

      test('THEN the sign-up is refused', async () => {
        expect(response.error?.status).toBe(403);
        await expect(readAccountId(email)).resolves.toBeNull();
      });
    });
  });

  describe('GIVEN a pending workspace invitation for the email', () => {
    beforeEach(async () => {
      const workspace = await seedWorkspace(owner.id, uniqueLabel('signup-invite'));
      await seedInvitation(workspace.id, email, await getRoleId(workspace.id, 'member'));
    });

    describe('WHEN a visitor signs up with it', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await createAnonClient().auth.signUp({ email, password: INTEGRATION_ACCOUNT_PASSWORD });
      });

      test('THEN the invitation alone does not open the sign-up', async () => {
        expect(response.error?.status).toBe(403);
        await expect(readAccountId(email)).resolves.toBeNull();
      });
    });
  });

  describe('GIVEN the allowance the invite route grants before its email', () => {
    beforeEach(async () => {
      await seedSignupAllowance(email, new Date(Date.now() + ALLOWANCE_TTL_MS));
    });

    describe('WHEN the service role sends the invitation email', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await getAdminClient().auth.admin.inviteUserByEmail(email);
      });

      test('THEN the invited account is created and the allowance is consumed', async () => {
        expect(response.error).toBeNull();
        await expect(readAccountId(email)).resolves.not.toBeNull();
        await expect(hasSignupAllowance(email)).resolves.toBe(false);
      });
    });
  });

  describe('GIVEN an email without an allowance', () => {
    describe('WHEN the service role sends the invitation email', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await getAdminClient().auth.admin.inviteUserByEmail(email);
      });

      test('THEN the invitation email is refused and no account appears', async () => {
        expect(response.error?.status).toBe(403);
        await expect(readAccountId(email)).resolves.toBeNull();
      });
    });
  });

  describe('GIVEN a stored allowance and a signed-in account', () => {
    beforeEach(async () => {
      await seedSignupAllowance(email, new Date(Date.now() + ALLOWANCE_TTL_MS));
    });

    describe('WHEN the account calls the hook directly to spend the allowance', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await ownerClient.rpc('hook_before_user_created', { event: { user: { email } } });
      });

      test('THEN execution is denied and the allowance survives', async () => {
        expect(response.error?.code).toBe('42501');
        await expect(hasSignupAllowance(email)).resolves.toBe(true);
      });
    });
  });
});

describe('grant_signup_allowance', () => {
  describe('GIVEN a visitor without a session', () => {
    describe('WHEN they grant themselves an allowance', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await createAnonClient().rpc('grant_signup_allowance', { p_email: email });
      });

      test('THEN the call is denied and nothing is stored', async () => {
        expect(response.error?.code).toBe('42501');
        await expect(hasSignupAllowance(email)).resolves.toBe(false);
      });
    });
  });

  describe('GIVEN a signed-in account', () => {
    describe('WHEN it grants an allowance', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await ownerClient.rpc('grant_signup_allowance', { p_email: email });
      });

      test('THEN the call is denied and nothing is stored', async () => {
        expect(response.error?.code).toBe('42501');
        await expect(hasSignupAllowance(email)).resolves.toBe(false);
      });
    });
  });

  describe('GIVEN the service role', () => {
    describe('WHEN it grants an allowance for a mixed-case email', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await getAdminClient().rpc('grant_signup_allowance', { p_email: email.toUpperCase() });
      });

      test('THEN the allowance is stored lower-cased', async () => {
        expect(response.error).toBeNull();
        await expect(hasSignupAllowance(email)).resolves.toBe(true);
      });
    });
  });
});

describe('signup_allowances', () => {
  describe('GIVEN a stored allowance', () => {
    beforeEach(async () => {
      await seedSignupAllowance(email, new Date(Date.now() + ALLOWANCE_TTL_MS));
    });

    describe('WHEN a visitor without a session reads the table', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await createAnonClient().from('signup_allowances').select('email');
      });

      test('THEN the table is out of reach', () => {
        expect(response.error?.code).toBe('42501');
      });
    });

    describe('WHEN a signed-in account reads the table', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await ownerClient.from('signup_allowances').select('email');
      });

      test('THEN the table is out of reach', () => {
        expect(response.error?.code).toBe('42501');
      });
    });
  });
});
