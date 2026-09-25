"use client";
import {useRef} from "react";
import {useApp} from "./providers";
export default function PrivacyNotice(){
 const {t}=useApp(),dialog=useRef<HTMLDialogElement>(null);
 return <><a href="#privacy-notice" className="underline font-semibold" onClick={e=>{e.preventDefault();dialog.current?.showModal();}}>{t("privacyNotice")}</a>
 <dialog ref={dialog} className="privacy-dialog" aria-label={t("privacyNotice")}><div className="drawer-heading"><h2>{t("privacyNotice")}</h2><button type="button" className="drawer-close" onClick={()=>dialog.current?.close()} aria-label={t("closeMenu")}>×</button></div>
 {["noticeData","noticeLocation","noticeSharing","noticeRetention","noticeCalls","noticeSecurity"].map(key=><p key={key}>{t(key)}</p>)}
 <button type="button" className="button w-full" onClick={()=>dialog.current?.close()}>{t("back")}</button></dialog></>;
}