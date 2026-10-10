import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';

import { List } from '@/components/List';

const renderList = () =>
  render(
    <List
      trigger={(open, toggle) => (
        <button type="button" aria-expanded={open} onClick={toggle}>
          Archive
        </button>
      )}
    >
      <a href="#archived">Archived thread</a>
    </List>,
  );

describe('List', () => {
  describe('GIVEN a collapsed list', () => {
    beforeEach(() => {
      renderList();
    });

    describe('WHEN it renders', () => {
      test('THEN the hidden content is inert, so keyboard focus cannot reach it', () => {
        expect(screen.getByText('Archived thread').closest('[inert]')).toBeInTheDocument();
      });
    });

    describe('WHEN the trigger expands it', () => {
      beforeEach(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
      });

      test('THEN the content becomes reachable', () => {
        expect(screen.getByText('Archived thread').closest('[inert]')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Archive' })).toHaveAttribute('aria-expanded', 'true');
      });
    });
  });
});
