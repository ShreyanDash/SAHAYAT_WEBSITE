import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { createInterestRegistration, updateInterestEmailStatus } from "./db";
import { sendRegistrationEmails } from "./email";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

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
        await updateInterestEmailStatus(input.email, {
          ...(delivery.confirmationSent ? { confirmationSentAt: now } : {}),
          ...(delivery.adminNotified && registration.isNew ? { adminNotifiedAt: now } : {}),
          lastEmailError: delivery.errors.length > 0 ? `Delivery issue: ${delivery.errors.join(", ")}` : null,
        });

        if (!delivery.confirmationSent) {
          return {
            ok: true,
            saved: true,
            alreadyRegistered: !registration.isNew,
            confirmationSent: false,
            message: "Your interest is saved. We will send the confirmation email shortly.",
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
