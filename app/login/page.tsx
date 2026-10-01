"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {post,useApp} from "@/app/components/providers";
import PrivacyNotice from "@/app/components/privacy-notice";
import {requestLocation,rememberPoint} from "@/lib/location-client";
import type {User,UserRole} from "@/lib/types";
export default function Login(){
 const {t,setUser}=useApp(),router=useRouter();
 const [name,setName]=useState(""),[phone,setPhone]=useState(""),[role,setRole]=useState<UserRole>("resident"),[agreed,setAgreed]=useState(false),[busy,setBusy]=useState(false),[phase,setPhase]=useState("saving"),[error,setError]=useState("");
 return <main className="mobile-app login-workspace"><div className="login-heading"><h1>{t("start")}</h1><p>{t("intro")}</p></div>
 <form className="login-form stage-scroll" onSubmit={async e=>{e.preventDefault();if(busy)return;if(!agreed){setError("privacyRequired");return;}setBusy(true);setError("");
 try{
  setPhase("findingLocation");
  const location=await requestLocation();
  setPhase("saving");
  const b=await post<{user:User}>("/api/auth",{name,phone,role,privacyAccepted:true,allowLocation:location.choice==="allowed"});
  if(location.point)rememberPoint(b.user.id,location.point);setUser(b.user);router.push("/"+b.user.role);
 }catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>
 <label className="field">{t("name")}<input required autoComplete="name" minLength={2} maxLength={80} value={name} onChange={e=>setName(e.target.value)}/></label>
 <label className="field">{t("phone")}<input required type="tel" autoComplete="tel" placeholder="0000 0000" maxLength={24} value={phone} onChange={e=>setPhone(e.target.value)}/></label>
 <div className="grid grid-cols-2 gap-3">{(["resident","volunteer"] as const).map(r=><button type="button" key={r} aria-pressed={role===r} onClick={()=>setRole(r)} className={role===r?"button":"button secondary"}>{t(r)}</button>)}</div>
 <div className="consent-row"><input id="privacy-consent" type="checkbox" required checked={agreed} onChange={e=>setAgreed(e.target.checked)}/><div><label htmlFor="privacy-consent">{t("agreePrivacy")} </label><PrivacyNotice/></div></div>
 <p className="text-sm text-muted">{t("signupLocation")}</p>
 {error&&<p className="error" role="alert">{t(error)}</p>}
 <button className="button w-full" disabled={busy}>{t(busy?phase:"continue")}</button>
 </form></main>;
}
