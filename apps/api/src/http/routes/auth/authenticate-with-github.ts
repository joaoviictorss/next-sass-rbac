import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { email } from "zod/v4";
import { BadRequestError } from "../_errors/bad-request-error copy";
import { prisma } from "@/lib/prisma";
import { env } from "@saas/env";

export async function authenticateWithGithub(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    "/sessions/github",
    {
      schema: {
        tags: ["Auth"],
        summary: "Authenticate with github",
        body: z.object({
          code: z.string(),
        }),
        response: {
          201: z.object({
            token: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { code } = request.body;

      const githubOauthUrl = new URL(
        "https://github.com/login/oauth/access_token",
      );

      githubOauthUrl.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
      githubOauthUrl.searchParams.set(
        "client_secret",
        env.GITHUB_CLIENT_SECRET,
      );
      githubOauthUrl.searchParams.set(
        "redirect_uri",
        env.BASE_URL + "/api/auth/github/callback",
      );
      githubOauthUrl.searchParams.set("code", code);
      githubOauthUrl.searchParams.set("scope", "user:email");

      const githubAccesTokenResponse = await fetch(githubOauthUrl, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      const githubAccesTokenResponseJson =
        await githubAccesTokenResponse.json();

      const { access_token: githubAccessToken } = z
        .object({
          access_token: z.string(),
          token_type: z.literal("bearer"),
          scope: z.string(),
        })
        .parse(githubAccesTokenResponseJson);

      const githubUserResponse = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${githubAccessToken}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      const githubUserData = await githubUserResponse.json();

      const {
        avatar_url: avatarUrl,
        email,
        id: githubUserId,
        name,
      } = z
        .object({
          id: z.number().int().transform(String),
          avatar_url: z.string(),
          email: z.string().nullable(),
          name: z.string().nullable(),
        })
        .parse(githubUserData);

      if (email === null) {
        throw new BadRequestError(
          "Your github account does not have an email to authenticate.",
        );
      }

      let user = await prisma.user.findUnique({
        where: {
          email: email,
        },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            name,
            avatarUrl,
          },
        });
      }

      let account = await prisma.account.findUnique({
        where: {
          provider_userId: {
            provider: "GITHUB",
            userId: user.id,
          },
        },
      });

      if (!account) {
        account = await prisma.account.create({
          data: {
            provider: "GITHUB",
            providerAccountId: githubUserId,
            userId: user.id,
          },
        });
      }

      const token = await reply.jwtSign(
        {
          sub: user.id,
        },
        {
          sign: {
            expiresIn: "2d",
          },
        },
      );

      return reply.status(200).send({ token });
    },
  );
}
