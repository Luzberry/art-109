// Each defeated champion grants gold; their health and damage rise by wave.
const waves = [
  { name: "ROGUE SCOUT", emoji: "🛡️", health: 55, damage: 7, reward: 25 },
  { name: "IRON VANGUARD", emoji: "⚔️", health: 80, damage: 10, reward: 45 },
  { name: "THE CROWN HUNTER", emoji: "🧙", health: 110, damage: 12, reward: 80 }
];

// This is the single source of truth for the current run.
const state = {
  active: false,
  wave: 0,
  health: 100,
  focus: 3,
  hoard: 0,
  enemyHealth: 0,
  guarding: false,
  busy: false,
  soundOn: false
};

let audioContext;

const elements = {
  start: document.querySelector("#start-button"),
  overlay: document.querySelector("#arena-overlay"),
  overlayTitle: document.querySelector("#overlay-title"),
  overlayCopy: document.querySelector("#overlay-copy"),
  dragon: document.querySelector("#dragon"),
  enemy: document.querySelector("#enemy"),
  enemyStage: document.querySelector("#enemy-stage"),
  enemyName: document.querySelector("#enemy-name"),
  waveLabel: document.querySelector("#wave-label"),
  healthValue: document.querySelector("#health-value"),
  healthFill: document.querySelector("#health-fill"),
  focusValue: document.querySelector("#focus-value"),
  focusPips: document.querySelector("#focus-pips"),
  hoardValue: document.querySelector("#hoard-value"),
  turnLabel: document.querySelector("#turn-label"),
  actionHint: document.querySelector("#action-hint"),
  log: document.querySelector("#log-list"),
  logLive: document.querySelector("#log-live"),
  bestRun: document.querySelector("#best-run"),
  damageFloat: document.querySelector("#damage-float"),
  enemyDamage: document.querySelector("#enemy-damage"),
  reset: document.querySelector("#reset-button"),
  sound: document.querySelector("#sound-toggle"),
  tip: document.querySelector("#tip-copy"),
  actions: [...document.querySelectorAll("[data-action]")]
};

const tips = [
  "A well-fed dragon is a fearsome guardian. Ransack your hoard to heal and rekindle your flame.",
  "Dragonfire hits hard, but a claw swipe saves your flame for the next clash.",
  "Guard the keep before a mighty blow. A braced dragon takes half damage.",
  "Your hoard is more than treasure. A quick ransack can turn the tide of battle."
];

function render() {
  // Refresh all values derived from game state and prevent moves during enemy turns.
  elements.healthValue.innerHTML = `${state.health} <small>/ 100</small>`;
  elements.healthFill.style.width = `${state.health}%`;
  elements.focusValue.innerHTML = `${state.focus} <small>/ 5</small>`;
  elements.focusPips.replaceChildren();
  for (let index = 0; index < 5; index += 1) {
    const pip = document.createElement("span");
    pip.className = `focus-pip${index < state.focus ? " is-filled" : ""}`;
    elements.focusPips.append(pip);
  }
  elements.focusPips.setAttribute("aria-label", `${state.focus} of 5 flame`);
  elements.hoardValue.innerHTML = `${state.hoard} <small>gold</small>`;
  elements.actions.forEach((button) => {
    const isFire = button.dataset.action === "fire";
    button.disabled = !state.active || state.busy || (isFire && state.focus < 2);
  });
}

function playSound(frequency, duration = 0.12, type = "sine") {
  if (!state.soundOn) return;
  // Reuse one browser audio context and synthesize short tones instead of loading audio files.
  audioContext ||= new AudioContext();
  const oscillator = audioContext.createOscillator();
  const volume = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  volume.gain.setValueAtTime(0.08, audioContext.currentTime);
  volume.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
  oscillator.connect(volume);
  volume.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}

function log(message) {
  const entry = document.createElement("li");
  entry.className = "log-entry";
  const marker = document.createElement("span");
  marker.className = "log-marker";
  marker.textContent = "✦";
  const text = document.createElement("span");
  text.textContent = message;
  entry.append(marker, text);
  elements.log.prepend(entry);
  // Keep the newest battle notes visible without letting the list grow indefinitely.
  while (elements.log.children.length > 10) elements.log.lastElementChild.remove();
  elements.logLive.textContent = "IN PLAY";
  elements.logLive.classList.add("is-live");
}

function showDamage(target, amount) {
  target.textContent = `−${amount}`;
  target.classList.remove("show");
  void target.offsetWidth;
  target.classList.add("show");
}

function setQuestProgress() {
  waves.forEach((_, index) => {
    const step = document.querySelector(`#quest-step-${index + 1}`);
    step.classList.toggle("is-done", index < state.wave);
    step.classList.toggle("current", index === state.wave && state.active);
  });
}

// Reset every run-specific value before the first champion arrives.
function startRun() {
  state.active = true;
  state.wave = 0;
  state.health = 100;
  state.focus = 3;
  state.hoard = 0;
  state.guarding = false;
  state.busy = false;
  elements.log.replaceChildren();
  elements.reset.hidden = true;
  elements.overlay.classList.add("is-hidden");
  elements.turnLabel.textContent = "YOUR TURN";
  elements.actionHint.textContent = "Choose your action. The champion strikes after every turn.";
  elements.tip.textContent = tips[0];
  startWave();
}

function startWave() {
  const enemy = waves[state.wave];
  state.busy = false;
  state.enemyHealth = enemy.health;
  elements.enemy.textContent = enemy.emoji;
  elements.enemyStage.classList.add("is-visible");
  elements.enemyStage.setAttribute("aria-hidden", "false");
  elements.enemyName.textContent = enemy.name;
  elements.waveLabel.textContent = `WAVE ${state.wave + 1} / ${waves.length}`;
  elements.turnLabel.textContent = "YOUR TURN";
  elements.tip.textContent = tips[state.wave];
  setQuestProgress();
  log(`${enemy.name} has reached the castle gates.`);
  render();
}

// Apply damage, award the wave's gold on defeat, then advance after a short pause.
function attackEnemy(damage, label) {
  const enemy = waves[state.wave];
  state.enemyHealth = Math.max(0, state.enemyHealth - damage);
  elements.enemy.classList.remove("is-hurt");
  void elements.enemy.offsetWidth;
  elements.enemy.classList.add("is-hurt");
  showDamage(elements.enemyDamage, damage);
  playSound(label === "Dragonfire" ? 170 : 260, 0.18, "sawtooth");
  log(`${label} deals ${damage} damage.`);
  if (state.enemyHealth === 0) {
    state.hoard += enemy.reward;
    log(`${enemy.name} retreats. You claim ${enemy.reward} gold for the royal hoard.`);
    render();
    window.setTimeout(advanceWave, 500);
    return true;
  }
  return false;
}

function takeEnemyTurn() {
  if (!state.active) return;
  const enemy = waves[state.wave];
  const damage = state.guarding ? Math.ceil(enemy.damage / 2) : enemy.damage;
  state.guarding = false;
  state.health = Math.max(0, state.health - damage);
  elements.dragon.classList.remove("is-hurt");
  void elements.dragon.offsetWidth;
  elements.dragon.classList.add("is-hurt");
  showDamage(elements.damageFloat, damage);
  playSound(110, 0.2, "triangle");
  log(`The champion deals ${damage} damage${damage < enemy.damage ? " (guarded)" : ""}.`);
  state.busy = false;
  render();
  if (state.health === 0) endRun(false);
  else elements.turnLabel.textContent = "YOUR TURN";
}

// Recover some health and flame between assaults; defeating the final wave wins.
function advanceWave() {
  if (!state.active) return;
  state.wave += 1;
  if (state.wave === waves.length) {
    endRun(true);
    return;
  }
  const healed = Math.min(20, 100 - state.health);
  state.health += healed;
  state.focus = Math.min(5, state.focus + 2);
  log(`You rest between assaults: +${healed} vigor and +2 flame.`);
  setQuestProgress();
  startWave();
}

function endRun(won) {
  state.active = false;
  state.busy = false;
  state.guarding = false;
  elements.turnLabel.textContent = won ? "KEEPER OF THE CROWN" : "THE KEEP HAS FALLEN";
  elements.waveLabel.textContent = won ? "THE CROWN IS YOURS" : "THE HUNTER PREVAILS";
  elements.overlayTitle.innerHTML = won ? "The crown stays<br>on your head." : "The mountain<br>falls silent.";
  elements.overlayCopy.textContent = won
    ? `Three assaults repelled. ${state.hoard} gold rests in your royal hoard. The crown is yours.`
    : `You secured ${state.hoard} gold before the champions breached the keep. Rest well, dragon.`;
  elements.start.textContent = won ? "Celebrate your victory" : "Rise again";
  elements.overlay.classList.remove("is-hidden");
  elements.reset.hidden = false;
  elements.enemyStage.classList.remove("is-visible");
  elements.enemyStage.setAttribute("aria-hidden", "true");
  elements.enemyName.textContent = won ? "CROWN SECURED" : "KEEP LOST";
  elements.actionHint.textContent = won ? "A legendary defense. Your hoard will remember this day." : "Every dragon gets another chance.";
  if (won) {
    // Store only the best victorious hoard so it survives a page reload.
    const best = Number(localStorage.getItem("emberkeep-best") || 0);
    if (state.hoard > best) localStorage.setItem("emberkeep-best", String(state.hoard));
    updateBestRun();
    log("The Ember Crown is safe. The kingdom sings your name.");
  } else {
    log("The champions have breached the keep. But dragons are hard to keep down.");
  }
  elements.logLive.textContent = won ? "VICTORY" : "DEFEATED";
  elements.logLive.classList.remove("is-live");
  render();
  setQuestProgress();
}

function updateBestRun() {
  const best = Number(localStorage.getItem("emberkeep-best") || 0);
  elements.bestRun.textContent = best ? `${best} gold · crowned` : "No victory yet";
}

// Resolve a chosen move, then hand the turn to the champion unless it was defeated.
function playAction(action) {
  if (!state.active) return;
  state.busy = true;
  state.guarding = false;
  let defeated = false;
  if (action === "fire") {
    if (state.focus < 2) {
      state.busy = false;
      elements.actionHint.textContent = "Your flame wanes. Ransack the hoard to rekindle it.";
      return;
    }
    state.focus -= 2;
    elements.dragon.classList.remove("is-attacking");
    void elements.dragon.offsetWidth;
    elements.dragon.classList.add("is-attacking");
    defeated = attackEnemy(30, "Dragonfire");
  } else if (action === "claw") {
    elements.dragon.classList.remove("is-attacking");
    void elements.dragon.offsetWidth;
    elements.dragon.classList.add("is-attacking");
    defeated = attackEnemy(15, "Claw swipe");
  } else if (action === "forage") {
    const gainedFocus = Math.min(2, 5 - state.focus);
    state.focus = Math.min(5, state.focus + 2);
    const healed = Math.min(8, 100 - state.health);
    state.health += healed;
    log(`You ransack the hoard: +${gainedFocus} flame and ${healed} vigor.`);
    elements.tip.textContent = tips[3];
    playSound(430, 0.14);
    render();
  } else if (action === "guard") {
    state.guarding = true;
    log("You guard the keep. The next blow will be weaker.");
    playSound(320, 0.14, "triangle");
    render();
  }

  if (defeated) return;
  elements.turnLabel.textContent = "CHAMPION'S TURN";
  render();
  window.setTimeout(takeEnemyTurn, 420);
}

// Connect the page controls to the game actions.
elements.start.addEventListener("click", startRun);
elements.reset.addEventListener("click", startRun);
elements.actions.forEach((button) => {
  button.addEventListener("click", () => playAction(button.dataset.action));
});
elements.sound.addEventListener("click", () => {
  state.soundOn = !state.soundOn;
  elements.sound.setAttribute("aria-pressed", String(state.soundOn));
  elements.sound.setAttribute("aria-label", state.soundOn ? "Turn sound effects off" : "Turn sound effects on");
  elements.sound.querySelector("span").textContent = state.soundOn ? "Sound on" : "Sound off";
  if (state.soundOn) playSound(520, 0.1);
});

updateBestRun();
render();
