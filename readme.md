
# Project Overview

This project automates the process of building Docker images and updating Helm charts based on the highest version available in a `versioning.json` file. It includes two main scripts: `HelmUpdate.js` and `DockerBuild.js`.

## HelmUpdate.js

The `HelmUpdate.js` script reads the `versioning.json` file to determine the highest version of each service and generates a `helm.yml` file for Helm chart deployment.

### Key Features:
- Reads the `versioning.json` file to get versioning data.
- Determines the highest version of each service.
- Generates a `helm.yml` file with the necessary Helm chart configuration.

### Usage:

```bash
node HelmUpdate.js
```

## DockerBuild.js

The `DockerBuild.js` script is a Node.js server that provides endpoints to build Docker images, check build status, and delete Kubernetes pods. It also reads the `versioning.json` file to manage versioning of Docker images.

### Key Features:
- Provides a REST API to trigger Docker builds and check build status.
- Reads directories to find Dockerfiles and builds Docker images.
- Manages versioning of Docker images and updates the `versioning.json` file.
- Deletes Kubernetes pods to refresh deployments.

### Endpoints:
- `GET /`: Serves the main HTML page.
- `GET /api/dockerfiles`: Lists available Dockerfiles.
- `POST /api/build`: Triggers the build process for selected images.
- `GET /api/buildStatus`: Checks the build status.
- `GET /api/deletePods`: Deletes Kubernetes pods.

### Usage:
1. Start the server:
    ```bash
    node DockerBuild.js
    ```
2. Access the server at `http://localhost:3000`.

### Example:
To build Docker images, send a POST request to `/api/build` with the selected images in the request body.

```json
{
"selectedImages": ["image1", "image2"]
}```



## Versioning

The `versioning.json` file keeps track of the versions of the Docker images. The scripts read and update this file to ensure the correct versions are used and incremented as needed.

### Example `versioning.json`:

```json
[
{
"Deployment": "Images",
"Name": "service1",
"Tag": "1.0.0",
"ACR": "youracr.azurecr.io",
"Port": "8080"
},
{
"Deployment": "Images",
"Name": "service2",
"Tag": "1.0.1",
"ACR": "youracr.azurecr.io",
"Port": "8081"
}
]```


## Dependencies

- Node.js
- Express
- YAML
- fs (File System)
- path
- child_process (for executing shell commands)

## Installation

1. Clone the repository.
2. Install the dependencies:
    ```bash
    npm install
    ```
3. Ensure you have Docker and Kubernetes (kubectl) installed and configured.

## Contributing

Feel free to submit issues or pull requests. For major changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the MIT License.

## dbunker.js

The `dbunker.js` script is an Express.js server that provides endpoints to dump and load the PostgreSQL database. It can export all tables, views, stored procedures, and functions to JSON files and import them back into the database.

### Key Features:
- Dumps all tables, views, stored procedures, and functions from the PostgreSQL database to JSON files.
- Loads data from JSON files back into the PostgreSQL database.
- Handles column data types and batch inserts for tables.

### Endpoints:
- `GET /api/dumpDatabase`: Dumps the database to JSON files.
- `GET /api/loadDatabase`: Loads the database from JSON files.

### Usage:
1. Start the server:
    ```bash
    node db/dbunker.js
    ```
2. Access the server at `http://localhost:7777`.

### Example:
To dump the database, send a GET request to `/api/dumpDatabase`. To load the database, send a GET request to `/api/loadDatabase`.

### Dependencies:
- Express
- pg (node-postgres)
- fs (File System)
- path

### Installation:
1. Clone the repository.
2. Install the dependencies:
    ```bash
    npm install
    ```
3. Ensure you have PostgreSQL installed and configured.
