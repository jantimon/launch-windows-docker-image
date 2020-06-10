/// @ts-check
const util = require("util");
const path = require("path");
const exec = util.promisify(require("child_process").exec);
const spawn = require("./spawn").spawn;

/** @type {ReturnType<typeof exec>} */
let versionCache;

/**
 * Returns the current installed docker version
 * @returns {Promise<[number, number, number] | undefined>}
 */
async function getDockerVersion() {
  try {
    versionCache = versionCache || exec("docker --version");
    const version = await versionCache;
    // e.g. Docker version 19.03.11, build 42e35e6
    const parsedVersion = String(version.stdout).match(/(\d+)\.(\d+)\.(\d+)/);
    if (parsedVersion) {
      return [
        Number(parsedVersion[1]),
        Number(parsedVersion[2]),
        Number(parsedVersion[3]),
      ];
    }
  } catch (e) {
    if (/command not found/.test(String(e.message))) {
      console.log(e);
      return;
    }
    if (/invalid character.+in host name/.test(String(e.message))) {
      const homeDir = process.env.HOME ? path.resolve(process.env.HOME) : '~';
      console.error(
        `\nError in docker context configuration.\n\nPlease remove "currentContext" from ${path.join(
          homeDir,
          ".docker/config.json"
        )} manually.\n See also https://github.com/StefanScherer/windows-docker-machine/issues/67\n`
      );
      console.log(e);
      process.exit(1);
    }
    throw e;
  }
}

/**
 * Returns if docker supports context
 */
async function dockerSupportsContext() {
  const version = await getDockerVersion()
  if (!isDockerInstalled() || !version) {
    return false;
  }
  const [major, minor] = version;
  return (major === 19 && minor >= 3) || major > 19;
}

/**
 * Returns if docker is installed at all
 */
async function isDockerInstalled() {
  return Boolean(await getDockerVersion());
}

async function setContext(box = "2019-box") {
  await spawn("docker", ["context", "use", box], {
    stdio: "inherit",
  });
}

/**
 * Run a docker image using windows-docker-machine
 * 
 * e.g.:
 *   
 * @param {string[]} args 
 * @param {string} [box] 
 */
async function runDocker(args, box) {
  await setContext(box);
  await spawn("docker", ["run", ...args], {
    stdio: "inherit",
  });
}

module.exports = {
  getDockerVersion,
  dockerSupportsContext,
  isDockerInstalled,
  setContext,
  runDocker,
};
