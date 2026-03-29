import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";

import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { encodeEditorNameHeader } from "@/lib/editor-name-header";

const TEST_TIMEOUT_MS = 120_000;
const GROUP_PASSWORD = "1234";
const ADMIN_USERNAME = "smoke-admin";
const ADMIN_PASSWORD = "smoke-secret";
const EDITOR_NAME = "홍길동";
const ENCODED_EDITOR_NAME = encodeEditorNameHeader(EDITOR_NAME);

dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
  quiet: true,
});

type CreatedGroup = {
  id: string;
  name: string;
  slug: string;
};

type CreatedMember = {
  id: string;
  name: string;
  nickname: string;
};

type CreatedParty = {
  id: string;
  name: string;
  status: string;
};

type CreatedGame = {
  id: string;
  name: string;
  winnerTeam: number | null;
};

type CookieJar = Map<string, string>;
type SmokeServerProcess = ReturnType<typeof spawn>;
type HttpClient = ReturnType<typeof createHttpClient>;

function getPnpmCommand() {
  return process.platform === "win32" ? "pnpm.cmd" : "pnpm";
}

function getHeaderCookies(response: Response) {
  const headers = response.headers as Headers & {
    getSetCookie?: () => string[];
  };

  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }

  const setCookie = response.headers.get("set-cookie");
  return setCookie ? [setCookie] : [];
}

function storeCookies(jar: CookieJar, response: Response) {
  for (const cookie of getHeaderCookies(response)) {
    const [pair] = cookie.split(";", 1);
    const separatorIndex = pair.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const name = pair.slice(0, separatorIndex);
    const value = pair.slice(separatorIndex + 1);

    if (!value) {
      jar.delete(name);
      continue;
    }

    jar.set(name, value);
  }
}

function createHttpClient(baseUrl: string) {
  const jar: CookieJar = new Map();

  return {
    async request(pathname: string, init: RequestInit = {}) {
      const headers = new Headers(init.headers);

      if (jar.size > 0) {
        headers.set(
          "cookie",
          [...jar.entries()].map(([name, value]) => `${name}=${value}`).join("; "),
        );
      }

      const response = await fetch(`${baseUrl}${pathname}`, {
        ...init,
        headers,
        redirect: init.redirect ?? "manual",
      });

      storeCookies(jar, response);
      return response;
    },
  };
}

async function findFreePort() {
  return new Promise<number>((resolve, reject) => {
    const server = net.createServer();

    server.listen(0, () => {
      const address = server.address();

      if (!address || typeof address === "string") {
        reject(new Error("Failed to resolve a free port."));
        return;
      }

      const port = address.port;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(port);
      });
    });

    server.on("error", reject);
  });
}

async function waitForServer(baseUrl: string, process: SmokeServerProcess) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < TEST_TIMEOUT_MS) {
    if (process.exitCode !== null) {
      throw new Error(`Smoke server exited early with code ${process.exitCode}.`);
    }

    try {
      const response = await fetch(baseUrl, { redirect: "manual" });

      if (response.status >= 200 && response.status < 500) {
        return;
      }
    } catch {
      // Server is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error("Timed out waiting for the smoke server to start.");
}

async function readJson<T>(response: Response) {
  return (await response.json()) as T;
}

describe.sequential("full application smoke flow", () => {
  const smokePrefix = `smoke-${crypto.randomUUID().slice(0, 8)}`;
  const workspaceRoot = process.cwd();

  let server: SmokeServerProcess | null = null;
  let sql!: ReturnType<typeof neon>;
  let baseUrl = "";
  let group: CreatedGroup | null = null;
  let encodedSlug = "";
  let activeMembers: CreatedMember[] = [];
  let archivedMember: CreatedMember | null = null;
  let party: CreatedParty | null = null;
  let game: CreatedGame | null = null;
  let plainClient!: HttpClient;
  let unlockedClient!: HttpClient;
  let adminClient!: HttpClient;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required for smoke tests.");
    }

    sql = neon(process.env.DATABASE_URL);

    const port = await findFreePort();
    baseUrl = `http://127.0.0.1:${port}`;

    server = spawn(getPnpmCommand(), ["start", "-p", String(port)], {
      cwd: workspaceRoot,
      env: {
        ...process.env,
        ADMIN_USERNAME,
        ADMIN_PASSWORD,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    await waitForServer(baseUrl, server);

    plainClient = createHttpClient(baseUrl);
    unlockedClient = createHttpClient(baseUrl);
    adminClient = createHttpClient(baseUrl);
  }, TEST_TIMEOUT_MS);

  afterAll(async () => {
    if (group && sql) {
      await sql`delete from groups where id = ${group.id}`;
    }

    if (server && server.exitCode === null) {
      server.kill("SIGTERM");
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }, TEST_TIMEOUT_MS);

  it(
    "creates a group and renders the encoded slug pages",
    async () => {
      const createResponse = await plainClient.request("/api/groups", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: `테스트 ${smokePrefix}`,
          password: GROUP_PASSWORD,
        }),
      });

      expect(createResponse.status).toBe(201);
      group = await readJson<CreatedGroup>(createResponse);
      encodedSlug = encodeURIComponent(group.slug);

      const overviewResponse = await plainClient.request(`/g/${encodedSlug}`);
      const overviewHtml = await overviewResponse.text();

      expect(overviewResponse.status).toBe(200);
      expect(overviewHtml).toContain(group.name);
      expect(overviewHtml).toContain(group.slug);

      const membersResponse = await plainClient.request(`/g/${encodedSlug}/members`);
      expect(membersResponse.status).toBe(200);
      expect(await membersResponse.text()).toContain("현재 멤버 로스터");

      const partiesResponse = await plainClient.request(`/g/${encodedSlug}/parties`);
      expect(partiesResponse.status).toBe(200);
      expect(await partiesResponse.text()).toContain("지금 운영 중인 세션");

      const logsResponse = await plainClient.request(`/g/${encodedSlug}/logs`);
      expect(logsResponse.status).toBe(200);
      expect(await logsResponse.text()).toContain("group.created");
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "covers member create, update, unlock, and archive flows",
    async () => {
      if (!group) {
        throw new Error("Smoke group was not created.");
      }

      const memberSeeds = [
        { name: "Alpha", nickname: "A" },
        { name: "Bravo", nickname: "B" },
        { name: "Charlie", nickname: "C" },
        { name: "Delta", nickname: "D" },
        { name: "Echo", nickname: "E" },
      ];

      const createdMembers: CreatedMember[] = [];

      for (const seed of memberSeeds) {
        const response = await plainClient.request(
          `/api/groups/${encodedSlug}/members`,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-editor-name": ENCODED_EDITOR_NAME,
            },
            body: JSON.stringify(seed),
          },
        );

        expect(response.status).toBe(201);
        createdMembers.push(await readJson<CreatedMember>(response));
      }

      activeMembers = createdMembers.slice(0, 4);
      archivedMember = createdMembers[4];

      const updateResponse = await plainClient.request(
        `/api/groups/${encodedSlug}/members/${activeMembers[0].id}`,
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            "x-editor-name": ENCODED_EDITOR_NAME,
          },
          body: JSON.stringify({ nickname: "AlphaPrime" }),
        },
      );

      expect(updateResponse.status).toBe(200);

      const membersPage = await plainClient.request(`/g/${encodedSlug}/members`);
      expect(membersPage.status).toBe(200);
      expect(await membersPage.text()).toContain("AlphaPrime");

      const archiveDeniedResponse = await plainClient.request(
        `/api/groups/${encodedSlug}/members/${archivedMember.id}`,
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            "x-editor-name": ENCODED_EDITOR_NAME,
          },
          body: JSON.stringify({ archived: true }),
        },
      );

      expect(archiveDeniedResponse.status).toBe(403);

      const wrongUnlockResponse = await unlockedClient.request(
        `/api/groups/${encodedSlug}/unlock`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ password: "9999" }),
        },
      );

      expect(wrongUnlockResponse.status).toBe(401);

      const unlockResponse = await unlockedClient.request(
        `/api/groups/${encodedSlug}/unlock`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ password: GROUP_PASSWORD }),
        },
      );

      expect(unlockResponse.status).toBe(200);

      const archiveAllowedResponse = await unlockedClient.request(
        `/api/groups/${encodedSlug}/members/${archivedMember.id}`,
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            "x-editor-name": ENCODED_EDITOR_NAME,
          },
          body: JSON.stringify({ archived: true }),
        },
      );

      expect(archiveAllowedResponse.status).toBe(200);

      const logsPage = await plainClient.request(`/g/${encodedSlug}/logs`);
      const logsHtml = await logsPage.text();

      expect(logsPage.status).toBe(200);
      expect(logsHtml).toContain("member.created");
      expect(logsHtml).toContain("member.archived");
      expect(logsHtml).toContain(EDITOR_NAME);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "covers party, participant pool, game result, protected edits, and ended party rules",
    async () => {
      if (!group || !archivedMember) {
        throw new Error("Smoke members were not initialized.");
      }

      const createPartyResponse = await plainClient.request(
        `/api/groups/${encodedSlug}/parties`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-editor-name": ENCODED_EDITOR_NAME,
          },
          body: JSON.stringify({ name: `금요일 내전 ${smokePrefix}` }),
        },
      );

      expect(createPartyResponse.status).toBe(201);
      party = await readJson<CreatedParty>(createPartyResponse);

      const renamePartyResponse = await plainClient.request(
        `/api/groups/${encodedSlug}/parties/${party.id}`,
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            "x-editor-name": ENCODED_EDITOR_NAME,
          },
          body: JSON.stringify({ name: `랭크전 ${smokePrefix}` }),
        },
      );

      expect(renamePartyResponse.status).toBe(200);
      const renamedParty = await renamePartyResponse.json();
      expect(renamedParty.name).toContain("랭크전");

      const syncPartyMembersResponse = await plainClient.request(
        `/api/groups/${encodedSlug}/parties/${party.id}/members`,
        {
          method: "PUT",
          headers: {
            "content-type": "application/json",
            "x-editor-name": ENCODED_EDITOR_NAME,
          },
          body: JSON.stringify({
            memberIds: activeMembers.map((member) => member.id),
          }),
        },
      );

      expect(syncPartyMembersResponse.status).toBe(200);

      const createGamePayload = {
        name: `1세트 ${smokePrefix}`,
        team1Name: "Blue",
        team2Name: "Red",
        participantIds: activeMembers.map((member) => member.id),
        constraints: [
          {
            type: "same_team",
            memberAId: activeMembers[0].id,
            memberBId: activeMembers[1].id,
          },
          {
            type: "different_team",
            memberAId: activeMembers[0].id,
            memberBId: activeMembers[2].id,
          },
          {
            type: "pinned_team",
            memberAId: activeMembers[3].id,
            targetTeam: 2,
          },
        ],
        assignments: [
          { memberId: activeMembers[0].id, teamId: 1 },
          { memberId: activeMembers[1].id, teamId: 1 },
          { memberId: activeMembers[2].id, teamId: 2 },
          { memberId: activeMembers[3].id, teamId: 2 },
        ],
        winnerTeam: null,
      } as const;

      const createGameResponse = await plainClient.request(
        `/api/groups/${encodedSlug}/parties/${party.id}/games`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-editor-name": ENCODED_EDITOR_NAME,
          },
          body: JSON.stringify(createGamePayload),
        },
      );

      expect(createGameResponse.status).toBe(201);
      game = await readJson<CreatedGame>(createGameResponse);

      const partyPage = await plainClient.request(
        `/g/${encodedSlug}/parties/${party.id}`,
      );
      expect(partyPage.status).toBe(200);
      expect(await partyPage.text()).toContain(createGamePayload.name);

      const recordResultResponse = await plainClient.request(
        `/api/groups/${encodedSlug}/parties/${party.id}/games/${game.id}`,
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            "x-editor-name": ENCODED_EDITOR_NAME,
          },
          body: JSON.stringify({
            ...createGamePayload,
            winnerTeam: 1,
          }),
        },
      );

      expect(recordResultResponse.status).toBe(200);

      const overviewResponse = await plainClient.request(`/g/${encodedSlug}`);
      const overviewHtml = await overviewResponse.text();

      expect(overviewResponse.status).toBe(200);
      expect(overviewHtml).toContain("1W 0L");

      const completedEditDeniedResponse = await plainClient.request(
        `/api/groups/${encodedSlug}/parties/${party.id}/games/${game.id}`,
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            "x-editor-name": ENCODED_EDITOR_NAME,
          },
          body: JSON.stringify({
            ...createGamePayload,
            team1Name: "Sky",
            winnerTeam: 1,
          }),
        },
      );

      expect(completedEditDeniedResponse.status).toBe(403);

      const deleteDeniedResponse = await plainClient.request(
        `/api/groups/${encodedSlug}/parties/${party.id}/games/${game.id}`,
        {
          method: "DELETE",
          headers: {
            "x-editor-name": ENCODED_EDITOR_NAME,
          },
        },
      );

      expect(deleteDeniedResponse.status).toBe(403);

      const completedEditAllowedResponse = await unlockedClient.request(
        `/api/groups/${encodedSlug}/parties/${party.id}/games/${game.id}`,
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            "x-editor-name": ENCODED_EDITOR_NAME,
          },
          body: JSON.stringify({
            ...createGamePayload,
            team1Name: "Sky",
            winnerTeam: 1,
          }),
        },
      );

      expect(completedEditAllowedResponse.status).toBe(200);

      const deleteAllowedResponse = await unlockedClient.request(
        `/api/groups/${encodedSlug}/parties/${party.id}/games/${game.id}`,
        {
          method: "DELETE",
          headers: {
            "x-editor-name": ENCODED_EDITOR_NAME,
          },
        },
      );

      expect(deleteAllowedResponse.status).toBe(200);

      const endPartyResponse = await plainClient.request(
        `/api/groups/${encodedSlug}/parties/${party.id}`,
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            "x-editor-name": ENCODED_EDITOR_NAME,
          },
          body: JSON.stringify({ status: "ended" }),
        },
      );

      expect(endPartyResponse.status).toBe(200);

      const syncAfterEndResponse = await plainClient.request(
        `/api/groups/${encodedSlug}/parties/${party.id}/members`,
        {
          method: "PUT",
          headers: {
            "content-type": "application/json",
            "x-editor-name": ENCODED_EDITOR_NAME,
          },
          body: JSON.stringify({
            memberIds: [...activeMembers.map((member) => member.id), archivedMember.id],
          }),
        },
      );

      expect(syncAfterEndResponse.status).toBe(409);

      const createGameAfterEndResponse = await plainClient.request(
        `/api/groups/${encodedSlug}/parties/${party.id}/games`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-editor-name": ENCODED_EDITOR_NAME,
          },
          body: JSON.stringify(createGamePayload),
        },
      );

      expect(createGameAfterEndResponse.status).toBe(409);

      const partiesPage = await plainClient.request(`/g/${encodedSlug}/parties`);
      const partiesHtml = await partiesPage.text();

      expect(partiesPage.status).toBe(200);
      expect(partiesHtml).toContain("랭크전");
      expect(partiesHtml).toContain("종료됨");

      const logsPage = await plainClient.request(`/g/${encodedSlug}/logs`);
      const logsHtml = await logsPage.text();

      expect(logsPage.status).toBe(200);
      expect(logsHtml).toContain("party.created");
      expect(logsHtml).toContain("party.members.synced");
      expect(logsHtml).toContain("game.result.recorded");
      expect(logsHtml).toContain("game.deleted");
      expect(logsHtml).toContain("party.ended");
      expect(logsHtml).toContain(EDITOR_NAME);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "covers admin login, dashboard access, and logout",
    async () => {
      if (!group) {
        throw new Error("Smoke group was not created.");
      }

      const adminRedirectResponse = await adminClient.request("/admin", {
        redirect: "manual",
      });

      expect(adminRedirectResponse.status).toBe(307);
      expect(adminRedirectResponse.headers.get("location")).toContain("/admin/login");

      const wrongLoginResponse = await adminClient.request("/api/admin/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          username: ADMIN_USERNAME,
          password: "incorrect",
        }),
      });

      expect(wrongLoginResponse.status).toBe(401);

      const loginResponse = await adminClient.request("/api/admin/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          username: ADMIN_USERNAME,
          password: ADMIN_PASSWORD,
        }),
      });

      expect(loginResponse.status).toBe(200);

      const adminPageResponse = await adminClient.request("/admin");
      const adminHtml = await adminPageResponse.text();

      expect(adminPageResponse.status).toBe(200);
      expect(adminHtml).toContain("전체 운영 현황");
      expect(adminHtml).toContain(group.name);
      expect(adminHtml).toContain(EDITOR_NAME);

      const logoutResponse = await adminClient.request("/api/admin/logout", {
        method: "POST",
      });

      expect(logoutResponse.status).toBe(200);

      const postLogoutRedirectResponse = await adminClient.request("/admin", {
        redirect: "manual",
      });

      expect(postLogoutRedirectResponse.status).toBe(307);
      expect(postLogoutRedirectResponse.headers.get("location")).toContain(
        "/admin/login",
      );
    },
    TEST_TIMEOUT_MS,
  );
});
