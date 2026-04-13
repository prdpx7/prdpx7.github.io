(function () {
  'use strict';
  if (!window.Anims) { console.error('[anim-cell] Anims runtime missing'); return; }

  function init(rootId) {
    var root = document.getElementById(rootId);
    if (!root) { console.warn('[anim-cell] root not found:', rootId); return; }
    var n = rootId.replace('anim-cell-', '');

    var slider  = document.getElementById('anim-cell-slider-'   + n);
    var readout = document.getElementById('anim-cell-readout-'  + n);
    var rotor   = document.getElementById('anim-cell-rotor-'    + n);
    var wireTop = document.getElementById('anim-cell-wire-top-' + n);
    var wireBot = document.getElementById('anim-cell-wire-bot-' + n);
    var flowTop = document.getElementById('anim-cell-flow-top-' + n);
    var flowBot = document.getElementById('anim-cell-flow-bot-' + n);
    var nub     = document.getElementById('anim-cell-nub-'      + n);

    if (!slider || !rotor || !wireTop || !wireBot) {
      console.warn('[anim-cell] required elements missing');
      return;
    }

    var motor = Anims.spinMotor(rotor, { center: [540, 155] });
    var flowT = Anims.flowCurrent(wireTop, flowTop, { color: '#ffa94d', count: 8, radius: 3 });
    var flowB = Anims.flowCurrent(wireBot, flowBot, { color: '#ffa94d', count: 8, radius: 2.5 });

    function onChange(v) {
      var absV = Math.abs(v);
      var sign = v < 0 ? -1 : v > 0 ? 1 : 0;

      motor.setVelocity(sign * (absV / 4) * 12);
      flowT.setRate(v / 4);
      flowB.setRate(-v / 4);

      var formatted = (v >= 0 ? '+' : '') + v.toFixed(1) + ' V';
      readout.textContent = formatted;
      readout.classList.toggle('active', absV > 0.05);

      if (nub) nub.classList.toggle('hw-breathe', absV < 0.05);
    }

    var unbind = Anims.bindSlider(slider, onChange);

    return function destroy() {
      unbind();
      motor.destroy();
      flowT.destroy();
      flowB.destroy();
    };
  }

  window.Anims = window.Anims || {};
  window.Anims.initCell = init;
})();
