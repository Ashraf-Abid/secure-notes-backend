import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Types } from 'mongoose';
import { Note } from '../../src/models/Note';
import { Post } from '../../src/models/Post';
import { User } from '../../src/models/User';
import { userPostsPipeline } from '../../src/services/post.service';
import { interestGroupsPipeline } from '../../src/services/user.service';

const plan = (explain: unknown) => JSON.stringify(explain);
const query = { page: 1, limit: 10 };

export function indexTests() {
  describe('Indexes', () => {
    it('defines exactly the required indexes', async () => {
      const names = async (model: { collection: { indexes(): Promise<any[]> } }) =>
        (await model.collection.indexes()).map((i) => i.name).sort();

      assert.deepEqual(await names(User), ['_id_', 'email_1', 'interests_1']);
      assert.deepEqual(await names(Note), ['_id_', 'user_1__id_-1']);
      assert.deepEqual(await names(Post), ['_id_', 'user_1__id_-1']);

      const email = (await User.collection.indexes()).find((i) => i.name === 'email_1');
      assert.equal(email?.unique, true);
    });

    it('login uses the unique email index', async () => {
      const explain = await User.find({ email: 'x@test.com' }).explain();
      assert.match(plan(explain), /"indexName":"email_1"/);
    });

    it('own notes list uses the compound index without an in-memory sort', async () => {
      const explain = plan(await Note.find({ user: new Types.ObjectId() }).sort({ _id: -1 }).limit(10).explain());
      assert.match(explain, /"indexName":"user_1__id_-1"/);
      assert.doesNotMatch(explain, /"stage":"SORT"/);
    });

    it('admin lists use the _id index', async () => {
      assert.match(plan(await User.find().sort({ _id: -1 }).limit(10).explain()), /"indexName":"_id_"/);
      assert.match(plan(await Note.find().sort({ _id: -1 }).limit(10).explain()), /"indexName":"_id_"/);
    });

    it('group-by-interests $match uses the multikey interests index', async () => {
      for (const interest of [undefined, 'chess']) {
        const explain = plan(await User.aggregate(interestGroupsPipeline({ ...query, interest })).explain());
        assert.match(explain, /"indexName":"interests_1"/);
        assert.doesNotMatch(explain, /COLLSCAN/);
      }
    });

    it('user posts $lookup uses the posts compound index', async () => {
      const post = await Post.findOne();
      assert.ok(post, 'needs at least one post (created by the aggregation tests)');
      const explain: any = await User.aggregate(userPostsPipeline(post.user, query)).explain('executionStats');
      const lookups = explain.stages.filter((s: any) => s.$lookup);
      assert.equal(lookups.length, 2);
      for (const lookup of lookups) {
        assert.deepEqual(lookup.indexesUsed, ['user_1__id_-1']);
        assert.equal(lookup.collectionScans, 0);
      }
    });
  });
}
