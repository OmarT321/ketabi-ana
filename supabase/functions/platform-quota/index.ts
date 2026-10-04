// Custom server-to-server authentication; no browser key is accepted.
Deno.serve(async (request: Request) => {
  const respond=(body:unknown,status:number)=>Response.json(body,{status,headers:{"Cache-Control":"no-store"}});
  if(request.method!=="POST")return respond({error:"method"},405);
  const secret=request.headers.get("x-internal-key");
  if(!secret||secret.length<40||secret.length>200)return respond({error:"unauthorized"},401);
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(secret)))).map(n=>n.toString(16).padStart(2,"0")).join("");
  const base=Deno.env.get("SUPABASE_URL")!,key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const headers={apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json"};
  try{
    const authenticated=await fetch(`${base}/rest/v1/runtime_keys?key_hash=eq.${hash}&select=label`,{headers,signal:AbortSignal.timeout(4000)});
    if(!authenticated.ok)return respond({error:"unavailable"},503);
    const keys=await authenticated.json();if(!Array.isArray(keys)||keys.length!==1)return respond({error:"unauthorized"},401);
    const raw=await request.text();if(raw.length>500)return respond({error:"oversize"},413);
    const {clientHash}=JSON.parse(raw);
    if(typeof clientHash!=="string"||!/^[a-f0-9]{64}$/.test(clientHash))return respond({error:"invalid"},400);
    const result=await fetch(`${base}/rest/v1/rpc/consume_request`,{method:"POST",headers,body:JSON.stringify({p_client_hash:clientHash}),signal:AbortSignal.timeout(4000)});
    if(!result.ok)return respond({error:"unavailable"},503);
    return (await result.json())===true ? respond({allowed:true},200):respond({allowed:false},429);
  }catch{return respond({error:"invalid_or_unavailable"},503);}
});
