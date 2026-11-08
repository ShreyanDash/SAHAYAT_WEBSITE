import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { createInterestRegistration, updateInterestEmailStatus } from "./db";
import { sendRegistrationEmails } from "./email";

export const appRouter = router({
  system: systemRouter,

  registration: router({
    submit: publicProcedure
      .input(z.object({ email: z.string().trim().toLowerCase().email().max(320), consent: z.literal(true) }))
      .mutation(async ({ input }) => {
        let registration: Awaited<ReturnType<typeof createInterestRegistration>>;
        try {
          registration = await createInterestRegistration(input.email);
        } catch (error) {
          console.error("[Registration] Could not save registration:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "We could not save your registration right now. Please try again." });
        }

        let delivery: Awaited<ReturnType<typeof sendRegistrationEmails>>;
        try {
          delivery = await sendRegistrationEmails(input.email, registration.isNew);
        } catch (error) {
          console.error("[Registration] Email service unavailable:", error);
          delivery = { confirmationSent: false, adminNotified: false, errors: ["service"] };
        }
        const now = new Date();
        try {
          await updateInterestEmailStatus(input.email, {
            ...(delivery.confirmationSent ? { confirmationSentAt: now } : {}),
            ...(delivery.adminNotified && registration.isNew ? { adminNotifiedAt: now } : {}),
            lastEmailError: delivery.errors.length > 0 ? `Delivery issue: ${delivery.errors.join(", ")}` : null,
          });
        } catch (error) {
          // Status tracking is best-effort. The registration is already persisted in PostgreSQL;
          // do not fail the visitor's registration if status update logging encounters an error.
          console.error("[Registration] Could not update delivery status:", error);
        }

        if (!delivery.confirmationSent) {
          return {
            ok: true,
            saved: true,
            alreadyRegistered: !registration.isNew,
            confirmationSent: false,
            message: "Your interest has been saved, but we couldn't send the confirmation email right now. Please try again later if you need another confirmation.",
          } as const;
        }

        return {
          ok: true,
          saved: true,
          alreadyRegistered: !registration.isNew,
          confirmationSent: true,
          message: registration.isNew ? "You are on the list. Check your inbox for the SAHAYAT confirmation." : "You are already on the list. We sent the confirmation again.",
        } as const;
      }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
