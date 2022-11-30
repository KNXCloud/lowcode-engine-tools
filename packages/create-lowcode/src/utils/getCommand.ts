export default function getCommand(packageManager: string, scriptName: string) {
  if (scriptName === 'install') {
    return packageManager === 'yarn' ? 'yarn' : `${packageManager} install`;
  }

  return packageManager === 'npm'
    ? `npm run ${scriptName}`
    : `${packageManager} ${scriptName}`;
}
