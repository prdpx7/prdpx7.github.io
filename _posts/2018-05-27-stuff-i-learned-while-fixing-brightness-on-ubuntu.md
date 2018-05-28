---
title: "Stuff i learned while fixing brightness on Ubuntu"
excerpt: "about /sys/, bash stuff and wtf is /etc/rc.local?"
header:
    overlay_image: "/assets/images/header.jpg"
categories:
    - Linux
author_profile: false
---
{% include toc icon="bars" title="Table of Contents" %}
{:toc}

Yeah the obvious solution doesn't work (which is googling and click on the first two links):
* [https://itsfoss.com/fix-brightness-ubuntu-1310/](https://itsfoss.com/fix-brightness-ubuntu-1310/)
* [https://askubuntu.com/questions/762764/cant-change-brightness-in-ubuntu-16-04-lts](https://askubuntu.com/questions/762764/cant-change-brightness-in-ubuntu-16-04-lts)

So I tempted to look for more like how the hell can i actually control the brightness?<br/>
(or how my os do it like it used to do, before?)

## TL;DR
 There is a text file named brightness, deep inside /sys/ dir contains a number which is proportional to the intensity of light coming out of monitor.

## Sysfs
> Sysfs is a virtual filesystem exported by the kernel, similar to /proc. The files in Sysfs contain information about devices and drivers. 
Some files in Sysfs are even writable, for configuration and control of devices attached to the system. Sysfs is always mounted on /sys. [[1]](http://www.signal11.us/oss/udev/)

Inside /sys/ there are multiple dirs like block,class, devices, firmware etc.<br/>
The thing which we are looking for is, some config file which somehow controls brightness!<br/>
```
$ ls /sys/
block  class  devices   fs          kernel  power
bus    dev    firmware  hypervisor  module

$ ls /sys/class/backlight/intel_backlight/ -lah
total 0
drwxr-xr-x 3 root    root    0 May 28 21:46 .
drwxr-xr-x 4 root    root    0 May 28 21:46 ..
-r--r--r-- 1 root    root 4.0K May 28 21:46 actual_brightness
-rw-r--r-- 1 root    root 4.0K May 28 21:46 bl_power
-r--r--r-- 1 root    root 4.0K May 28 20:26 brightness
lrwxrwxrwx 1 root    root    0 May 28 21:46 device -> ../../card0-eDP-1
-r--r--r-- 1 root    root 4.0K May 28 21:46 max_brightness
drwxr-xr-x 2 root    root    0 May 28 21:46 power
lrwxrwxrwx 1 root    root    0 May 28 21:46 subsystem -> ../../../../../../../class/backlight
-r--r--r-- 1 root    root 4.0K May 28 21:46 type
-rw-r--r-- 1 root    root 4.0K May 28 21:46 uevent
```

Woah! there are so many files here, but the one we are looking for is `brightness`.<br/>
more precisely `/sys/class/backlight/intel_backlight/brightness` file.

```
$ cat /sys/class/backlight/intel_backlight/brightness
10
$  cat /sys/class/backlight/intel_backlight/max_brightness
937
```
Yeah these files just contain a number that's it.  the max_brightness my laptop can have is `937` and current brightness is `10`. <br/>
Imagine it like this, 1% of brightness level is equivalent to 9.37 ;)

## The Script
Now that we have found the brightness file, we can just change the number in it and adjust the brightness accordingly.<br/>
Interesting thing is that, we can put only integers in it(`0 <= brightness <= 937`) <br/>
and need root permission to edit the file.
So, i created a script which works like this:
```
$ brightness 100 # set brightness value to 100 in that file
$ brightness asdf # also shows warnings
brighness value should be an +integer
```

The script is pretty simple but i learned some things like:
* Bash and zsh does not work the same way as i used to think.
```
$ zsh
$ x=123
$ # here is snippet to check for integer, notice the '' with regex 
$ if [[ $x =~ '^[0-9]+$' ]]; then
    echo "this is a number";
  else
    echo "not a number";
  fi;
this is a number
$ bash # let do samething in bash
$ x=123
$ if [[ $x =~ '^[0-9]+$' ]]; then
    echo "this is a number";
  else
    echo "not a number";
  fi;
not a number
$ # wtf
$ # let do that again without '' in regex
$ if [[ $x =~ ^[0-9]+$ ]]; then
    echo "this is a number";
  else
    echo "not a number";
  fi;
this is a number
$ # so bash and zsh if conditions doesn't always match
$ # this will work in zsh also, because for zsh  'regex' and regex are the same thing.
```
* here is the final script:

{% gist prdpx7/51fd3fb2f994c43593e9dc2cf70e88d4 %}

## /etc/rc.local

So far we have solved our problem but we always need to change the permission of file to run the script without sudo, because `/sys/class/` files permissions resets to root user on every boot.

So all we need is to automate this task of changing `brightness` file permission after every boot.

Turns out that `/etc/rc.local` is just kind of thing which do similar things
like running a script or starting a service after every boot.(`rc` denotes `run-control` btw)
[[2]](https://unix.stackexchange.com/questions/49626/purpose-and-typical-usage-of-etc-rc-local)

```
$ sudo vim /etc/rc.local
# see the gist
```
{% gist prdpx7/921d9c7ab24fc4ad8bc21392e7b8e95e %}

## But why all this?

Because i don't have anything else to do on weekend!

## References:
* [http://www.signal11.us/oss/udev/](http://www.signal11.us/oss/udev/)
* [https://www.kernel.org/doc/Documentation/filesystems/sysfs.txt](https://www.kernel.org/doc/Documentation/filesystems/sysfs.txt)
* [https://www.tldp.org/HOWTO/HighQuality-Apps-HOWTO/boot.html](https://www.tldp.org/HOWTO/HighQuality-Apps-HOWTO/boot.html)