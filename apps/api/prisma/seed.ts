import { PrismaClient } from '@prisma/client';
import { SKILL_DICTIONARY } from '../src/skills/skill-dictionary.config';
import { QUERY_PROFILES } from '../src/taxonomy/role-taxonomy.config';

const prisma = new PrismaClient();

async function seedSources(): Promise<{
  remoteOkId: string;
  jobicyId: string;
}> {
  const remoteOk = await prisma.source.upsert({
    where: { code: 'REMOTEOK' },
    update: {
      name: 'RemoteOK',
      baseUrl: 'https://remoteok.com',
      isActive: true,
    },
    create: {
      code: 'REMOTEOK',
      name: 'RemoteOK',
      baseUrl: 'https://remoteok.com',
      isActive: true,
    },
  });

  const jobicy = await prisma.source.upsert({
    where: { code: 'JOBICY' },
    update: {
      name: 'Jobicy',
      baseUrl: 'https://jobicy.com',
      isActive: true,
    },
    create: {
      code: 'JOBICY',
      name: 'Jobicy',
      baseUrl: 'https://jobicy.com',
      isActive: true,
    },
  });

  // Keep legacy rows but mark inactive so sync defaults ignore them.
  await prisma.source.updateMany({
    where: { code: { in: ['HH', 'REMOTIVE'] } },
    data: { isActive: false },
  });

  return { remoteOkId: remoteOk.id, jobicyId: jobicy.id };
}

async function seedQueryProfiles(): Promise<number> {
  // Deactivate legacy HH/Remotive profiles
  await prisma.queryProfile.updateMany({
    where: {
      OR: [
        { sourceCode: { in: ['HH', 'REMOTIVE'] } },
        { host: { in: ['hh.ru', 'remotive.com'] } },
      ],
    },
    data: { isActive: false },
  });

  for (const profile of QUERY_PROFILES) {
    await prisma.queryProfile.upsert({
      where: { code: profile.code },
      update: {
        title: profile.title,
        clusterHint: profile.clusterHint,
        searchText: profile.searchText,
        sourceCode: profile.sourceCode,
        host: profile.host,
        isActive: profile.isActive,
      },
      create: {
        code: profile.code,
        title: profile.title,
        clusterHint: profile.clusterHint,
        searchText: profile.searchText,
        sourceCode: profile.sourceCode,
        host: profile.host,
        isActive: profile.isActive,
      },
    });
  }

  return QUERY_PROFILES.length;
}

async function seedSkills(): Promise<number> {
  for (const skill of SKILL_DICTIONARY) {
    await prisma.skill.upsert({
      where: { code: skill.code },
      update: {
        name: skill.name,
        category: skill.category,
      },
      create: {
        code: skill.code,
        name: skill.name,
        category: skill.category,
      },
    });
  }

  return SKILL_DICTIONARY.length;
}

async function main(): Promise<void> {
  const sources = await seedSources();
  const profilesCount = await seedQueryProfiles();
  const skillsCount = await seedSkills();

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        sources,
        queryProfiles: profilesCount,
        skills: skillsCount,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error: unknown) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
