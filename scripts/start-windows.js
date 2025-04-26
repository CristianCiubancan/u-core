/**
 * FiveM Server Starter for Windows
 *
 * This script starts the FiveM server using the server.cfg file found in the txData directory
 * for the server specified in the SERVER_NAME environment variable.
 */
import 'dotenv/config';
import { spawn, exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import chalk from 'chalk';
import { promisify } from 'util';

// Get the server name from environment variables
const SERVER_NAME = process.env.SERVER_NAME;

if (!SERVER_NAME) {
  console.error(
    chalk.red('Error: SERVER_NAME environment variable is not set.')
  );
  console.error(
    chalk.yellow(
      'Please make sure you have a .env file with SERVER_NAME defined.'
    )
  );
  process.exit(1);
}

// Define paths
const rootDir = process.cwd();
const fxServerPath = path.join(rootDir, 'fivem-binaries', 'FXServer.exe');
const serverCfgPath = path.join(rootDir, 'txData', SERVER_NAME, 'server.cfg');
const serverDataDir = path.dirname(serverCfgPath);
const resourcesPath = path.join(serverDataDir, 'resources');

// Check if FXServer.exe exists
if (!fs.existsSync(fxServerPath)) {
  console.error(chalk.red(`Error: FXServer.exe not found at ${fxServerPath}`));
  console.error(
    chalk.yellow(
      'Please make sure you have the FiveM server binaries installed.'
    )
  );
  process.exit(1);
}

// Check if server.cfg exists
if (!fs.existsSync(serverCfgPath)) {
  console.error(chalk.red(`Error: server.cfg not found at ${serverCfgPath}`));
  console.error(
    chalk.yellow(
      `Please make sure you have a server.cfg file in the txData/${SERVER_NAME} directory.`
    )
  );
  process.exit(1);
}

// Check for essential resources
const essentialResources = [
  'sessionmanager',
  'mapmanager',
  'spawnmanager',
  'basic-gamemode',
  'hardcap',
];

// Check if resources directory exists
if (!fs.existsSync(resourcesPath)) {
  console.warn(
    chalk.yellow(`Warning: Resources directory not found at ${resourcesPath}`)
  );
  console.warn(chalk.yellow('Creating resources directory...'));
  try {
    fs.mkdirSync(resourcesPath, { recursive: true });
    console.log(chalk.green('Resources directory created successfully.'));
  } catch (error) {
    console.warn(
      chalk.yellow(`Failed to create resources directory: ${error.message}`)
    );
  }
}

// Check server.cfg for resource starts
let serverCfgContent = '';
try {
  serverCfgContent = fs.readFileSync(serverCfgPath, 'utf8');
} catch (error) {
  console.warn(
    chalk.yellow(`Warning: Could not read server.cfg: ${error.message}`)
  );
}

// Print warning for missing essential resources
console.log(chalk.blue('Checking for essential resources...'));
const missingResources = [];

essentialResources.forEach((resource) => {
  const resourceExists = fs.existsSync(path.join(resourcesPath, resource));
  const isStartedInConfig =
    serverCfgContent.includes(`ensure ${resource}`) ||
    serverCfgContent.includes(`start ${resource}`);

  if (!resourceExists) {
    missingResources.push(resource);
  } else if (!isStartedInConfig) {
    console.warn(
      chalk.yellow(
        `Warning: Resource '${resource}' exists but is not started in server.cfg`
      )
    );
    console.warn(
      chalk.yellow(`         Add 'ensure ${resource}' to your server.cfg file.`)
    );
  }
});

if (missingResources.length > 0) {
  console.warn(
    chalk.yellow('Warning: The following essential resources are missing:')
  );
  missingResources.forEach((resource) => {
    console.warn(chalk.yellow(`  - ${resource}`));
  });
  console.warn(
    chalk.yellow('These resources are part of the standard FiveM server setup.')
  );
  console.warn(chalk.yellow('To add these resources:'));
  console.warn(chalk.yellow('1. Download the cfx-server-data repository:'));
  console.warn(
    chalk.yellow(
      '   git clone https://github.com/citizenfx/cfx-server-data.git'
    )
  );
  console.warn(
    chalk.yellow(
      `2. Copy the missing resources from cfx-server-data/resources to ${resourcesPath}`
    )
  );
  console.warn(chalk.yellow('3. Add the following lines to your server.cfg:'));
  missingResources.forEach((resource) => {
    console.warn(chalk.yellow(`   ensure ${resource}`));
  });
}

console.log(chalk.green('Starting FiveM server...'));
console.log(chalk.blue(`Server Name: ${SERVER_NAME}`));
console.log(chalk.blue(`Server Config: ${serverCfgPath}`));
console.log(chalk.blue(`Working Directory: ${serverDataDir}`));

// Function to check if a port is in use
const isPortInUse = async (port) => {
  const execPromise = promisify(exec);
  try {
    // Use netstat to check if the port is in use
    const { stdout } = await execPromise(`netstat -ano | findstr :${port}`);
    return stdout.trim().length > 0;
  } catch (error) {
    // If the command fails, the port is not in use
    return false;
  }
};

// Check if the default FiveM port (30120) is in use
const DEFAULT_PORT = 30120;
isPortInUse(DEFAULT_PORT).then((inUse) => {
  if (inUse) {
    console.warn(
      chalk.yellow(`Warning: Port ${DEFAULT_PORT} is already in use.`)
    );
    console.warn(chalk.yellow('This may cause the server to fail to start.'));
    console.warn(chalk.yellow('Make sure no other FiveM server is running.'));
    console.warn(
      chalk.yellow('You can change the port in your server.cfg file:')
    );
    console.warn(
      chalk.yellow(
        'endpoint_add_tcp "0.0.0.0:XXXX" (replace XXXX with a different port)'
      )
    );
    console.warn(
      chalk.yellow(
        'endpoint_add_udp "0.0.0.0:XXXX" (replace XXXX with a different port)'
      )
    );
  }

  // Start the FiveM server from the server data directory
  const serverProcess = spawn(fxServerPath, ['+exec', 'server.cfg'], {
    stdio: 'inherit',
    shell: true,
    cwd: serverDataDir,
  });

  // Handle server process events
  serverProcess.on('error', (error) => {
    console.error(chalk.red(`Failed to start FiveM server: ${error.message}`));
    process.exit(1);
  });

  serverProcess.on('close', (code) => {
    if (code !== 0) {
      console.error(chalk.red(`FiveM server exited with code ${code}`));
    } else {
      console.log(chalk.green('FiveM server shut down gracefully.'));
    }
  });

  // Handle process termination signals
  process.on('SIGINT', () => {
    console.log(chalk.yellow('Received SIGINT. Shutting down FiveM server...'));
    serverProcess.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    console.log(
      chalk.yellow('Received SIGTERM. Shutting down FiveM server...')
    );
    serverProcess.kill('SIGTERM');
  });
});
