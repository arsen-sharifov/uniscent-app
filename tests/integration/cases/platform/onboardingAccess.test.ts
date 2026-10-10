import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';

import { COMPLETED_GUIDES_CAP, COMPLETED_GUIDES_LENGTH_CAP } from '../../consts';
import type { IIntegrationAccount, IIntegrationOnboardingRow, IIntegrationResponse } from '../../interfaces';
import { deleteAccounts, getUserClient, readOnboarding, seedAccount } from '../../utils';

let owner: IIntegrationAccount;
let stranger: IIntegrationAccount;
let ownerClient: SupabaseClient;
let strangerClient: SupabaseClient;

beforeAll(async () => {
  [owner, stranger] = await Promise.all([seedAccount('onboarding-owner'), seedAccount('onboarding-stranger')]);
  [ownerClient, strangerClient] = await Promise.all([getUserClient(owner), getUserClient(stranger)]);

  const { error } = await ownerClient
    .from('user_onboarding')
    .insert({ user_id: owner.id, offer_answered: true, completed_guides: ['base'] });

  if (error) throw new Error(`Could not seed the onboarding row of ${owner.id}: ${error.message}`);
});

afterAll(async () => {
  await deleteAccounts(owner, stranger);
});

describe('user_onboarding', () => {
  describe('GIVEN an account with stored onboarding progress', () => {
    beforeEach(async () => {
      await ownerClient
        .from('user_onboarding')
        .update({ completed_guides: ['base'] })
        .eq('user_id', owner.id);
    });

    describe('WHEN the owner reads it back', () => {
      let response: IIntegrationResponse<IIntegrationOnboardingRow>;

      beforeEach(async () => {
        response = await ownerClient
          .from('user_onboarding')
          .select('offer_answered, completed_guides')
          .eq('user_id', owner.id)
          .maybeSingle<IIntegrationOnboardingRow>();
      });

      test('THEN the row is returned', () => {
        expect(response.error).toBeNull();
        expect(response.data).toEqual({ offer_answered: true, completed_guides: ['base'] });
      });
    });

    describe('WHEN the owner records another finished guide', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await ownerClient
          .from('user_onboarding')
          .update({ completed_guides: ['base', 'canvas'] })
          .eq('user_id', owner.id);
      });

      test('THEN the update lands', async () => {
        expect(response.error).toBeNull();
        await expect(readOnboarding(owner.id)).resolves.toMatchObject({ completed_guides: ['base', 'canvas'] });
      });
    });

    describe('WHEN the owner saves progress with an upsert, the way the app does', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await ownerClient
          .from('user_onboarding')
          .upsert({ user_id: owner.id, offer_answered: true, completed_guides: ['base', 'settings'] });
      });

      test('THEN the stored row is replaced instead of conflicting', async () => {
        expect(response.error).toBeNull();
        await expect(readOnboarding(owner.id)).resolves.toMatchObject({ completed_guides: ['base', 'settings'] });
      });
    });

    describe('WHEN the owner records guides up to both caps', () => {
      let completedGuides: string[];
      let response: IIntegrationResponse;

      beforeEach(async () => {
        completedGuides = Array.from({ length: COMPLETED_GUIDES_CAP }, (_, index) =>
          String(index).padStart(COMPLETED_GUIDES_LENGTH_CAP / COMPLETED_GUIDES_CAP, 'g'),
        );
        response = await ownerClient
          .from('user_onboarding')
          .update({ completed_guides: completedGuides })
          .eq('user_id', owner.id);
      });

      test('THEN the update lands', async () => {
        expect(response.error).toBeNull();
        await expect(readOnboarding(owner.id)).resolves.toMatchObject({ completed_guides: completedGuides });
      });
    });

    describe('WHEN the owner records more guides than the cap', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await ownerClient
          .from('user_onboarding')
          .update({
            completed_guides: Array.from({ length: COMPLETED_GUIDES_CAP + 1 }, (_, index) => `guide-${index}`),
          })
          .eq('user_id', owner.id);
      });

      test('THEN the check constraint rejects it and the stored guides stay', async () => {
        expect(response.error?.code).toBe('23514');
        await expect(readOnboarding(owner.id)).resolves.toMatchObject({ completed_guides: ['base'] });
      });
    });

    describe('WHEN the owner records a guide past the length cap', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await ownerClient
          .from('user_onboarding')
          .update({ completed_guides: ['g'.repeat(COMPLETED_GUIDES_LENGTH_CAP + 1)] })
          .eq('user_id', owner.id);
      });

      test('THEN the check constraint rejects it and the stored guides stay', async () => {
        expect(response.error?.code).toBe('23514');
        await expect(readOnboarding(owner.id)).resolves.toMatchObject({ completed_guides: ['base'] });
      });
    });
  });

  describe('GIVEN another signed-in account', () => {
    beforeEach(async () => {
      await ownerClient
        .from('user_onboarding')
        .update({ completed_guides: ['base'] })
        .eq('user_id', owner.id);
    });

    describe('WHEN it reads the owner row', () => {
      let response: IIntegrationResponse<{ user_id: string }[]>;

      beforeEach(async () => {
        response = await strangerClient.from('user_onboarding').select('user_id').eq('user_id', owner.id);
      });

      test('THEN nothing comes back', () => {
        expect(response.error).toBeNull();
        expect(response.data).toEqual([]);
      });
    });

    describe('WHEN it writes progress for the owner', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await strangerClient
          .from('user_onboarding')
          .insert({ user_id: owner.id, offer_answered: false, completed_guides: [] });
      });

      test('THEN the insert is refused', () => {
        expect(response.error?.code).toBe('42501');
      });
    });

    describe('WHEN it resets the owner progress', () => {
      let response: IIntegrationResponse;

      beforeEach(async () => {
        response = await strangerClient
          .from('user_onboarding')
          .update({ completed_guides: [] })
          .eq('user_id', owner.id);
      });

      test('THEN the update touches nothing', async () => {
        expect(response.error).toBeNull();
        await expect(readOnboarding(owner.id)).resolves.toMatchObject({ completed_guides: ['base'] });
      });
    });
  });

  describe('GIVEN an account that stored its onboarding row', () => {
    let doomed: IIntegrationAccount;

    beforeEach(async () => {
      doomed = await seedAccount('onboarding-doomed');
      const doomedClient = await getUserClient(doomed);
      const { error } = await doomedClient.from('user_onboarding').insert({ user_id: doomed.id, offer_answered: true });

      if (error) throw new Error(`Could not seed the onboarding row of ${doomed.id}: ${error.message}`);
    });

    describe('WHEN the account is deleted', () => {
      beforeEach(async () => {
        await deleteAccounts(doomed);
      });

      test('THEN its onboarding row goes with it', async () => {
        await expect(readOnboarding(doomed.id)).resolves.toBeNull();
      });
    });
  });
});
