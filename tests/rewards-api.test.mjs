import {test} from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
const base=process.env.CARECALL_TEST_URL||"http://127.0.0.1:47297";
assert(["localhost","127.0.0.1"].includes(new URL(base).hostname));
test("confirmed rewards are private, atomic, idempotent and survive archive clearing",async()=>{
 const clients=[];
 async function client(role,phone){const r=await fetch(base+"/api/auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode:"create",name:"Rewards "+role,phone,role,privacyAccepted:true,password:"test-password-1"})});assert.equal(r.status,200);const {user}=await r.json();const cookie=r.headers.get("set-cookie").split(";")[0];const c={user,call:async(path,body,method=body===undefined?"GET":"POST")=>{const res=await fetch(base+path,{method,headers:{Cookie:cookie,Origin:base,...(body instanceof FormData?{}:{"Content-Type":"application/json"})},body:body===undefined?undefined:body instanceof FormData?body:JSON.stringify(body)});return {status:res.status,body:await res.json().catch(()=>null)};}};clients.push(c);return c;}
 let db;
 try{
  const r=await client("resident","68760001"),v=await client("volunteer","68760002"),other=await client("volunteer","68760003");
  assert.equal((await fetch(base+"/api/volunteer/rewards")).status,401);
  assert.equal((await r.call("/api/volunteer/rewards")).status,403);
  const form=()=>{const f=new FormData();f.set("text","Please help carry groceries.");f.set("lat","22.3");f.set("lng","114.1");return f;};
  let made=await r.call("/api/triage",form());assert.equal(made.status,201);
  await r.call("/api/request/close",{id:made.body.id});
  assert.equal((await v.call("/api/volunteer/rewards")).body.points,0);
  made=await r.call("/api/triage",form());const id=made.body.id;
  await v.call("/api/volunteer/shift",{available:true},"PATCH");
  const accepted=await v.call("/api/volunteer/accept",{id,lat:22.3,lng:114.1});assert.equal(accepted.status,200);assert.equal(accepted.body.rewardQuote.points,5);
  assert.equal((await v.call("/api/request/close",{id})).status,403);
  assert.equal((await other.call("/api/volunteer/rewards?userId="+v.user.id)).body.points,0);
  // Fault injection is restricted to an explicitly isolated test database.
  if(process.env.CARECALL_DB_PATH?.includes("local-artifacts")){
   db=new DatabaseSync(process.env.CARECALL_DB_PATH);
   db.exec("CREATE TRIGGER review_fail_reward BEFORE INSERT ON carecall_reward_events BEGIN SELECT RAISE(ABORT,'test rollback'); END;");
   const failed=await r.call("/api/request/close",{id});assert.equal(failed.status,500);
   assert.equal((await r.call("/api/request/status?id="+id)).body.status,"ACCEPTED");
   assert.equal((await v.call("/api/volunteer/rewards")).body.points,0);
   db.exec("DROP TRIGGER review_fail_reward");
  }
  const closed=await Promise.all([r.call("/api/request/close",{id,points:99999}),r.call("/api/request/close",{id})]);assert.deepEqual(closed.map(x=>x.status),[200,200]);
  let rewards=(await v.call("/api/volunteer/rewards")).body;assert.equal(rewards.points,5);assert.equal(rewards.helps,1);assert(rewards.badges.find(b=>b.code==="helps:1").earnedAt);
  assert.equal((await v.call("/api/request/status?id="+id)).body.rewardEarnedPoints,5);
  await v.call("/api/account/archive",undefined,"DELETE");
  rewards=(await v.call("/api/volunteer/rewards")).body;assert.equal(rewards.points,5);assert.equal(rewards.helps,1);
  await r.call("/api/account",undefined,"DELETE");assert.equal((await v.call("/api/volunteer/rewards")).body.points,5);
  await v.call("/api/account",undefined,"DELETE");
  if(db){assert.equal(db.prepare("SELECT COUNT(*) AS n FROM carecall_reward_events WHERE volunteer_id=?").get(v.user.id).n,0);assert.equal(db.prepare("SELECT COUNT(*) AS n FROM carecall_badges WHERE volunteer_id=?").get(v.user.id).n,0);}
 }finally{if(db){db.exec("DROP TRIGGER IF EXISTS review_fail_reward");db.close();}for(const c of clients)await c.call("/api/account",undefined,"DELETE");}
});
