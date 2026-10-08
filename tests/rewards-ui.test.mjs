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
  const centeredDialog=async()=>{
   const dialog=p.getByRole("dialog");await dialog.waitFor();
   const box=await dialog.evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,vw:document.documentElement.clientWidth,vh:innerHeight,sw:el.scrollWidth,cw:el.clientWidth};});
   assert(Math.abs(box.x+box.w/2-box.vw/2)<=1,JSON.stringify(box));
   assert(Math.abs(box.y+box.h/2-box.vh/2)<=1,JSON.stringify(box));
   assert(box.x>=15&&box.y>=15&&box.x+box.w<=box.vw-15&&box.y+box.h<=box.vh-15,JSON.stringify(box));
   assert(box.sw<=box.cw+1,'dialog must not overflow horizontally');
  };
  for(const size of [{width:320,height:568},{width:360,height:740},{width:390,height:844},{width:430,height:932},{width:844,height:390},{width:1280,height:800}]){
   await p.setViewportSize(size);
   for(const locale of ["en","zh-Hant","zh-Hans"]){
    await p.locator("#language").selectOption(locale);
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
    await p.locator('.award-tile[aria-label^="200 "]').click();await centeredDialog();
    // On short landscape screens the action must remain reachable by scrolling inside the dialog.
    await p.getByRole("dialog").locator(".button").click();await p.getByRole("dialog").waitFor({state:"hidden"});
    await p.locator(".challenge-card").first().click();await centeredDialog();await p.keyboard.press("Escape");
   }
  }
  await p.setViewportSize({width:360,height:740});await p.locator("#language").selectOption("en");
  const r=await (await resident.request.post(base+"/api/triage",{multipart:{text:"Please help carry water",lat:"22.3",lng:"114.1"}})).json();
  await volunteer.request.patch(base+"/api/volunteer/shift",{data:{available:true}});
  await volunteer.request.post(base+"/api/volunteer/accept",{data:{id:r.id,lat:22.3,lng:114.1}});
  await resident.request.post(base+"/api/request/close",{data:{id:r.id}});
  await p.reload();await p.getByRole("button",{name:"First Helping Hand · Earned",exact:true}).waitFor();assert.equal(await p.locator(".impact-total").innerText(),"5");
  await p.getByRole("button",{name:"First Helping Hand · Earned",exact:true}).click();await centeredDialog();await p.keyboard.press("Escape");
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
