const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const YAML = require('yaml'); // Added line to require YAML
const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public'));

let dockerfiles = [];
let buildInProgress = false;

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/dockerfiles', (req, res) => {
  res.json(dockerfiles.map(dockerfile => path.dirname(dockerfile)));
});

app.post('/api/build', (req, res) => {
  const selectedImages = req.body.selectedImages;
  buildDockerImages(selectedImages);
  res.sendStatus(200);
});

app.get('/api/buildStatus', (req, res) => {
  res.json({ buildInProgress });
});

app.get('/api/deletePods', (req, res) => {
  deleteAksPods();
  res.sendStatus(200);
});

try {
  // The following code is commented out because it depends on your project structure.
  /*
  const backDirectories = fs.readdirSync(path.join(__dirname, '..', 'back', 'perks'))
    .filter(directory => fs.statSync(path.join(__dirname, '..', 'back', 'perks', directory)).isDirectory());

  const frontDirectories = ['dir2', 'dir1'];
  */

  const directories = [...backDirectories, ...frontDirectories];

  console.log(directories);

  // The following code is commented out because it depends on your project structure.
  // Adjust the paths according to where your Dockerfiles are located in your project.
  /*
  dockerfiles = directories.map(directory => {
    const backPath = path.join(__dirname, '..', 'back', 'perks', directory, 'Dockerfile');
    const frontPath = path.join(__dirname, '..', 'front', directory, 'Dockerfile');
    return fs.existsSync(backPath) ? backPath : (fs.existsSync(frontPath) ? frontPath : null);
  }).filter(dockerfile => dockerfile !== null);
  */

  console.log(dockerfiles);
} catch (error) {
  console.error('Failed to get the dockerfiles:', error);
}

console.log(JSON.stringify(dockerfiles.map(dockerfile => path.dirname(dockerfile))));
console.log(JSON.stringify(dockerfiles));

const versioningFilePath = path.join(__dirname, 'versioning.json');

function deleteAksPods() {
  
  console.log("Deleting all pods in microservice-deployment...");
  const deletePodsCommand = 'kubectl delete pods --selector=app=microservices --wait=false';
  try {
    execSync(deletePodsCommand, { stdio: 'inherit' });

  } catch (error) {
    console.error("Failed to delete pods:", error);
  }

}

function buildDockerImages(selectedImages) {
  buildInProgress = true;

  let versioningData = [];
  let thisVersion = [];
  if (fs.existsSync(versioningFilePath)) {
    const versioningFileContent = fs.readFileSync(versioningFilePath, 'utf8');
    versioningData = JSON.parse(versioningFileContent);

    // Filter versioningData for the highest available version
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

    const [highestMajor, highestMinor, highestPatch] = highestVersion.Tag.split('.').map(Number);

    // Increment the highest patch version to get the new version
    const newVersion = `${highestMajor}.${highestMinor}.${highestPatch + 1}`;

    // The following command is commented out because it depends on your environment
    // execSync('docker login .azurecr.io', { stdio: 'inherit' });

    dockerfiles.forEach(dockerfile => {
      const directory = path.relative(path.join(__dirname, '..'), path.dirname(dockerfile));
      const imageName = directory.split(path.sep).pop();
      console.log(imageName);
      // const acr = '.azurecr.io'; // This line is commented out because it depends on your environment
      const port = fs.readFileSync(dockerfile, 'utf8')
        .match(/EXPOSE (\d+)/)?.[1];

      
      if (selectedImages.some(image => image.includes(imageName))) {
        console.log("Building " + imageName);
        const latestVersionIndex = versioningData.findIndex(data => data.Name === imageName);

        const imageTag = 'latest';

        console.log(`Building Docker image with tag ${imageName}:${imageTag} from directory ../${directory}`);
        console.log(`docker build --no-cache -t ${imageName}:${imageTag} ../${directory}`); // Print the docker command before running it
        const buildOutput = execSync(`docker build -t ${imageName}:${imageTag} ../${directory}`).toString(); // Capture the output
        console.log(buildOutput); // Print the output
        console.log(`Tagging Docker image ${imageName}:${imageTag} as ${acr}/${imageName}:${imageTag}`);
        console.log(`docker tag ${imageName}:${imageTag} ${acr}/${imageName}:${imageTag}`); // Print the docker command before running it
        const tagOutput = execSync(`docker tag ${imageName}:${imageTag} ${acr}/${imageName}:${imageTag}`).toString(); // Capture the output
        console.log(tagOutput); // Print the output

        console.log(`Pushing Docker image ${acr}/${imageName}:${imageTag} to the registry`);
        console.log(`docker push ${acr}/${imageName}:${imageTag}`); // Print the docker command before running it
        execSync(`docker push ${acr}/${imageName}:${imageTag}`, { stdio: 'inherit' }); // Execute the command with live output

        versioningData.push({ Deployment: 'Images', Name: imageName, Tag: imageTag, ACR: acr, Port: port });
        thisVersion.push({ Deployment: 'Images', Name: imageName, Tag: imageTag, ACR: acr, Port: port });
      }
    });

    console.log("Deleting all pods in perks-microservice-deployment...");
    const deletePodsCommand = 'kubectl delete pods --selector=app=microservice --wait=false';
    try {
      const deletePodsOutput = execSync(deletePodsCommand).toString();
      console.log("Pods deletion initiated successfully.");
      console.log(deletePodsOutput);
    } catch (error) {
      console.error("Failed to delete pods:", error);
    }

    // const servicesDirectory = path.join(__dirname, '..', 'services'); // This line is commented out because it depends on your environment
    const serviceDockerfiles = fs.readdirSync(servicesDirectory);

    serviceDockerfiles.forEach(directory => {
      const imageName = `${directory}`;
      // const acr = 'azurecr.io'; // This line is commented out because it depends on your environment
      const port = fs.readFileSync(path.join(servicesDirectory, directory, 'Dockerfile'), 'utf8')
        .match(/EXPOSE (\d+)/)?.[1];

      if (port && selectedImages.includes(imageName)) {
        if (imageName === 'calo-postgresql') {
          console.log(`Building Docker image with tag ${imageName}:latest from directory ${servicesDirectory}/${directory}`);
          console.log(`docker build --no-cache -t ${imageName}:latest ${servicesDirectory}/${directory}`); // Print the docker command before running it
          execSync(`docker build --no-cache -t ${imageName}:latest ${servicesDirectory}/${directory}`, { stdio: 'inherit' }); // Persist command line context
        } else {
          console.log(`Building Docker image with tag ${imageName}:latest from directory ${servicesDirectory}/${directory}`);
          console.log(`docker build -t ${imageName}:latest ${servicesDirectory}/${directory}`); // Print the docker command before running it
          execSync(`docker build --no-cache -t ${imageName}:latest ${servicesDirectory}/${directory}`, { stdio: 'inherit' }); // Persist command line context
        }

        console.log(`Tagging Docker image ${imageName}:latest as ${acr}/${imageName}:latest`);
        console.log(`docker tag ${imageName}:latest ${acr}/${imageName}:latest`); // Print the docker command before running it
        execSync(`docker tag ${imageName}:latest ${acr}/${imageName}:latest`, { stdio: 'inherit' }); // Persist command line context

        console.log(`Pushing Docker image ${acr}/${imageName}:latest to the registry`);
        console.log(`docker push ${acr}/${imageName}:latest`); // Print the docker command before running it
        execSync(`docker push ${acr}/${imageName}:latest`, { stdio: 'inherit' }); // Persist command line context

        versioningData.push({ Deployment: 'Images', Name: imageName, Tag: 'latest', ACR: acr, Port: port });
        thisVersion.push({ Deployment: 'Images', Name: imageName, Tag: 'latest', ACR: acr, Port: port });
      }
    });


    
    fs.writeFileSync(versioningFilePath, JSON.stringify(versioningData, null, 2), 'utf8');
  }

  buildInProgress = false;
}

function incrementVersion(version) {
  const versionParts = version.split('.');
  if (versionParts.length !== 3) {
    return 'Invalid version format';
  }

  const [major, minor, patch] = versionParts.map(Number);
  if (isNaN(major) || isNaN(minor) || isNaN(patch)) {
    return 'Invalid version format';
  }

  if (patch < 9) {
    return `${major}.${minor}.${patch + 1}`;
  } else if (minor < 9) {
    return `${major}.${minor + 1}.0`;
  } else {
    return `${major + 1}.0.0`;
  }
}

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
