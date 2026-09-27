"use client";
export type Point={lat:number;lng:number};
export type LocationResult={point:Point|null;error:string;choice:"allowed"|"blocked"|"ask"};
export function rememberPoint(id:string,point:Point){try{sessionStorage.setItem("carecall_position_"+id,JSON.stringify({point,time:Date.now()}));}catch{}}
export function cachedPoint(id:string):Point|null{try{const value=JSON.parse(sessionStorage.getItem("carecall_position_"+id)||"null");return value&&Date.now()-value.time<10*60000?value.point:null;}catch{return null;}}
export function requestLocation():Promise<LocationResult>{
 return new Promise(resolve=>{
  // Permission belongs to the browser/device. Never persist a denial as an
  // application-level block: users can change Safari settings at any time.
  let done=false;const finish=(result:LocationResult)=>{if(done)return;done=true;clearTimeout(timer);resolve(result);};
  const timer=setTimeout(()=>finish({point:null,error:"locationUnavailable",choice:"ask"}),12000);
  if(!navigator.geolocation||!window.isSecureContext){finish({point:null,error:"locationUnsupported",choice:"ask"});return;}
  navigator.geolocation.getCurrentPosition(p=>finish({point:{lat:p.coords.latitude,lng:p.coords.longitude},error:"",choice:"allowed"}),e=>finish({point:null,error:e.code===1?"locationDenied":"locationUnavailable",choice:e.code===1?"blocked":"ask"}),{enableHighAccuracy:false,timeout:10000,maximumAge:30000});
 });
}
