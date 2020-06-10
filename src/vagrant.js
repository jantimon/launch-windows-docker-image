/// @ts-check
const util = require('util');
const child_process = require('child_process');
const exec = util.promisify(child_process.exec);
const path = require('path');
const spawn = require('./spawn').spawn;
const writeFile = util.promisify(require('fs').writeFile);
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

async function startMachine(config='', box = defaultBox) {
  await writeVagrantConfig(config);
  await spawn('vagrant', ['up', box], {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '../windows-docker-machine'),
    env: {
      ...process.env,
      VAGRANT_VAGRANTFILE: getVagrantOverwriteFileName()
    }
  });
}

async function reloadMachine(config='', box = defaultBox) {
  await writeVagrantConfig(config);
  await spawn('vagrant', ['up', box], {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '../windows-docker-machine'),
    env: {
      ...process.env,
      VAGRANT_VAGRANTFILE: getVagrantOverwriteFileName()
    }
  });
}

/**
 * Write a Vagrantfile with additional settings to 
 * the base windows-docker-machine Vagrantfile 
 * 
 * @param {string} config 
 */
async function writeVagrantConfig(config) {
  await writeFile(getVagrantOverwriteFilePath(), `
    base_vagrantfile = './Vagrantfile'
    load base_vagrantfile
    ${config}
  `);
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

module.exports = {
  getVagrantVersion,
  vagrantSupportsConfig,
  isVagrantInstalled,
  execute,
  destroy,
  startMachine,
  reloadMachine,
  isVagrantBoxRunning,
}