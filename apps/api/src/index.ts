import {
  defineAbilityFor,
  projectSchema,
  userSchema,
  organizationSchema,
} from "@saas/auth";

const ability = defineAbilityFor({
  role: "MEMBER",
  id: "user-id-2",
});

const project = projectSchema.parse({
  id: "project-id-1",
  ownerId: "user-id-1",
});

const userCanInvite = ability.can("delete", project);
console.log(userCanInvite);

