import {currentUser,fail,json,sameOrigin} from "@/lib/server";
import {persist} from "@/lib/db";
export async function PATCH(request:Request){
 if(!sameOrigin(request))return fail("forbidden",403);
 const user=await currentUser();if(!user)return fail("sessionExpired",401);
 const body=await request.json().catch(()=>null);
 if(typeof body?.allowed!=="boolean")return fail("invalidInput");
 user.privacy.allowLocation=body.allowed;persist();return json({user});
}
