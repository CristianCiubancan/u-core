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
  { name: 'sessionmanager', category: '[system]' },
  { name: 'mapmanager', category: '[managers]' },
  { name: 'spawnmanager', category: '[managers]' },
  { name: 'basic-gamemode', category: '[gamemodes]' },
  { name: 'hardcap', category: '[system]' },
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

// Function to check if a resource exists in any subdirectory
const resourceExistsInAnySubdir = (resourceName) => {
  // Check direct path
  if (fs.existsSync(path.join(resourcesPath, resourceName))) {
    return true;
  }

  // Check in subdirectories
  try {
    const subdirs = fs
      .readdirSync(resourcesPath, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    for (const subdir of subdirs) {
      if (fs.existsSync(path.join(resourcesPath, subdir, resourceName))) {
        return true;
      }
    }
  } catch (error) {
    console.warn(
      chalk.yellow(`Error checking subdirectories: ${error.message}`)
    );
  }

  return false;
};

// Print warning for missing essential resources
console.log(chalk.blue('Checking for essential resources...'));
const missingResources = [];

essentialResources.forEach((resource) => {
  // Check if resource exists in its category or directly
  const resourceExists =
    fs.existsSync(path.join(resourcesPath, resource.category, resource.name)) ||
    resourceExistsInAnySubdir(resource.name);

  const isStartedInConfig =
    serverCfgContent.includes(`ensure ${resource.name}`) ||
    serverCfgContent.includes(`start ${resource.name}`);

  if (!resourceExists) {
    missingResources.push(resource.name);
  } else if (!isStartedInConfig) {
    console.warn(
      chalk.yellow(
        `Warning: Resource '${resource.name}' exists but is not started in server.cfg`
      )
    );
    console.warn(
      chalk.yellow(
        `         Add 'ensure ${resource.name}' to your server.cfg file.`
      )
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
    return stdout.trim().length > 0 ? stdout : false;
  } catch (error) {
    // If the command fails, the port is not in use
    return false;
  }
};

// Function to kill a process by PID
const killProcessByPid = async (pid) => {
  const execPromise = promisify(exec);
  try {
    await execPromise(`taskkill /F /PID ${pid}`);
    return true;
  } catch (error) {
    console.error(
      chalk.red(`Failed to kill process with PID ${pid}: ${error.message}`)
    );
    return false;
  }
};

// Function to check if a process is FXServer
const isFXServerProcess = async (pid) => {
  const execPromise = promisify(exec);
  try {
    const { stdout } = await execPromise(
      `wmic process where "ProcessId=${pid}" get CommandLine`
    );
    return stdout.includes('FXServer') || stdout.includes('fivem');
  } catch (error) {
    return false;
  }
};

// Check if the default FiveM port (30120) is in use
const DEFAULT_PORT = 30120;
const portCheck = await isPortInUse(DEFAULT_PORT);

if (portCheck) {
  console.warn(
    chalk.yellow(`Warning: Port ${DEFAULT_PORT} is already in use.`)
  );

  // Extract PIDs from netstat output
  const lines = portCheck.split('\n');
  const pids = new Set();

  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 5) {
      const pid = parts[4];
      pids.add(pid);
    }
  }

  if (pids.size > 0) {
    // Check if any of the processes are FXServer
    let fxServerRunning = false;
    for (const pid of pids) {
      if (await isFXServerProcess(pid)) {
        fxServerRunning = true;
        console.warn(
          chalk.yellow(`FiveM server is already running with PID ${pid}.`)
        );
      }
    }

    if (fxServerRunning) {
      const answer = await new Promise((resolve) => {
        process.stdout.write(
          chalk.yellow(
            'Do you want to kill the existing server and start a new one? (y/n): '
          )
        );
        process.stdin.once('data', (data) => {
          resolve(data.toString().trim().toLowerCase());
        });
      });

      if (answer !== 'y') {
        console.log(chalk.blue('Exiting without starting a new server.'));
        process.exit(0);
      }
    }

    console.warn(
      chalk.yellow('Attempting to kill processes using this port...')
    );

    for (const pid of pids) {
      console.warn(chalk.yellow(`Killing process with PID ${pid}...`));
      const success = await killProcessByPid(pid);
      if (success) {
        console.log(chalk.green(`Successfully killed process with PID ${pid}`));
      }
    }

    // Wait a moment for the ports to be released
    console.log(chalk.blue('Waiting for ports to be released...'));
    await new Promise((resolve) => setTimeout(resolve, 2000));
  } else {
    console.warn(
      chalk.yellow('Could not identify the processes using this port.')
    );
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
  console.log(chalk.yellow('Received SIGTERM. Shutting down FiveM server...'));
  serverProcess.kill('SIGTERM');
});
