import { DatabaseSync } from "node:sqlite";
import {mkdirSync} from "node:fs";
import {dirname,resolve} from "node:path";
const cache=globalThis;
/** Single-process SQLite snapshot store; never place this file in public/ or Git. */
function connection(){
 if(!cache.__carecallDatabase){
  const file=process.env.CARECALL_DB_PATH||resolve(process.cwd(),".carecall-data","carecall.sqlite");
  if(file!==":memory:")mkdirSync(dirname(file),{recursive:true});
  const db=new DatabaseSync(file);
  db.exec("PRAGMA journal_mode=WAL; PRAGMA secure_delete=ON; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS carecall_state (id INTEGER PRIMARY KEY CHECK(id=1), payload TEXT NOT NULL, revision INTEGER NOT NULL)");
  cache.__carecallDatabase=db;
 }
 return cache.__carecallDatabase;
}
export function loadSnapshot(){
 const row=connection().prepare("SELECT payload,revision FROM carecall_state WHERE id=1").get();
 cache.__carecallRevision=row?.revision||0;
 return row ? JSON.parse(row.payload) : null;
}
export function writeSnapshot(data){
 const db=connection(),payload=JSON.stringify(data),revision=cache.__carecallRevision||0;
 db.exec("BEGIN IMMEDIATE");
 try{
  const stored=db.prepare("SELECT revision FROM carecall_state WHERE id=1").get();
  if((stored?.revision||0)!==revision)throw new Error("CareCall requires a single server process per SQLite database.");
  db.prepare("INSERT INTO carecall_state(id,payload,revision) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,revision=excluded.revision").run(payload,revision+1);
  db.exec("COMMIT");cache.__carecallRevision=revision+1;
 }catch(e){db.exec("ROLLBACK");throw e;}
}
