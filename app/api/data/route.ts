import { verifyToken } from "../../auth";
export async function GET(request:Request){
  const username=await verifyToken(request.headers.get("authorization")?.replace(/^Bearer\s+/i,"")||null);
  if(!username)return Response.json({error:"请重新登录"},{status:401});
  const api=process.env.CLOUDBASE_API_URL||"https://questionnaire-study-d4bl162e032e-1458603416.ap-shanghai.app.tcloudbase.com/api";
  const password=process.env.CLOUDBASE_ADMIN_PASSWORD||"eorT5Oe23xhNZCRTKFr_z_Ny8h58anCp";
  const base=api.replace(/\/$/,"");
  const login=await fetch(`${base}/admin/login`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({password}),cache:"no-store"});
  if(!login.ok)return Response.json({error:"无法连接问卷数据库"},{status:502});
  const {token}=await login.json() as {token:string};
  const data=await fetch(`${base}/admin/data`,{headers:{authorization:`Bearer ${token}`},cache:"no-store"});
  if(!data.ok)return Response.json({error:"无法读取问卷数据"},{status:502});
  return new Response(await data.text(),{headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
}
