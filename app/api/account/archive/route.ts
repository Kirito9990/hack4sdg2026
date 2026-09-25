import {currentUser,fail,json,sameOrigin} from "@/lib/server";
import {store,member,persist} from "@/lib/db";
export async function DELETE(request:Request){
 if(!sameOrigin(request))return fail("forbidden",403);
 const user=await currentUser();if(!user)return fail("sessionExpired",401);
 const data=store(),ids=new Set(data.requests.filter(r=>r.status==="CLOSED"&&member(r,user)).map(r=>r.id));
 data.requests=data.requests.filter(r=>!ids.has(r.id));data.messages=data.messages.filter(m=>!ids.has(m.requestId));persist();return json({ok:true});
}
