import fs from "fs";
const FILE = process.env.CDB_SESSION_FILE || "/tmp/cdb_sessions.json";
function load(){ try { return JSON.parse(fs.readFileSync(FILE,"utf-8")); } catch { return {}; } }
function save(data){ try { fs.writeFileSync(FILE, JSON.stringify(data, null, 2)); } catch {} }
const state = load();
export function setSession(key, session){ state[key]=session; save(state); }
export function getSession(key){ return state[key] || null; }
export function listSessions(){ return Object.keys(state); }
