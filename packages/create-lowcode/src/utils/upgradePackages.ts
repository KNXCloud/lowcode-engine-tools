import axios from 'axios';
import semver from 'semver';
import { yellow } from 'kolorist';

async function getLatestVersion(name: string, current: string): Promise<string | null> {
  try {
    const res = await axios.get(`https://registry.npmmirror.com/${name}`);
    const distTags = res.data?.['dist-tags'];
    if (!distTags) return null;

    const symbol = current.match(/^[0-9]/) ? '' : current.charAt(0);
    if (!symbol) return current;
    let latestSafeVersion = current.substring(1);
    for (const key in distTags) {
      const version = distTags[key];
      if (semver.satisfies(version, current) && semver.lt(latestSafeVersion, version)) {
        latestSafeVersion = version;
      }
    }
    return symbol + latestSafeVersion;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      console.log(`\n${yellow(`${name} 不存在，忽略升级包版本`)}`);
    }
    return null;
  }
}

export async function upgradePackages(packageJson: string): Promise<string> {
  const pkg = JSON.parse(packageJson);
  const { dependencies, devDependencies } = pkg;
  const promises1 = Object.keys(dependencies).map(async (key) => {
    const latestVersion = await getLatestVersion(key, dependencies[key]);
    if (latestVersion) dependencies[key] = latestVersion;
  });

  const promises2 = Object.keys(devDependencies).map(async (key) => {
    const latestVersion = await getLatestVersion(key, devDependencies[key]);
    if (latestVersion) devDependencies[key] = latestVersion;
  });

  await Promise.all([...promises1, ...promises2]);

  return JSON.stringify(pkg, null, 2);
}
