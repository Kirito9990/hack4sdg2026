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
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA secure_delete=ON; PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS carecall_state (id INTEGER PRIMARY KEY CHECK(id=1), payload TEXT NOT NULL, revision INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS carecall_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS carecall_users (
 id TEXT PRIMARY KEY,
 name TEXT,
 phone TEXT,
 role TEXT,
 available INTEGER,
 address TEXT,
 privacy_accepted_at TEXT,
 created_at TEXT
);
CREATE TABLE IF NOT EXISTS carecall_privacy (
 user_id TEXT PRIMARY KEY,
 allow_calls INTEGER,
 allow_ai INTEGER,
 allow_chat INTEGER,
 show_name INTEGER,
 share_address INTEGER,
 share_location INTEGER,
 allow_location INTEGER
);`);
  const privacyColumnsNow=db.prepare("PRAGMA table_info(carecall_privacy)").all();
  if(!privacyColumnsNow.some(column=>column.name==="share_location"))db.exec("ALTER TABLE carecall_privacy ADD COLUMN share_location INTEGER");
  cache.__carecallDatabase=db;
 }
 return cache.__carecallDatabase;
}
const privacyColumns=[
 ["allow_calls","allowCalls"],
 ["allow_ai","allowAI"],
 ["allow_chat","allowChat"],
 ["show_name","showName"],
 ["share_address","shareAddress"],
 ["share_location","shareLocation"],
 ["allow_location","allowLocation"],
];
function bit(value){return value===true?1:value===false?0:null;}
function readUsers(db){
 const privacy=new Map(db.prepare("SELECT * FROM carecall_privacy").all().map(row=>[row.user_id,row]));
 return db.prepare("SELECT * FROM carecall_users ORDER BY rowid").all().map(row=>{
  const user={id:row.id};
  if(row.name!=null)user.name=row.name;
  if(row.phone!=null)user.phone=row.phone;
  if(row.role!=null)user.role=row.role;
  if(row.available!=null)user.available=row.available===1;
  if(row.address!=null)user.address=row.address;
  if(row.privacy_accepted_at!=null)user.privacyAcceptedAt=row.privacy_accepted_at;
  if(row.created_at!=null)user.createdAt=row.created_at;
  const stored=privacy.get(row.id),prefs={};
  if(stored)for(const [column,key] of privacyColumns)if(stored[column]!=null)prefs[key]=stored[column]===1;
  user.privacy=prefs;
  return user;
 });
}
function writeUsers(db,users){
 db.exec("DELETE FROM carecall_privacy; DELETE FROM carecall_users;");
 const insertUser=db.prepare("INSERT INTO carecall_users(id,name,phone,role,available,address,privacy_accepted_at,created_at) VALUES(?,?,?,?,?,?,?,?)");
 const insertPrivacy=db.prepare("INSERT INTO carecall_privacy(user_id,allow_calls,allow_ai,allow_chat,show_name,share_address,share_location,allow_location) VALUES(?,?,?,?,?,?,?,?)");
 for(const user of users||[]){
  if(!user||typeof user.id!=="string"||!user.id)throw new Error("User id is required");
  insertUser.run(user.id,user.name??null,user.phone??null,user.role??null,bit(user.available),user.address??null,user.privacyAcceptedAt??null,user.createdAt??null);
  const prefs=user.privacy||{};
  insertPrivacy.run(user.id,bit(prefs.allowCalls),bit(prefs.allowAI),bit(prefs.allowChat),bit(prefs.showName),bit(prefs.shareAddress),bit(prefs.shareLocation),bit(prefs.allowLocation));
 }
 db.prepare("INSERT INTO carecall_meta(key,value) VALUES('user_tables','1') ON CONFLICT(key) DO UPDATE SET value=excluded.value").run();
}
export function loadSnapshot(){
 const db=connection();
 const row=db.prepare("SELECT payload,revision FROM carecall_state WHERE id=1").get();
 cache.__carecallRevision=row?.revision||0;
 if(!row)return null;
 const data=JSON.parse(row.payload);
 if(db.prepare("SELECT value FROM carecall_meta WHERE key='user_tables'").get()?.value==="1")data.users=readUsers(db);
 return data;
}
export function writeSnapshot(data){
 const db=connection(),payload=JSON.stringify(data),revision=cache.__carecallRevision||0;
 db.exec("BEGIN IMMEDIATE");
 try{
  const stored=db.prepare("SELECT revision FROM carecall_state WHERE id=1").get();
  if((stored?.revision||0)!==revision)throw new Error("CareCall requires a single server process per SQLite database.");
  writeUsers(db,data.users);
  db.prepare("INSERT INTO carecall_state(id,payload,revision) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,revision=excluded.revision").run(payload,revision+1);
  db.exec("COMMIT");cache.__carecallRevision=revision+1;
 }catch(e){db.exec("ROLLBACK");throw e;}
}
