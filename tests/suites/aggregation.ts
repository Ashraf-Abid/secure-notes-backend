import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { api, createUser } from '../helpers';

export function aggregationTests() {
  describe('Aggregation', () => {
    let admin: Awaited<ReturnType<typeof createUser>>;
    let alice: Awaited<ReturnType<typeof createUser>>;
    let carol: Awaited<ReturnType<typeof createUser>>;
    let dave: Awaited<ReturnType<typeof createUser>>;

    before(async () => {
      admin = await createUser({ role: 'ADMIN' });
      alice = await createUser({ name: 'Alice', interests: ['agg-chess', 'agg-reading'] });
      await createUser({ name: 'Bob', interests: ['agg-chess'] });
      carol = await createUser({ name: 'Carol', interests: ['agg-reading', 'agg-music'] });
      dave = await createUser({ name: 'Dave', interests: [] });
    });

    describe('Scenario 1: users grouped by interests', () => {
      const groups = (data: any[]) => data.filter((g) => g.interest.startsWith('agg-'));

      it('groups users by interest, sorted by count then name', async () => {
        const res = await api('GET', '/admin/users/grouped-by-interests?limit=50', { token: admin.token });
        assert.equal(res.status, 200);
        const result = groups(res.body.data);
        assert.deepEqual(
          result.map((g: any) => [g.interest, g.count, g.users.map((u: any) => u.name).sort()]),
          [
            ['agg-chess', 2, ['Alice', 'Bob']],
            ['agg-reading', 2, ['Alice', 'Carol']],
            ['agg-music', 1, ['Carol']],
          ],
        );
        assert.deepEqual(Object.keys(result[0].users[0]).sort(), ['_id', 'email', 'name']);
      });

      it('excludes users without interests', async () => {
        const res = await api('GET', '/admin/users/grouped-by-interests?limit=50', { token: admin.token });
        const ids = res.body.data.flatMap((g: any) => g.users.map((u: any) => u._id));
        assert.ok(!ids.includes(dave.id));
      });

      it('filters by a single interest (case-insensitive)', async () => {
        const res = await api('GET', '/admin/users/grouped-by-interests?interest=AGG-CHESS', { token: admin.token });
        assert.equal(res.body.data.length, 1);
        assert.equal(res.body.data[0].interest, 'agg-chess');
        assert.equal(res.body.data[0].count, 2);
        assert.equal(res.body.pagination.totalItems, 1);
      });

      it('paginates the groups', async () => {
        const all = await api('GET', '/admin/users/grouped-by-interests', { token: admin.token });
        const page2 = await api('GET', '/admin/users/grouped-by-interests?page=2&limit=1', { token: admin.token });
        assert.equal(page2.body.data.length, 1);
        assert.equal(page2.body.pagination.totalPages, all.body.pagination.totalItems);
      });

      it('returns an empty list for an unknown interest', async () => {
        const res = await api('GET', '/admin/users/grouped-by-interests?interest=nothing', { token: admin.token });
        assert.deepEqual(res.body.data, []);
        assert.equal(res.body.pagination.totalItems, 0);
      });
    });

    describe('Scenario 2: user posts with $lookup', () => {
      before(async () => {
        for (const title of ['p1', 'p2', 'p3']) {
          await api('POST', '/posts', { token: alice.token, body: { title, content: 'x' } });
        }
      });

      it("returns a user's posts newest first with pagination", async () => {
        const res = await api('GET', `/users/${alice.id}/posts?limit=2`, { token: carol.token });
        assert.equal(res.status, 200);
        assert.deepEqual(res.body.data.user, { _id: alice.id, name: 'Alice' });
        assert.deepEqual(res.body.data.posts.map((p: any) => p.title), ['p3', 'p2']);
        assert.deepEqual(res.body.pagination, { currentPage: 1, totalPages: 2, totalItems: 3, limit: 2 });

        const page2 = await api('GET', `/users/${alice.id}/posts?limit=2&page=2`, { token: carol.token });
        assert.deepEqual(page2.body.data.posts.map((p: any) => p.title), ['p1']);
      });

      it('returns an empty list for a user without posts', async () => {
        const res = await api('GET', `/users/${dave.id}/posts`, { token: carol.token });
        assert.equal(res.status, 200);
        assert.deepEqual(res.body.data.posts, []);
        assert.equal(res.body.pagination.totalItems, 0);
      });

      it('returns 404 for an unknown user and 400 for a malformed id', async () => {
        assert.equal((await api('GET', '/users/000000000000000000000000/posts', { token: carol.token })).status, 404);
        assert.equal((await api('GET', '/users/bad/posts', { token: carol.token })).status, 400);
      });

      it('lists all posts with the author name', async () => {
        const res = await api('GET', '/posts?limit=1', { token: carol.token });
        assert.equal(res.body.data[0].title, 'p3');
        assert.equal(res.body.data[0].user.name, 'Alice');
        assert.equal(res.body.data[0].user.email, undefined);
      });
    });
  });
}
