import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export async function getClientAdminCompanyId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as any)?.companyId;
  return companyId || null;
}

export async function requireClientAdminCompanyId(): Promise<string> {
  const companyId = await getClientAdminCompanyId();
  if (!companyId) {
    throw new Error("Unauthorized");
  }
  return companyId;
}
