# windows-docker-machine-cli

A tiny wrapper around [windows-docker-machine](https://github.com/StefanScherer/windows-docker-machine) to run Windows Docker Images on all platforms.

## Installation:

For caching reasons the cli works best if it is installed first.

```bash
  npm install windows-docker-machine
```

To use the CLI the following tools must be installed:

  - [VirtualBox](https://www.virtualbox.org/)
  - [Docker](https://www.docker.com/)
  - [Vagrant](https://www.vagrantup.com/)

## Usage:

```bash
  npx windows-docker-machine
```

![Preview](https://github.com/jantimon/windows-docker-machine-cli/blob/master/preview.gif?raw=true)

[![Windows Machine Diagram](https://github.com/StefanScherer/windows-docker-machine/blob/main/images/packer_vagrant_docker.png)](https://github.com/StefanScherer/windows-docker-machine/)

## Running docker images

`run` supports all [`docker run`](https://docs.docker.com/engine/reference/run/) options:

```bash
npx windows-docker-machine run hello-world
```

```bash
npx windows-docker-machine run -d -p 8000:80 -v C:/$(pwd):C:/inetpub/wwwroot/content mcr.microsoft.com/windows/servercore/iis
```

## Keep docker image up

By default windows-docker-machine will cleanup once the image execution is finished. This behaviour can be disabled with the `--noCleanup` flag. 

```bash
npx windows-docker-machine run --noCleanup hello-world
```

## Custom Vagrantfile options

It is possible to provide custom vagrant options.  
This will allow for example to forward specific ports.

Vagrantfile

```ruby
# -*- mode: ruby -*-
# vi: set ft=ruby :
Vagrant.configure("2") do |config|
    config.vm.network "forwarded_port", guest: 8000, host: 8000, auto_correct: true
end
```

```bash
npx windows-docker-machine run --vagrantfile=Vagrantfile hello-world
```

## Docker Compose

Right now docker-compose has no support for docker context.  
To make use of docker-compose windows-docker-machine-cli adds a workaround which executes docker-compose directly inside the vagrant image:

```bash
npx windows-docker-machine docker-compose up
```

## windows-docker-machine

Almost all features have been developed by Stefan Scherer in [windows-docker-machine](https://github.com/StefanScherer/windows-docker-machine)

## License

This project is licensed under [MIT](https://github.com/jantimon/windows-docker-machine-cli/blob/master/LICENSE).
