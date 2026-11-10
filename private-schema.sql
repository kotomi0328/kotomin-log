CREATE TABLE fans (id TEXT PRIMARY KEY NOT NULL, owner_id TEXT NOT NULL, name TEXT NOT NULL, created_at TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE lives (id TEXT PRIMARY KEY NOT NULL, owner_id TEXT NOT NULL, date TEXT NOT NULL, title TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE visits (owner_id TEXT NOT NULL, fan_id TEXT NOT NULL REFERENCES fans(id), live_id TEXT NOT NULL REFERENCES lives(id), PRIMARY KEY(owner_id,fan_id,live_id));
