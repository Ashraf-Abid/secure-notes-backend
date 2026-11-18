import { connectDB, disconnectDB } from '../config/db';
import { Note } from '../models/Note';
import { Post } from '../models/Post';
import { User } from '../models/User';

const DEMO_PASSWORD = 'password123';
const DEMO_EMAIL = /\.demo@example\.com$/;

const demoUsers = [
  { name: 'Alice', interests: ['chess', 'reading', 'programming'], posts: 3 },
  { name: 'Bob', interests: ['chess', 'music'], posts: 2 },
  { name: 'Carol', interests: ['reading', 'travel', 'photography'], posts: 1 },
  { name: 'David', interests: ['programming', 'music', 'chess'], posts: 2 },
  { name: 'Emma', interests: ['travel'], posts: 0 },
  { name: 'Frank', interests: [], posts: 1 },
];

async function main() {
  await connectDB();

  const existing = await User.find({ email: DEMO_EMAIL }).select('_id');
  const existingIds = existing.map((u) => u._id);
  await Note.deleteMany({ user: { $in: existingIds } });
  await Post.deleteMany({ user: { $in: existingIds } });
  await User.deleteMany({ _id: { $in: existingIds } });

  for (const demo of demoUsers) {
    const user = await User.create({
      name: demo.name,
      email: `${demo.name.toLowerCase()}.demo@example.com`,
      password: DEMO_PASSWORD,
      interests: demo.interests,
    });

    await Note.insertMany(
      [1, 2, 3].map((i) => ({
        user: user._id,
        title: `${demo.name}'s note ${i}`,
        content: `Private note ${i} written by ${demo.name}.`,
      })),
    );

    if (demo.posts > 0) {
      await Post.insertMany(
        Array.from({ length: demo.posts }, (_, i) => ({
          user: user._id,
          title: `${demo.name}'s post ${i + 1}`,
          content: `Public post ${i + 1} by ${demo.name}.`,
        })),
      );
    }
  }

  console.log(`Replaced ${existingIds.length} old demo users with ${demoUsers.length} new ones.`);
  console.log(`Login: <name>.demo@example.com / ${DEMO_PASSWORD}  (e.g. alice.demo@example.com)`);

  await disconnectDB();
}

main().catch(async (err) => {
  console.error(err);
  await disconnectDB();
  process.exit(1);
});
