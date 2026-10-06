let paths = [
  // Fase 1: Estrada do Vale
  [{x: 0, y: 120}, {x: 220, y: 120}, {x: 220, y: 280}, {x: 380, y: 280}, {x: 380, y: 180}, {x: 520, y: 180}],
  // Fase 2: Caminho da Montanha
  [{x: 0, y: 80}, {x: 460, y: 80}, {x: 120, y: 320}, {x: 520, y: 320}],
  // Fase 3: Labirinto das Ruínas
  [{x: 0, y: 200}, {x: 150, y: 200}, {x: 150, y: 80}, {x: 340, y: 80}, {x: 340, y: 320}, {x: 520, y: 320}]
];

let levelWaves = [
  // Fase 1
  [
    ['warrior', 'warrior', 'scout'],
    ['scout', 'scout', 'warrior', 'scout'],
    ['warrior', 'warrior', 'warrior', 'king'],
    ['scout', 'scout', 'king', 'warrior'],
    ['warrior', 'warrior', 'scout', 'king', 'king']
  ],
  // Fase 2
  [
    ['scout', 'scout', 'warrior'],
    ['warrior', 'warrior', 'scout', 'scout'],
    ['scout', 'king', 'scout', 'king'],
    ['warrior', 'warrior', 'king', 'king'],
    ['scout', 'scout', 'warrior', 'king', 'king', 'king']
  ],
  // Fase 3
  [
    ['scout', 'scout', 'scout', 'warrior'],
    ['warrior', 'warrior', 'king', 'warrior'],
    ['scout', 'king', 'scout', 'king', 'warrior'],
    ['king', 'king', 'warrior', 'warrior', 'king'],
    ['scout', 'scout', 'king', 'king', 'king', 'king']
  ]
];

let gameState = "START"; 
let currentLevel = 0;
let currentWave = 0;
let path = [];
let spawnQueue = [];
let enemies = [];
let towers = [];
let bullets = [];
let sceneryElements = [];

let money = 150;
let lives = 20;
let selectedTowerType = 'wizard';
let selectedTowerInstance = null; // Torre selecionada no mapa para upgrade
let spawnTimer = 0;
let waveDelay = 0;

function setup() {
  createCanvas(600, 470); // 400px de área de jogo + 70px de HUD na base
  loadLevel(currentLevel);
}

function loadLevel(lvlIndex) {
  path = paths[lvlIndex].map(p => createVector(p.x, p.y));
  currentWave = 0;
  loadWave(currentLevel, currentWave);
  towers = [];
  selectedTowerInstance = null;
  generateScenery();
}

function loadWave(lvl, wave) {
  spawnQueue = [...levelWaves[lvl][wave]];
  enemies = [];
  bullets = [];
  spawnTimer = 0;
}

function generateScenery() {
  sceneryElements = [];
  for (let i = 0; i < 25; i++) {
    let rx = random(70, width - 90);
    let ry = random(50, 350);
    let onPath = false;
    for (let p of path) {
      if (dist(rx, ry, p.x, p.y) < 40) onPath = true;
    }
    if (!onPath) {
      sceneryElements.push({ x: rx, y: ry, type: floor(random(4)) });
    }
  }
}

function draw() {
  if (gameState === "START") {
    drawStartScreen();
    return;
  }

  if (gameState === "WIN") {
    drawWinScreen();
    return;
  }

  if (gameState === "GAMEOVER") {
    drawGameOverScreen();
    return;
  }

  background(220, 210, 180);
  
  drawMedievalPath(currentLevel);
  drawScenery();
  drawForestSpawn();
  drawCastleDefend();

  // Spawna inimigos da onda
  spawnTimer++;
  if (spawnTimer > 45 && spawnQueue.length > 0) {
    let type = spawnQueue.shift();
    enemies.push(new Ogre(type));
    spawnTimer = 0;
  }

  // Avanço de Ondas e Fases
  if (spawnQueue.length === 0 && enemies.length === 0) {
    waveDelay++;
    if (waveDelay > 90) { // Pausa entre ondas
      waveDelay = 0;
      if (currentWave < levelWaves[currentLevel].length - 1) {
        currentWave++;
        loadWave(currentLevel, currentWave);
      } else if (currentLevel < paths.length - 1) {
        currentLevel++;
        loadLevel(currentLevel);
      } else {
        gameState = "WIN";
        return;
      }
    }
  }

  // Atualiza e desenha Torres
  for (let t of towers) { 
    t.update(); 
    t.display(); 
  }

  // Atualiza e desenha Inimigos
  for (let i = enemies.length - 1; i >= 0; i--) {
    let e = enemies[i];
    e.update();
    e.display();

    if (e.reachedEnd) {
      lives -= e.damage;
      enemies.splice(i, 1);
    } else if (e.hp <= 0) {
      money += e.reward;
      enemies.splice(i, 1);
    }
  }

  // Atualiza e desenha Projéteis
  for (let i = bullets.length - 1; i >= 0; i--) {
    let b = bullets[i];
    b.update();
    b.display();
    if (b.hit) bullets.splice(i, 1);
  }

  // Desenha prévia do alcance no mouse
  if (mouseY < 400 && !selectedTowerInstance) {
    noFill();
    stroke(255, 255, 255, 120);
    strokeWeight(2);
    let range = selectedTowerType === 'wizard' ? 125 : 165;
    circle(mouseX, mouseY, range * 2);
  }

  drawHUD();

  if (lives <= 0) {
    gameState = "GAMEOVER";
  }
}

// --- INTERFACE HUD ---
function drawHUD() {
  // Painel Inferior
  fill(30, 32, 40);
  stroke(60, 65, 80);
  strokeWeight(2);
  rect(0, 400, width, 70);

  // Status Globais
  fill(255);
  noStroke();
  textSize(12);
  textAlign(LEFT, CENTER);
  textStyle(BOLD);
  text(`💰 $${money}`, 15, 420);
  fill(235, 75, 75);
  text(`❤️ ${lives}`, 15, 450);

  fill(180, 190, 200);
  text(`🚩 Fase ${currentLevel + 1}/3 | Onda ${currentWave + 1}/5`, 85, 435);

  // Botões de Seleção de Torres
  let wizardCost = 50;
  let archerCost = 30;

  // Botão Mago
  let isWizSel = (selectedTowerType === 'wizard' && !selectedTowerInstance);
  stroke(isWizSel ? color(241, 196, 15) : color(70));
  strokeWeight(isWizSel ? 2 : 1);
  fill(money >= wizardCost ? color(45, 52, 80) : color(35, 35, 40));
  rect(230, 410, 95, 50, 6);
  fill(255); noStroke();
  textSize(11);
  text("[1] 🧙 Mago", 238, 426);
  fill(241, 196, 15);
  text(`$${wizardCost}`, 238, 444);

  // Botão Arqueiro
  let isArcSel = (selectedTowerType === 'archer' && !selectedTowerInstance);
  stroke(isArcSel ? color(241, 196, 15) : color(70));
  strokeWeight(isArcSel ? 2 : 1);
  fill(money >= archerCost ? color(40, 75, 50) : color(35, 35, 40));
  rect(335, 410, 100, 50, 6);
  fill(255); noStroke();
  textSize(11);
  text("[2] 🏹 Arqueiro", 343, 426);
  fill(241, 196, 15);
  text(`$${archerCost}`, 343, 444);

  // Painel de Upgrade (Aparece ao Clicar em uma Torre colocada no mapa)
  if (selectedTowerInstance) {
    let t = selectedTowerInstance;
    let panelX = 445;
    let panelY = 408;

    fill(45, 50, 65);
    stroke(241, 196, 15);
    strokeWeight(1.5);
    rect(panelX, panelY, 145, 54, 6);

    fill(255);
    noStroke();
    textSize(11);
    textAlign(LEFT, TOP);
    text(`${t.name} (Nv. ${t.level})`, panelX + 8, panelY + 6);

    if (t.level < 3) {
      let cost = t.getUpgradeCost();
      fill(money >= cost ? color(46, 204, 113) : color(100));
      rect(panelX + 8, panelY + 26, 128, 22, 4);

      fill(255);
      textAlign(CENTER, CENTER);
      textSize(10);
      text(`UPGRADE: $${cost}`, panelX + 72, panelY + 37);
    } else {
      fill(241, 196, 15);
      textAlign(CENTER, CENTER);
      textSize(10);
      text("NÍVEL MÁXIMO!", panelX + 72, panelY + 35);
    }
  }
}

// --- CONTROLES DE MOUSE E TECLADO ---
function keyPressed() {
  if (key === '1') { selectedTowerType = 'wizard'; selectedTowerInstance = null; }
  if (key === '2') { selectedTowerType = 'archer'; selectedTowerInstance = null; }
}

function mousePressed() {
  if (gameState === "START") {
    let btnX = width / 2 - 75;
    let btnY = height / 2 + 105;
    if (mouseX > btnX && mouseX < btnX + 150 && mouseY > btnY && mouseY < btnY + 45) {
      gameState = "PLAYING";
    }
    return;
  }

  if (gameState === "WIN" || gameState === "GAMEOVER") {
    gameState = "PLAYING";
    money = 150;
    lives = 20;
    currentLevel = 0;
    loadLevel(0);
    loop();
    return;
  }

  // Clique na Barra de HUD (Inferior)
  if (mouseY >= 400) {
    // Selecionar Mago
    if (mouseX >= 230 && mouseX <= 325 && mouseY >= 410 && mouseY <= 460) {
      selectedTowerType = 'wizard';
      selectedTowerInstance = null;
      return;
    }
    // Selecionar Arqueiro
    if (mouseX >= 335 && mouseX <= 435 && mouseY >= 410 && mouseY <= 460) {
      selectedTowerType = 'archer';
      selectedTowerInstance = null;
      return;
    }
    // Clicar em Upgrade
    if (selectedTowerInstance && mouseX >= 453 && mouseX <= 581 && mouseY >= 434 && mouseY <= 456) {
      selectedTowerInstance.upgrade();
      return;
    }
    return;
  }

  // Clique no Mapa de Jogo
  if (mouseY < 400) {
    // 1. Verifica se clicou em uma torre existente
    for (let t of towers) {
      if (dist(mouseX, mouseY, t.pos.x, t.pos.y) < 22) {
        selectedTowerInstance = t;
        return;
      }
    }

    // Se clicou no chão, limpa a seleção da torre focada
    selectedTowerInstance = null;

    // 2. Coloca uma nova torre se não estiver sobre o caminho ou sobre outra torre
    let onPath = false;
    for (let p of path) {
      if (dist(mouseX, mouseY, p.x, p.y) < 28) onPath = true;
    }
    for (let t of towers) {
      if (dist(mouseX, mouseY, t.pos.x, t.pos.y) < 28) onPath = true;
    }

    if (!onPath) {
      if (selectedTowerType === 'wizard' && money >= 50) {
        towers.push(new Wizard(mouseX, mouseY));
        money -= 50;
      } else if (selectedTowerType === 'archer' && money >= 30) {
        towers.push(new Archer(mouseX, mouseY));
        money -= 30;
      }
    }
  }
}

// --- CLASSES DE PERSONAGENS E UPGRADES ---

// MAGO COM LEVEL UP
class Wizard {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.name = "Mago";
    this.level = 1;
    this.range = 125;
    this.cooldown = 0;
    this.fireRate = 22;
    this.damage = 15;
    this.baseCost = 50;
  }

  getUpgradeCost() {
    return Math.floor(this.baseCost * 0.9 * this.level);
  }

  upgrade() {
    let cost = this.getUpgradeCost();
    if (this.level < 3 && money >= cost) {
      money -= cost;
      this.level++;
      this.damage += 10;
      this.range += 20;
      this.fireRate = Math.max(10, this.fireRate - 4);
    }
  }

  update() {
    if (this.cooldown > 0) this.cooldown--;
    let closest = null, recordDist = this.range;
    for (let e of enemies) {
      let d = dist(this.pos.x, this.pos.y, e.pos.x, e.pos.y);
      if (d < recordDist) { recordDist = d; closest = e; }
    }
    if (closest && this.cooldown === 0) {
      bullets.push(new Fireball(this.pos.x, this.pos.y, closest, this.damage));
      this.cooldown = this.fireRate;
    }
  }

  display() {
    push();
    translate(this.pos.x, this.pos.y);

    // Se focada, exibe o alcance
    if (selectedTowerInstance === this) {
      stroke(241, 196, 15, 180);
      strokeWeight(2);
      noFill();
      circle(0, 0, this.range * 2);
    }

    // Base Mágica por Nível
    if (this.level > 1) {
      noStroke();
      fill(100, 200, 255, 60 * (this.level - 1));
      circle(0, 4, 28);
    }

    // Vestes e Corpo
    fill(40, 50, 160 + (this.level - 1) * 30); rect(-6, -2, 12, 18);
    // Cabeça
    fill(255, 220, 180); circle(0, -8, 12);
    // Chapéu
    fill(20, 30, 110); triangle(-10, -10, 10, -10, 0, -28 - (this.level - 1) * 3);
    // Cajado
    stroke(100, 60, 20); strokeWeight(2); line(8, -12, 8, 14);
    fill(100, 200, 255); noStroke(); circle(8, -14, 6 + (this.level - 1) * 2);

    // Indicador de Nível
    fill(241, 196, 15);
    for (let i = 0; i < this.level; i++) {
      circle(-6 + i * 6, 18, 4);
    }
    pop();
  }
}

// ARQUEIRO COM LEVEL UP
class Archer {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.name = "Arqueiro";
    this.level = 1;
    this.range = 165;
    this.cooldown = 0;
    this.fireRate = 12;
    this.damage = 6;
    this.baseCost = 30;
  }

  getUpgradeCost() {
    return Math.floor(this.baseCost * 0.9 * this.level);
  }

  upgrade() {
    let cost = this.getUpgradeCost();
    if (this.level < 3 && money >= cost) {
      money -= cost;
      this.level++;
      this.damage += 4;
      this.range += 20;
      this.fireRate = Math.max(6, this.fireRate - 2);
    }
  }

  update() {
    if (this.cooldown > 0) this.cooldown--;
    let closest = null, recordDist = this.range;
    for (let e of enemies) {
      let d = dist(this.pos.x, this.pos.y, e.pos.x, e.pos.y);
      if (d < recordDist) { recordDist = d; closest = e; }
    }
    if (closest && this.cooldown === 0) {
      bullets.push(new Arrow(this.pos.x, this.pos.y, closest, this.damage));
      this.cooldown = this.fireRate;
    }
  }

  display() {
    push();
    translate(this.pos.x, this.pos.y);

    // Se focada, exibe o alcance
    if (selectedTowerInstance === this) {
      stroke(241, 196, 15, 180);
      strokeWeight(2);
      noFill();
      circle(0, 0, this.range * 2);
    }

    // Base Mágica por Nível
    if (this.level > 1) {
      noStroke();
      fill(46, 204, 113, 60 * (this.level - 1));
      circle(0, 4, 26);
    }

    // Túnica e Corpo
    fill(40, 120 + (this.level - 1) * 30, 50); rect(-5, -2, 10, 16);
    // Cabeça
    fill(255, 220, 180); circle(0, -8, 11);
    // Capuz
    fill(30, 90 + (this.level - 1) * 20, 40); triangle(-7, -8, 7, -8, 0, -18);
    // Arco
    stroke(110, 70, 30); strokeWeight(2 + (this.level - 1) * 0.5); noFill();
    arc(6, 0, 10 + (this.level - 1) * 2, 18, -HALF_PI, HALF_PI);

    // Indicador de Nível
    fill(241, 196, 15);
    noStroke();
    for (let i = 0; i < this.level; i++) {
      circle(-6 + i * 6, 18, 4);
    }
    pop();
  }
}

// OGRO HUMANOIDE
class Ogre {
  constructor(type) {
    this.pos = path[0].copy();
    this.targetIndex = 1;
    this.type = type;
    this.reachedEnd = false;

    if (type === 'scout') {
      this.speed = 3.2; this.hp = 14; this.maxHp = 14;
      this.color = color(140, 200, 80); this.reward = 8; this.damage = 1;
    } else if (type === 'king') {
      this.speed = 0.7; this.hp = 120; this.maxHp = 120;
      this.color = color(90, 100, 90); this.reward = 40; this.damage = 4;
    } else {
      this.speed = 1.4; this.hp = 42; this.maxHp = 42;
      this.color = color(90, 130, 50); this.reward = 18; this.damage = 1;
    }
  }

  update() {
    let target = path[this.targetIndex];
    let dir = p5.Vector.sub(target, this.pos);

    if (dir.mag() < this.speed) {
      this.pos = target.copy();
      this.targetIndex++;
      if (this.targetIndex >= path.length) this.reachedEnd = true;
    } else {
      dir.setMag(this.speed);
      this.pos.add(dir);
    }
  }

  display() {
    push();
    translate(this.pos.x, this.pos.y);

    // Perna/Pés
    fill(40, 30, 20); rect(-6, 8, 4, 10); rect(2, 8, 4, 10);
    // Tronco
    fill(this.color); rect(-8, -6, 16, 16, 3);
    // Braços
    rect(-12, -4, 4, 12); rect(8, -4, 4, 12);
    // Cabeça
    circle(0, -12, 14);

    if (this.type === 'warrior') {
      fill(120); arc(0, -14, 16, 10, PI, TWO_PI);
    } else if (this.type === 'king') {
      fill(255, 215, 0); triangle(-6, -18, 0, -26, 6, -18);
    }

    // Barra HP
    fill(100, 150); rect(-12, -26, 24, 4);
    fill(46, 204, 113);
    rect(-12, -26, max(0, map(this.hp, 0, this.maxHp, 0, 24)), 4);
    pop();
  }
}

// PROJÉTEIS
class Fireball {
  constructor(x, y, target, damage) {
    this.pos = createVector(x, y); this.target = target;
    this.speed = 7; this.hit = false; this.damage = damage;
  }
  update() {
    if (!enemies.includes(this.target)) { this.hit = true; return; }
    let dir = p5.Vector.sub(this.target.pos, this.pos);
    if (dir.mag() < this.speed) { this.target.hp -= this.damage; this.hit = true; }
    else { dir.setMag(this.speed); this.pos.add(dir); }
  }
  display() { fill(255, 100, 0); stroke(255, 200, 0); circle(this.pos.x, this.pos.y, 8); }
}

class Arrow {
  constructor(x, y, target, damage) {
    this.pos = createVector(x, y); this.target = target;
    this.speed = 9; this.hit = false; this.damage = damage;
  }
  update() {
    if (!enemies.includes(this.target)) { this.hit = true; return; }
    let dir = p5.Vector.sub(this.target.pos, this.pos);
    if (dir.mag() < this.speed) { this.target.hp -= this.damage; this.hit = true; }
    else { dir.setMag(this.speed); this.pos.add(dir); }
  }
  display() { fill(80); stroke(100, 60, 20); circle(this.pos.x, this.pos.y, 4); }
}

// --- ELEMENTOS DE MAPA E TELAS ---
function drawStartScreen() {
  background(25, 20, 20);

  push();
  translate(width / 2, height / 2 - 20);

  fill(65, 65, 70);
  stroke(20);
  strokeWeight(5);
  beginShape();
  vertex(-240, -70); vertex(-210, -95); vertex(0, -80); vertex(220, -100);
  vertex(250, -60); vertex(235, 40); vertex(210, 85); vertex(-30, 95);
  vertex(-230, 80); vertex(-255, 10);
  endShape(CLOSE);

  stroke(30);
  strokeWeight(3);
  line(-210, -50, -160, -20); line(-160, -20, -180, 20);
  line(140, -70, 180, -30); line(180, -30, 160, 40); line(-80, 50, -20, 80);

  noStroke();
  fill(15, 15, 15, 230);
  textAlign(CENTER, CENTER);
  textSize(28);
  textStyle(BOLD);
  text("MAGICAL TOWER DEFENSE!", 4, -13);

  fill(190, 180, 160);
  text("MAGICAL TOWER DEFENSE!", 0, -16);

  textSize(13);
  fill(100, 190, 255);
  text("⚔️ Proteja o Castelo contra 5 Ondas de Ogros ⚔️", 0, 35);
  pop();

  push();
  let btnX = width / 2 - 75;
  let btnY = height / 2 + 105;
  let btnW = 150;
  let btnH = 45;

  if (mouseX > btnX && mouseX < btnX + btnW && mouseY > btnY && mouseY < btnY + btnH) {
    fill(70, 150, 70);
  } else {
    fill(45, 110, 45);
  }

  stroke(220);
  strokeWeight(2);
  rect(btnX, btnY, btnW, btnH, 8);

  fill(255);
  noStroke();
  textSize(18);
  textAlign(CENTER, CENTER);
  text("JOGAR", width / 2, btnY + 22);
  pop();
}

function drawForestSpawn() {
  let start = path[0];
  push();
  translate(start.x, start.y);
  fill(20, 50, 25); noStroke();
  circle(-35, -35, 60); circle(-10, -50, 70);
  circle(20, -30, 55); circle(-40, 15, 65);
  circle(-15, 35, 70); circle(15, 30, 55);
  fill(35, 85, 40);
  circle(-20, -20, 50); circle(0, -15, 45);
  pop();
}

function drawCastleDefend() {
  let end = path[path.length - 1];
  push();
  translate(end.x, end.y - 35);
  fill(90); stroke(40); strokeWeight(2);
  rect(-20, -10, 60, 70);
  fill(110);
  rect(-32, -25, 22, 85); rect(30, -25, 22, 85);
  fill(150, 35, 35);
  triangle(-35, -25, -21, -55, -7, -25); triangle(27, -25, 41, -55, 55, -25);
  fill(70); rect(-20, -20, 60, 12);
  fill(80, 45, 15); stroke(30);
  arc(10, 60, 28, 38, PI, TWO_PI);
  pop();
}

function drawScenery() {
  for (let el of sceneryElements) {
    push();
    translate(el.x, el.y);
    noStroke();
    if (el.type === 0) {
      fill(100, 60, 20); rect(-3, 0, 6, 12);
      fill(40, 120, 50); circle(0, -6, 22);
    } else if (el.type === 1) {
      fill(60, 140, 60); circle(0, 0, 14); circle(7, 2, 10);
    } else if (el.type === 2) {
      fill(130); ellipse(0, 0, 14, 8);
    } else {
      fill(180, 160, 80); circle(0, 0, 6);
    }
    pop();
  }
}

function drawMedievalPath(level) {
  push();
  stroke(100, 80, 50); strokeWeight(42); noFill(); drawPathShape();
  stroke(150, 130, 100); strokeWeight(30); drawPathShape();
  pop();
}

function drawPathShape() {
  beginShape();
  for (let p of path) { vertex(p.x, p.y); }
  endShape();
}

function drawWinScreen() {
  background(20, 80, 40, 220); 
  fill(100, 255, 100); 
  textSize(36); 
  textAlign(CENTER, CENTER);
  text("VITÓRIA ABSOLUTA!", width / 2, height / 2 - 20);
  fill(255); 
  textSize(16); 
  text("Você defendeu o reino em todas as fases!", width / 2, height / 2 + 20);
  textSize(14);
  text("Clique em qualquer lugar para Jogar Novamente", width / 2, height / 2 + 60);
}

function drawGameOverScreen() {
  background(80, 20, 20, 220); 
  fill(255, 60, 60); 
  textSize(36); 
  textAlign(CENTER, CENTER);
  text("O CASTELO CAIU!", width / 2, height / 2 - 20);
  fill(255); 
  textSize(16); 
  text("Os Ogros dominaram o reino...", width / 2, height / 2 + 20);
  textSize(14);
  text("Clique em qualquer lugar para Tentar Novamente", width / 2, height / 2 + 60);
}