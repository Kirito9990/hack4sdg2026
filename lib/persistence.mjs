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
 const db=cache.__carecallDatabase;
 const userColumnsNow=db.prepare("PRAGMA table_info(carecall_users)").all();
 if(!userColumnsNow.some(column=>column.name==="password_hash"))db.exec("ALTER TABLE carecall_users ADD COLUMN password_hash TEXT");
 db.exec(`CREATE TABLE IF NOT EXISTS carecall_sessions (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL,
 created_at TEXT NOT NULL,
 password_auth INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS carecall_requests (
 id TEXT PRIMARY KEY,
 resident_id TEXT NOT NULL,
 volunteer_id TEXT,
 lat REAL NOT NULL,
 lng REAL NOT NULL,
 status TEXT NOT NULL,
 urgency_level TEXT NOT NULL,
 category TEXT NOT NULL,
 summary TEXT NOT NULL,
 dispatch_action TEXT NOT NULL,
 requirements_json TEXT,
 tools_json TEXT,
 resources_json TEXT,
 created_at TEXT NOT NULL,
 accepted_at TEXT,
 chat_expires_at TEXT,
 closed_at TEXT,
 closed_reason TEXT,
 image_data TEXT,
 transcript TEXT,
 source TEXT NOT NULL,
 classification_json TEXT,
 audio_status TEXT,
 image_status TEXT,
 image_width INTEGER,
 image_height INTEGER,
 position INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS carecall_messages (
 id TEXT PRIMARY KEY,
 request_id TEXT NOT NULL,
 sender_id TEXT NOT NULL,
 text TEXT NOT NULL,
 image_data TEXT,
 created_at TEXT NOT NULL,
 position INTEGER NOT NULL
);`);
 return db;
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
  if(row.password_hash!=null)user.passwordHash=row.password_hash;
  const stored=privacy.get(row.id),prefs={};
  if(stored)for(const [column,key] of privacyColumns)if(stored[column]!=null)prefs[key]=stored[column]===1;
  user.privacy=prefs;
  return user;
 });
}
function writeUsers(db,users){
 db.exec("DELETE FROM carecall_privacy; DELETE FROM carecall_users;");
 const insertUser=db.prepare("INSERT INTO carecall_users(id,name,phone,role,available,address,privacy_accepted_at,created_at,password_hash) VALUES(?,?,?,?,?,?,?,?,?)");
 const insertPrivacy=db.prepare("INSERT INTO carecall_privacy(user_id,allow_calls,allow_ai,allow_chat,show_name,share_address,share_location,allow_location) VALUES(?,?,?,?,?,?,?,?)");
 for(const user of users||[]){
  if(!user||typeof user.id!=="string"||!user.id)throw new Error("User id is required");
  insertUser.run(user.id,user.name??null,user.phone??null,user.role??null,bit(user.available),user.address??null,user.privacyAcceptedAt??null,user.createdAt??null,user.passwordHash??null);
  const prefs=user.privacy||{};
  insertPrivacy.run(user.id,bit(prefs.allowCalls),bit(prefs.allowAI),bit(prefs.allowChat),bit(prefs.showName),bit(prefs.shareAddress),bit(prefs.shareLocation),bit(prefs.allowLocation));
 }
 db.prepare("INSERT INTO carecall_meta(key,value) VALUES('user_tables','1') ON CONFLICT(key) DO UPDATE SET value=excluded.value").run();
}
function requiredString(value,label){
 if(typeof value!=="string"||value.length===0)throw new Error(label);
 return value;
}
function requiredNumber(value,label){
 if(typeof value!=="number"||!Number.isFinite(value))throw new Error(label);
 return value;
}
function jsonText(value){return value==null?null:JSON.stringify(value);}
function snapshotRecords(data){
 return {
  sessions:(Array.isArray(data?.sessions)?data.sessions:[]).filter(session=>session&&session.passwordAuth===true),
  requests:Array.isArray(data?.requests)?data.requests:[],
  messages:Array.isArray(data?.messages)?data.messages:[],
 };
}
function tableCount(db,table){
 return db.prepare("SELECT COUNT(*) AS n FROM "+table).get().n;
}
function writeSnapshotTables(db,data){
 const records=snapshotRecords(data);
 db.exec("DELETE FROM carecall_messages; DELETE FROM carecall_requests; DELETE FROM carecall_sessions;");
 const insertSession=db.prepare("INSERT INTO carecall_sessions(id,user_id,created_at,password_auth) VALUES(?,?,?,1)");
 for(const session of records.sessions){
  insertSession.run(requiredString(session.id,"Session id is required"),requiredString(session.userId,"Session user is required"),requiredString(session.createdAt,"Session time is required"));
 }
 const insertRequest=db.prepare(`INSERT INTO carecall_requests(
 id,resident_id,volunteer_id,lat,lng,status,urgency_level,category,summary,dispatch_action,
 requirements_json,tools_json,resources_json,created_at,accepted_at,chat_expires_at,closed_at,closed_reason,
 image_data,transcript,source,classification_json,audio_status,image_status,image_width,image_height,position
) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
 records.requests.forEach((request,position)=>{
  insertRequest.run(
   requiredString(request?.id,"Request id is required"),
   requiredString(request.residentId,"Request resident is required"),
   request.volunteerId??null,
   requiredNumber(request.lat,"Request latitude is required"),
   requiredNumber(request.lng,"Request longitude is required"),
   requiredString(request.status,"Request status is required"),
   requiredString(request.urgency_level,"Request urgency is required"),
   requiredString(request.category,"Request category is required"),
   typeof request.summary==="string"?request.summary:requiredString(request.summary,"Request summary is required"),
   requiredString(request.dispatch_action,"Request dispatch is required"),
   jsonText(request.requirements),
   jsonText(request.tools),
   jsonText(request.resources),
   requiredString(request.createdAt,"Request time is required"),
   request.acceptedAt??null,
   request.chatExpiresAt??null,
   request.closedAt??null,
   request.closedReason??null,
   request.imageData??null,
   request.transcript??null,
   requiredString(request.source,"Request source is required"),
   jsonText(request.classification),
   request.audioStatus??null,
   request.imageStatus??null,
   request.imageWidth??null,
   request.imageHeight??null,
   position,
  );
 });
 const insertMessage=db.prepare("INSERT INTO carecall_messages(id,request_id,sender_id,text,image_data,created_at,position) VALUES(?,?,?,?,?,?,?)");
 records.messages.forEach((message,position)=>{
  insertMessage.run(
   requiredString(message?.id,"Message id is required"),
   requiredString(message.requestId,"Message request is required"),
   requiredString(message.senderId,"Message sender is required"),
   typeof message.text==="string"?message.text:requiredString(message.text,"Message text is required"),
   message.imageData??null,
   requiredString(message.createdAt,"Message time is required"),
   position,
  );
 });
 if(tableCount(db,"carecall_sessions")!==records.sessions.length)throw new Error("Session count mismatch");
 if(tableCount(db,"carecall_requests")!==records.requests.length)throw new Error("Request count mismatch");
 if(tableCount(db,"carecall_messages")!==records.messages.length)throw new Error("Message count mismatch");
 db.prepare("INSERT INTO carecall_meta(key,value) VALUES('snapshot_tables','1') ON CONFLICT(key) DO UPDATE SET value=excluded.value").run();
 return records;
}
const SESSION_MS=30*86400000;
export function readPasswordSession(id){
 if(typeof id!=="string"||!id)return null;
 const row=connection().prepare("SELECT id,user_id,created_at,password_auth FROM carecall_sessions WHERE id=?").get(id);
 if(!row||row.password_auth!==1)return null;
 if(!(Date.parse(row.created_at)+SESSION_MS>Date.now()))return null;
 return {id:row.id,userId:row.user_id,createdAt:row.created_at,passwordAuth:true};
}
export function migrateSnapshotTables(){
 const db=connection();
 if(db.prepare("SELECT value FROM carecall_meta WHERE key='snapshot_tables'").get()?.value==="1")return {migrated:false};
 db.exec("BEGIN IMMEDIATE");
 try{
  if(db.prepare("SELECT value FROM carecall_meta WHERE key='snapshot_tables'").get()?.value==="1"){db.exec("COMMIT");return {migrated:false};}
  const current=db.prepare("SELECT payload,revision FROM carecall_state WHERE id=1").get();
  const data=current?JSON.parse(current.payload):{sessions:[],requests:[],messages:[]};
  const records=writeSnapshotTables(db,data);
  const after=db.prepare("SELECT payload,revision FROM carecall_state WHERE id=1").get();
  if((after?.payload??null)!==(current?.payload??null)||(after?.revision||0)!==(current?.revision||0))throw new Error("Migration changed the JSON snapshot");
  db.exec("COMMIT");
  return {migrated:true,sessions:records.sessions.length,requests:records.requests.length,messages:records.messages.length};
 }catch(error){db.exec("ROLLBACK");throw error;}
}
function jsonValue(text){
 if(text==null)return undefined;
 return JSON.parse(text);
}
function readRequests(db){
 return db.prepare("SELECT * FROM carecall_requests ORDER BY position ASC, rowid ASC").all().map(row=>{
  const request={
   id:row.id,
   residentId:row.resident_id,
   lat:row.lat,
   lng:row.lng,
   status:row.status,
   urgency_level:row.urgency_level,
   category:row.category,
   summary:row.summary,
   dispatch_action:row.dispatch_action,
   createdAt:row.created_at,
   source:row.source,
  };
  if(row.volunteer_id!=null)request.volunteerId=row.volunteer_id;
  const requirements=jsonValue(row.requirements_json),tools=jsonValue(row.tools_json),resources=jsonValue(row.resources_json);
  if(requirements!=null)request.requirements=requirements;
  if(tools!=null)request.tools=tools;
  if(resources!=null)request.resources=resources;
  if(row.accepted_at!=null)request.acceptedAt=row.accepted_at;
  if(row.chat_expires_at!=null)request.chatExpiresAt=row.chat_expires_at;
  if(row.closed_at!=null)request.closedAt=row.closed_at;
  if(row.closed_reason!=null)request.closedReason=row.closed_reason;
  if(row.image_data!=null)request.imageData=row.image_data;
  if(row.transcript!=null)request.transcript=row.transcript;
  const classification=jsonValue(row.classification_json);
  if(classification!=null)request.classification=classification;
  if(row.audio_status!=null)request.audioStatus=row.audio_status;
  if(row.image_status!=null)request.imageStatus=row.image_status;
  if(row.image_width!=null)request.imageWidth=row.image_width;
  if(row.image_height!=null)request.imageHeight=row.image_height;
  return request;
 });
}
function readMessages(db){
 return db.prepare("SELECT * FROM carecall_messages ORDER BY position ASC, rowid ASC").all().map(row=>{
  const message={
   id:row.id,
   requestId:row.request_id,
   senderId:row.sender_id,
   text:row.text,
   createdAt:row.created_at,
  };
  if(row.image_data!=null)message.imageData=row.image_data;
  return message;
 });
}
export function loadSnapshot(){
 const db=connection();
 try{migrateSnapshotTables();}catch{/* A failed table copy leaves the JSON snapshot readable. */}
 const row=db.prepare("SELECT payload,revision FROM carecall_state WHERE id=1").get();
 cache.__carecallRevision=row?.revision||0;
 if(!row)return null;
 const data=JSON.parse(row.payload);
 if(db.prepare("SELECT value FROM carecall_meta WHERE key='user_tables'").get()?.value==="1")data.users=readUsers(db);
 if(db.prepare("SELECT value FROM carecall_meta WHERE key='snapshot_tables'").get()?.value==="1"){
  data.requests=readRequests(db);
  data.messages=readMessages(db);
 }
 if(Array.isArray(data.sessions)){
  const kept=data.sessions.filter(session=>session&&session.passwordAuth===true);
  if(kept.length!==data.sessions.length)data.droppedLegacySessions=true;
  data.sessions=kept;
 }
 return data;
}
export function writeSnapshot(data){
 if(Array.isArray(data.sessions))data.sessions=data.sessions.filter(session=>session&&session.passwordAuth===true);
 const db=connection(),payload=JSON.stringify(data),revision=cache.__carecallRevision||0;
 db.exec("BEGIN IMMEDIATE");
 try{
  const stored=db.prepare("SELECT revision FROM carecall_state WHERE id=1").get();
  if((stored?.revision||0)!==revision)throw new Error("CareCall requires a single server process per SQLite database.");
  writeUsers(db,data.users);
  db.prepare("INSERT INTO carecall_state(id,payload,revision) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,revision=excluded.revision").run(payload,revision+1);
  writeSnapshotTables(db,data);
  db.exec("COMMIT");cache.__carecallRevision=revision+1;
 }catch(e){db.exec("ROLLBACK");throw e;}
}
