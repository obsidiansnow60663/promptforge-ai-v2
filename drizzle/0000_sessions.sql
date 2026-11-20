CREATE TABLE versions (
 owner TEXT NOT NULL,
 session TEXT NOT NULL,
 version INTEGER NOT NULL,
 request_id TEXT NOT NULL,
 created TEXT NOT NULL,
 payload TEXT NOT NULL,
 PRIMARY KEY (owner,session,version),
 UNIQUE (owner,request_id)
);
