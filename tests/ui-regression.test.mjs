
import {test} from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import sharp from "sharp";
const require=createRequire(import.meta.url);
const {chromium}=require("playwright");
const base=process.env.CARECALL_TEST_URL||"http://127.0.0.1:47294";
assert(["localhost","127.0.0.1"].includes(new URL(base).hostname),"UI tests must stay local");
test("request usability: denied GPS, manual map, clickable photos, recording, account drawer and phone targets",async()=>{
 const browser=await chromium.launch({channel:"msedge",headless:true,args:["--use-fake-device-for-media-stream","--use-fake-ui-for-media-stream"]});
 const contexts=[],errors=[];
 async function context(mode="denied"){
  const c=await browser.newContext({viewport:{width:390,height:844},permissions:["microphone"]});contexts.push(c);
  await c.addInitScript(mode=>{
   window.geoCalls=0;
   Object.defineProperty(navigator.geolocation,"getCurrentPosition",{value:(ok,fail)=>{window.geoCalls++;if(mode==="pending")return;setTimeout(()=>mode==="success"?ok({coords:{latitude:22.3193,longitude:114.1694}}):fail({code:mode==="denied"?1:2}),0);}});
  },mode);
  const p=await c.newPage();p.on("pageerror",e=>errors.push(e.message));return {c,p};
 }
 async function create(c,role){await c.request.post(base+"/api/auth",{data:{name:"UI "+role,phone:"61234567",role,allowCalls:true,privacyAccepted:true}});}
 async function fit(p){const s=await p.evaluate(()=>({w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight}));assert(s.sw<=s.w+1,JSON.stringify(s));assert(s.sh<=s.h+1,JSON.stringify(s));}
 try {
  const {p}=await context();
  await p.goto(base+"/login");await p.getByRole("button",{name:"Log in",exact:true}).waitFor();await p.getByRole("button",{name:"First time here? Create account",exact:true}).click();
  assert.equal(await p.locator('input[type=tel]').getAttribute("placeholder"),"0000 0000");
  assert(!/local demo/i.test(await p.locator("main").innerText()));
  await fit(p);
  if(process.env.CARECALL_SCREENSHOT_DIR)await p.screenshot({path:process.env.CARECALL_SCREENSHOT_DIR+"/carecall-login-corrected.png"});
  await p.getByRole("textbox",{name:"Your name",exact:true}).fill("Test Resident");
  await p.getByRole("textbox",{name:"Phone number",exact:true}).fill("61234567");
  await p.locator("#privacy-consent").check();await p.getByRole("button",{name:"Create account",exact:true}).click();
  await p.getByRole("button",{name:"Send request",exact:true}).waitFor();
  assert.equal(await p.evaluate(()=>window.geoCalls),1);
  assert.equal(await p.evaluate(()=>getComputedStyle(document.body).backgroundColor),"rgb(243, 239, 228)");
  await p.locator(".leaflet-container:visible").waitFor();
  const text=p.getByRole("textbox",{name:"Description / editable transcript",exact:true});
  await text.fill("Please bring water to my building.");
  assert.equal(await p.getByRole("button",{name:"Send request",exact:true}).isEnabled(),true);
  await p.getByRole("button",{name:"Send request",exact:true}).click();
  await p.getByText("Your draft is kept. Choose a location on the map, then send again.",{exact:true}).waitFor();
  assert.equal(await text.inputValue(),"Please bring water to my building.");
  await p.getByText("Location access is blocked.",{exact:false}).waitFor();
  assert.equal(await p.evaluate(()=>window.geoCalls),2); // Send retries current permission instead of trusting an old denial.
  // A deliberate map click is a real fallback; no default coordinates are silently submitted.
  await p.locator(".leaflet-container:visible").click({position:{x:160,y:70}});
  await p.getByText("Location ready",{exact:true}).waitFor();
  const [fileChooser]=await Promise.all([p.waitForEvent("filechooser"),p.locator(".attachment-plus").click()]);
  const photo=await sharp({create:{width:500,height:350,channels:3,background:"#bcab88"}}).png().toBuffer();
  await fileChooser.setFiles({name:"supplies.png",mimeType:"image/png",buffer:photo});
  await p.getByAltText("Photo preview",{exact:true}).waitFor();
  // Voice recording uses only one tap-to-start/stop control and no language selector.
  assert.equal(await p.locator('main select').count(),0);
  await p.getByRole("button",{name:"Tap to speak",exact:true}).click();
  await p.getByRole("button",{name:"Tap to stop",exact:true}).waitFor();
  await p.waitForTimeout(300);
  await p.getByRole("button",{name:"Tap to stop",exact:true}).click();
  await p.locator("audio").waitFor();
  await p.getByRole("button",{name:"Remove recording",exact:true}).click();
  // Switching to the map must not discard the typed draft.
  await p.getByRole("button",{name:"History",exact:true}).click();
  await p.getByRole("button",{name:"New request",exact:true}).click();
  assert.equal(await text.inputValue(),"Please bring water to my building.");
  await p.getByRole("button",{name:"Account centre",exact:true}).click();
  const drawer=p.getByRole("dialog",{name:"Account centre",exact:true});await drawer.waitFor();
  const links=await drawer.getByRole("link").all();assert.equal(links.length,3);
  const positions=await Promise.all(links.map(x=>x.boundingBox()));assert(positions[0].y<positions[1].y&&positions[1].y<positions[2].y);
  if(process.env.CARECALL_SCREENSHOT_DIR)await p.screenshot({path:process.env.CARECALL_SCREENSHOT_DIR+"/carecall-sidebar-corrected.png"});
  await p.keyboard.press("Escape");
  await p.getByRole("button",{name:"Send request",exact:true}).click();
  await p.getByRole("heading",{name:"Request sent successfully",exact:true}).waitFor();
  const {c:vc,p:v}=await context("success");await create(vc,"volunteer");await v.goto(base+"/volunteer");
  await v.getByRole("switch").click();
  await v.getByRole("button",{name:"Use my location",exact:true}).click();
  await v.getByRole("button",{name:"Accept request",exact:true}).click();
  await p.getByRole("button",{name:"View request progress",exact:true}).waitFor();
  // Call targets are inspected only. Do not click tel links in tests.
  await p.getByRole("button",{name:"Account centre",exact:true}).click();await p.getByRole("link",{name:"Privacy settings",exact:true}).click();
  await p.getByRole("checkbox",{name:"Allow my matched partner to call me",exact:true}).check();await p.getByRole("button",{name:"Save changes",exact:true}).click();
  assert.equal(await v.getByRole("switch").isDisabled(),true);await v.getByRole("button",{name:"Call resident",exact:true}).click();await v.getByRole("link",{name:"Open phone app",exact:true}).waitFor();const phone=await v.getByRole("link",{name:"Open phone app",exact:true}).getAttribute("href");
  assert(phone.startsWith("tel:+"));assert.notEqual(phone,"tel:999");await v.keyboard.press("Escape");
  for(const page of [p,v])assert.equal(await page.locator('footer a').getAttribute("href"),"tel:999");
  await p.getByRole("link",{name:"Back",exact:true}).click();
  p.once("dialog",d=>d.accept());await p.getByRole("button",{name:"✓ Confirm help completed",exact:true}).click();
  await v.getByText("The resident confirmed completion. Thank you for helping.",{exact:true}).waitFor();
  assert.equal(await v.getByRole("switch").isEnabled(),true);await v.getByText("Request finished · Conversation is read-only for 7 days.",{exact:true}).waitFor();
  for(const mode of ["unavailable","pending"]){
   const {c:fc,p:f}=await context(mode);await create(fc,"resident");await f.goto(base+"/resident");
   await f.getByRole("textbox",{name:"Description / editable transcript",exact:true}).fill("Check location fallback");
   await f.getByRole("button",{name:"Send request",exact:true}).click();
   if(mode==="unavailable")await f.getByText("Your device could not locate you.",{exact:false}).waitFor();
   await f.locator(".leaflet-container:visible").click({position:{x:160,y:70}});
   if(mode==="unavailable")await f.getByRole("button",{name:"Send request",exact:true}).click();
   await f.getByRole("heading",{name:"Request sent successfully",exact:true}).waitFor();
  }
  const {c:mc,p:m}=await context("success");await create(mc,"resident");await m.goto(base+"/resident");
  await m.getByRole("button",{name:"Use my location",exact:true}).click();await m.getByText("Location ready",{exact:true}).waitFor();assert.equal(await m.evaluate(()=>window.geoCalls),1);
  for(const language of ["en","zh-Hant","zh-Hans"]){await m.locator("#language").selectOption(language);await fit(m);}
  await m.setViewportSize({width:360,height:740});await fit(m);
  if(process.env.CARECALL_SCREENSHOT_DIR)await m.screenshot({path:process.env.CARECALL_SCREENSHOT_DIR+"/carecall-request-corrected.png"});
  assert.deepEqual(errors,[]);
 }finally{for(const c of contexts)await c.request.delete(base+"/api/account");await browser.close();}
});

