import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { BadRequestError } from "../_errors/bad-request-error copy";
import { hash } from "bcryptjs";

export async function resetPassword(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    "/password/reset",
    {
      schema: {
        tags: ["Auth"],
        summary: "Reset password",
        body: z.object({
          code: z.string(),
          password: z.string().min(6),
        }),
        response: {
          204: z.null(),
        },
      },
    },
    async (request, reply) => {
      const { code, password } = request.body;

      const token = await prisma.token.findUnique({
        where: {
          id: code,
        },
      });

      if (!token) {
        throw new BadRequestError("Invalid code.");
      }

      if (token.type !== "RESET_PASSWORD") {
        throw new BadRequestError("Invalid code.");
      }

      const passwordHash = await hash(password, 6);

      await prisma.user.update({
        where: {
          id: token.userId,
        },
        data: {
          passwordHash,
        },
      });

      return reply.status(204).send();
    },
  );
}
