---
title: "Hardware is hard?"
date: 2026-04-06
---

I have been feeling hopeless ever since Claude started doing most of my work. I wanted to put the fun back in life by doing something - something which i used to feel back in college, back when i was doing dumb shit - building silly things in python.

I thought how crazy it will be to build a robot? after all, Claude is so smart - why can't i just prompt the shit out of it and build my own silly robot?

So i started browsing internet, checking videos on youtube on how to build a robot. Turns out, it does need a lot of initial investment - atleast INR 20,000 (~ $200). 
i thought i will end up wasting my money by buying all these components and then not able to stitch it together.

While researching, i found out - i don't know anything about anything. 
i don't know how electricity works. 
what's the deal with so many electronics components? 
why is every one of these thing look like a silicon chip with bunch of components stick on it? what's a breadboard? 
wtf is potentiometer? 
and why is everyone is saying don't forget to check voltage with multimeter?

Watching bunch of youtubers making DIY robot didn't help either.


So i thought what if i can make "Hello, World!" equivalent in robotics? I looked around and finally aligned myself to make a toy car - which i can control from my phone over the internet. 


## Building the robot car
To make the robot car or what most tutorial videos call it on youtube, "Arduino 4WD Robot Car", you need to buy bunch of small things and stitch it together.

To keep things simple. let's just assume there is nothing robotic about it. 
just imagine the toy car you had in your childhood - there was a battery and a motor and maybe few wheels. 

when you put one wire to the +ive terminal and another wire to -ive terminal - it makes motor move. if you change the terminals - the motor moves in opposite direction. 

everything we are going to do will be based on this principle - Voltage difference moves the motor



### Motors and Batteries

1. 4 wheels, 4 motors, a chassis and wires. 

This is how it looks like when you order it.
![4WD with chassis](4wd_chassis.png)

you need to assemble it, do soldering to stick the wires on the motor terminals. 

once you assemble it, make sure to test the wheel by connecting directly to battery and write down the direction it moves. 
eg: i wrote down explicitly and marked on the chassis

a. On Top left - when Red -> +ive and Black -> -ive terminal on battery. the wheel moves forward
b. On Rear left - When Red -> +ive and Black -> -ive terminak on battery. the wheel moves backward.
![left_side_car](4wd_car_left_side_wheels.jpeg) 
This is critical step. Remember the wheel direction and connectivity with battery terminals.


[link](https://robu.in/product/longer-version-4-wd-double-layer-smart-car-chassis/)


2. 2 Batteries - specifically 18650 Li-ion battery + Battery Holder
![DC Battery](dc_battery.jpeg)

These are most common rechargeable batteries - used in bunch of electronic items. 
you will be amazed to know that initial tesla cars used to have this battery - bunch of 18650 Li-ion batteries enclosed in a box.

![alt text](tesla_using_18650.png)



[battery](https://robu.in/product/dmegc-inr18650-26e-3-7v-2600mah-li-ion-battery/)

[holder][https://robu.in/product/18650-x-2-battery-holder-with-cover-and-on-off-switch-with-dc-jack/]


3. Charger for battery - you will soon need it
![Charger](18650_charger.jpeg)

The charger looks weird. but it cost only 14 Rs (~15 Cents). you need to use Type C to charge it. At a time - only one battery can get charged. and it does take time.






4. M to M Jumper wires[[link](https://robu.in/product/male-to-male-jumper-wires-40-pin-30cm/)] and M to F Jumper wires - [[link](https://robu.in/product/male-to-male-jumper-wires-40-pin-30cm/)]

