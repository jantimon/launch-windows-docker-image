#!/usr/bin/env node
/// @ts-check
const Docker = require("../src/docker");
const Vagrant = require("../src/vagrant");
const VirtualBox = require("../src/virtualbox");
const yargs = require("yargs");
const fs = require("fs");

yargs
  .command(
    "powershell",
    "starts powershell inside a docker image",
    (yargs) => {
      yargs.option("noCleanup", {
        type: "boolean",
        description: "Keep VM instance",
      })
    },
    (argv) => launchPowerShell(Boolean(argv.noCleanup), argv.vagrantfile ? String(argv.vagrantfile): undefined)
  )

  .command(
    "run",
    "runs a docker image",
    (yargs) => {
      yargs.option("noCleanup", {
        type: "boolean",
        description: "Keep VM instance running",
      })
    },
    (argv) => {
      const runIndex = Math.max(process.argv.indexOf("run"), process.argv.indexOf("--noCleanup"));
      if (!runIndex) {
        yargs.showHelp();
        process.exit(1);
      }
      dockerRun(process.argv.slice(runIndex + 1), Boolean(argv.noCleanup), argv.vagrantfile ? String(argv.vagrantfile): undefined);
    }
  )

  .command(
    "halt",
    "shuts down the vagrant image",
    (yargs) => {
      yargs;
    },
    (argv) => vagrantCommand(["halt"])
  )

  .command(
    "destroy",
    "destroy the vagrant image and relaese the disk space",
    (yargs) => {
      yargs;
    },
    (argv) => vagrantCommand(["destroy"])
  )

  .option("verbose", {
    alias: "v",
    type: "boolean",
    description: "Run with verbose logging",
  })

  .option("vagrantfile", {
    type: "string",
    description: "Path to a custom vagrant file",
  })

  .showHelpOnFail(true).argv;

if (!yargs.argv._[0]) {
  yargs.showHelp();
  process.exit(0);
}

/**
 * Assert that prerequisites are installed
 */
async function assertVersions() {
  // Check Versions in Parallel:
  return Promise.all([assertDockerVersion(), assertVagrantVersion()]);
}

async function assertDockerVersion() {
  if (!(await Docker.isDockerInstalled())) {
    console.error("❌ docker cli was not found");
    console.log(
      "Please download the latest docker version from https://docs.docker.com/get-docker/"
    );
    process.exit(1);
  }
  if (!(await Docker.dockerSupportsContext())) {
    console.error(
      `❌ your docker version is to old (${await (
        await Docker.getDockerVersion() || []
      ).join(".")})`
    );
    console.log(
      "Please download the latest docker version from https://docs.docker.com/get-docker/"
    );
    process.exit(1);
  }

  console.log(
    `Docker found: (${await (await Docker.getDockerVersion() || []).join(".")})`
  );
}

async function assertVagrantVersion() {
  if (!(await Vagrant.isVagrantInstalled())) {
    console.error("❌ vagrant cli was not found");
    console.log(
      "Please download the latest vagrant version from https://www.vagrantup.com/downloads"
    );
    process.exit(1);
  }
  if (!(await Vagrant.vagrantSupportsConfig())) {
    console.error(
      `❌ your vagrant version is to old (${await (
        await Vagrant.getVagrantVersion() || []
      ).join(".")})`
    );
    console.log(
      "Please download the latest vagrant version from https://www.vagrantup.com/downloads"
    );
    process.exit(1);
  }

  console.log(
    `Vagrant found: (${(await Vagrant.getVagrantVersion() || []).join(".")})`
  );

  const virtualBoxVersion = await VirtualBox.getVirtualBoxVersion();
  if (virtualBoxVersion) {
    console.log(`VirtualBox found: (${virtualBoxVersion.join(".")})`);
  }
}

/**
 * Launch vagrant for the given vagrant file
 * @param {string} [vagrantFileName] 
 */
async function launchVagrant(vagrantFileName) {
  const config = vagrantFileName ? fs.readFileSync(vagrantFileName, 'utf-8') : '';
  const isBoxRunning = await Vagrant.isVagrantBoxRunning();
  if (isBoxRunning) {
    console.log("vagrant box is already running");
    await Vagrant.reloadMachine(config)
  } else {
    console.log("🚀 launching vagrant");
    await Vagrant.startMachine(config);
  }
}

/**
 * Launch a demo docker image which runs an interactive
 * powershell
 * 
 * @param {boolean} noCleanup
 * @param {string} [vagrantFileName]
 */
async function launchPowerShell(noCleanup, vagrantFileName) {
  await dockerRun([
    "-i",
    "--tty",
    "--volume",
    `C:${process.cwd()}:C:/cwd`,
    "mcr.microsoft.com/windows/servercore:1809",
    "powershell",
  ], noCleanup, vagrantFileName);
}

/**
 * @param {string[]} dockerRunArgs
 * @param {boolean} noCleanup
 * @param {string} [vagrantFileName]
 */
async function dockerRun(dockerRunArgs, noCleanup, vagrantFileName) {
  await assertVersions();
  await launchVagrant(vagrantFileName);
  console.log(`🚀 launch docker\n$ docker run ${dockerRunArgs.join(' ')}`);
  // Always run docker interactive to wait until the docker image shuts down
  await Docker.runDocker(['--interactive', ...dockerRunArgs]);
  if (!noCleanup) {
    await Vagrant.destroy();
  }
}

/**
 * @param {string[]} vagrantArgs
 */
async function vagrantCommand(vagrantArgs) {
  await assertVagrantVersion();
  await Vagrant.execute(vagrantArgs);
}
