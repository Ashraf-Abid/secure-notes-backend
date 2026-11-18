// Makes the database indexes match exactly what the schemas define, then
// prints them. syncIndexes() creates missing indexes AND drops any index that
// is no longer declared in a schema, so no stale/unnecessary index survives.
//
// Usage: npm run db:indexes
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User';
import { Note } from '../models/Note';
import { Post } from '../models/Post';

async function main() {
  await connectDB();

  for (const model of [User, Note, Post] as mongoose.Model<any>[]) {
    const dropped = await model.syncIndexes();
    const indexes = await model.collection.indexes();
    console.log(`\n${model.collection.collectionName}`);
    for (const idx of indexes) {
      console.log(`  ${String(idx.name).padEnd(22)} ${JSON.stringify(idx.key)}${idx.unique ? '  (unique)' : ''}`);
    }
    if (dropped.length) console.log(`  dropped: ${dropped.join(', ')}`);
  }

  await disconnectDB();
}

main().catch(async (err) => {
  console.error(err);
  await disconnectDB();
  process.exit(1);
});
