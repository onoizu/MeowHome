PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  passwordHash TEXT NOT NULL,
  created TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS cats (
  id TEXT PRIMARY KEY,
  ownerId TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  adopterId TEXT REFERENCES users(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  breed TEXT NOT NULL,
  months INTEGER NOT NULL CHECK(months BETWEEN 1 AND 360),
  gender TEXT NOT NULL CHECK(gender IN ('Male','Female')),
  location TEXT NOT NULL,
  health TEXT NOT NULL,
  personality TEXT NOT NULL,
  energy TEXT NOT NULL CHECK(energy IN ('calm','active')),
  care TEXT NOT NULL CHECK(care IN ('easy','regular')),
  beginner INTEGER NOT NULL CHECK(beginner IN (0,1)),
  otherPets INTEGER NOT NULL CHECK(otherPets IN (0,1)),
  description TEXT NOT NULL,
  requirements TEXT NOT NULL,
  image TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available','reserved','adopted')),
  created TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK((status = 'adopted' AND adopterId IS NOT NULL) OR (status <> 'adopted' AND adopterId IS NULL)),
  CHECK(adopterId IS NULL OR adopterId <> ownerId)
);

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  catId TEXT NOT NULL REFERENCES cats(id) ON DELETE CASCADE,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  experience TEXT NOT NULL,
  home TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN
    ('pending','contacting','accepted','completed','rejected','withdrawn','closed')),
  created TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
-- 重复点击和两个请求同时接受申请时，也由数据库保护唯一性。
CREATE UNIQUE INDEX IF NOT EXISTS one_active_request ON applications(catId,userId)
  WHERE status IN ('pending','contacting','accepted','completed');
CREATE UNIQUE INDEX IF NOT EXISTS one_adopter_per_cat ON applications(catId)
  WHERE status IN ('accepted','completed');

CREATE TABLE IF NOT EXISTS diaries (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  catId TEXT NOT NULL REFERENCES cats(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  text TEXT NOT NULL,
  image TEXT NOT NULL,
  public INTEGER NOT NULL CHECK(public IN (0,1)),
  created TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  tokenHash TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS login_failures (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  resetAt INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS favourites (
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  catId TEXT NOT NULL REFERENCES cats(id) ON DELETE CASCADE,
  PRIMARY KEY(userId,catId)
);
CREATE TABLE IF NOT EXISTS checklist (
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item INTEGER NOT NULL CHECK(item BETWEEN 0 AND 6),
  PRIMARY KEY(userId,item)
);
