import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  ApplyAsCreatorBody,
  ApplyAsCreatorResponse,
  GetCreatorParams,
  GetCreatorResponse,
  GetPlatformStatsResponse,
  ListCreatorSupportersParams,
  ListCreatorSupportersResponse,
  ListCreatorsQueryParams,
  ListCreatorsResponse,
  SimulateDonationBody,
  SimulateDonationParams,
  SimulateDonationResponse,
} from "@workspace/api-zod";
import { creatorsTable, db, supportTable } from "@workspace/db";

const router: IRouter = Router();

function creatorResponse(
  creator: typeof creatorsTable.$inferSelect,
  supporterCount: number,
) {
  return {
    id: creator.id,
    name: creator.name,
    slug: creator.slug,
    category: creator.category,
    bio: creator.bio,
    goalAmount: creator.goalAmount,
    goalRaised: creator.goalRaised,
    supporterCount,
    status: creator.status,
    createdAt: creator.createdAt.toISOString(),
  };
}

function supportResponse(
  support: typeof supportTable.$inferSelect,
  creatorSlug: string,
) {
  return {
    id: support.id,
    creatorId: support.creatorId,
    creatorSlug,
    amount: support.amount,
    currency: support.currency,
    displayName: support.isAnonymous ? null : support.displayName,
    isAnonymous: support.isAnonymous,
    message: support.message,
    status: "simulated",
    createdAt: support.createdAt.toISOString(),
  };
}

router.get("/platform/stats", async (_req, res): Promise<void> => {
  const [creatorTotals] = await db
    .select({ creatorCount: count() })
    .from(creatorsTable)
    .where(eq(creatorsTable.status, "verified"));
  const [supportTotals] = await db
    .select({
      supportCount: count(),
      totalSupportAmount:
        sql<number>`coalesce(sum(${supportTable.amount}), 0)::int`,
    })
    .from(supportTable)
    .innerJoin(creatorsTable, eq(creatorsTable.id, supportTable.creatorId))
    .where(eq(creatorsTable.status, "verified"));

  res.json(
    GetPlatformStatsResponse.parse({
      creatorCount: creatorTotals.creatorCount,
      supportCount: supportTotals.supportCount,
      totalSupportAmount: supportTotals.totalSupportAmount,
    }),
  );
});

router.get("/creators", async (req, res): Promise<void> => {
  const parsed = ListCreatorsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const conditions = [eq(creatorsTable.status, "verified")];
  if (parsed.data.category) {
    conditions.push(eq(creatorsTable.category, parsed.data.category));
  }
  const search = parsed.data.q?.trim();
  if (search) {
    conditions.push(
      or(
        ilike(creatorsTable.name, `%${search}%`),
        ilike(creatorsTable.slug, `%${search}%`),
        ilike(creatorsTable.category, `%${search}%`),
      )!,
    );
  }

  const rows = await db
    .select({ creator: creatorsTable, supporterCount: count(supportTable.id) })
    .from(creatorsTable)
    .leftJoin(supportTable, eq(supportTable.creatorId, creatorsTable.id))
    .where(and(...conditions))
    .groupBy(creatorsTable.id)
    .orderBy(desc(creatorsTable.goalRaised), desc(creatorsTable.createdAt));

  res.json(
    ListCreatorsResponse.parse(
      rows.map(({ creator, supporterCount }) =>
        creatorResponse(creator, supporterCount),
      ),
    ),
  );
});

router.post("/creators", async (req, res): Promise<void> => {
  const parsed = ApplyAsCreatorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const [creator] = await db
      .insert(creatorsTable)
      .values({ ...parsed.data, status: "pending" })
      .returning();

    res.status(201).json(
      ApplyAsCreatorResponse.parse(creatorResponse(creator, 0)),
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      res.status(409).json({ error: "This creator link is already taken." });
      return;
    }
    req.log.error({ err: error }, "Creator application could not be saved");
    res.status(500).json({ error: "Could not submit your application." });
  }
});

router.get("/creators/:slug", async (req, res): Promise<void> => {
  const params = GetCreatorParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select({ creator: creatorsTable, supporterCount: count(supportTable.id) })
    .from(creatorsTable)
    .leftJoin(supportTable, eq(supportTable.creatorId, creatorsTable.id))
    .where(
      and(
        eq(creatorsTable.slug, params.data.slug),
        eq(creatorsTable.status, "verified"),
      ),
    )
    .groupBy(creatorsTable.id)
    .limit(1);

  if (!row) {
    res.status(404).json({ error: "Creator not found." });
    return;
  }

  res.json(
    GetCreatorResponse.parse(creatorResponse(row.creator, row.supporterCount)),
  );
});

router.get(
  "/creators/:slug/supporters",
  async (req, res): Promise<void> => {
    const params = ListCreatorSupportersParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [creator] = await db
      .select({ id: creatorsTable.id, slug: creatorsTable.slug })
      .from(creatorsTable)
      .where(
        and(
          eq(creatorsTable.slug, params.data.slug),
          eq(creatorsTable.status, "verified"),
        ),
      )
      .limit(1);

    if (!creator) {
      res.status(404).json({ error: "Creator not found." });
      return;
    }

    const records = await db
      .select()
      .from(supportTable)
      .where(eq(supportTable.creatorId, creator.id))
      .orderBy(desc(supportTable.createdAt))
      .limit(12);

    res.json(
      ListCreatorSupportersResponse.parse(
        records.map((record) => supportResponse(record, creator.slug)),
      ),
    );
  },
);

router.post(
  "/creators/:slug/donations",
  async (req, res): Promise<void> => {
    const params = SimulateDonationParams.safeParse(req.params);
    const parsed = SimulateDonationBody.safeParse(req.body);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const creator = await db.transaction(async (tx) => {
      const [found] = await tx
        .select({ id: creatorsTable.id, slug: creatorsTable.slug })
        .from(creatorsTable)
        .where(
          and(
            eq(creatorsTable.slug, params.data.slug),
            eq(creatorsTable.status, "verified"),
          ),
        )
        .limit(1);

      if (!found) return null;

      const [record] = await tx
        .insert(supportTable)
        .values({
          creatorId: found.id,
          amount: parsed.data.amount,
          displayName: parsed.data.isAnonymous
            ? null
            : (parsed.data.displayName ?? null),
          isAnonymous: parsed.data.isAnonymous,
          message: parsed.data.message ?? null,
          status: "simulated",
        })
        .returning();

      await tx
        .update(creatorsTable)
        .set({
          goalRaised: sql`${creatorsTable.goalRaised} + ${parsed.data.amount}`,
        })
        .where(eq(creatorsTable.id, found.id));

      return { creator: found, record };
    });

    if (!creator) {
      res.status(404).json({ error: "Creator not found." });
      return;
    }

    res.status(201).json(
      SimulateDonationResponse.parse(
        supportResponse(creator.record, creator.creator.slug),
      ),
    );
  },
);

export default router;
