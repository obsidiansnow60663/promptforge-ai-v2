CREATE TABLE executions (
 owner TEXT NOT NULL,
 session TEXT NOT NULL,
 version INTEGER NOT NULL,
 request_id TEXT NOT NULL,
 created TEXT NOT NULL,
 status TEXT NOT NULL CHECK (status IN ('running','complete','warning','failed')),
 payload TEXT NOT NULL,
 PRIMARY KEY (owner,request_id),
 FOREIGN KEY (owner,session,version) REFERENCES versions(owner,session,version) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX executions_version ON executions(owner,session,version,created);
--> statement-breakpoint
CREATE INDEX executions_usage ON executions(owner,created);
