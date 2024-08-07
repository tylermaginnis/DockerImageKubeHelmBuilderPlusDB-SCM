const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const versioningFilePath = path.join(__dirname, 'versioning.json');

if (fs.existsSync(versioningFilePath)) {
  const versioningFileContent = fs.readFileSync(versioningFilePath, 'utf8');
  const versioningData = JSON.parse(versioningFileContent);

  const highestVersion = versioningData.reduce((highest, current) => {
    const [major, minor, patch] = current.Tag.split('.').map(Number);
    const [highestMajor, highestMinor, highestPatch] = highest.Tag.split('.').map(Number);

    if (major > highestMajor ||
      (major === highestMajor && minor > highestMinor) ||
      (major === highestMajor && minor === highestMinor && patch > highestPatch)) {
      return current;
    } else {
      return highest;
    }
  });

  const helmYamlContent = versioningData
    .filter(data => data.Tag === highestVersion.Tag)
    .map(data => ({
      apiVersion: 'v2',
      name: data.Name,
      description: `A Helm chart for deploying the ${data.Name}`,
      version: data.Tag,
      repository: data.ACR,
      image: data.Name,
      tag: data.Tag
    }));

  console.log('Debugging - helmYamlContent:', helmYamlContent); // Add debugging

  fs.writeFileSync('helm.yml', YAML.stringify(helmYamlContent), 'utf8');
}
