import { auth } from "@/http/middlewares/auth";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { Role } from "@/generated/prisma";

export async function getMembership(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .get(
      "/organizations/:organizationSlug/membership",
      {
        schema: {
          tags: ["Organizations"],
          summary: "Get membership of the current user",
          security: [{ bearerAuth: [] }],
          params: z.object({
            organizationSlug: z.string(),
          }),
          response: {
            200: z.object({
              membership: z.object({
                id: z.string().uuid(),
                role: z.nativeEnum(Role),
                orgazationId: z.string().uuid(),
              }),
            }),
          },
        },
      },
      async (request, reply) => {
        const { organizationSlug } = request.params;
        const { membership } =
          await request.getUserMembership(organizationSlug);

        return reply.status(200).send({
          membership: {
            id: membership.id,
            role: membership.role,
            orgazationId: membership.organizationId,
          },
        });
      },
    );
}
