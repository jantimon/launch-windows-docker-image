# windows-docker-machine-cli

A tiny wrapper around [windows-docker-machine](https://github.com/StefanScherer/windows-docker-machine).

Usage:

```bash
  npx windows-docker-machine
```

![Preview](https://github.com/jantimon/windows-docker-machine-cli/blob/master/preview.gif?raw=true)

## Run any docker image

`run` supports all [`docker run`](https://docs.docker.com/engine/reference/run/) options:

```bash
npx windows-docker-machine run hello-world
```

```bash
npx windows-docker-machine run -d -p 8000:80 -v C:/$(pwd):C:/inetpub/wwwroot/content mcr.microsoft.com/windows/servercore/iis
```

## Keep docker image up

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
npx windows-docker-machine --vagrantfile="./Vagrantfile" run hello-world
```

## windows-docker-machine

The main features have been developed by StefanScherer in [windows-docker-machine](https://github.com/StefanScherer/windows-docker-machine)

## License

This project is licensed under [MIT](https://github.com/jantimon/windows-docker-machine-cli/blob/master/LICENSE).