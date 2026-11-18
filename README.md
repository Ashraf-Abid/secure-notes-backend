# Secure Notes – Backend

REST API for a note-taking application with JWT authentication and role-based access control (USER / ADMIN), built with Express, TypeScript and MongoDB.

The focus of this project is the data layer: a minimal, query-driven index strategy and the two required MongoDB aggregation pipelines.

- Frontend repository: _to be added_
- Live API: _to be added_

## Tech stack

| Area | Choice |
|---|---|
| Runtime / framework | Node.js 18+, Express 5, TypeScript |
| Database | MongoDB Atlas, Mongoose 8 |
| Auth | JWT (`jsonwebtoken`, HS256), password hashing with `bcryptjs` (cost 12) |
| Validation | `zod` |
| Security | `helmet`, `express-rate-limit`, CORS allow-list |
| Tests | Node's built-in test runner (`node:test`) run via `tsx` |

## Getting started

Prerequisites: Node.js 18 or newer and a MongoDB Atlas cluster (or a local replica set – user deletion uses a transaction).

```bash
git clone https://github.com/Ashraf-Abid/secure-notes-backend.git
cd secure-notes-backend
npm install
cp .env.example .env        # then fill in the values
npm run seed:admin          # creates the first admin from ADMIN_* in .env
npm run seed:demo           # optional: demo users, notes and posts
npm run dev                 # http://localhost:5000/api/health
```

In Atlas, **Network Access** must allow the machine's IP address. The driver connects over IPv4 (`family: 4`) because Atlas access-list entries such as `0.0.0.0/0` only cover IPv4.

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | no | Defaults to `5000` |
| `NODE_ENV` | no | `development`, `production` or `test` |
| `CLIENT_URL` | no | Allowed CORS origin(s), comma-separated. Defaults to `http://localhost:5173` |
| `MONGODB_URI` | yes | MongoDB connection string including the database name |
| `JWT_SECRET` | yes | Long random string used to sign tokens |
| `JWT_EXPIRES_IN` | no | Token lifetime, defaults to `1d` |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | for `seed:admin` | Credentials of the first admin. Only read by the seed script |

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start with hot reload |
| `npm run build` / `npm start` | Compile to `dist/` and run the compiled server |
| `npm test` | Run the API test suite against a separate `secure-notes-test` database |
| `npm run seed:admin` | Create the first admin, or promote an existing user. Safe to re-run |
| `npm run seed:demo` | Recreate demo users (`<name>.demo@example.com` / `password123`) with notes and posts |
| `npm run db:indexes` | Sync the database indexes with the schemas and print them |

## API

Base URL: `/api`. Protected routes expect `Authorization: Bearer <token>`.

Successful responses use `{ "success": true, "data": ... }`. List endpoints also return:

```json
"pagination": { "currentPage": 1, "totalPages": 3, "totalItems": 25, "limit": 10 }
```

All list endpoints accept `?page=` (default 1) and `?limit=` (default 10, max 50). Errors use `{ "success": false, "message": "...", "errors": [{ "field": "...", "message": "..." }] }`.

### Auth

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/auth/register` | public | Register (always creates a `USER`). Returns `{ token, user }` |
| POST | `/auth/login` | public | Login. Returns `{ token, user }` |

### Users

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/users/me` | user | Own profile |
| GET | `/users` | admin | List users, newest first |
| POST | `/users` | admin | Create a user (`role` optional, defaults to `USER`) |
| GET | `/users/:id` | admin | Get a user |
| PATCH | `/users/:id` | admin | Update name, email, password, role or interests |
| DELETE | `/users/:id` | admin | Delete a user and their notes and posts |
| GET | `/users/:id/posts` | user | A user's posts (aggregation with `$lookup`) |

### Notes

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/notes` | user | Create a note |
| GET | `/notes` | user | List own notes, newest first |
| GET | `/notes/:id` | owner or admin | Get a note |
| PATCH | `/notes/:id` | owner | Update title and/or content |
| DELETE | `/notes/:id` | owner | Delete a note |

### Posts

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/posts` | user | Create a post |
| GET | `/posts` | user | List all posts with author name |

### Admin

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/admin/notes` | admin | Everyone's notes with owner name and email. Optional `?userId=` |
| GET | `/admin/users/grouped-by-interests` | admin | Users grouped by interest (aggregation). Optional `?interest=` |

### Access rules

- Registration ignores any `role` field and always creates a `USER`. The first admin is created with `npm run seed:admin`, which needs database credentials and is not reachable over HTTP.
- Note queries always include the owner (`{ _id, user }`), so another user's note returns 404 and its existence is not revealed.
- An admin has all user capabilities, can manage users, and can **view** everyone's notes. Admins cannot edit or delete other users' notes.
- An admin cannot change their own role or delete their own account, so the last admin cannot lock themselves out.
- The authenticated user is loaded from the database on every request, so deleted users and role changes take effect immediately.

## Data model

| Collection | Fields |
|---|---|
| `users` | `name`, `email` (unique, lowercase), `password` (bcrypt hash, `select: false`), `role` (`USER`/`ADMIN`), `interests` (string array), timestamps |
| `notes` | `user` (ref User), `title`, `content`, timestamps – private |
| `posts` | `user` (ref User), `title`, `content`, timestamps – public |

## Indexes

All indexes are declared with `schema.index()` in `src/models`. Only four custom indexes exist:

| Collection | Index | Type | Supports |
|---|---|---|---|
| users | `{ email: 1 }` | unique | Login lookup and duplicate-email protection |
| users | `{ interests: 1 }` | multikey | `$match` stage of the group-by-interests pipeline |
| notes | `{ user: 1, _id: -1 }` | compound | Own notes list (equality on `user`, sorted by `_id` desc), its count, admin notes filtered by user, cascade delete |
| posts | `{ user: 1, _id: -1 }` | compound | `$lookup` from users to posts (`foreignField: user`), sorted newest first, and its count |

Queries that deliberately rely on the built-in `_id` index instead of an extra index:

- Get a user, note or post by id. Ownership is checked on the single document found by `_id`.
- Admin list of all users and all notes, and the list of all posts, sorted by `_id: -1`. ObjectIds start with a timestamp, so `_id` order is creation order and no `createdAt` index is needed.
- Unfiltered list totals use `estimatedDocumentCount()`, which reads collection metadata.

A separate `{ user: 1 }` index would be redundant because it is a prefix of `{ user: 1, _id: -1 }`.

`tests/suites/indexes.ts` checks that exactly these indexes exist and uses `explain()` to confirm each query uses the intended index (no `COLLSCAN`, no in-memory `SORT` for the notes list).

## Aggregation pipelines

### Scenario 1 – users grouped by interests

`GET /api/admin/users/grouped-by-interests` – `src/services/user.service.ts`. Exactly one `User.aggregate()` call; the page and the total come from the same pipeline through `$facet`.

```js
[
  { $match: { interests: { $type: 'string' } } },   // or { interests: '<interest>' } with ?interest=
  { $unwind: '$interests' },
  // { $match: { interests: '<interest>' } }       // only with ?interest=
  { $group: { _id: '$interests', count: { $sum: 1 }, users: { $push: { _id: '$_id', name: '$name', email: '$email' } } } },
  { $sort: { count: -1, _id: 1 } },
  { $facet: {
      data: [{ $skip: skip }, { $limit: limit }, { $project: { _id: 0, interest: '$_id', count: 1, users: 1 } }],
      total: [{ $count: 'count' }],
  } },
]
```

- The leading `$match` uses the multikey `interests_1` index. `$type: 'string'` limits the scan to string keys, so users without interests are skipped. With `?interest=` it becomes a point lookup that only reads the matching users.
- The index only helps the initial `$match`. `$unwind`, `$group` and `$sort` run in memory, and a multikey index cannot cover the query, so documents are always fetched.

### Scenario 2 – posts of a user with `$lookup`

`GET /api/users/:id/posts` – `src/services/post.service.ts`. One `User.aggregate()` call.

```js
[
  { $match: { _id: userId } },
  { $lookup: { from: 'posts', localField: '_id', foreignField: 'user',
               pipeline: [{ $sort: { _id: -1 } }, { $skip: skip }, { $limit: limit },
                          { $project: { title: 1, content: 1, createdAt: 1, updatedAt: 1 } }],
               as: 'posts' } },
  { $lookup: { from: 'posts', localField: '_id', foreignField: 'user',
               pipeline: [{ $count: 'count' }], as: 'postCount' } },
  { $project: { user: { _id: '$_id', name: '$name' }, posts: 1, total: { $ifNull: [{ $first: '$postCount.count' }, 0] } } },
]
```

- `$match` uses the `_id` index; an empty result means the user does not exist (404).
- Both `$lookup` stages use `posts.user_1__id_-1`: the posts come out of the index already sorted, so only `limit` documents are read, and the count is answered from the index without reading documents.

## Security

- Passwords hashed with bcrypt (cost 12), excluded from queries (`select: false`) and from JSON output.
- JWT signed and verified with HS256 only (rejects `alg: none`), expires after `JWT_EXPIRES_IN`.
- Same error message for unknown email and wrong password.
- Request bodies validated with zod; unknown fields are stripped and services copy fields explicitly (no mass assignment).
- `helmet` security headers, CORS restricted to `CLIENT_URL`, 100 kB body limit.
- Auth endpoints limited to 10 failed attempts per 15 minutes per IP.
- Internal error details are hidden when `NODE_ENV=production`.

## Testing

```bash
npm test
```

46 tests covering authentication, authorization, notes, admin features, both aggregation scenarios and the index strategy. They run against a separate `secure-notes-test` database on the same cluster, which is dropped afterwards.

A Postman collection is available in `docs/secure-notes.postman_collection.json`. Import it, set `baseUrl`, and run **Login** or **Login as admin** first; the token is stored automatically for the other requests.

## Project structure

```
src/
  config/        env and database connection
  models/        Mongoose schemas and indexes
  validators/    zod request schemas
  middlewares/   authentication, authorization, validation, error handling
  services/      business logic and database queries
  controllers/   HTTP handlers
  routes/        route definitions
  scripts/       seed:admin, seed:demo, db:indexes
  utils/         errors, JWT, pagination
tests/           API tests
docs/            Postman collection
```
