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
 const data={users:[{id:"r",address:"District\nBuilding\nUnit",privacy:{allowLocation:true,showName:false}}],sessions:[{token:"test"}],requests:[{id:"old",status:"CLOSED",closedAt:new Date(Date.now()-8*86400000).toISOString()}],messages:[{requestId:"old",text:"retained"}]};
 function child(code){const p=spawnSync(process.execPath,["--input-type=module","-e",code],{env,encoding:"utf8"});assert.equal(p.status,0,p.stderr);return p.stdout;}
 try{child('import {loadSnapshot,writeSnapshot} from "./lib/persistence.mjs";loadSnapshot();writeSnapshot('+JSON.stringify(data)+');');
 const loaded=JSON.parse(child('import {loadSnapshot} from "./lib/persistence.mjs";console.log(JSON.stringify(loadSnapshot()));'));assert.deepEqual(loaded,data);
 child('import {loadSnapshot,writeSnapshot} from "./lib/persistence.mjs";const d=loadSnapshot();d.requests=[];d.messages=[];writeSnapshot(d);');
 const deleted=JSON.parse(child('import {loadSnapshot} from "./lib/persistence.mjs";console.log(JSON.stringify(loadSnapshot()));'));assert.equal(deleted.messages.length,0);assert.equal(deleted.users[0].privacy.allowLocation,true);
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
 const data={users:[{id:"resident",name:"Archive Test",phone:"+85260000001",role:"resident",createdAt:new Date(now).toISOString(),privacy:{allowChat:true,allowCalls:false,allowAI:false,allowLocation:true,showName:false},address:"District\nBuilding\nUnit"},{id:"volunteer",name:"Helper",phone:"+85260000002",role:"volunteer",privacy:{allowChat:true},createdAt:new Date(now).toISOString()}],sessions:[{id:"archive-test-session",userId:"resident",createdAt:new Date(now).toISOString()}],requests:[{id:"archived",residentId:"resident",volunteerId:"volunteer",status:"CLOSED",createdAt:new Date(now-9*86400000).toISOString(),closedAt:new Date(now-8*86400000).toISOString(),category:"OTHER",urgency_level:"LOW",summary:"Test",dispatch_action:"NEIGHBORHOOD_VOLUNTEER",lat:22.3,lng:114.1}],messages:[{id:"msg",requestId:"archived",senderId:"resident",text:"Retained archive",createdAt:new Date(now-8*86400000).toISOString()}]};
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
