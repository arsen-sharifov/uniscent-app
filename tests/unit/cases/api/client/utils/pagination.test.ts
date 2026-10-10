import { beforeEach, describe, expect, test, vi } from 'vitest';

import { deleteRowsByIds, IDS_PER_REQUEST, readAllRows, readRowsByIds, ROWS_PER_PAGE } from '@api/client';

const readPage = vi.fn();

const readChunkPage = vi.fn();

const deleteChunk = vi.fn();

const idsOf = (length: number) => Array.from({ length }, (_, index) => `id-${index}`);

const pageOf = (length: number, offset = 0) => ({
  data: Array.from({ length }, (_, index) => ({ id: `row-${offset + index}` })),
  error: null,
});

describe('readAllRows', () => {
  describe('GIVEN a list shorter than one page', () => {
    beforeEach(() => {
      readPage.mockResolvedValueOnce(pageOf(3));
    });

    describe('WHEN every row is read', () => {
      test('THEN a single page is requested and its rows are returned', async () => {
        await expect(readAllRows(readPage)).resolves.toEqual(pageOf(3).data);
        expect(readPage.mock.calls).toEqual([[0, ROWS_PER_PAGE - 1]]);
      });
    });
  });

  describe('GIVEN a list longer than one page', () => {
    beforeEach(() => {
      readPage.mockResolvedValueOnce(pageOf(ROWS_PER_PAGE)).mockResolvedValueOnce(pageOf(2, ROWS_PER_PAGE));
    });

    describe('WHEN every row is read', () => {
      test('THEN the pages are requested in order and joined without a gap', async () => {
        await expect(readAllRows(readPage)).resolves.toEqual(pageOf(ROWS_PER_PAGE + 2).data);
        expect(readPage.mock.calls).toEqual([
          [0, ROWS_PER_PAGE - 1],
          [ROWS_PER_PAGE, 2 * ROWS_PER_PAGE - 1],
        ]);
      });
    });
  });

  describe('GIVEN a list that exactly fills one page', () => {
    beforeEach(() => {
      readPage.mockResolvedValueOnce(pageOf(ROWS_PER_PAGE)).mockResolvedValueOnce(pageOf(0));
    });

    describe('WHEN every row is read', () => {
      test('THEN an empty next page ends the read', async () => {
        await expect(readAllRows(readPage)).resolves.toHaveLength(ROWS_PER_PAGE);
        expect(readPage).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('GIVEN a page that fails', () => {
    const failure = { message: 'db down', code: 'XX000' };

    beforeEach(() => {
      readPage.mockResolvedValueOnce(pageOf(ROWS_PER_PAGE)).mockResolvedValueOnce({ data: null, error: failure });
    });

    describe('WHEN every row is read', () => {
      test('THEN the error propagates instead of a partial list', async () => {
        await expect(readAllRows(readPage)).rejects.toBe(failure);
      });
    });
  });
});

describe('readRowsByIds', () => {
  describe('GIVEN more ids than one request may carry', () => {
    beforeEach(() => {
      readChunkPage.mockImplementation(async (chunk: string[]) => ({
        data: chunk.map((id) => ({ id })),
        error: null,
      }));
    });

    describe('WHEN the rows of every id are read', () => {
      test('THEN each request carries a bounded slice of the ids and the rows are joined in order', async () => {
        await expect(readRowsByIds(idsOf(IDS_PER_REQUEST + 1), readChunkPage)).resolves.toEqual(
          idsOf(IDS_PER_REQUEST + 1).map((id) => ({ id })),
        );
        expect(readChunkPage.mock.calls).toEqual([
          [idsOf(IDS_PER_REQUEST), 0, ROWS_PER_PAGE - 1],
          [[`id-${IDS_PER_REQUEST}`], 0, ROWS_PER_PAGE - 1],
        ]);
      });
    });
  });

  describe('GIVEN no ids', () => {
    describe('WHEN the rows of every id are read', () => {
      test('THEN no request is made', async () => {
        await expect(readRowsByIds([], readChunkPage)).resolves.toEqual([]);
        expect(readChunkPage).not.toHaveBeenCalled();
      });
    });
  });
});

describe('deleteRowsByIds', () => {
  describe('GIVEN more ids than one request may carry', () => {
    beforeEach(() => {
      deleteChunk.mockResolvedValue({ data: null, error: null });
    });

    describe('WHEN the rows of every id are deleted', () => {
      test('THEN each request carries a bounded slice of the ids, in order', async () => {
        await expect(deleteRowsByIds(idsOf(IDS_PER_REQUEST + 1), deleteChunk)).resolves.toBeUndefined();
        expect(deleteChunk.mock.calls).toEqual([[idsOf(IDS_PER_REQUEST)], [[`id-${IDS_PER_REQUEST}`]]]);
      });
    });
  });

  describe('GIVEN a delete request that fails', () => {
    const failure = { message: 'db down', code: 'XX000' };

    beforeEach(() => {
      deleteChunk.mockResolvedValueOnce({ data: null, error: failure });
    });

    describe('WHEN the rows of every id are deleted', () => {
      test('THEN the error propagates and the remaining slices are not sent', async () => {
        await expect(deleteRowsByIds(idsOf(IDS_PER_REQUEST + 1), deleteChunk)).rejects.toBe(failure);
        expect(deleteChunk).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('GIVEN no ids', () => {
    describe('WHEN the rows of every id are deleted', () => {
      test('THEN no request is made', async () => {
        await expect(deleteRowsByIds([], deleteChunk)).resolves.toBeUndefined();
        expect(deleteChunk).not.toHaveBeenCalled();
      });
    });
  });
});
