CREATE TABLE prompt_generations (
 owner TEXT NOT NULL,
 request_id TEXT NOT NULL,
 session TEXT NOT NULL,
 input_hash TEXT NOT NULL,
 created TEXT NOT NULL,
 status TEXT NOT NULL CHECK (status IN ('running','finished','failed')),
 clarification TEXT,
 PRIMARY KEY (owner,request_id)
);
--> statement-breakpoint
CREATE INDEX prompt_generations_window ON prompt_generations(owner,created);
