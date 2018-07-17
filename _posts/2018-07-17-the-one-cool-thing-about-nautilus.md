---
title: "The One Cool Thing About Nautilus"
excerpt: "nautilus scripts FTW!"
header:
    overlay_image: "/assets/images/gnome.png"
categories:
    - Linux
author_profile: false
---
{% include toc icon="bars" title="Table of Contents"%}
{:toc}

## Nautilus
> Nautilus is the default file manager in Ubuntu [Gnome](https://help.ubuntu.com/community/DefaultFileManager).

Now they just call it `Gnome Files` but still use `nautilus` name in settings and config files [etc](https://wiki.archlinux.org/index.php/GNOME/Files).<br/>
Forget about this naming debate or which desktop enviroment is better?<br/>
(it's gnome btw but nvm).

## Nautilus Script
The one thing where Linux haven't disappointed us, is that there is always scope of tweaking our OS.
Now the cool thing with nautilus scripts is, we can customize things/operation we can do with right click of mouse.

All you need to do is:
* write a cool script.
* save it as `~/.local/share/nautilus/scripts/cool-script.sh` .
* `chmod +x ~/.local/share/nautilus/scripts/cool-script.sh` .

You can automate lot of stuff like sending selected file as an email attachment or 
something fun like **downloading subtitle** of selected movie file(s).<br/>
we'll do the latter one!

### The Script

{% gist 'prdpx7/bcd732b364cacc92fbc09f6414cfb79c' %}

* You need to install some dependency to run this:
```
sudo apt-get install notify-osd
sudo pip install subliminal
```
### Demo

<img src="/assets/images/nautilus-script.gif" alt="demo" height="550" width="700" />

## Resources
* [NautilusScriptsHowto](https://help.ubuntu.com/community/NautilusScriptsHowto)
* [Nautilus Scripts Collection](http://mundogeek.net/nautilus-scripts/)
* [Subliminal](https://github.com/Diaoul/subliminal)