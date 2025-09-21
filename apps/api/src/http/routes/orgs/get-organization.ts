import { auth } from "@/http/middlewares/auth";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

export async function getOrganization(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .get(
      "/organizations/:organizationSlug",
      {
        schema: {
          tags: ["Organizations"],
          summary: "Get details of an organization",
          security: [{ bearerAuth: [] }],
          params: z.object({
            organizationSlug: z.string(),
          }),
          response: {
            200: z.object({
              organization: z.object({
                id: z.string().uuid(),
                slug: z.string(),
                name: z.string(),
                domain: z.string().nullable(),
                avatarUrl: z.string().nullable(),
                shouldAttachUsersByDomain: z.boolean().optional(),
                ownerId: z.string().uuid(),
                createdAt: z.date(),
                updatedAt: z.date(),
              }),
            }),
          },
        },
      },
      async (request, reply) => {
        const { organizationSlug } = request.params;

        const { organization } =
          await request.getUserMembership(organizationSlug);

        return reply.status(200).send({
          organization,
        });
      },
    );
}
