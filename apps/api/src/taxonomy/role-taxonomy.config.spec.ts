import { RoleCluster } from '@prisma/client';
import {
  QUERY_PROFILES,
  assertQueryProfilesUnique,
  getActiveQueryProfiles,
  getActiveQueryProfilesBySource,
  getQueryProfilesByCluster,
} from './role-taxonomy.config';

describe('role-taxonomy.config', () => {
  it('contains unique profile codes', () => {
    expect(() => assertQueryProfilesUnique()).not.toThrow();
  });

  it('covers all eight market clusters with active profiles', () => {
    const clusters = [
      RoleCluster.FRONTEND,
      RoleCluster.FULLSTACK,
      RoleCluster.BACKEND,
      RoleCluster.MOBILE,
      RoleCluster.DEVOPS,
      RoleCluster.ML_AI,
      RoleCluster.AI_FIRST,
      RoleCluster.DATA_ENGINEERING,
    ];

    for (const cluster of clusters) {
      const profiles = getQueryProfilesByCluster(cluster).filter(
        (p) => p.isActive,
      );
      expect(profiles.length).toBeGreaterThan(0);
    }
  });

  it('includes RemoteOK and Jobicy profiles', () => {
    expect(getActiveQueryProfilesBySource('REMOTEOK').length).toBeGreaterThan(
      0,
    );
    expect(getActiveQueryProfilesBySource('JOBICY').length).toBeGreaterThan(0);
  });

  it('uses expected hosts per source', () => {
    for (const profile of getActiveQueryProfiles()) {
      if (profile.sourceCode === 'REMOTEOK') {
        expect(profile.host).toBe('remoteok.com');
      } else {
        expect(profile.host).toBe('jobicy.com');
      }
    }
  });

  it('includes required search tags for core clusters', () => {
    const texts = QUERY_PROFILES.map((p) => p.searchText.toLowerCase());
    expect(texts).toEqual(
      expect.arrayContaining([
        'react',
        'frontend',
        'fullstack',
        'backend',
        'mobile',
        'devops',
        'python',
        'ai',
        'data',
      ]),
    );
  });
});
