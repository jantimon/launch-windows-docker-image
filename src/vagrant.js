/// @ts-check
const util = require('util');
const child_process = require('child_process');
const exec = util.promisify(child_process.exec);
const path = require('path');
const spawn = require('./spawn').spawn;
const writeFile = util.promisify(require('fs').writeFile);
const exists = util.promisify(require('fs').exists);
const readFile = util.promisify(require('fs').readFile);
const unlink = util.promisify(require('fs').unlink);

/** @type {ReturnType<typeof exec>} */
let versionCache;

/**
 * Returns the current installed Vagrant version
 * @returns {Promise<[number, number, number] | undefined>}
 */
async function getVagrantVersion () {
  try {
    versionCache = versionCache || exec("vagrant --version");
    const version = await versionCache;
    // e.g. Vagrant version 19.03.11, build 42e35e6
    const parsedVersion = String(version.stdout).match(/(\d+)\.(\d+)\.(\d+)/);
    if (parsedVersion) {
      return [Number(parsedVersion[1]), Number(parsedVersion[2]), Number(parsedVersion[3])];
    }
  } catch (e) {
    if (/command not found/.test(String(e.message))) {
      return;
    }
    throw e
  }
}

/**
 * Returns if Vagrant supports context
 */
async function vagrantSupportsConfig() {
  const version = await getVagrantVersion();
  if (!isVagrantInstalled() || !version) {
    return false;
  }
  const [major, minor] = version;
  return (major === 2 && minor >= 2) || major > 2;
}

/** 
 * Returns if Vagrant is installed at all
 */
async function isVagrantInstalled() {
  return Boolean(await getVagrantVersion());
}

const defaultBox = "2019-box";

/**
 * 
 * @param {string[]} args 
 * @param {string | false} [box] 
 */
async function execute(args, box = defaultBox) {
  await spawn('vagrant', [...args, ...(box ? [box] : []) ], {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '../windows-docker-machine'),
    env: {
      ...process.env,
      VAGRANT_VAGRANTFILE: getVagrantOverwriteFileName()
    }
  });
}

async function isVagrantBoxRunning(box = defaultBox) {
  const status = await exec('vagrant status ' + box, {
    cwd: path.resolve(__dirname, '../windows-docker-machine'),
  });
  const boxStatus = String(status.stdout).split('\n').find((row) => row.startsWith(box));
  if (!boxStatus) {
    return false;
  }
  return boxStatus.includes('running');
}

/**
 * Destroys the box and delete all files 
 * @param {string} [box]
 */
async function destroy(box) {
  console.log("🧹cleaning up");
  await execute(['halt', '-f'], box);
  await execute(['destroy', '-f'], box);
  await unlink(getVagrantOverwriteFilePath()).catch(console.error);
}

/**
 * Write a Vagrantfile with additional settings to 
 * the base windows-docker-machine Vagrantfile 
 * 
 * @param {string} config 
 */
async function writeVagrantConfig(config) {
  const configContent = `# Generated
base_vagrantfile = './Vagrantfile'
load base_vagrantfile
${config}`;
  let currentConfig = '';
  try {
    currentConfig = await readFile(getVagrantOverwriteFilePath(), 'UTF8');
  } catch(e) {}
  if (currentConfig === configContent) {
    return false;
  }
  await writeFile(getVagrantOverwriteFilePath(), configContent);
  return true;
}

/**
 * Get the base overwrite filename
 */
function getVagrantOverwriteFileName() {
  return 'VagrantfileOverwrites';
}

/**
 * Get the full absolute overwrite file path
 */
function getVagrantOverwriteFilePath() {
  return path.resolve(__dirname, '../windows-docker-machine/', getVagrantOverwriteFileName());
}

/**
 * use the Vagrantfile in the current working directory
 * if a custom vagrantfile path is set use it instead
 * 
 * Returns true if the config was changed
 * 
 * @param {unknown} [vagrantfilePath] 
 * @param {string} [additionalContent] 
 * @returns {Promise<boolean>}
 */
async function useVagrantFile(vagrantfilePath, additionalContent = '') {
  if (typeof vagrantfilePath !== 'string' && typeof vagrantfilePath !== 'undefined') {
    return await writeVagrantConfig('' + '\n' + additionalContent);
  }
  return await writeVagrantConfig(await loadVagrantFile(vagrantfilePath) + '\n' + additionalContent);
}

/**
 * Load a vagrant file - if none is pathed use the 
 * Vagrant file from the current directory
 * 
 * @param {string} [vagrantfilePath] 
 */
async function loadVagrantFile(vagrantfilePath) {
  if (vagrantfilePath) {
    return await readFile(vagrantfilePath, 'UTF8');
  }
  if (await exists('Vagrantfile')) {
    return await readFile("Vagrantfile", 'UTF8');
  }
  return '';
}

/**
 * Launch vagrant for the given vagrant file
 * @param {unknown} [vagrantFileName] 
 * @param {string} [vagrantConfigCommands] 
 */
async function launchVagrant(vagrantFileName, vagrantConfigCommands) {
  const configChanged = useVagrantFile(vagrantFileName, vagrantConfigCommands);
  const isBoxRunning = await isVagrantBoxRunning();
  if (isBoxRunning) {
    console.log("vagrant box is already running");
    if (configChanged) {
      console.log("🚀 vagrant config changed - restart box");
      await execute(["reload"])
    }
  } else {
    console.log("🚀 launching vagrant");
    await execute(["up"]);
  }
}

module.exports = {
  getVagrantVersion,
  vagrantSupportsConfig,
  isVagrantInstalled,
  execute,
  destroy,
  isVagrantBoxRunning,
  useVagrantFile,
  launchVagrant
}