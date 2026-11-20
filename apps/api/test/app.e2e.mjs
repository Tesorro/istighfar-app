import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { after, before, beforeEach, describe, it } from "node:test";
import request from "supertest";

process.env.NODE_ENV = "test";
process.env.PORT = "3000";
process.env.DATABASE_URL =
  "postgresql://istighfar:istighfar@localhost:5432/istighfar_test?schema=public";
process.env.JWT_ACCESS_SECRET = "test-secret-test-secret-test-secret-32";
process.env.JWT_ACCESS_TTL = "15m";
process.env.REFRESH_TTL_DAYS = "30";
process.env.BCRYPT_ROUNDS = "4";
process.env.CORS_ORIGINS = "http://localhost:5173";
process.env.COOKIE_SECURE = "false";
process.env.COOKIE_SAMESITE = "lax";
process.env.INVITE_TTL_HOURS = "168";
delete process.env.COOKIE_DOMAIN;

const require = createRequire(import.meta.url);
const { Test } = require("@nestjs/testing");
const { AppModule } = require("../dist/app.module.js");
const { configureApp } = require("../dist/main.js");
const { PrismaService } = require("../dist/prisma/prisma.service.js");

const prismaCli = path.resolve(
  process.cwd(),
  "node_modules/prisma/build/index.js",
);
execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], {
  cwd: process.cwd(),
  stdio: "inherit",
  env: process.env,
});

describe("Istighfar API", () => {
  /** @type {import('@nestjs/common').INestApplication} */
  let app;
  /** @type {import('../dist/prisma/prisma.service.js').PrismaService} */
  let prisma;
  let server;

  before(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication({ bodyParser: false, logger: false });
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    server = app.getHttpServer();
  });

  beforeEach(async () => {
    await prisma.dailyProgress.deleteMany();
    await prisma.invitation.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
    await prisma.family.deleteMany();
  });

  after(async () => {
    await app.close();
  });

  it("registers, logs in, refreshes and logs out without storing the password", async () => {
    const created = await register("Танзила", "tanzila@example.com");
    assert.equal(created.body.user.email, "tanzila@example.com");
    assert.equal(JSON.stringify(created.body).includes("password"), false);
    assert.match(created.cookie, /HttpOnly/);

    const me = await request(server)
      .get("/auth/me")
      .set("Authorization", `Bearer ${created.token}`)
      .expect(200);
    assert.equal(me.body.familyId, null);

    await request(server)
      .post("/auth/login")
      .send({ email: "tanzila@example.com", password: "wrong-pass" })
      .expect(401);

    const refreshed = await request(server)
      .post("/auth/refresh")
      .set("Cookie", created.cookieHeader)
      .expect(200);
    assert.equal(typeof refreshed.body.accessToken, "string");
    assert.equal(refreshed.body.user.email, "tanzila@example.com");

    await request(server)
      .post("/auth/logout")
      .set("Cookie", cookieHeader(refreshed))
      .expect(200);
    await request(server)
      .post("/auth/refresh")
      .set("Cookie", cookieHeader(refreshed))
      .expect(401);
    await request(server).get("/auth/me").expect(401);
  });

  it("rejects a family id supplied during registration", async () => {
    await request(server)
      .post("/auth/register")
      .send({
        name: "Танзила",
        email: "extra@example.com",
        password: "password1",
        familyId: "3f8c2c4e-2a4e-4d1a-9c3a-6d0a5b2f7e11",
      })
      .expect(400);
  });

  it("rotates refresh tokens and revokes the family after delayed reuse", async () => {
    const created = await register("Танзила", "rotate@example.com");
    const first = await request(server)
      .post("/auth/refresh")
      .set("Cookie", created.cookieHeader)
      .expect(200);
    const firstCookie = cookieHeader(first);

    await request(server)
      .post("/auth/refresh")
      .set("Cookie", created.cookieHeader)
      .expect(401);
    const stillValid = await request(server)
      .post("/auth/refresh")
      .set("Cookie", firstCookie)
      .expect(200);

    await prisma.refreshToken.updateMany({
      where: { userId: created.userId, revokedAt: { not: null } },
      data: { revokedAt: new Date(Date.now() - 2 * 60 * 1000) },
    });

    await request(server)
      .post("/auth/refresh")
      .set("Cookie", created.cookieHeader)
      .expect(401);
    await request(server)
      .post("/auth/refresh")
      .set("Cookie", cookieHeader(stillValid))
      .expect(401);
  });

  it("creates one family, invites the second person and keeps the limit", async () => {
    const husband = await register("Ибрагим", "husband@example.com");
    const family = await request(server)
      .post("/family")
      .set("Authorization", `Bearer ${husband.token}`)
      .send({ name: "Семья Ибрагима", timezone: "Europe/Moscow" })
      .expect(201);
    assert.equal(family.body.memberCount, 1);
    assert.equal(family.body.targetCount, 1_000_000);

    await request(server)
      .post("/family")
      .set("Authorization", `Bearer ${husband.token}`)
      .send({ name: "Вторая", timezone: "Europe/Moscow" })
      .expect(409);

    const invitation = await request(server)
      .post("/family/invitations")
      .set("Authorization", `Bearer ${husband.token}`)
      .expect(201);
    const wife = await register("Марьям", "wife@example.com");
    const joined = await request(server)
      .post("/family/join")
      .set("Authorization", `Bearer ${wife.token}`)
      .send({ token: invitation.body.token })
      .expect(200);
    assert.equal(joined.body.id, family.body.id);
    assert.equal(joined.body.memberCount, 2);

    await request(server)
      .post("/family/join")
      .set("Authorization", `Bearer ${wife.token}`)
      .send({ token: invitation.body.token })
      .expect(409);

    const outsider = await register("Гость", "guest@example.com");
    await request(server)
      .post("/family/join")
      .set("Authorization", `Bearer ${outsider.token}`)
      .send({ token: invitation.body.token })
      .expect(400);
    await request(server)
      .post("/family/invitations")
      .set("Authorization", `Bearer ${husband.token}`)
      .expect(409);

    const me = await request(server)
      .get("/auth/me")
      .set("Authorization", `Bearer ${wife.token}`)
      .expect(200);
    assert.equal(me.body.familyId, family.body.id);
  });

  it("expires an invitation and hides its raw token from the database", async () => {
    const founder = await register("Танзила", "founder@example.com");
    await request(server)
      .post("/family")
      .set("Authorization", `Bearer ${founder.token}`)
      .send({ name: "Дом", timezone: "UTC" })
      .expect(201);
    const invitation = await request(server)
      .post("/family/invitations")
      .set("Authorization", `Bearer ${founder.token}`)
      .expect(201);

    const stored = await prisma.invitation.findFirst();
    assert.notEqual(stored?.tokenHash, invitation.body.token);

    await prisma.invitation.updateMany({
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const guest = await register("Гость", "late@example.com");
    await request(server)
      .post("/family/join")
      .set("Authorization", `Bearer ${guest.token}`)
      .send({ token: invitation.body.token })
      .expect(400);
  });

  it("keeps individual counts private and isolates families", async () => {
    const husband = await sessionInFamily(
      "Ибрагим",
      "h@example.com",
      "Первая",
      "UTC",
    );
    const wife = await register("Марьям", "w@example.com");
    const invitation = await request(server)
      .post("/family/invitations")
      .set("Authorization", `Bearer ${husband.token}`)
      .expect(201);
    await request(server)
      .post("/family/join")
      .set("Authorization", `Bearer ${wife.token}`)
      .send({ token: invitation.body.token })
      .expect(200);

    const other = await sessionInFamily(
      "Юсуф",
      "y@example.com",
      "Вторая",
      "UTC",
    );

    const own = await request(server)
      .post("/progress")
      .set("Authorization", `Bearer ${husband.token}`)
      .send({ count: 111 })
      .expect(201);
    await request(server)
      .post("/progress")
      .set("Authorization", `Bearer ${wife.token}`)
      .send({ count: 222 })
      .expect(201);
    await request(server)
      .post("/progress")
      .set("Authorization", `Bearer ${other.token}`)
      .send({ count: 777 })
      .expect(201);

    await request(server)
      .post("/progress")
      .set("Authorization", `Bearer ${husband.token}`)
      .send({ count: 5 })
      .expect(409);
    await request(server)
      .patch(`/progress/${own.body.progressId}`)
      .set("Authorization", `Bearer ${wife.token}`)
      .send({ count: 1 })
      .expect(404);
    await request(server)
      .patch(`/progress/${own.body.progressId}`)
      .set("Authorization", `Bearer ${husband.token}`)
      .send({ count: 150 })
      .expect(200);

    const summary = await request(server)
      .get("/family/progress")
      .set("Authorization", `Bearer ${wife.token}`)
      .expect(200);
    assert.deepEqual(summary.body, {
      targetCount: 1_000_000,
      totalCount: 372,
      todayCount: 372,
      remainingCount: 999_628,
      progressPercentage: 0.037,
      goalReached: false,
      membersSubmittedToday: 2,
      totalMembers: 2,
    });
    const summaryJson = JSON.stringify(summary.body);
    assert.equal(summaryJson.includes("150"), false);
    assert.equal(summaryJson.includes("222"), false);
    assert.equal(summaryJson.includes("777"), false);
    assert.equal(summaryJson.includes(husband.userId), false);

    const history = await request(server)
      .get("/progress/history")
      .set("Authorization", `Bearer ${husband.token}`)
      .expect(200);
    assert.equal(history.body.length, 1);
    assert.equal(history.body[0].totalCount, 372);
    assert.equal(history.body[0].allMembersSubmitted, true);
    assert.match(history.body[0].date, /^\d{4}-\d{2}-\d{2}$/);
    const historyJson = JSON.stringify(history.body);
    assert.equal(historyJson.includes("150"), false);
    assert.equal(historyJson.includes("222"), false);

    const today = await request(server)
      .get("/progress/today")
      .set("Authorization", `Bearer ${husband.token}`)
      .expect(200);
    assert.equal(today.body.count, 150);
    assert.equal(today.body.isSubmitted, true);

    const wifeToday = await request(server)
      .get("/progress/today")
      .set("Authorization", `Bearer ${wife.token}`)
      .expect(200);
    assert.equal(wifeToday.body.count, 222);

    const otherSummary = await request(server)
      .get("/family/progress")
      .set("Authorization", `Bearer ${other.token}`)
      .expect(200);
    assert.equal(otherSummary.body.totalCount, 777);
    assert.equal(otherSummary.body.totalMembers, 1);

    await request(server)
      .post("/progress")
      .set("Authorization", `Bearer ${husband.token}`)
      .send({ count: -1 })
      .expect(400);
    await request(server)
      .post("/progress")
      .set("Authorization", `Bearer ${other.token}`)
      .send({ count: 100_001 })
      .expect(400);

    const stranger = await register("Без семьи", "solo@example.com");
    await request(server)
      .post("/progress")
      .set("Authorization", `Bearer ${stranger.token}`)
      .send({ count: 1 })
      .expect(400);
  });

  async function register(name, email) {
    const response = await request(server)
      .post("/auth/register")
      .send({ name, email, password: "password1" })
      .expect(201);
    return {
      body: response.body,
      token: response.body.accessToken,
      userId: response.body.user.id,
      cookie: cookieOf(response),
      cookieHeader: cookieHeader(response),
    };
  }

  async function sessionInFamily(name, email, familyName, timezone) {
    const user = await register(name, email);
    await request(server)
      .post("/family")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ name: familyName, timezone })
      .expect(201);
    return user;
  }
});

function cookieOf(response) {
  const header = response.headers["set-cookie"];
  const list = Array.isArray(header) ? header : header ? [header] : [];
  const found = list.find((value) => value.startsWith("istighfar_refresh="));
  if (!found) {
    throw new Error("Refresh cookie не установлена");
  }
  return found;
}

function cookieHeader(response) {
  return cookieOf(response).split(";")[0];
}
