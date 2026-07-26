import { validUser } from "../../auth";
export async function POST(request: Request) {
  const { username = "", password = "" } = await request.json().catch(() => ({}));
  if (!await validUser(String(username), String(password))) {
    return Response.json({ error: "用户名或密码错误" }, { status: 401 });
  }
  return Response.json({ token: crypto.randomUUID(), username });
}
