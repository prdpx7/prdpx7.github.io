---
title: "Hardware is hard?"
date: 2026-04-06
animations: true
footnotes: true
---
> or: How I Learned to Stop Worrying and Admire Electronics

I have been feeling hopeless ever since Claude started doing most of my work. I wanted to put the fun back in life by doing something - something which i used to feel back in college, back when i was doing dumb shit - building silly things in python or whatnot.


I thought how crazy it will be to build a robot? after all, Claude is so smart - why can't i just prompt the shit out of it and build my own silly robot?


So i started browsing internet, checking videos on youtube on how to build a robot. Turns out, it does need a lot of initial investment - atleast ₹20,000 (~=$200). 
i thought i will end up wasting my money by buying all these components and then not able to stitch it together.

While researching, i find out - i don't know anything about anything. 

*i don't know how electricity works.* 

*what's the deal with so many electronics components?*

*why is every one of these thing look like a silicon chip with bunch of components stick on it?* 

*what's a breadboard?* 

*what is buck converter?* 

*and why is everyone saying don't forget to check voltage with multimeter?*

Watching bunch of youtubers making DIY robot didn't help either.


So i thought what if i can make "Hello, World!" equivalent in robotics? I looked around and finally "aligned" myself to make a teeny-tiny toy car - and use my phone as remote control.


## A Mental model for building the robot car
To make robot car or what most tutorial videos call it on youtube, "Arduino 4WD Robot Car", you need to buy bunch of small things and stitch it together.

To keep things simple - let's just assume there is nothing robotic about it. 
just imagine the toy car you had in your childhood - there was a battery and a motor and maybe few wheels. 

when you put one wire to the +ive terminal and another wire to -ive terminal - it makes motor move. if you change the terminals - the motor moves in opposite direction. 

everything we are going to do will be based on this principle - Voltage difference moves the motor


## A little bit about Ohm's law (V = IR)
What makes motors move is actually the Voltage difference b/w its terminals.  
Voltage, Current and Resistance - the holy trinity - it always confused me. 
After watching bunch of videos, talking to LLMs - i kinda picture these things as following:

> Voltage is just difference b/w potential energy between two points

Think of water flowing down from mountain top.

* At the top of mountain - when water flows down - it will move fast toward the ground/sea level. why? because there is height difference and gravity.

* Now if the mountain has rough edges, bunch of rocks - the water will move slower.

* Height difference b/w mountain top and ground -> Potential Entergy -> `Voltage`
* The water flow rate -> how many eletrons moved per second -> `Current`
* The rocks, rough edges -> `Resistence`


Same principle applies to batteries. 
When battery dies - the potential differnce b/w its terminals goes to zero. 
the resistance is fixed. the number of electrons remains the same in wire before and after. but the current goes to zero because there is no force to move the current. 

In a way, you can say that Voltage is like a graviy for electrons - the difference make the electrons move

{{< anim-cell >}}

> A small note on convention: the glowing beads above show the direction of **current** (`+` → motor → `−`), which is what every schematic, datasheet, and wiring diagram uses. Electrons are negatively charged, so they physically drift in the *opposite* direction (`−` → motor → `+`). Same phenomenon, two different arrows — we'll stick with current throughout this post.

Alright! let's go back to assembling the car

## Components you need to buy

1. 4 wheels, 4 motors, a chassis and wires. 
![4WD with chassis](4wd_chassis.webp)

Note: it won't come in assembled form. you need to assemble it yourself, do soldering to stick the wires on the motor terminals etc. 

Once you assemble it, make sure to test the wheel by connecting directly to battery and write down the direction it moves. 

eg: i wrote down explicitly and marked on the chassis

a. On Top left - when Red -> +ive and Black -> -ive terminal on battery. the wheel moves forward
b. On Rear left - When Red -> +ive and Black -> -ive terminak on battery. the wheel moves backward.
![left_side_car](4wd_car_left_side_wheels.jpeg) 
This is critical step. Remember the wheel direction and connectivity with battery terminals.


[4WD chassis kit](https://robu.in/product/longer-version-4-wd-double-layer-smart-car-chassis/ "4WD double-layer smart car chassis with 4 motors and wheels, Robu.in")


2. 2 Batteries - specifically `18650 Li-ion` battery + Battery Holder
![DC Battery](dc_battery.jpeg)

These are most common rechargeable batteries - used in bunch of electronic items. 

> The amazing thing about 18650 Li-ion battery is that initial Tesla cars used to have this exact same battery - hundreds of 18650 cells enclosed in a box.

![alt text](tesla_using_18650.png)


[18650 Li-ion battery](https://robu.in/product/dmegc-inr18650-26e-3-7v-2600mah-li-ion-battery/ "DMEGC INR18650-26E 3.7V 2600mAh Li-ion cell, Robu.in")

[2× 18650 holder with switch](https://robu.in/product/18650-x-2-battery-holder-with-cover-and-on-off-switch-with-dc-jack/ "Battery holder for two 18650 cells with on/off switch and DC jack, Robu.in")


3. `TP4056` Charger for battery - you will soon need it
![Charger](18650_charger.jpeg)

The charger looks weird. but it cost only ₹14(~15 Cents). you need to use Type C to charge it. One battery at a time only, and it does take time.

4. Multimeter - The most important purchase you are ever going to make here is multimeter.
![Multimeter](multimeter.jpeg)

5. ESP32 - the brain of your car
![ESP32](esp32_pins.jpeg)


6. [TB6612FNG](https://www.amazon.in/dp/B0CJ5PDCSN?ref=ppx_yo2ov_dt_b_fed_asin_title) - this is a MOSFET based motor module - it's the most important component here. this thing makes   voltage dance.
![TBFNG](TBFNG.jpeg)


7. [M-to-M jumper wires](https://robu.in/product/male-to-male-jumper-wires-40-pin-30cm/ "40-pin 30cm male-to-male jumper wire strip, Robu.in") and [M-to-F jumper wires](https://robu.in/product/male-to-female-jumper-wires-40-pin-30cm/ "40-pin 30cm male-to-female jumper wire strip, Robu.in")

8. [Soldering iron kit](https://blinkit.com/prn/fadman-soldering-iron-tool-kit-10-pcs/prid/608236 "Fadman 10-piece soldering iron tool kit, Blinkit")


9. [Breadboard](https://robu.in/product/mb102-830-points-solderless-prototype-breadboard-power-supply-module-140-jumper-wires-arduino-diy-starter-kit/) - Buy the bigger one so that you can do bunch of experiments at home with capacitors, resistence etc

10. [Buck Converter](https://robu.in/product/lm2596-buck-step-power-converter-module-dc-4-040-1-3-37v-led-voltmeter/) - To protect ESP32 from battery's high voltage


## Time to cook

1. Assemble the wheels, motors and chassis to create our base toy car
2. Mark down the movement of wheel individually on all 4 wheels by applying voltage from battery
3. ESP32 has what we call `GPIO` pins. these are General Purpose Input Output pins. 
4. You can flash code into ESP32 - for that you need arduino-cli
5. 




{{< anim-hbridge >}}

Here's the matching ESP32 sketch — `AIN1` / `AIN2` pick the direction, `PWMA` picks the speed:

```cpp
#define AIN1 27
#define AIN2 26
#define PWMA 14

#define PWM_FREQ 5000
#define PWM_RES  8

void setup() {
  Serial.begin(115200);
  pinMode(AIN1, OUTPUT);
  pinMode(AIN2, OUTPUT);
  ledcAttach(PWMA, PWM_FREQ, PWM_RES);
}

void forward(uint8_t speed) {
  digitalWrite(AIN1, HIGH);
  digitalWrite(AIN2, LOW);
  ledcWrite(PWMA, speed);
}

void backward(uint8_t speed) {
  digitalWrite(AIN1, LOW);
  digitalWrite(AIN2, HIGH);
  ledcWrite(PWMA, speed);
}

void coast() {
  digitalWrite(AIN1, LOW);
  digitalWrite(AIN2, LOW);
  ledcWrite(PWMA, 0);
}

void brake() {
  digitalWrite(AIN1, HIGH);
  digitalWrite(AIN2, HIGH);
  ledcWrite(PWMA, 0);
}

void loop() {
  forward(128);  delay(2000);
  forward(255);  delay(2000);
  brake();       delay(1500);
  backward(128); delay(2000);
  backward(255); delay(2000);
  coast();       delay(2000);
}
```

{{< car-wiring >}}

{{< youtube gUCH7pqUL10 >}}


