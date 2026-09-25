import type {HelpRequest} from "./types";
export const HISTORY_DAYS=7;
export function historyVisible(r: HelpRequest, now=Date.now()){
 return r.status!=="CLOSED" || (!!r.closedAt && now<Date.parse(r.closedAt)+HISTORY_DAYS*86400000);
}
