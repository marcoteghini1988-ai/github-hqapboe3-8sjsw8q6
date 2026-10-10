// ============================================================================
// WEAPON COMBAT EFFECTS ENGINE (VFX BALISTICI & INTERAZIONE CON LA BARRA HP)
// ============================================================================

import { playSound } from './audio';

// Helper per ottenere layer e barra HP bersaglio (giocatore o avversario)
function getCombatElements(targetDockId = 'classicEnemyHpDock') {
  const layer = document.getElementById('classic-projectiles-layer');
  const targetHpDock = document.getElementById(targetDockId) || document.getElementById('classicEnemyHpDock') || document.getElementById('classicPlayerHpDock');
  const enemyHpFill = targetHpDock?.querySelector('.enemy-hp-fill-3d') || targetHpDock?.querySelector('.player-hp-fill-3d');
  return { layer, targetHpDock, enemyHpDock: targetHpDock, enemyHpFill };
}

// Generatore procedurale di coordinate a zig-zag per veri fulmini
function createJaggedPoints(x1, y1, x2, y2, segments = 12, maxOffset = 26) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) return `${x1},${y1} ${x2},${y2}`;

  const nx = -dy / dist;
  const ny = dx / dist;

  const points = [[x1, y1]];
  for (let i = 1; i < segments; i++) {
    const progress = i / segments;
    const baseX = x1 + dx * progress;
    const baseY = y1 + dy * progress;
    const damp = Math.sin(progress * Math.PI); // Preserva precisione iniziale e finale
    const offset = (Math.random() - 0.5) * 2 * maxOffset * damp;
    points.push([baseX + nx * offset, baseY + ny * offset]);
  }
  points.push([x2, y2]);
  return points.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
}

// ----------------------------------------------------------------------------
// 1. ARCO-X BALISTICO (arrow_barrage)
// ----------------------------------------------------------------------------
function executeArrowBarrage({ level, targetX, targetY, startX, startY, onComplete, targetDockId, isEnemyAttacking = false }) {
  const { layer, targetHpDock } = getCombatElements(targetDockId);
  if (!layer || !targetHpDock) return onComplete?.();

  const arrowConfig = {
    1: { count: 3, delayMs: 110 },
    2: { count: 5, delayMs: 75 },
    3: { count: 12, delayMs: 40 }
  };

  const cfg = arrowConfig[level] || arrowConfig[1];
  let hits = 0;

  for (let i = 0; i < cfg.count; i++) {
    setTimeout(() => {
      try { playSound('arrow_launch'); } catch (_) {}

      const arrow = document.createElement('div');
      arrow.className = 'flight-arrow-screen';
      layer.appendChild(arrow);

      const spawnX = startX + (Math.random() - 0.5) * 90;
      const hitX = targetX + (Math.random() - 0.5) * 30;
      const dx = hitX - spawnX;
      const dy = targetY - startY;
      const angleRad = Math.atan2(dy, dx) + Math.PI / 2;

      arrow.animate([
        { transform: `translate3d(${spawnX}px, ${startY}px, 0) rotate(${angleRad}rad) scale(1.4)`, opacity: 0.95 },
        { transform: `translate3d(${hitX}px, ${targetY}px, 0) rotate(${angleRad}rad) scale(0.65)`, opacity: 1 }
      ], { duration: 250, easing: 'cubic-bezier(0.2, 0.8, 0.4, 1)', fill: 'forwards' }).onfinish = () => {
        arrow.remove();
        targetHpDock.classList.remove('bar-hit-flash', 'bar-shiver');
        void targetHpDock.offsetWidth;
        targetHpDock.classList.add('bar-hit-flash', 'bar-shiver');
        try { playSound('arrow_launch'); } catch (_) {}

        hits++;
        if (hits === cfg.count) onComplete?.();
      };
    }, i * cfg.delayMs);
  }
}

// ----------------------------------------------------------------------------
// 2. LASER A INCISIONE RADIALE SVG (railgun_beam & cross_laser)
// ----------------------------------------------------------------------------
function executeLaserSweep({
  level = 1,
  emitterX,
  emitterY,
  startEdgeX,
  targetEdgeX,
  targetY,
  durationMs = 450,
  onComplete,
  targetDockId,
  isEnemyAttacking = false
}) {
  const { layer, targetHpDock } = getCombatElements(targetDockId);
  if (!layer || !targetHpDock) return onComplete?.();

  try { playSound('arrow_launch'); } catch (_) {}

  const beamColor = isEnemyAttacking ? '#f43f5e' : '#00f2fe';
  const glowColor = isEnemyAttacking ? '#fda4af' : '#a5f3fc';
  const beamWidth = level === 3 ? 12 : (level === 2 ? 8 : 6);

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.style.position = 'fixed';
  svg.style.top = '0';
  svg.style.left = '0';
  svg.style.width = '100vw';
  svg.style.height = '100dvh';
  svg.style.pointerEvents = 'none';
  svg.style.zIndex = '999998';

  const beamGlow = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  beamGlow.setAttribute('stroke', beamColor);
  beamGlow.setAttribute('stroke-width', (beamWidth * 2.8).toString());
  beamGlow.setAttribute('stroke-linecap', 'round');
  beamGlow.setAttribute('opacity', '0.7');
  beamGlow.style.filter = `drop-shadow(0 0 16px ${beamColor})`;

  const beamCore = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  beamCore.setAttribute('stroke', '#ffffff');
  beamCore.setAttribute('stroke-width', beamWidth.toString());
  beamCore.setAttribute('stroke-linecap', 'round');

  const emitterCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  emitterCircle.setAttribute('cx', emitterX.toString());
  emitterCircle.setAttribute('cy', emitterY.toString());
  emitterCircle.setAttribute('r', '16');
  emitterCircle.setAttribute('fill', '#ffffff');
  emitterCircle.setAttribute('stroke', beamColor);
  emitterCircle.setAttribute('stroke-width', '4');
  emitterCircle.style.filter = `drop-shadow(0 0 20px ${beamColor})`;

  const impactCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  impactCircle.setAttribute('r', '13');
  impactCircle.setAttribute('fill', '#ffffff');
  impactCircle.setAttribute('stroke', glowColor);
  impactCircle.setAttribute('stroke-width', '4');
  impactCircle.style.filter = `drop-shadow(0 0 24px ${beamColor})`;

  svg.appendChild(beamGlow);
  svg.appendChild(beamCore);
  svg.appendChild(emitterCircle);
  svg.appendChild(impactCircle);
  layer.appendChild(svg);

  targetHpDock.classList.add('bar-hit-flash', 'bar-shiver');

  const animStart = performance.now();
  let lastSparkTime = 0;

  function spawnSpark(x, y) {
    const spark = document.createElement('div');
    spark.style.position = 'fixed';
    spark.style.left = `${x}px`;
    spark.style.top = `${y}px`;
    spark.style.width = '4px';
    spark.style.height = '4px';
    spark.style.borderRadius = '50%';
    spark.style.backgroundColor = Math.random() > 0.4 ? '#ffffff' : beamColor;
    spark.style.boxShadow = `0 0 10px ${beamColor}`;
    spark.style.pointerEvents = 'none';
    spark.style.zIndex = '999999';
    layer.appendChild(spark);

    const destX = (Math.random() - 0.5) * 60;
    const destY = isEnemyAttacking ? (Math.random() * -35 - 10) : (Math.random() * 35 + 10);

    spark.animate([
      { transform: 'translate(0, 0) scale(1.6)', opacity: 1 },
      { transform: `translate(${destX}px, ${destY}px) scale(0)`, opacity: 0 }
    ], { duration: 220, easing: 'ease-out' }).onfinish = () => spark.remove();
  }

  function step(now) {
    const elapsed = now - animStart;
    const progress = Math.min(1, elapsed / durationMs);

    const curX = startEdgeX + (targetEdgeX - startEdgeX) * progress;

    beamGlow.setAttribute('x1', emitterX.toString());
    beamGlow.setAttribute('y1', emitterY.toString());
    beamGlow.setAttribute('x2', curX.toString());
    beamGlow.setAttribute('y2', targetY.toString());

    beamCore.setAttribute('x1', emitterX.toString());
    beamCore.setAttribute('y1', emitterY.toString());
    beamCore.setAttribute('x2', curX.toString());
    beamCore.setAttribute('y2', targetY.toString());

    impactCircle.setAttribute('cx', curX.toString());
    impactCircle.setAttribute('cy', targetY.toString());

    if (now - lastSparkTime > 30) {
      spawnSpark(curX, targetY);
      lastSparkTime = now;
    }

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      svg.remove();
      targetHpDock.classList.remove('bar-hit-flash', 'bar-shiver');
      onComplete?.();
    }
  }

  requestAnimationFrame(step);
}

// ----------------------------------------------------------------------------
// 3. VERO FULMINE PROCEDURALE A ZIG-ZAG (lightning_strike, tesla_arc & orbital_pillar)
// ----------------------------------------------------------------------------
function executeTeslaLightning({ level, startX, startY, targetX, targetY, onComplete, targetDockId, isEnemyAttacking = false }) {
  const { layer, targetHpDock } = getCombatElements(targetDockId);
  if (!layer || !targetHpDock) return onComplete?.();

  try { playSound('cannon_hit'); } catch (_) {}

  const boltColor = isEnemyAttacking ? '#f43f5e' : '#00f2fe';
  const glowColor = isEnemyAttacking ? '#fda4af' : '#7dd3fc';
  const boltCount = level === 3 ? 3 : (level === 2 ? 2 : 1);

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.style.position = 'fixed';
  svg.style.top = '0';
  svg.style.left = '0';
  svg.style.width = '100vw';
  svg.style.height = '100dvh';
  svg.style.pointerEvents = 'none';
  svg.style.zIndex = '999999';
  layer.appendChild(svg);

  function createBoltGroup(origX, origY, destX, destY, isBranch = false) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

    const glow = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    glow.setAttribute('stroke', boltColor);
    glow.setAttribute('stroke-width', isBranch ? '6' : '12');
    glow.setAttribute('fill', 'none');
    glow.setAttribute('stroke-linecap', 'round');
    glow.setAttribute('stroke-linejoin', 'round');
    glow.setAttribute('opacity', '0.7');
    glow.style.filter = `drop-shadow(0 0 14px ${boltColor})`;

    const core = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    core.setAttribute('stroke', '#ffffff');
    core.setAttribute('stroke-width', isBranch ? '2' : '3.5');
    core.setAttribute('fill', 'none');
    core.setAttribute('stroke-linecap', 'round');
    core.setAttribute('stroke-linejoin', 'round');

    g.appendChild(glow);
    g.appendChild(core);

    const updatePoints = () => {
      const pts = createJaggedPoints(origX, origY, destX, destY, isBranch ? 6 : 14, isBranch ? 15 : 28);
      glow.setAttribute('points', pts);
      core.setAttribute('points', pts);
    };

    updatePoints();
    return { g, updatePoints };
  }

  // Creazione dei fasci principali e ramificazioni laterali
  const bolts = [];
  for (let b = 0; b < boltCount; b++) {
    const offsetX = (b - (boltCount - 1) / 2) * 20;
    const destX = targetX + offsetX;
    const origX = startX + offsetX * 1.5;

    // Fulmine primario
    const mainBolt = createBoltGroup(origX, startY, destX, targetY, false);
    svg.appendChild(mainBolt.g);
    bolts.push(mainBolt);

    // Ramo 1
    const midY1 = startY + (targetY - startY) * 0.4;
    const midX1 = origX + (destX - origX) * 0.4;
    const branch1 = createBoltGroup(midX1, midY1, midX1 + (Math.random() > 0.5 ? 55 : -55), midY1 + (isEnemyAttacking ? 45 : -45), true);
    svg.appendChild(branch1.g);
    bolts.push(branch1);

    // Ramo 2
    const midY2 = startY + (targetY - startY) * 0.7;
    const midX2 = origX + (destX - origX) * 0.7;
    const branch2 = createBoltGroup(midX2, midY2, midX2 + (Math.random() > 0.5 ? -60 : 60), midY2 + (isEnemyAttacking ? 40 : -40), true);
    svg.appendChild(branch2.g);
    bolts.push(branch2);
  }

  // Stella al plasma di impatto sulla barra vita
  const impactBurst = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  impactBurst.setAttribute('cx', targetX.toString());
  impactBurst.setAttribute('cy', targetY.toString());
  impactBurst.setAttribute('r', '18');
  impactBurst.setAttribute('fill', '#ffffff');
  impactBurst.setAttribute('stroke', glowColor);
  impactBurst.setAttribute('stroke-width', '4');
  impactBurst.style.filter = `drop-shadow(0 0 25px ${boltColor})`;
  svg.appendChild(impactBurst);

  targetHpDock.classList.remove('bar-hit-flash', 'bar-shiver');
  void targetHpDock.offsetWidth;
  targetHpDock.classList.add('bar-hit-flash', 'bar-shiver');

  // Crackle animation: ricalcola la forma a zig-zag ogni 50ms per farlo vibrare come un vero fulmine
  let crackleCount = 0;
  const crackleTimer = setInterval(() => {
    bolts.forEach(b => b.updatePoints());
    crackleCount++;
    if (crackleCount >= 5) {
      clearInterval(crackleTimer);
      svg.remove();
      targetHpDock.classList.remove('bar-hit-flash', 'bar-shiver');
      onComplete?.();
    }
  }, 45);
}

// ----------------------------------------------------------------------------
// 4. MICRORAZZI / FLAK A SCALINI (micro_missiles & flak_burst)
// ----------------------------------------------------------------------------
function executeMissileSalvo({ level, startX, startY, hpLeft, hpWidth, currentHp, maxHp, damage, onComplete, targetDockId, isEnemyAttacking = false }) {
  const { layer, targetHpDock } = getCombatElements(targetDockId);
  if (!layer || !targetHpDock) return onComplete?.();

  const missileCount = level === 3 ? 5 : (level === 2 ? 3 : 2);
  const dmgStep = damage / missileCount;
  let hits = 0;

  for (let i = 0; i < missileCount; i++) {
    setTimeout(() => {
      try { playSound('arrow_launch'); } catch (_) {}

      const subHp = currentHp - dmgStep * i;
      const hitX = hpLeft + hpWidth * (Math.max(0, subHp) / (maxHp || 1));
      const hitY = targetHpDock.getBoundingClientRect().top + 5;

      const missile = document.createElement('div');
      missile.style.position = 'fixed';
      missile.style.width = '10px';
      missile.style.height = '24px';
      missile.style.background = isEnemyAttacking
        ? 'linear-gradient(0deg, #facc15 0%, #ef4444 100%)'
        : 'linear-gradient(180deg, #facc15 0%, #ef4444 100%)';
      missile.style.boxShadow = '0 0 14px #facc15';
      missile.style.borderRadius = '3px';
      missile.style.pointerEvents = 'none';
      missile.style.zIndex = '999999';
      layer.appendChild(missile);

      const spawnX = startX + (i % 2 === 0 ? -70 : 70);
      const baseRot = isEnemyAttacking ? 180 : 0;
      const startAngle = isEnemyAttacking ? (i % 2 === 0 ? 160 : 200) : (i % 2 === 0 ? -20 : 20);

      missile.animate([
        { transform: `translate3d(${spawnX}px, ${startY}px, 0) rotate(${startAngle}deg) scale(1.2)`, opacity: 1 },
        { transform: `translate3d(${hitX}px, ${hitY}px, 0) rotate(${baseRot}deg) scale(0.7)`, opacity: 1 }
      ], { duration: 250, easing: 'cubic-bezier(0.2, 0.7, 0.4, 1)', fill: 'forwards' }).onfinish = () => {
        missile.remove();
        targetHpDock.classList.remove('bar-hit-flash', 'bar-shiver');
        void targetHpDock.offsetWidth;
        targetHpDock.classList.add('bar-hit-flash', 'bar-shiver');
        try { playSound('cannon_hit'); } catch (_) {}

        hits++;
        if (hits === missileCount) onComplete?.();
      };
    }, i * 90);
  }
}

// ----------------------------------------------------------------------------
// 5. SIFONE DI SANGUE (blood_siphon)
// ----------------------------------------------------------------------------
function executeBloodSiphon({ level, targetX, targetY, startX, startY, onComplete, targetDockId }) {
  const { layer, targetHpDock } = getCombatElements(targetDockId);
  if (!layer || !targetHpDock) return onComplete?.();

  const count = level === 3 ? 4 : (level === 2 ? 3 : 2);
  let finished = 0;

  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      try { playSound('card_slide'); } catch (_) {}

      const orb = document.createElement('div');
      orb.style.position = 'fixed';
      orb.style.width = '14px';
      orb.style.height = '14px';
      orb.style.borderRadius = '50%';
      orb.style.background = 'radial-gradient(circle, #ff4d6d 0%, #c9184a 100%)';
      orb.style.boxShadow = '0 0 16px #ff4d6d';
      orb.style.pointerEvents = 'none';
      orb.style.zIndex = '999999';
      layer.appendChild(orb);

      orb.animate([
        { transform: `translate3d(${startX + (Math.random() - 0.5) * 50}px, ${startY}px, 0) scale(1)`, opacity: 1 },
        { transform: `translate3d(${targetX}px, ${targetY}px, 0) scale(0.6)`, opacity: 1 }
      ], { duration: 260, easing: 'ease-in', fill: 'forwards' }).onfinish = () => {
        orb.remove();
        targetHpDock.classList.add('bar-hit-flash', 'bar-shiver');
        setTimeout(() => targetHpDock.classList.remove('bar-hit-flash', 'bar-shiver'), 140);

        const healOrb = document.createElement('div');
        healOrb.style.position = 'fixed';
        healOrb.style.width = '12px';
        healOrb.style.height = '12px';
        healOrb.style.borderRadius = '50%';
        healOrb.style.background = 'radial-gradient(circle, #a7f3d0 0%, #10b981 100%)';
        healOrb.style.boxShadow = '0 0 16px #10b981';
        healOrb.style.pointerEvents = 'none';
        healOrb.style.zIndex = '999999';
        layer.appendChild(healOrb);

        healOrb.animate([
          { transform: `translate3d(${targetX}px, ${targetY}px, 0)`, opacity: 1 },
          { transform: `translate3d(${startX}px, ${startY}px, 0)`, opacity: 0 }
        ], { duration: 280, easing: 'ease-out', fill: 'forwards' }).onfinish = () => {
          healOrb.remove();
          finished++;
          if (finished === count) onComplete?.();
        };
      };
    }, i * 80);
  }
}

// ----------------------------------------------------------------------------
// 6. GATLING CINETICA (gatling)
// ----------------------------------------------------------------------------
function executeGatlingSpray({ level, targetX, targetY, startX, startY, onComplete, targetDockId, isEnemyAttacking = false }) {
  const { layer, targetHpDock } = getCombatElements(targetDockId);
  if (!layer || !targetHpDock) return onComplete?.();

  const bulletCount = level === 3 ? 16 : (level === 2 ? 10 : 6);
  let hits = 0;
  const rot = isEnemyAttacking ? 'rotate(180deg)' : '';

  for (let i = 0; i < bulletCount; i++) {
    setTimeout(() => {
      const bullet = document.createElement('div');
      bullet.style.position = 'fixed';
      bullet.style.width = '3px';
      bullet.style.height = '18px';
      bullet.style.background = '#facc15';
      bullet.style.boxShadow = '0 0 8px #facc15';
      bullet.style.pointerEvents = 'none';
      bullet.style.zIndex = '999999';
      layer.appendChild(bullet);

      const spawnX = startX + (Math.random() - 0.5) * 40;
      const hitX = targetX + (Math.random() - 0.5) * 20;

      bullet.animate([
        { transform: `translate3d(${spawnX}px, ${startY}px, 0) ${rot} scale(1.2)`, opacity: 1 },
        { transform: `translate3d(${hitX}px, ${targetY}px, 0) ${rot} scale(0.6)`, opacity: 1 }
      ], { duration: 180, easing: 'linear', fill: 'forwards' }).onfinish = () => {
        bullet.remove();
        hits++;
        if (hits % 3 === 0) {
          targetHpDock.classList.remove('bar-hit-flash', 'bar-shiver');
          void targetHpDock.offsetWidth;
          targetHpDock.classList.add('bar-hit-flash', 'bar-shiver');
          try { playSound('arrow_launch'); } catch (_) {}
        }
        if (hits === bulletCount) onComplete?.();
      };
    }, i * 28);
  }
}

// ----------------------------------------------------------------------------
// 7. CANNONE D'ASSEDIO / BOMBA (heavy_cannon & reactor_bomb)
// ----------------------------------------------------------------------------
function executeHeavyCannon({ level, targetX, targetY, startX, startY, onComplete, targetDockId }) {
  const { layer, targetHpDock } = getCombatElements(targetDockId);
  if (!layer || !targetHpDock) return onComplete?.();

  try { playSound('cannon_hit'); } catch (_) {}

  const ballSize = 24 + level * 6;
  const ball = document.createElement('div');
  ball.style.position = 'fixed';
  ball.style.width = `${ballSize}px`;
  ball.style.height = `${ballSize}px`;
  ball.style.borderRadius = '50%';
  ball.style.background = 'radial-gradient(circle at 35% 35%, #ffffff 0%, #ef4444 60%, #000 100%)';
  ball.style.boxShadow = '0 0 24px #ef4444, 0 0 35px #ffffff';
  ball.style.pointerEvents = 'none';
  ball.style.zIndex = '999999';
  layer.appendChild(ball);

  ball.animate([
    { transform: `translate3d(${startX - ballSize / 2}px, ${startY}px, 0) scale(1.4)`, opacity: 1 },
    { transform: `translate3d(${targetX - ballSize / 2}px, ${targetY - ballSize / 2}px, 0) scale(0.7)`, opacity: 1 }
  ], { duration: 280, easing: 'cubic-bezier(0.2, 0.7, 0.35, 1)', fill: 'forwards' }).onfinish = () => {
    ball.remove();
    targetHpDock.classList.add('bar-hit-flash', 'bar-shiver');
    setTimeout(() => {
      targetHpDock.classList.remove('bar-hit-flash', 'bar-shiver');
      onComplete?.();
    }, 200);
  };
}

// ============================================================================
// DISPATCHER PRINCIPALE DEI COLPI (ORIGINI FORZATE FUORI DALLO SCHERMO)
// ============================================================================
export function fireWeaponCombatVFX(weapon, level = 1, { currentHp, maxHp, damage, onComplete, isEnemyAttacking = false }) {
  const targetDockId = isEnemyAttacking ? 'classicPlayerHpDock' : 'classicEnemyHpDock';
  const { layer, targetHpDock } = getCombatElements(targetDockId);

  if (!layer || !targetHpDock) return onComplete?.();

  const rect = targetHpDock.getBoundingClientRect();
  const hpLeft = rect.left;
  const hpWidth = rect.width;
  const targetY = rect.top + rect.height / 2;

  // ORIGINE RIGOROSAMENTE FUORI DAL DISPLAY:
  // - Nemico che attacca: parte da sopra lo schermo (y = -60px)
  // - Giocatore che attacca: parte da sotto lo schermo (y = window.innerHeight + 60px)
  const startX = window.innerWidth / 2;
  const startY = isEnemyAttacking ? -60 : (window.innerHeight + 60);

  // Estremità vive della barra HP da incidere
  const startEdgeX = hpLeft + hpWidth * (Math.max(0, currentHp) / (maxHp || 1));
  const targetEdgeX = hpLeft + hpWidth * (Math.max(0, currentHp - damage) / (maxHp || 1));
  const midPointX = (startEdgeX + targetEdgeX) / 2;

  const fx = weapon?.fxType || 'gatling';

  // 1. LASER A INCISIONE RADIALE SVG
  if (fx === 'railgun_beam' || fx === 'cross_laser') {
    return executeLaserSweep({
      level,
      emitterX: startX,
      emitterY: startY,
      startEdgeX,
      targetEdgeX,
      targetY,
      onComplete,
      targetDockId,
      isEnemyAttacking
    });
  }

  // 2. VERO FULMINE PROCEDURALE A ZIG-ZAG
  if (fx === 'lightning_strike' || fx === 'tesla_arc' || fx === 'orbital_pillar') {
    return executeTeslaLightning({
      level,
      startX,
      startY,
      targetX: midPointX,
      targetY,
      onComplete,
      targetDockId,
      isEnemyAttacking
    });
  }

  // 3. MICRORAZZI / FLAK A SCALINI
  if (fx === 'micro_missiles' || fx === 'flak_burst') {
    return executeMissileSalvo({
      level,
      startX,
      startY,
      hpLeft,
      hpWidth,
      currentHp,
      maxHp,
      damage,
      onComplete,
      targetDockId,
      isEnemyAttacking
    });
  }

  // 4. SIFONE DI SANGUE
  if (fx === 'blood_siphon') {
    return executeBloodSiphon({
      level,
      targetX: midPointX,
      targetY,
      startX,
      startY,
      onComplete,
      targetDockId
    });
  }

  // 5. GATLING CINETICA
  if (fx === 'gatling' || fx === 'disc_blades' || fx === 'fuse_bolts') {
    return executeGatlingSpray({
      level,
      targetX: startEdgeX,
      targetY,
      startX,
      startY,
      onComplete,
      targetDockId,
      isEnemyAttacking
    });
  }

  // 6. ARCO-X BALISTICO
  if (fx === 'arrow_barrage') {
    return executeArrowBarrage({
      level,
      targetX: midPointX,
      targetY,
      startX,
      startY,
      onComplete,
      targetDockId,
      isEnemyAttacking
    });
  }

  // 7. DEFAULT: CANNONE PESANTE / BOMBA
  return executeHeavyCannon({
    level,
    targetX: midPointX,
    targetY,
    startX,
    startY,
    onComplete,
    targetDockId
  });
}
