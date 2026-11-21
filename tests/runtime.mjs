import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import worker from '../dist/server/index.js';

export function runtime(t, config = {}, { beforeMigration } = {}) {
  const sqlite = new DatabaseSync(':memory:');
  t.after(() => sqlite.close());
  for (const name of readdirSync('drizzle').filter(name => name.endsWith('.sql')).sort()) {
    if (name === beforeMigration?.name) beforeMigration.seed(sqlite);
    sqlite.exec(readFileSync('drizzle/' + name, 'utf8'));
  }
  const DB = {
    prepare(query) {
      const statement = sqlite.prepare(query);
      return { bind(...values) {
        return {
          all: () => ({ results: statement.all(...values) }),
          first: () => statement.get(...values),
          run: () => statement.run(...values),
        };
      } };
    },
    batch(statements) {
      sqlite.exec('BEGIN');
      try {
        const results = statements.map(statement => statement.run());
        sqlite.exec('COMMIT');
        return results;
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
  };
  function call(path, body, owner = 'pemilik', customHeaders = {}) {
    const headers = new Headers(customHeaders);
    if (owner) headers.set('oai-authenticated-user-id', owner);
    if (body !== undefined) {
      if (!headers.has('Origin')) headers.set('Origin', 'https://studio.test');
      if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    }
    return worker.fetch(new Request('https://studio.test/api/' + path, {
      headers, method: body === undefined ? 'GET' : 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
    }), { DB, ...config });
  }
  return { call, sqlite };
}

export const existing = (session = crypto.randomUUID()) => ({
  session, requestId: crypto.randomUUID(), source: 'Tulis 5 poin.', draft: 'Write 5 points.',
  lang: 'Bahasa Indonesia', domain: 'Umum', answers: [],
});

export const arxReply = text => Response.json({
  model: 'fixture-2026', usage: { prompt_tokens: 10, completion_tokens: 4 },
  choices: [{ finish_reason: 'stop', message: { content: text } }],
});
