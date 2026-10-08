import {test} from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {spawnSync} from "node:child_process";
import {DatabaseSync} from "node:sqlite";

test("pre-reward database upgrades without changing existing records or granting historical points",()=>{
 const dir=mkdtempSync(join(tmpdir(),"carecall-reward-upgrade-"));
 const file=join(dir,"test.sqlite"),env={...process.env,CARECALL_DB_PATH:file};
 const run=code=>{const r=spawnSync(process.execPath,["--input-type=module","-e",code],{env,encoding:"utf8"});assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout);};
 let db;
 try{
  run(`import {loadSnapshot,writeSnapshot} from './lib/persistence.mjs';loadSnapshot();
  writeSnapshot({users:[{id:'v',role:'volunteer',name:'Synthetic volunteer',phone:'60000001',privacy:{allowChat:true}},{id:'r',role:'resident',name:'Synthetic resident',phone:'60000002',privacy:{allowChat:true}}],sessions:[{id:'s',userId:'v',createdAt:'2026-10-08T00:00:00Z',passwordAuth:true}],messages:[{id:'m',requestId:'old',senderId:'r',text:'Synthetic message',createdAt:'2026-10-08T00:00:00Z'}],requests:[{id:'old',residentId:'r',volunteerId:'v',lat:22,lng:114,status:'CLOSED',closedReason:'completed',closedAt:'2026-10-08T00:00:00Z',urgency_level:'LOW',category:'OTHER',summary:'Synthetic historical request',dispatch_action:'NEIGHBORHOOD_VOLUNTEER',createdAt:'2026-10-08T00:00:00Z',source:'fallback'}]});console.log('true');`);
  db=new DatabaseSync(file);
  // Reconstruct the schema immediately before incentives were introduced.
  db.exec("DROP TABLE carecall_reward_events; DROP TABLE carecall_badges; ALTER TABLE carecall_requests DROP COLUMN reward_quote_json;");
  const tables=['carecall_state','carecall_meta','carecall_users','carecall_privacy','carecall_sessions','carecall_messages'];
  const before=Object.fromEntries(tables.map(table=>[table,db.prepare('SELECT * FROM '+table).all()]));
  const requestsBefore=db.prepare('SELECT * FROM carecall_requests').all();
  db.close();db=null;
  const first=run(`import {loadSnapshot,readRewards,readBadges} from './lib/persistence.mjs';console.log(JSON.stringify({data:loadSnapshot(),events:readRewards('v'),badges:readBadges('v')}));`);
  const second=run(`import {loadSnapshot,readRewards,readBadges} from './lib/persistence.mjs';console.log(JSON.stringify({data:loadSnapshot(),events:readRewards('v'),badges:readBadges('v')}));`);
  assert.deepEqual(second,first,'repeated startup must be safe');
  assert.deepEqual(first.events,[]);assert.deepEqual(first.badges,[]);
  assert.equal(Object.hasOwn(first.data.requests[0],'rewardQuote'),false);
  db=new DatabaseSync(file);
  for(const table of tables)assert.deepEqual(db.prepare('SELECT * FROM '+table).all(),before[table],table+' must stay unchanged');
  const requestsAfter=db.prepare('SELECT * FROM carecall_requests').all();
  assert.equal(requestsAfter[0].reward_quote_json,null);
  for(const row of requestsAfter)delete row.reward_quote_json;
  assert.deepEqual(requestsAfter,requestsBefore);
  assert(db.prepare("PRAGMA index_list(carecall_reward_events)").all().some(i=>i.name==='carecall_reward_volunteer'));
  const insert=db.prepare("INSERT INTO carecall_reward_events VALUES(?,?,?,?,?,?)");
  insert.run('new','v',5,'LOW',1,'2026-10-08T01:00:00Z');
  assert.throws(()=>insert.run('new','v',5,'LOW',1,'2026-10-08T01:00:00Z'),/UNIQUE/);
  assert.throws(()=>insert.run('invalid','v',20,'LOW',1,'2026-10-08T01:00:00Z'),/CHECK/);
  db.prepare("INSERT INTO carecall_badges VALUES(?,?,?)").run('v','helps:1','2026-10-08T01:00:00Z');
  assert.throws(()=>db.prepare("INSERT INTO carecall_badges VALUES(?,?,?)").run('v','helps:1','2026-10-09T01:00:00Z'),/UNIQUE/);
  assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
 }finally{db?.close();rmSync(dir,{recursive:true,force:true});}
});
test("reward offer, ledger and badge dates survive a process restart",()=>{
 const dir=mkdtempSync(join(tmpdir(),"carecall-rewards-"));
 const env={...process.env,CARECALL_DB_PATH:join(dir,"test.sqlite")};
 const run=code=>{const r=spawnSync(process.execPath,["--input-type=module","-e",code],{env,encoding:"utf8"});assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout);};
 try{
  run(`import {loadSnapshot,writeSnapshot} from './lib/persistence.mjs';loadSnapshot();
  const quote={points:10,urgency:'MEDIUM',version:1};
  const data={users:[{id:'v',role:'volunteer',privacy:{}}],sessions:[],messages:[],requests:[{id:'r',residentId:'resident',volunteerId:'v',lat:22,lng:114,status:'CLOSED',closedReason:'completed',closedAt:'2026-10-08T00:00:00Z',urgency_level:'MEDIUM',category:'OTHER',summary:'Synthetic',dispatch_action:'NEIGHBORHOOD_VOLUNTEER',createdAt:'2026-10-08T00:00:00Z',source:'fallback',rewardQuote:quote}]};
  writeSnapshot(data,{requestId:'r',volunteerId:'v',points:10,urgency:'MEDIUM',ruleVersion:1,earnedAt:'2026-10-08T00:00:00Z'},[{code:'helps:1',unlockedAt:'2026-10-08T00:00:00Z'}]);console.log('true');`);
  const loaded=run(`import {loadSnapshot,readRewards,readBadges} from './lib/persistence.mjs';console.log(JSON.stringify({quote:loadSnapshot().requests[0].rewardQuote,events:readRewards('v'),badges:readBadges('v')}));`);
  assert.equal(loaded.quote.points,10);assert.equal(loaded.events.length,1);assert.equal(loaded.events[0].points,10);assert.equal(loaded.badges[0].unlockedAt,"2026-10-08T00:00:00Z");
 }finally{rmSync(dir,{recursive:true,force:true});}
});
