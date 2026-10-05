import { handle } from "@/server/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ path: string[] }> };
async function dispatch(request: Request, context: Context) {
  return handle(request, (await context.params).path);
}
export { dispatch as GET, dispatch as POST, dispatch as PATCH };
