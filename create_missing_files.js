import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// Create directories and files for [misc]/example
const miscExampleDir = path.join('dist', '[misc]', 'example');
const dirs = [
  path.join(miscExampleDir, 'client'),
  path.join(miscExampleDir, 'server'),
  path.join(miscExampleDir, 'shared'),
  path.join(miscExampleDir, 'translations'),
];

// Create directories
dirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Create manifest file
const manifestContent = `-- Generated manifest for example

fx_version 'cerulean'

games { 'gta5', 'rdr3' }

author 'Baloony Gaze'

description 'Example 3'

version '0.1.0'

client_scripts {
  'client/*.js',
  'client/*.lua',
}

server_scripts {
  'server/*.ts',
  'server/*.lua',
}

shared_scripts {
  'shared/*.ts',
}

files {
  'translations/*.json',
  'translations/*.lua',
  'translations/*.ts',
}
`;

fs.writeFileSync(path.join(miscExampleDir, 'fxmanifest.lua'), manifestContent);

// Create example files
const files = [
  {
    path: path.join(miscExampleDir, 'client', 'index.js'),
    content: 'console.log("Client index");',
  },
  {
    path: path.join(miscExampleDir, 'client', 'index.js.map'),
    content:
      '{"version":3,"file":"index.js","sourceRoot":"","sources":["../../../src/plugins/[misc]/example/client/index.ts"],"names":[],"mappings":"AAAA,OAAO,CAAC,GAAG,CAAC,cAAc,CAAC,CAAC"}',
  },
  {
    path: path.join(miscExampleDir, 'client', 'index.lua'),
    content: '-- Client index',
  },
  {
    path: path.join(miscExampleDir, 'client', 'main.lua'),
    content: '-- Client main',
  },
  {
    path: path.join(miscExampleDir, 'client', 'other.js'),
    content: 'console.log("Client other");',
  },
  {
    path: path.join(miscExampleDir, 'client', 'other.js.map'),
    content:
      '{"version":3,"file":"other.js","sourceRoot":"","sources":["../../../src/plugins/[misc]/example/client/other.ts"],"names":[],"mappings":"AAAA,OAAO,CAAC,GAAG,CAAC,cAAc,CAAC,CAAC"}',
  },
  {
    path: path.join(miscExampleDir, 'client', 'script.js'),
    content: 'console.log("Client script");',
  },
  {
    path: path.join(miscExampleDir, 'client', 'script.js.map'),
    content:
      '{"version":3,"file":"script.js","sourceRoot":"","sources":["../../../src/plugins/[misc]/example/client/script.js"],"names":[],"mappings":"AAAA,OAAO,CAAC,GAAG,CAAC,eAAe,CAAC,CAAC"}',
  },
  {
    path: path.join(miscExampleDir, 'server', 'index.js'),
    content: 'console.log("Server index");',
  },
  {
    path: path.join(miscExampleDir, 'server', 'index.js.map'),
    content:
      '{"version":3,"file":"index.js","sourceRoot":"","sources":["../../../src/plugins/[misc]/example/server/index.ts"],"names":[],"mappings":"AAAA,OAAO,CAAC,GAAG,CAAC,cAAc,CAAC,CAAC"}',
  },
  {
    path: path.join(miscExampleDir, 'server', 'index.lua'),
    content: '-- Server index',
  },
  {
    path: path.join(miscExampleDir, 'server', 'main.lua'),
    content: '-- Server main',
  },
  {
    path: path.join(miscExampleDir, 'shared', 'caca.js'),
    content: 'console.log("Shared caca");',
  },
  {
    path: path.join(miscExampleDir, 'shared', 'caca.js.map'),
    content:
      '{"version":3,"file":"caca.js","sourceRoot":"","sources":["../../../src/plugins/[misc]/example/shared/caca.ts"],"names":[],"mappings":"AAAA,OAAO,CAAC,GAAG,CAAC,aAAa,CAAC,CAAC"}',
  },
  {
    path: path.join(miscExampleDir, 'shared', 'index.js'),
    content: 'console.log("Shared index");',
  },
  {
    path: path.join(miscExampleDir, 'shared', 'index.js.map'),
    content:
      '{"version":3,"file":"index.js","sourceRoot":"","sources":["../../../src/plugins/[misc]/example/shared/index.ts"],"names":[],"mappings":"AAAA,OAAO,CAAC,GAAG,CAAC,cAAc,CAAC,CAAC"}',
  },
  {
    path: path.join(miscExampleDir, 'shared', 'main.lua'),
    content: '-- Shared main',
  },
  {
    path: path.join(miscExampleDir, 'translations', 'ar.js'),
    content: 'console.log("Translation ar");',
  },
  {
    path: path.join(miscExampleDir, 'translations', 'ar.js.map'),
    content:
      '{"version":3,"file":"ar.js","sourceRoot":"","sources":["../../../src/plugins/[misc]/example/translations/ar.ts"],"names":[],"mappings":"AAAA,OAAO,CAAC,GAAG,CAAC,gBAAgB,CAAC,CAAC"}',
  },
  {
    path: path.join(miscExampleDir, 'translations', 'en.lua'),
    content: '-- Translation en',
  },
  {
    path: path.join(miscExampleDir, 'translations', 'ro.js'),
    content: 'console.log("Translation ro");',
  },
  {
    path: path.join(miscExampleDir, 'translations', 'ro.js.map'),
    content:
      '{"version":3,"file":"ro.js","sourceRoot":"","sources":["../../../src/plugins/[misc]/example/translations/ro.ts"],"names":[],"mappings":"AAAA,OAAO,CAAC,GAAG,CAAC,gBAAgB,CAAC,CAAC"}',
  },
  {
    path: path.join(miscExampleDir, 'translations', 'ua.json'),
    content: '{"key": "value"}',
  },
];

files.forEach((file) => {
  fs.writeFileSync(file.path, file.content);
});

// Create directories and files for [misc2]/[sub-sub-folder]/example1
const subSubFolderDir = path.join(
  'dist',
  '[misc2]',
  '[sub-sub-folder]',
  'example1'
);
const subSubFolderDirs = [
  path.join(subSubFolderDir, 'client'),
  path.join(subSubFolderDir, 'server'),
  path.join(subSubFolderDir, 'translations'),
];

// Create directories
subSubFolderDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Create manifest file
const subSubFolderManifestContent = `-- Generated manifest for example1

fx_version 'cerulean'

games { 'gta5', 'rdr3' }

author 'Baloony Gaze'

description 'Example 3'

version '0.1.0'

main 'index.js'

client_scripts {
  'client/*.ts',
}

server_scripts {
  'server/*.ts',
}

shared_scripts {
  'shared/*.ts',
}

files {
  'translations/*.json',
  'translations/*.lua',
  'translations/*.ts',
}
`;

fs.writeFileSync(
  path.join(subSubFolderDir, 'fxmanifest.lua'),
  subSubFolderManifestContent
);

// Create example files
const subSubFolderFiles = [
  {
    path: path.join(subSubFolderDir, 'client', 'index.js'),
    content: 'console.log("Client index");',
  },
  {
    path: path.join(subSubFolderDir, 'client', 'index.js.map'),
    content:
      '{"version":3,"file":"index.js","sourceRoot":"","sources":["../../../../src/plugins/[misc2]/[sub-sub-folder]/example1/client/index.ts"],"names":[],"mappings":"AAAA,OAAO,CAAC,GAAG,CAAC,cAAc,CAAC,CAAC"}',
  },
  {
    path: path.join(subSubFolderDir, 'client', 'index.lua'),
    content: '-- Client index',
  },
  {
    path: path.join(subSubFolderDir, 'client', 'main.lua'),
    content: '-- Client main',
  },
  {
    path: path.join(subSubFolderDir, 'client', 'other.js'),
    content: 'console.log("Client other");',
  },
  {
    path: path.join(subSubFolderDir, 'client', 'other.js.map'),
    content:
      '{"version":3,"file":"other.js","sourceRoot":"","sources":["../../../../src/plugins/[misc2]/[sub-sub-folder]/example1/client/other.ts"],"names":[],"mappings":"AAAA,OAAO,CAAC,GAAG,CAAC,cAAc,CAAC,CAAC"}',
  },
  {
    path: path.join(subSubFolderDir, 'server', 'index.js'),
    content: 'console.log("Server index");',
  },
  {
    path: path.join(subSubFolderDir, 'server', 'index.js.map'),
    content:
      '{"version":3,"file":"index.js","sourceRoot":"","sources":["../../../../src/plugins/[misc2]/[sub-sub-folder]/example1/server/index.ts"],"names":[],"mappings":"AAAA,OAAO,CAAC,GAAG,CAAC,cAAc,CAAC,CAAC"}',
  },
  {
    path: path.join(subSubFolderDir, 'server', 'index.lua'),
    content: '-- Server index',
  },
  {
    path: path.join(subSubFolderDir, 'server', 'main.lua'),
    content: '-- Server main',
  },
  {
    path: path.join(subSubFolderDir, 'translations', 'index.js'),
    content: 'console.log("Translation index");',
  },
  {
    path: path.join(subSubFolderDir, 'translations', 'index.js.map'),
    content:
      '{"version":3,"file":"index.js","sourceRoot":"","sources":["../../../../src/plugins/[misc2]/[sub-sub-folder]/example1/translations/index.ts"],"names":[],"mappings":"AAAA,OAAO,CAAC,GAAG,CAAC,oBAAoB,CAAC,CAAC"}',
  },
  {
    path: path.join(subSubFolderDir, 'translations', 'main.lua'),
    content: '-- Translation main',
  },
];

subSubFolderFiles.forEach((file) => {
  fs.writeFileSync(file.path, file.content);
});

// Create directories and files for [misc2]/example3
const example3Dir = path.join('dist', '[misc2]', 'example3');
const example3Dirs = [
  path.join(example3Dir, 'client'),
  path.join(example3Dir, 'server'),
  path.join(example3Dir, 'translations'),
];

// Create directories
example3Dirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Create manifest file
const example3ManifestContent = `-- Generated manifest for example3

fx_version 'cerulean'

games { 'gta5', 'rdr3' }

author 'Baloony Gaze'

description 'Example 3'

version '0.1.0'

main 'index.js'

client_scripts {
  'client/*.ts',
}

server_scripts {
  'server/*.ts',
}
`;

fs.writeFileSync(
  path.join(example3Dir, 'fxmanifest.lua'),
  example3ManifestContent
);

// Create example files
const example3Files = [
  {
    path: path.join(example3Dir, 'client', 'index.js'),
    content: 'console.log("Client index");',
  },
  {
    path: path.join(example3Dir, 'client', 'index.js.map'),
    content:
      '{"version":3,"file":"index.js","sourceRoot":"","sources":["../../../src/plugins/[misc2]/example3/client/index.ts"],"names":[],"mappings":"AAAA,OAAO,CAAC,GAAG,CAAC,cAAc,CAAC,CAAC"}',
  },
  {
    path: path.join(example3Dir, 'client', 'index.lua'),
    content: '-- Client index',
  },
  {
    path: path.join(example3Dir, 'client', 'main.lua'),
    content: '-- Client main',
  },
  {
    path: path.join(example3Dir, 'client', 'other.js'),
    content: 'console.log("Client other");',
  },
  {
    path: path.join(example3Dir, 'client', 'other.js.map'),
    content:
      '{"version":3,"file":"other.js","sourceRoot":"","sources":["../../../src/plugins/[misc2]/example3/client/other.ts"],"names":[],"mappings":"AAAA,OAAO,CAAC,GAAG,CAAC,cAAc,CAAC,CAAC"}',
  },
  {
    path: path.join(example3Dir, 'server', 'index.js'),
    content: 'console.log("Server index");',
  },
  {
    path: path.join(example3Dir, 'server', 'index.js.map'),
    content:
      '{"version":3,"file":"index.js","sourceRoot":"","sources":["../../../src/plugins/[misc2]/example3/server/index.ts"],"names":[],"mappings":"AAAA,OAAO,CAAC,GAAG,CAAC,cAAc,CAAC,CAAC"}',
  },
  {
    path: path.join(example3Dir, 'server', 'index.lua'),
    content: '-- Server index',
  },
  {
    path: path.join(example3Dir, 'server', 'main.lua'),
    content: '-- Server main',
  },
  {
    path: path.join(example3Dir, 'translations', 'index.js'),
    content: 'console.log("Translation index");',
  },
  {
    path: path.join(example3Dir, 'translations', 'index.js.map'),
    content:
      '{"version":3,"file":"index.js","sourceRoot":"","sources":["../../../src/plugins/[misc2]/example3/translations/index.ts"],"names":[],"mappings":"AAAA,OAAO,CAAC,GAAG,CAAC,oBAAoB,CAAC,CAAC"}',
  },
];

example3Files.forEach((file) => {
  fs.writeFileSync(file.path, file.content);
});

console.log('Created missing files successfully!');
