import { Member, Organization } from "@/generated/prisma";
import "fastify";

declare module "fastify" {
  export interface FastifyRequest {
    getCurrentUserId: () => Promise<string>;
    getUserMembership: (organizationSlug: string) => Promise<{
      organization: Organization;
      membership: Member;
    }>;
  }
}
