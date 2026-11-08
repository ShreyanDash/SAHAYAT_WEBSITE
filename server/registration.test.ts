import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";
import * as emailModule from "./email";

afterEach(() => {
  vi.restoreAllMocks();
  db.setDbForTesting(null);
  emailModule.setTransporterForTesting(null);
  emailModule.setBandAssetPathForTesting(undefined);
});

function createTestContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
      get: () => undefined,
    } as unknown as TrpcContext["req"],
    res: {
      setHeader: () => {},
      status: () => ({ json: () => {} }),
    } as unknown as TrpcContext["res"],
  };
}

describe("system router", () => {
  it("health check query succeeds with positive timestamp", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.system.health({ timestamp: Date.now() });
    expect(result).toEqual({ ok: true });
  });

  it("health check query rejects negative timestamp", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.system.health({ timestamp: -1 })).rejects.toThrow();
  });
});

describe("registration router", () => {
  // Test 1: Successful new registration
  it("1. successfully registers a new interest with confirmation email", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const emailSpy = vi.spyOn(emailModule, "sendRegistrationEmails").mockResolvedValueOnce({
      confirmationSent: true,
      adminNotified: true,
      errors: [],
    });

    vi.spyOn(db, "createInterestRegistration").mockResolvedValueOnce({
      isNew: true,
      registration: {
        id: 1,
        email: "first@example.com",
        consentedAt: new Date(),
        createdAt: new Date(),
        confirmationSentAt: null,
        adminNotifiedAt: null,
        lastEmailError: null,
      },
    });

    const updateStatusSpy = vi.spyOn(db, "updateInterestEmailStatus").mockResolvedValueOnce(undefined);

    const result = await caller.registration.submit({
      email: "first@example.com",
      consent: true,
    });

    expect(result.ok).toBe(true);
    expect(result.saved).toBe(true);
    expect(result.alreadyRegistered).toBe(false);
    expect(result.confirmationSent).toBe(true);
    expect(result.message).toContain("Check your inbox for the SAHAYAT confirmation");
    expect(emailSpy).toHaveBeenCalledWith("first@example.com", true);
    expect(updateStatusSpy).toHaveBeenCalledWith("first@example.com", expect.objectContaining({
      confirmationSentAt: expect.any(Date),
      adminNotifiedAt: expect.any(Date),
    }));
  });

  // Test 2: Duplicate registration
  it("2. handles duplicate registrations gracefully", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    vi.spyOn(db, "createInterestRegistration").mockResolvedValueOnce({
      isNew: false,
      registration: {
        id: 2,
        email: "repeat@example.com",
        consentedAt: new Date(),
        createdAt: new Date(),
        confirmationSentAt: new Date(),
        adminNotifiedAt: new Date(),
        lastEmailError: null,
      },
    });

    const emailSpy = vi.spyOn(emailModule, "sendRegistrationEmails").mockResolvedValueOnce({
      confirmationSent: true,
      adminNotified: true,
      errors: [],
    });

    vi.spyOn(db, "updateInterestEmailStatus").mockResolvedValueOnce(undefined);

    const result = await caller.registration.submit({
      email: "repeat@example.com",
      consent: true,
    });

    expect(result.ok).toBe(true);
    expect(result.saved).toBe(true);
    expect(result.alreadyRegistered).toBe(true);
    expect(result.confirmationSent).toBe(true);
    expect(result.message).toContain("already on the list");
    // Duplicate passes isNew=false to email service
    expect(emailSpy).toHaveBeenCalledWith("repeat@example.com", false);
  });

  // Test 3: Invalid email
  it("3. rejects invalid email formats", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.registration.submit({
        email: "not-an-email",
        consent: true,
      })
    ).rejects.toThrow();
  });

  // Test 4: Missing consent
  it("4. rejects registration without consent", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      // @ts-expect-error - testing invalid runtime input
      caller.registration.submit({
        email: "valid@example.com",
        consent: false,
      })
    ).rejects.toThrow();
  });

  // Test 5: Database registration failure
  it("5. throws error when initial database registration fails", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    vi.spyOn(db, "createInterestRegistration").mockRejectedValueOnce(
      new Error("PostgreSQL connection terminated")
    );

    const emailSpy = vi.spyOn(emailModule, "sendRegistrationEmails");

    await expect(
      caller.registration.submit({
        email: "dbfail@example.com",
        consent: true,
      })
    ).rejects.toThrow("We could not save your registration right now. Please try again.");

    // Email service should never be called if database save fails
    expect(emailSpy).not.toHaveBeenCalled();
  });

  // Test 6: SMTP returns an unsuccessful delivery result
  it("6. saves registration even when SMTP returns delivery errors", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    vi.spyOn(db, "createInterestRegistration").mockResolvedValueOnce({
      isNew: true,
      registration: {
        id: 3,
        email: "smtperror@example.com",
        consentedAt: new Date(),
        createdAt: new Date(),
        confirmationSentAt: null,
        adminNotifiedAt: null,
        lastEmailError: null,
      },
    });

    vi.spyOn(emailModule, "sendRegistrationEmails").mockResolvedValueOnce({
      confirmationSent: false,
      adminNotified: false,
      errors: ["smtp_auth_failed"],
    });

    const statusSpy = vi.spyOn(db, "updateInterestEmailStatus").mockResolvedValueOnce(undefined);

    const result = await caller.registration.submit({
      email: "smtperror@example.com",
      consent: true,
    });

    expect(result.ok).toBe(true);
    expect(result.saved).toBe(true);
    expect(result.confirmationSent).toBe(false);
    expect(result.message).toContain("Your interest has been saved, but we couldn't send the confirmation email right now");
    expect(statusSpy).toHaveBeenCalledWith("smtperror@example.com", expect.objectContaining({
      lastEmailError: "Delivery issue: smtp_auth_failed",
    }));
  });

  // Test 7: Email service throws an exception
  it("7. saves registration even when email service throws an unhandled exception", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    vi.spyOn(db, "createInterestRegistration").mockResolvedValueOnce({
      isNew: true,
      registration: {
        id: 4,
        email: "throwservice@example.com",
        consentedAt: new Date(),
        createdAt: new Date(),
        confirmationSentAt: null,
        adminNotifiedAt: null,
        lastEmailError: null,
      },
    });

    vi.spyOn(emailModule, "sendRegistrationEmails").mockRejectedValueOnce(
      new Error("Unexpected SMTP network crash")
    );

    const statusSpy = vi.spyOn(db, "updateInterestEmailStatus").mockResolvedValueOnce(undefined);

    const result = await caller.registration.submit({
      email: "throwservice@example.com",
      consent: true,
    });

    expect(result.ok).toBe(true);
    expect(result.saved).toBe(true);
    expect(result.confirmationSent).toBe(false);
    expect(result.message).toContain("Your interest has been saved, but we couldn't send the confirmation email right now");
    expect(statusSpy).toHaveBeenCalledWith("throwservice@example.com", expect.objectContaining({
      lastEmailError: "Delivery issue: service",
    }));
  });

  // Test 8: Email-status database update fails after registration is saved
  it("8. preserves saved registration when email-status database update fails", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    vi.spyOn(db, "createInterestRegistration").mockResolvedValueOnce({
      isNew: true,
      registration: {
        id: 5,
        email: "statusfail@example.com",
        consentedAt: new Date(),
        createdAt: new Date(),
        confirmationSentAt: null,
        adminNotifiedAt: null,
        lastEmailError: null,
      },
    });

    vi.spyOn(emailModule, "sendRegistrationEmails").mockResolvedValueOnce({
      confirmationSent: true,
      adminNotified: true,
      errors: [],
    });

    // Simulate failure in updating email status
    vi.spyOn(db, "updateInterestEmailStatus").mockRejectedValueOnce(
      new Error("Temporary database write lock timeout")
    );

    // The registration MUST NOT throw an error - it was already saved!
    const result = await caller.registration.submit({
      email: "statusfail@example.com",
      consent: true,
    });

    expect(result.ok).toBe(true);
    expect(result.saved).toBe(true);
    expect(result.confirmationSent).toBe(true);
    expect(result.message).toContain("Check your inbox for the SAHAYAT confirmation");
  });

  // Test 9: New registration sends admin notification
  it("9. new registration triggers admin notification", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    vi.spyOn(db, "createInterestRegistration").mockResolvedValueOnce({
      isNew: true,
      registration: {
        id: 6,
        email: "brandnew@example.com",
        consentedAt: new Date(),
        createdAt: new Date(),
        confirmationSentAt: null,
        adminNotifiedAt: null,
        lastEmailError: null,
      },
    });

    const emailSpy = vi.spyOn(emailModule, "sendRegistrationEmails").mockResolvedValueOnce({
      confirmationSent: true,
      adminNotified: true,
      errors: [],
    });

    const statusSpy = vi.spyOn(db, "updateInterestEmailStatus").mockResolvedValueOnce(undefined);

    await caller.registration.submit({
      email: "brandnew@example.com",
      consent: true,
    });

    expect(emailSpy).toHaveBeenCalledWith("brandnew@example.com", true);
    expect(statusSpy).toHaveBeenCalledWith("brandnew@example.com", expect.objectContaining({
      adminNotifiedAt: expect.any(Date),
    }));
  });

  // Test 10: Duplicate registration does not send a new admin notification
  it("10. duplicate registration does not record a new admin notification timestamp", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    vi.spyOn(db, "createInterestRegistration").mockResolvedValueOnce({
      isNew: false,
      registration: {
        id: 7,
        email: "existinguser@example.com",
        consentedAt: new Date(),
        createdAt: new Date(),
        confirmationSentAt: new Date(),
        adminNotifiedAt: new Date(),
        lastEmailError: null,
      },
    });

    const emailSpy = vi.spyOn(emailModule, "sendRegistrationEmails").mockResolvedValueOnce({
      confirmationSent: true,
      adminNotified: true,
      errors: [],
    });

    const statusSpy = vi.spyOn(db, "updateInterestEmailStatus").mockResolvedValueOnce(undefined);

    await caller.registration.submit({
      email: "existinguser@example.com",
      consent: true,
    });

    // isNew is false
    expect(emailSpy).toHaveBeenCalledWith("existinguser@example.com", false);
    // status update does NOT update adminNotifiedAt for duplicates
    expect(statusSpy).toHaveBeenCalledWith("existinguser@example.com", {
      confirmationSentAt: expect.any(Date),
      lastEmailError: null,
    });
  });
});

describe("database concurrent registration handling", () => {
  // Test 11: Concurrent duplicate registration handling
  it("11. handles concurrent duplicate submissions gracefully via ON CONFLICT", async () => {
    const existingRegistration = {
      id: 8,
      email: "concurrent@example.com",
      consentedAt: new Date(),
      createdAt: new Date(),
      confirmationSentAt: null,
      adminNotifiedAt: null,
      lastEmailError: null,
    };

    // Simulate database where onConflictDoNothing returns empty array (conflict),
    // and subsequent fetch returns the existing registration created by the concurrent winner.
    const mockDb = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoNothing: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]), // 0 rows inserted due to conflict
          }),
        }),
      }),
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([existingRegistration]),
          }),
        }),
      }),
    };

    db.setDbForTesting(mockDb as never);

    const result = await db.createInterestRegistration("concurrent@example.com");

    expect(result.isNew).toBe(false);
    expect(result.registration).toEqual(existingRegistration);
  });
});

describe("email service resilience", () => {
  it("returns not_configured error gracefully when GMAIL_APP_PASSWORD is not set and restores safely", async () => {
    const originalPassword = process.env.GMAIL_APP_PASSWORD;
    delete process.env.GMAIL_APP_PASSWORD;

    try {
      const result = await emailModule.sendRegistrationEmails("test@example.com", true);
      expect(result.confirmationSent).toBe(false);
      expect(result.adminNotified).toBe(false);
      expect(result.errors).toContain("not_configured");
    } finally {
      if (originalPassword === undefined) {
        delete process.env.GMAIL_APP_PASSWORD;
      } else {
        process.env.GMAIL_APP_PASSWORD = originalPassword;
      }
    }

    // Verify safe restoration: never becomes the literal string "undefined"
    expect(process.env.GMAIL_APP_PASSWORD).not.toBe("undefined");
  });

  it("handles missing email asset gracefully without crashing", async () => {
    const mockSendMail = vi.fn().mockResolvedValue({ messageId: "mock-id" });
    emailModule.setTransporterForTesting({
      sendMail: mockSendMail,
    } as never);
    emailModule.setBandAssetPathForTesting(null); // simulate missing band image asset on disk

    const result = await emailModule.sendRegistrationEmails("assettest@example.com", false);
    expect(result.confirmationSent).toBe(true);
    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
      attachments: [], // sent without attachments instead of throwing
    }));
  });

  it("embeds inline watch image with matching CID and inline disposition", async () => {
    const mockSendMail = vi.fn().mockResolvedValue({ messageId: "inline-test-id" });
    emailModule.setTransporterForTesting({
      sendMail: mockSendMail,
    } as never);
    emailModule.setBandAssetPathForTesting("/mock/path/sahayat-band-cutout.png");

    await emailModule.sendRegistrationEmails("inline@example.com", true);

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining(`src="cid:${emailModule.WATCH_CID}"`),
        attachments: [
          expect.objectContaining({
            cid: emailModule.WATCH_CID,
            contentDisposition: "inline",
            contentType: "image/png",
          }),
        ],
      })
    );
  });

  it("adminHtml accurately reflects whether confirmation email was sent", () => {
    const sentHtml = emailModule.adminHtml("visitor@example.com", true);
    expect(sentHtml).toContain("visitor@example.com");
    expect(sentHtml).toContain("successfully dispatched");

    const failedHtml = emailModule.adminHtml("visitor@example.com", false);
    expect(failedHtml).toContain("visitor@example.com");
    expect(failedHtml).toContain("could not be sent");
  });

  it("sendRegistrationEmails marks adminNotified false on duplicate registration", async () => {
    const mockSendMail = vi.fn().mockResolvedValue({ messageId: "mock-dup-id" });
    emailModule.setTransporterForTesting({
      sendMail: mockSendMail,
    } as never);

    const result = await emailModule.sendRegistrationEmails("dup@example.com", false);
    expect(result.confirmationSent).toBe(true);
    expect(result.adminNotified).toBe(false);
    expect(result.errors).toEqual([]);
    // Only 1 email was sent (to the visitor), admin email was not called
    expect(mockSendMail).toHaveBeenCalledTimes(1);
  });

  it("sendRegistrationEmails records error if confirmation delivery fails but admin send succeeds", async () => {
    const mockSendMail = vi.fn()
      .mockRejectedValueOnce(new Error("SMTP recipient rejected"))
      .mockResolvedValueOnce({ messageId: "admin-id" });

    emailModule.setTransporterForTesting({
      sendMail: mockSendMail,
    } as never);

    const result = await emailModule.sendRegistrationEmails("partial@example.com", true);
    expect(result.confirmationSent).toBe(false);
    expect(result.adminNotified).toBe(true);
    expect(result.errors).toContain("confirmation");
  });
});

describe("database connectivity check", () => {
  it("testDatabaseConnection returns failure when DATABASE_URL is unset", async () => {
    const originalUrl = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;

    try {
      db.setDbForTesting(null);
      const status = await db.testDatabaseConnection();
      expect(status.ok).toBe(false);
      expect(status.error).toBeDefined();
    } finally {
      if (originalUrl === undefined) {
        delete process.env.DATABASE_URL;
      } else {
        process.env.DATABASE_URL = originalUrl;
      }
    }
  });
});
