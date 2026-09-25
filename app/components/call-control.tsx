"use client";
import {useRef,useState} from "react";
import Link from "next/link";
import {api,useApp} from "./providers";
import {PhoneIcon} from "./shell";
import type {RequestView} from "@/lib/types";
export default function CallControl({request}:{request:RequestView}){
 const {t,user}=useApp(),dialog=useRef<HTMLDialogElement>(null);
 const [contact,setContact]=useState<RequestView|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false),[copied,setCopied]=useState(false);
 return <><button type="button" className="phone-action" disabled={request.status!=="ACCEPTED"||busy} aria-label={t(user?.role==="resident"?"callVolunteer":"callResident")} onClick={async()=>{dialog.current?.showModal();setBusy(true);setContact(null);setError("");setCopied(false);try{setContact(await api<RequestView>("/api/request/status?id="+request.id));}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}><PhoneIcon/>{t("call")}</button>
 <dialog ref={dialog} className="privacy-dialog call-dialog" aria-label={t("call")}><div className="drawer-heading"><h2>{t("call")}</h2><button type="button" className="drawer-close" aria-label={t("closeMenu")} onClick={()=>dialog.current?.close()}>×</button></div>
 {busy?<p>{t("loading")}</p>:contact?.status==="ACCEPTED"&&contact.callPhone?<><p className="call-number">{contact.callPhone}</p>{contact.testCall&&<p>{t("testCall")}</p>}<p>{t("callDeviceHint")}</p><a className="button w-full" href={"tel:"+contact.callPhone}>{t("openDialer")}</a><button className="button secondary w-full mt-3" onClick={async()=>{try{await navigator.clipboard.writeText(contact.callPhone!);setCopied(true);}catch{setError("copyManually");}}}>{t(copied?"copied":"copyNumber")}</button></>:<><p>{t(error||"callsDisabled")}</p><p>{t("callPermissionHint")}</p><Link href="/account/privacy" className="underline" onClick={()=>dialog.current?.close()}>{t("privacy")}</Link></>}
 {error&&contact?.callPhone&&<p role="alert">{t(error)}</p>}
 </dialog></>;
}