#!/usr/bin/env node
/// @ts-check
const Docker = require("../src/docker");
const Vagrant = require("../src/vagrant");
const VirtualBox = require("../src/virtualbox");
const yargs = require("yargs");

yargs
  .command(
    "powershell",
    "starts powershell inside a docker image",
    (yargs) => {
      yargs.option("cache", {
        type: "boolean",
        description: "Keep VM instance",
      })
    },
    (argv) => launchPowerShell(Boolean(argv.cache))
  )

  .command(
    "run",
    "runs a docker image",
    (yargs) => {
      yargs.option("cache", {
        type: "boolean",
        description: "Keep VM instance",
      })
    },
    (argv) => {
      const runIndex = process.argv.indexOf("run");
      if (!runIndex) {
        yargs.showHelp();
        process.exit(1);
      }
      dockerRun(process.argv.slice(runIndex + 1), Boolean(argv.cache));
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
        await Docker.getDockerVersion()
      ).join(".")})`
    );
    console.log(
      "Please download the latest docker version from https://docs.docker.com/get-docker/"
    );
    process.exit(1);
  }

  console.log(
    `Docker found: (${await (await Docker.getDockerVersion()).join(".")})`
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
        await Vagrant.getVagrantVersion()
      ).join(".")})`
    );
    console.log(
      "Please download the latest vagrant version from https://www.vagrantup.com/downloads"
    );
    process.exit(1);
  }

  console.log(
    `Vagrant found: (${await (await Vagrant.getVagrantVersion()).join(".")})`
  );

  const virtualBoxVersion = await VirtualBox.getVirtualBoxVersion();
  if (virtualBoxVersion) {
    console.log(`VirtualBox found: (${virtualBoxVersion.join(".")})`);
  }
}

async function launchVagrant() {
  const isBoxRunning = await Vagrant.isVagrantBoxRunning();
  if (isBoxRunning) {
    console.log("vagrant box is already running");
  } else {
    console.log("🚀 launching vagrant");
    await Vagrant.execute(["up"]);
  }
}


/**
 * @param {boolean} cache
 */
async function launchPowerShell(cache) {
  await assertVersions();
  await launchVagrant();
  await Docker.launchPowerShell();
  if (!cache) {
    await Vagrant.destroy();
  }
}

/**
 * @param {string[]} dockerRunArgs
 * @param {boolean} cache
 */
async function dockerRun(dockerRunArgs, cache) {
  await assertVersions();
  await launchVagrant();
  await Docker.runDocker(dockerRunArgs);
  if (!cache) {
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
