import {test} from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
const {chromium}=createRequire(import.meta.url)("playwright");
const base=process.env.CARECALL_TEST_URL||"http://127.0.0.1:47297";
assert(["localhost","127.0.0.1"].includes(new URL(base).hostname));
test("volunteer impact is private, responsive and shows real confirmed rewards and badge details",async()=>{
 const browser=await chromium.launch({channel:"msedge",headless:true});const contexts=[],errors=[];
 try{
  const make=async(role,phone)=>{const c=await browser.newContext({viewport:{width:360,height:740}});contexts.push(c);assert.equal((await c.request.post(base+"/api/auth",{data:{mode:"create",role,phone,name:"Impact "+role,password:"test-password-1",privacyAccepted:true}})).status(),200);return c;};
  const resident=await make("resident","68670001"),volunteer=await make("volunteer","68670002");
  const p=await volunteer.newPage();p.on("pageerror",e=>errors.push(e.message));
  await p.goto(base+"/volunteer");await p.locator(".impact-summary").waitFor();await p.locator(".impact-summary").click();
  await p.getByRole("heading",{name:"My Impact",exact:true}).waitFor();await p.locator(".impact-total").waitFor();
  assert.equal(await p.locator(".impact-total").innerText(),"0");assert.equal(await p.locator(".challenge-card").count(),3);
  for(const n of [100,200,300])assert.equal(await p.getByRole("button",{name:`${n} Helping Hands · Not yet earned`,exact:true}).count(),1);
  await p.getByRole("button",{name:"200 Helping Hands · Not yet earned",exact:true}).click();
  await p.getByRole("dialog").getByText("Complete 200 confirmed helps.",{exact:true}).waitFor();await p.keyboard.press("Escape");
  const r=await (await resident.request.post(base+"/api/triage",{multipart:{text:"Please help carry water",lat:"22.3",lng:"114.1"}})).json();
  await volunteer.request.patch(base+"/api/volunteer/shift",{data:{available:true}});
  await volunteer.request.post(base+"/api/volunteer/accept",{data:{id:r.id,lat:22.3,lng:114.1}});
  await resident.request.post(base+"/api/request/close",{data:{id:r.id}});
  await p.reload();await p.getByRole("button",{name:"First Helping Hand · Earned",exact:true}).waitFor();assert.equal(await p.locator(".impact-total").innerText(),"5");
  await p.getByRole("button",{name:"First Helping Hand · Earned",exact:true}).click();await p.getByRole("dialog").waitFor();await p.keyboard.press("Escape");
  for(const locale of ["zh-Hant","zh-Hans","en"]){await p.locator("#language").selectOption(locale);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);}
  await p.emulateMedia({reducedMotion:"reduce"});assert.equal(await p.locator(".award-tile.earned").count(),1);
  assert.equal(await p.getByRole("heading",{name:"Recent contributions",exact:true}).count(),0);
  await p.goto(base+"/volunteer");await p.getByRole("button",{name:"History",exact:true}).click();
  await p.locator(".history-reward").waitFor();assert.equal(await p.locator(".history-reward").innerText(),"+5 CarePoints");
  await p.locator(".history-item").click();await p.getByText("✦ +5 CarePoints earned",{exact:true}).waitFor();
  const rp=await resident.newPage();await rp.goto(base+"/account/impact");await rp.waitForURL(base+"/resident");
  assert.deepEqual(errors,[]);
 }finally{for(const c of contexts)await c.request.delete(base+"/api/account");await browser.close();}
});
