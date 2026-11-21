CREATE TABLE execution_limits (
 owner TEXT NOT NULL,
 request_id TEXT NOT NULL,
 created TEXT NOT NULL,
 PRIMARY KEY (owner,request_id)
);
--> statement-breakpoint
CREATE INDEX execution_limits_window ON execution_limits(owner,created);
--> statement-breakpoint
CREATE TRIGGER reserve_execution_usage AFTER INSERT ON executions
 WHEN NEW.status='running'
 BEGIN
   INSERT INTO execution_limits(owner,request_id,created) VALUES (NEW.owner,NEW.request_id,NEW.created);
 END;
