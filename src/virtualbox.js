/// @ts-check
const util = require('util');
const child_process = require('child_process');
const exec = util.promisify(child_process.exec);

/** @type {ReturnType<typeof exec>} */
let versionCache;

/**
 * Returns the current installed VirtualBox version
 * @returns {Promise<[number, number, number] | undefined>}
 */
async function getVirtualBoxVersion () {
  try {
    versionCache = versionCache || exec("VirtualBox --help");
    const version = await versionCache;
    /*
    Oracle VM VirtualBox VM Selector v6.1.8
    (C) 2005-2020 Oracle Corporation
    All rights reserved.

    No special options.

    If you are looking for --startvm and related options, you need to use VirtualBoxVM.
    */
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

module.exports = {
  getVirtualBoxVersion,
}