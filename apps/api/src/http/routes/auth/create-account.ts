import { hash } from "bcryptjs";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { BadRequestError } from "../_errors/bad-request-error copy";

export async function createAccount(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    "/users",
    {
      schema: {
        tags: ["Auth"],
        summary: "Create a new account",
        body: z.object({
          name: z.string(),
          email: z.string().email(),
          password: z.string().min(6),
        }),
        response: {
          201: z.object({
            message: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { name, email, password } = request.body;

      const userWithSameEmail = await prisma.user.findUnique({
        where: {
          email,
        },
      });

      const [_, doamin] = email.split("@");

      const autoJoinOrganization = await prisma.organization.findFirst({
        where: {
          domain: doamin,
          shouldAttachUsersByDomain: true,
        },
      });

      if (userWithSameEmail) {
        throw new BadRequestError("User with same e-mail already exists.");
      }

      const passwordHash = await hash(password, 6);

      await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          member_on: autoJoinOrganization
            ? {
                create: {
                  organizationId: autoJoinOrganization.id,
                },
              }
            : undefined,
        },
      });

      return reply.status(201).send({
        message: "Account created successfully.",
      });
    },
  );
}
