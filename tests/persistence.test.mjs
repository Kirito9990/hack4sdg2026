import {test} from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,rmSync,readFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {spawnSync} from "node:child_process";
import ts from "typescript";
test("SQLite preserves preferences, address and old conversations across processes",()=>{
 const dir=mkdtempSync(join(tmpdir(),"carecall-db-"));
 const env={...process.env,CARECALL_DB_PATH:join(dir,"state.sqlite")};
 const data={users:[{id:"r",address:"District\nBuilding\nUnit",privacy:{allowLocation:true,showName:false}}],sessions:[{id:"kept",passwordAuth:true}],requests:[{id:"old",status:"CLOSED",closedAt:new Date(Date.now()-8*86400000).toISOString()}],messages:[{requestId:"old",text:"retained"}]};
 function child(code){const p=spawnSync(process.execPath,["--input-type=module","-e",code],{env,encoding:"utf8"});assert.equal(p.status,0,p.stderr);return p.stdout;}
 try{child('import {loadSnapshot,writeSnapshot} from "./lib/persistence.mjs";loadSnapshot();writeSnapshot('+JSON.stringify(data)+');');
 const loaded=JSON.parse(child('import {loadSnapshot} from "./lib/persistence.mjs";console.log(JSON.stringify(loadSnapshot()));'));assert.deepEqual(loaded,data);
 const tables=JSON.parse(child('import {DatabaseSync} from "node:sqlite";const db=new DatabaseSync(process.env.CARECALL_DB_PATH);const user=db.prepare("SELECT id,address,name FROM carecall_users").get();const privacy=db.prepare("SELECT allow_location,show_name,allow_calls FROM carecall_privacy WHERE user_id=?").get("r");console.log(JSON.stringify({user,privacy}));db.close();'));
 assert.equal(tables.user.address,"District\nBuilding\nUnit");assert.equal(tables.user.name,null);assert.equal(tables.privacy.allow_location,1);assert.equal(tables.privacy.show_name,0);assert.equal(tables.privacy.allow_calls,null);
 child('import {loadSnapshot,writeSnapshot} from "./lib/persistence.mjs";const d=loadSnapshot();d.requests=[];d.messages=[];writeSnapshot(d);');
 const deleted=JSON.parse(child('import {loadSnapshot} from "./lib/persistence.mjs";console.log(JSON.stringify(loadSnapshot()));'));assert.equal(deleted.messages.length,0);assert.equal(deleted.users[0].privacy.allowLocation,true);
 child('import {loadSnapshot,writeSnapshot} from "./lib/persistence.mjs";const d=loadSnapshot();d.users=[];writeSnapshot(d);');
 const removed=JSON.parse(child('import {DatabaseSync} from "node:sqlite";const db=new DatabaseSync(process.env.CARECALL_DB_PATH);console.log(JSON.stringify({users:db.prepare("SELECT COUNT(*) AS n FROM carecall_users").get().n,privacy:db.prepare("SELECT COUNT(*) AS n FROM carecall_privacy").get().n}));db.close();'));
 assert.equal(removed.users,0);assert.equal(removed.privacy,0);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test("account profile and privacy settings round-trip as table rows",()=>{
 const dir=mkdtempSync(join(tmpdir(),"carecall-user-"));
 const env={...process.env,CARECALL_DB_PATH:join(dir,"state.sqlite")};
 const user={id:"resident",name:"Ada Lam",phone:"+85261234567",role:"resident",available:false,address:"District\nBuilding\nUnit",privacyAcceptedAt:"2026-10-01T00:00:00.000Z",createdAt:"2026-10-01T00:00:00.000Z",privacy:{allowCalls:true,allowAI:false,allowChat:true,showName:false,shareAddress:true,allowLocation:false}};
 const data={users:[user],sessions:[{id:"session",userId:"resident",createdAt:user.createdAt}],requests:[],messages:[]};
 function child(code){const p=spawnSync(process.execPath,["--input-type=module","-e",code],{env,encoding:"utf8"});assert.equal(p.status,0,p.stderr);return p.stdout;}
 try{child('import {loadSnapshot,writeSnapshot} from "./lib/persistence.mjs";loadSnapshot();writeSnapshot('+JSON.stringify(data)+');');
  const loaded=JSON.parse(child('import {loadSnapshot} from "./lib/persistence.mjs";console.log(JSON.stringify(loadSnapshot()));'));assert.deepEqual(loaded.users[0],user);
  const row=JSON.parse(child('import {DatabaseSync} from "node:sqlite";const db=new DatabaseSync(process.env.CARECALL_DB_PATH);const user=db.prepare("SELECT name,phone,role,available,address,privacy_accepted_at FROM carecall_users").get();const privacy=db.prepare("SELECT * FROM carecall_privacy").get();console.log(JSON.stringify({user,privacy}));db.close();'));
  assert.equal(row.user.name,"Ada Lam");assert.equal(row.user.phone,"+85261234567");assert.equal(row.user.role,"resident");assert.equal(row.user.available,0);assert.equal(row.user.privacy_accepted_at,user.privacyAcceptedAt);
  assert.equal(row.privacy.allow_calls,1);assert.equal(row.privacy.allow_ai,0);assert.equal(row.privacy.allow_chat,1);assert.equal(row.privacy.show_name,0);assert.equal(row.privacy.share_address,1);assert.equal(row.privacy.allow_location,0);
  child('import {loadSnapshot,writeSnapshot} from "./lib/persistence.mjs";const d=loadSnapshot();d.users[0].privacy.allowAI=true;d.users[0].name="Ada Chan";writeSnapshot(d);');
  const updated=JSON.parse(child('import {DatabaseSync} from "node:sqlite";const db=new DatabaseSync(process.env.CARECALL_DB_PATH);console.log(JSON.stringify({name:db.prepare("SELECT name FROM carecall_users").get().name,allowAI:db.prepare("SELECT allow_ai FROM carecall_privacy").get().allow_ai}));db.close();'));
  assert.equal(updated.name,"Ada Chan");assert.equal(updated.allowAI,1);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test("seven-day boundary hides closed requests without hiding active requests",async()=>{
 const source=readFileSync(new URL("../lib/retention.ts",import.meta.url),"utf8");
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
 const {historyVisible}=await import("data:text/javascript;base64,"+Buffer.from(js).toString("base64"));
 const now=Date.now(),r={status:"CLOSED",closedAt:new Date(now-7*86400000).toISOString()};
 assert.equal(historyVisible(r,now),false);assert.equal(historyVisible(r,now-1),true);assert.equal(historyVisible({status:"ACCEPTED"},now),true);
});

test("archived conversations stay in SQLite but disappear from participant APIs",async()=>{
 const {DatabaseSync}=await import("node:sqlite"),{spawn}=await import("node:child_process");
 const dir=mkdtempSync(join(tmpdir(),"carecall-archive-")),file=join(dir,"state.sqlite");
 const now=Date.now(),cookie="carecall_session=archive-test-session";
 const data={users:[{id:"resident",name:"Archive Test",phone:"+85260000001",role:"resident",createdAt:new Date(now).toISOString(),privacy:{allowChat:true,allowCalls:false,allowAI:false,allowLocation:true,showName:false},address:"District\nBuilding\nUnit"},{id:"volunteer",name:"Helper",phone:"+85260000002",role:"volunteer",privacy:{allowChat:true},createdAt:new Date(now).toISOString()}],sessions:[{id:"archive-test-session",userId:"resident",createdAt:new Date(now).toISOString(),passwordAuth:true}],requests:[{id:"archived",residentId:"resident",volunteerId:"volunteer",status:"CLOSED",createdAt:new Date(now-9*86400000).toISOString(),closedAt:new Date(now-8*86400000).toISOString(),category:"OTHER",urgency_level:"LOW",summary:"Test",dispatch_action:"NEIGHBORHOOD_VOLUNTEER",lat:22.3,lng:114.1}],messages:[{id:"msg",requestId:"archived",senderId:"resident",text:"Retained archive",createdAt:new Date(now-8*86400000).toISOString()}]};
 const db=new DatabaseSync(file);db.exec("CREATE TABLE carecall_state (id INTEGER PRIMARY KEY,payload TEXT,revision INTEGER)");db.prepare("INSERT INTO carecall_state VALUES(1,?,1)").run(JSON.stringify(data));db.close();
 const base="http://127.0.0.1:47295",server=spawn(process.execPath,[".next/standalone/server.js"],{env:{...process.env,PORT:"47295",HOSTNAME:"127.0.0.1",CARECALL_DB_PATH:file},stdio:"ignore"});
 try{
  for(let n=0;n<80;n++){if(server.exitCode!==null)throw Error("Test server exited");try{if((await fetch(base+"/api/health")).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  const get=path=>fetch(base+path,{headers:{Cookie:cookie}});
  assert.equal((await (await get("/api/auth")).json()).user.address,"District\nBuilding\nUnit");
  assert.deepEqual((await (await get("/api/request/status")).json()).requests,[]);
  assert.equal((await get("/api/request/status?id=archived")).status,404);
  assert.equal((await get("/api/request/chat?id=archived")).status,403);
  const read=()=>{const d=new DatabaseSync(file);const r=JSON.parse(d.prepare("SELECT payload FROM carecall_state WHERE id=1").get().payload);d.close();return r;};
  assert.equal(read().messages[0].text,"Retained archive");
  assert.equal((await fetch(base+"/api/account/archive",{method:"DELETE",headers:{Cookie:cookie,Origin:base}})).status,200);
  assert.equal(read().messages.length,0);
 }finally{server.kill();await new Promise(r=>server.exitCode!==null?r():server.once("exit",r));rmSync(dir,{recursive:true,force:true});}
});
