/// @ts-check
const util = require("util");
const Vagrant = require('./vagrant');
const shellEscape = require('shell-escape');

/**
 * 
 * @param {unknown} vagrantfile 
 * @param {string[]} cliCommands 
 */
async function provisionDockerCompose(vagrantfile, cliCommands) {
  await Vagrant.launchVagrant(vagrantfile, `

## provision docker installation
$dockerComposeProvisionScript = <<-SCRIPT

echo "Installing docker compose - this will take some minutes"

[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
Invoke-WebRequest "https://github.com/docker/compose/releases/download/1.26.0/docker-compose-Windows-x86_64.exe" -UseBasicParsing -OutFile "C:/Program Files/Docker/docker-compose.exe"

SCRIPT

## provision docker command
$dockerComposeLaunch = <<-SCRIPT

cd C:/cwd/
echo ${shellEscape([shellEscape(cliCommands)])}

${shellEscape(cliCommands)}

SCRIPT

Vagrant.configure("2") do |config|
  config.vm.synced_folder "${process.cwd()}", "/cwd", disabled: false
  config.vm.provision "shell", inline: $dockerComposeProvisionScript
  config.vm.provision :shell, :inline => $dockerComposeLaunch, run: "always"
end
`);
}

module.exports = {
  provisionDockerCompose
}