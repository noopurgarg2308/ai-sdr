import "next-auth";

declare module "next-auth" {
  interface User {
    companyId?: string;
    companySlug?: string;
  }

  interface Session {
    user: User & {
      companyId?: string;
      companySlug?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    companyId?: string;
    companySlug?: string;
  }
}
