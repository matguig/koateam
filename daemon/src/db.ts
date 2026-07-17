// Persistance SQLite (SPEC-V1 §5.4) via node:sqlite — natif Node 22,
// zéro addon natif : indispensable pour l'empaquetage SEA du sidecar.

import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

export function openDb(dataDir: string): DatabaseSync {
  mkdirSync(dataDir, { recursive: true })
  const db = new DatabaseSync(join(dataDir, 'koateam.db'))
  db.exec('PRAGMA journal_mode = WAL')
  db.exec('PRAGMA foreign_keys = ON')
  db.exec(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      mission TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      budget_amount REAL NOT NULL DEFAULT 0,
      budget_period TEXT NOT NULL DEFAULT 'monthly',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      name TEXT NOT NULL,
      title TEXT NOT NULL,
      role TEXT NOT NULL,               -- ceo | head | specialist
      department TEXT,
      manager_id TEXT,
      contract TEXT NOT NULL,           -- permanent | mission
      status TEXT NOT NULL DEFAULT 'active',
      color TEXT NOT NULL,
      model TEXT NOT NULL,
      autonomy TEXT NOT NULL DEFAULT 'ask_sensitive',
      scope TEXT NOT NULL DEFAULT '',
      character TEXT NOT NULL DEFAULT '[]',   -- JSON jauges
      perms TEXT NOT NULL DEFAULT '[]',       -- JSON
      memory TEXT NOT NULL DEFAULT '[]',      -- JSON
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      parent_id TEXT REFERENCES tasks(id),
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      objectives TEXT NOT NULL DEFAULT '[]',  -- JSON [label, done][]
      status TEXT NOT NULL,
      assignee_id TEXT,
      supervisor_id TEXT,
      budget_allocated REAL NOT NULL DEFAULT 0,
      complexity_note TEXT NOT NULL DEFAULT '',
      created_by TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id TEXT NOT NULL,
      at TEXT NOT NULL,
      type TEXT NOT NULL,               -- consumption | allocation | release | topup
      amount REAL NOT NULL,
      task_id TEXT,
      employee_id TEXT,
      detail TEXT
    );
    CREATE TABLE IF NOT EXISTS inbox (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      type TEXT NOT NULL,               -- deliverable_review | budget_pause_alert | question | info
      status TEXT NOT NULL DEFAULT 'pending',
      title TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      task_id TEXT,
      employee_id TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS traces (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      employee_id TEXT,
      task_id TEXT,
      trigger TEXT NOT NULL DEFAULT '',
      events TEXT NOT NULL DEFAULT '[]',      -- JSON chronologique
      tokens_in INTEGER NOT NULL DEFAULT 0,
      tokens_out INTEGER NOT NULL DEFAULT 0,
      cost REAL NOT NULL DEFAULT 0,
      outcome TEXT NOT NULL DEFAULT '',
      started_at TEXT NOT NULL,
      ended_at TEXT
    );
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id TEXT NOT NULL,
      from_id TEXT NOT NULL,
      to_id TEXT NOT NULL,
      task_id TEXT,
      content TEXT NOT NULL,
      at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_id);
    CREATE INDEX IF NOT EXISTS idx_ledger_task ON ledger(task_id);
    CREATE INDEX IF NOT EXISTS idx_traces_task ON traces(task_id);
  `)
  return db
}
