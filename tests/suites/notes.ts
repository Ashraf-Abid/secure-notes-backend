import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { api, createUser } from '../helpers';

export function notesTests() {
  describe('Notes', () => {
    let owner: Awaited<ReturnType<typeof createUser>>;
    let other: Awaited<ReturnType<typeof createUser>>;
    let admin: Awaited<ReturnType<typeof createUser>>;
    const ids: string[] = [];

    before(async () => {
      owner = await createUser();
      other = await createUser();
      admin = await createUser({ role: 'ADMIN' });
    });

    it('creates notes for the logged-in user', async () => {
      for (const title of ['first', 'second', 'third']) {
        const res = await api('POST', '/notes', { token: owner.token, body: { title, content: `${title} content` } });
        assert.equal(res.status, 201);
        assert.equal(res.body.data.user, owner.id);
        ids.push(res.body.data._id);
      }
    });

    it('ignores a user field in the body (mass assignment)', async () => {
      const res = await api('POST', '/notes', {
        token: owner.token,
        body: { title: 'sneaky', content: 'x', user: other.id },
      });
      assert.equal(res.body.data.user, owner.id);
      await api('DELETE', `/notes/${res.body.data._id}`, { token: owner.token });
    });

    it('validates note input', async () => {
      const res = await api('POST', '/notes', { token: owner.token, body: { content: 'no title' } });
      assert.equal(res.status, 400);
    });

    it('lists own notes newest first with pagination', async () => {
      const page1 = await api('GET', '/notes?page=1&limit=2', { token: owner.token });
      assert.equal(page1.status, 200);
      assert.deepEqual(page1.body.data.map((n: any) => n.title), ['third', 'second']);
      assert.deepEqual(page1.body.pagination, { currentPage: 1, totalPages: 2, totalItems: 3, limit: 2 });

      const page2 = await api('GET', '/notes?page=2&limit=2', { token: owner.token });
      assert.deepEqual(page2.body.data.map((n: any) => n.title), ['first']);
    });

    it('rejects invalid pagination parameters', async () => {
      for (const query of ['page=0', 'page=abc', 'limit=0', 'limit=51']) {
        assert.equal((await api('GET', `/notes?${query}`, { token: owner.token })).status, 400, query);
      }
    });

    it('gets, updates and deletes own notes', async () => {
      const get = await api('GET', `/notes/${ids[0]}`, { token: owner.token });
      assert.equal(get.body.data.title, 'first');

      const patch = await api('PATCH', `/notes/${ids[0]}`, {
        token: owner.token,
        body: { title: 'first edited', user: other.id },
      });
      assert.equal(patch.status, 200);
      assert.equal(patch.body.data.title, 'first edited');
      assert.equal(patch.body.data.user, owner.id);

      assert.equal((await api('PATCH', `/notes/${ids[0]}`, { token: owner.token, body: {} })).status, 400);

      assert.equal((await api('DELETE', `/notes/${ids[2]}`, { token: owner.token })).status, 200);
      assert.equal((await api('GET', `/notes/${ids[2]}`, { token: owner.token })).status, 404);
    });

    it("hides another user's notes (404 on get, update, delete)", async () => {
      const list = await api('GET', '/notes', { token: other.token });
      assert.equal(list.body.pagination.totalItems, 0);

      assert.equal((await api('GET', `/notes/${ids[1]}`, { token: other.token })).status, 404);
      assert.equal((await api('PATCH', `/notes/${ids[1]}`, { token: other.token, body: { title: 'x' } })).status, 404);
      assert.equal((await api('DELETE', `/notes/${ids[1]}`, { token: other.token })).status, 404);

      const unchanged = await api('GET', `/notes/${ids[1]}`, { token: owner.token });
      assert.equal(unchanged.body.data.title, 'second');
    });

    it('lets an admin view any note but not modify it', async () => {
      assert.equal((await api('GET', `/notes/${ids[1]}`, { token: admin.token })).status, 200);
      assert.equal((await api('PATCH', `/notes/${ids[1]}`, { token: admin.token, body: { title: 'x' } })).status, 404);
      assert.equal((await api('DELETE', `/notes/${ids[1]}`, { token: admin.token })).status, 404);
    });

    it('returns 400 for a malformed id and 404 for an unknown id', async () => {
      assert.equal((await api('GET', '/notes/not-an-id', { token: owner.token })).status, 400);
      assert.equal((await api('GET', '/notes/000000000000000000000000', { token: owner.token })).status, 404);
    });
  });
}
