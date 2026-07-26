const encoder = new TextEncoder();
const toBase64 = (value: Uint8Array | string) => {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  let binary = ""; bytes.forEach(byte => binary += String.fromCharCode(byte));
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
};
const fromBase64 = (value: string) => Uint8Array.from(atob(value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4-value.length%4)%4)), c=>c.charCodeAt(0));
const USERS:Record<string,string>={youmingyi:"youmingyi",liuzhiyu:"liuzhiyu",BuchholzPaul:"BuchholzPaul"};
const SESSION_SECRET=process.env.SESSION_SECRET||"0fc84b747cefee4b83a47a9fe39adada1bd0e30bea50d79516c9bcfbc4b2443b";
async function sign(value:string){const key=await crypto.subtle.importKey("raw",encoder.encode(SESSION_SECRET),{name:"HMAC",hash:"SHA-256"},false,["sign"]);return new Uint8Array(await crypto.subtle.sign("HMAC",key,encoder.encode(value)))}
export async function createToken(username:string){const payload=toBase64(JSON.stringify({username,exp:Math.floor(Date.now()/1000)+28800}));return `${payload}.${toBase64(await sign(payload))}`}
export async function verifyToken(token:string|null){if(!token)return null;const [payload,signed]=token.split(".");if(!payload||!signed)return null;const expected=await sign(payload),received=fromBase64(signed);if(expected.length!==received.length)return null;let mismatch=0;expected.forEach((byte,i)=>mismatch|=byte^received[i]);if(mismatch)return null;try{const value=JSON.parse(new TextDecoder().decode(fromBase64(payload)));return value.exp>Math.floor(Date.now()/1000)?String(value.username):null}catch{return null}}
export function validUser(username:string,password:string){return Object.prototype.hasOwnProperty.call(USERS,username)&&USERS[username]===password}
