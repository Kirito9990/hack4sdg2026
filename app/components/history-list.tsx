"use client";
import {useApp} from "./providers";
import type {RequestView} from "@/lib/types";
export default function HistoryList({requests,onOpen}:{requests:RequestView[];onOpen:(id:string)=>void}){
 const {t,locale}=useApp();
 return <div className="stage-scroll history-list"><p className="text-sm text-muted">{t("historySevenDays")}</p>{requests.length?requests.map(r=><button className="history-item" key={r.id} onClick={()=>onOpen(r.id)}><span><strong>{t(r.category)}</strong><span className="block text-sm">{new Date(r.closedAt||r.createdAt).toLocaleDateString(locale)} · {t(r.closedReason==="completed"?"completedTitle":"closed")}</span></span><span aria-hidden>›</span></button>):<div className="empty-state">{t("noHistory")}</div>}</div>;
}