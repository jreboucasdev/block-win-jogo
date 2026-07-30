import { useState, useRef, useEffect } from 'react';
import { Settings, X, RotateCcw, PlayCircle, Wallet, RotateCw } from 'lucide-react';

const GRID = 8;
const BETS = [5, 10, 25, 50, 100, 250];
const PALETTE = ['#00D2FF', '#FF4081', '#FF9F43', '#9E57E5', '#10AC84'];

const SHAPES = {
  single:   [[0,0]],
  domino_h: [[0,0],[0,1]],
  domino_v: [[0,0],[1,0]],
  square:   [[0,0],[0,1],[1,0],[1,1]],
  lshape:   [[0,0],[1,0],[1,1]],
  line3:    [[0,0],[0,1],[0,2]],
  tshape:   [[0,0],[0,1],[0,2],[1,1]],
  zshape:   [[0,0],[0,1],[1,1],[1,2]],
  line5:    [[0,0],[0,1],[0,2],[0,3],[0,4]],
  block3:   [[0,0],[0,1],[0,2],[1,0],[1,1],[1,2],[2,0],[2,1],[2,2]],
};

const SHAPE_LABELS = {
  single: '1×1', domino_h: 'Dominó H', domino_v: 'Dominó V', square: 'Quadrado 2×2',
  lshape: 'L pequeno', line3: 'Barra 3', tshape: 'T', zshape: 'Z', line5: 'Barra 5', block3: 'Bloco 3×3',
};

const DEFAULT_WEIGHTS = {
  single: 20, domino_h: 12, domino_v: 12, square: 15, lshape: 12,
  line3: 10, tshape: 8, zshape: 8, line5: 5, block3: 2,
};

const BOOST_WEIGHTS = {
  single: 30, domino_h: 18, domino_v: 18, square: 18, lshape: 10,
  line3: 4, tshape: 1, zshape: 1, line5: 0, block3: 0,
};

const WEIGHT_PRESETS = {
  facil: { single: 28, domino_h: 16, domino_v: 16, square: 16, lshape: 10, line3: 8, tshape: 3, zshape: 3, line5: 0, block3: 0 },
  medio: DEFAULT_WEIGHTS,
  dificil: { single: 12, domino_h: 8, domino_v: 8, square: 10, lshape: 10, line3: 12, tshape: 12, zshape: 12, line5: 10, block3: 6 },
  extremo: { single: 4, domino_h: 4, domino_v: 4, square: 6, lshape: 8, line3: 10, tshape: 14, zshape: 14, line5: 20, block3: 16 },
};

function lighten(hex, amt) {
  const num = parseInt(hex.slice(1), 16);
  let r = Math.min(255, Math.max(0, (num >> 16) + amt));
  let g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
  let b = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function hexToRgb(hex) {
  const num = parseInt(hex.slice(1), 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function colorLerp(hexA, hexB, t) {
  const a = hexToRgb(hexA), b = hexToRgb(hexB);
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

function rotateCells(cells) {
  const maxR = Math.max(...cells.map((c) => c[0]));
  return cells.map(([r, c]) => [c, maxR - r]);
}

function weightedPick(weights) {
  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [key, w] of entries) {
    if (r < w) return key;
    r -= w;
  }
  return entries[0][0];
}

function makePiece(weights) {
  const shapeKey = weightedPick(weights);
  return {
    id: Math.random().toString(36).slice(2),
    shapeKey,
    cells: SHAPES[shapeKey],
    color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
  };
}

function spawnTray(weights) {
  return [makePiece(weights), makePiece(weights), makePiece(weights)];
}

function canPlaceAt(cells, board, anchorRow, anchorCol) {
  for (const [dr, dc] of cells) {
    const r = anchorRow + dr, c = anchorCol + dc;
    if (r < 0 || r >= GRID || c < 0 || c >= GRID) return false;
    if (board[r * GRID + c]) return false;
  }
  return true;
}

function hasAnyValidPlacement(cells, board) {
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      if (canPlaceAt(cells, board, r, c)) return true;
    }
  }
  return false;
}

function findFullLines(board) {
  const cells = new Set();
  let lines = 0;
  for (let r = 0; r < GRID; r++) {
    let ok = true;
    for (let c = 0; c < GRID; c++) if (!board[r * GRID + c]) { ok = false; break; }
    if (ok) { lines++; for (let c = 0; c < GRID; c++) cells.add(r * GRID + c); }
  }
  for (let c = 0; c < GRID; c++) {
    let ok = true;
    for (let r = 0; r < GRID; r++) if (!board[r * GRID + c]) { ok = false; break; }
    if (ok) { lines++; for (let r = 0; r < GRID; r++) cells.add(r * GRID + c); }
  }
  return { cells, lines };
}

function payoutMultiplier(score, target, gamma, cap) {
  if (target <= 0) return 0;
  const ratio = score / target;
  return Math.min(cap, Math.pow(ratio, gamma));
}

function countIsolatedHoles(board) {
  let count = 0;
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      const idx = r * GRID + c;
      if (board[idx]) continue;
      let blocked = true;
      for (const [nr, nc] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) {
        if (nr >= 0 && nr < GRID && nc >= 0 && nc < GRID && !board[nr * GRID + nc]) { blocked = false; break; }
      }
      if (blocked) count++;
    }
  }
  return count;
}

// Simulação com um bot heurístico (não o encaixe ingênuo na 1ª posição válida):
// entre as posições válidas, prioriza limpar mais linhas e, em empate, a que
// deixa menos "buracos isolados" no tabuleiro. Isso aproxima melhor o
// comportamento de um jogador humano tentando jogar bem — o motor real de
// produção ainda deve ser validado com dados de jogadores de verdade.
function simulateRTP(weights, gamma, cap, pointsTarget, trials, cellPointsPct, comboBasePct, comboGrowth) {
  let totalMultiplier = 0;
  let wins = 0;

  for (let t = 0; t < trials; t++) {
    let board = new Array(GRID * GRID).fill(null);
    let tray = spawnTray(weights);
    let score = 0;
    let safety = 0;

    while (safety < 200) {
      safety++;
      const idx = tray.findIndex((p) => p !== null);
      if (idx === -1) { tray = spawnTray(weights); continue; }
      const piece = tray[idx];

      let best = null;
      for (let r = 0; r < GRID; r++) {
        for (let c = 0; c < GRID; c++) {
          if (!canPlaceAt(piece.cells, board, r, c)) continue;
          const next = [...board];
          for (const [dr, dc] of piece.cells) next[(r + dr) * GRID + (c + dc)] = piece.color;
          const full = findFullLines(next);
          for (const i of full.cells) next[i] = null;
          const holes = countIsolatedHoles(next);
          const evalScore = full.lines * 1000 - holes;
          if (!best || evalScore > best.evalScore) {
            best = { evalScore, next, linesCleared: full.lines };
          }
        }
      }

      if (!best) {
        const anyFit = tray.some((p) => p && hasAnyValidPlacement(p.cells, board));
        if (!anyFit) break;
        continue;
      }

      const comboBonus = best.linesCleared > 0 ? Math.round(best.linesCleared * (pointsTarget * comboBasePct / 100) * (1 + comboGrowth * (best.linesCleared - 1))) : 0;
      score += Math.round(piece.cells.length * (pointsTarget * cellPointsPct / 100)) + comboBonus;
      board = best.next;
      const nextTray = [...tray];
      nextTray[idx] = null;
      tray = nextTray;
    }

    const mult = payoutMultiplier(score, pointsTarget, gamma, cap);
    totalMultiplier += mult;
    if (mult >= 1) wins++;
  }

  return {
    avgMultiplier: totalMultiplier / trials,
    winRate: (wins / trials) * 100,
    impliedRTP: (totalMultiplier / trials) * 100,
  };
}

export default function BlockPuzzlePrototype() {
  const [phase, setPhase] = useState('betting');
  const [bet, setBet] = useState(10);
  const [board, setBoard] = useState(new Array(GRID * GRID).fill(null));
  const [tray, setTray] = useState([null, null, null]);
  const [trayKey, setTrayKey] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [dragIdx, setDragIdx] = useState(null);
  const [hoverCell, setHoverCell] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [rotationUsed, setRotationUsed] = useState(false);
  const boardRef = useRef(null);
  const dragHoverRef = useRef(null);
  const [score, setScore] = useState(0);
  const [flashing, setFlashing] = useState(new Set());
  const [clearBurst, setClearBurst] = useState(null);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [roundHistory, setRoundHistory] = useState([]);
  const [result, setResult] = useState(null);
  const [scorePopup, setScorePopup] = useState(null);
  const [comboBanner, setComboBanner] = useState(null);

  const [adminOpen, setAdminOpen] = useState(false);
  const [weights, setWeights] = useState(WEIGHT_PRESETS.dificil);
  const [gamma, setGamma] = useState(1.8);
  const [maxWinCap, setMaxWinCap] = useState(10);
  const [boostRounds, setBoostRounds] = useState(0);
  const [pointsTarget, setPointsTarget] = useState(500);
  const [betScalingEnabled, setBetScalingEnabled] = useState(true);
  const [pointsPerReal, setPointsPerReal] = useState(60);
  const [cellPointsPct, setCellPointsPct] = useState(2);
  const [comboBasePct, setComboBasePct] = useState(3);
  const [comboGrowth, setComboGrowth] = useState(0.5);
  const [allowEarlyCashout, setAllowEarlyCashout] = useState(true);
  const [minCashoutPct, setMinCashoutPct] = useState(15);
  const [simTrials, setSimTrials] = useState(120);
  const [simResult, setSimResult] = useState(null);
  const [simulating, setSimulating] = useState(false);

  const activeWeights = gamesPlayed < boostRounds ? BOOST_WEIGHTS : weights;
  const effectiveTarget = betScalingEnabled ? Math.max(50, Math.round(bet * pointsPerReal)) : pointsTarget;
  const currentMultiplier = payoutMultiplier(score, effectiveTarget, gamma, maxWinCap);
  const progressPct = Math.min(100, (score / effectiveTarget) * 100);
  const cashoutEligible = phase === 'playing' && allowEarlyCashout && score >= effectiveTarget * (minCashoutPct / 100);
  const cashoutPayout = bet * currentMultiplier;

  const activeIdx = isDragging ? dragIdx : selectedIdx;

  let footprintCells = new Set();
  let footprintValid = false;
  if (phase === 'playing' && activeIdx !== null && hoverCell !== null && tray[activeIdx]) {
    const piece = tray[activeIdx];
    const row = Math.floor(hoverCell / GRID), col = hoverCell % GRID;
    footprintValid = canPlaceAt(piece.cells, board, row, col);
    for (const [dr, dc] of piece.cells) {
      const r = row + dr, c = col + dc;
      if (r >= 0 && r < GRID && c >= 0 && c < GRID) footprintCells.add(r * GRID + c);
    }
  }

  let dangerActive = false;
  if (phase === 'playing') {
    let totalOptions = 0;
    for (const p of tray) {
      if (!p) continue;
      for (let r = 0; r < GRID; r++) {
        for (let c = 0; c < GRID; c++) {
          if (canPlaceAt(p.cells, board, r, c)) totalOptions++;
        }
      }
    }
    dangerActive = totalOptions > 0 && totalOptions <= 2;
  }
  const boardBorderColor = colorLerp('#00D2FF', '#FF4081', Math.min(1, progressPct / 100));

  function startGame() {
    setBoard(new Array(GRID * GRID).fill(null));
    setTray(spawnTray(activeWeights));
    setTrayKey((k) => k + 1);
    setSelectedIdx(null);
    setDragIdx(null);
    setHoverCell(null);
    setScore(0);
    setResult(null);
    setScorePopup(null);
    setComboBanner(null);
    setRotationUsed(false);
    setPhase('playing');
  }

  function finalizeRound(finalScore, reason) {
    const mult = payoutMultiplier(finalScore, effectiveTarget, gamma, maxWinCap);
    setResult({ score: finalScore, multiplier: mult, payout: bet * mult, reason });
    setRoundHistory((h) => [{ id: Date.now(), multiplier: mult }, ...h].slice(0, 8));
    setGamesPlayed((g) => g + 1);
    setPhase('ended');
  }

  function handleCashOut() {
    if (!cashoutEligible) return;
    finalizeRound(score, 'cashout');
  }

  function rotatePiece(idx) {
    if (phase !== 'playing' || !tray[idx] || rotationUsed) return;
    const piece = tray[idx];
    const nextTray = [...tray];
    nextTray[idx] = { ...piece, cells: rotateCells(piece.cells) };
    setTray(nextTray);
    setRotationUsed(true);
  }

  function handleDragStart(e, idx) {
    if (phase !== 'playing' || !tray[idx]) return;
    setDragIdx(idx);
    setDragPos({ x: e.clientX, y: e.clientY });
    setIsDragging(true);
  }

  useEffect(() => {
    if (!isDragging) return;
    function onMove(e) {
      setDragPos({ x: e.clientX, y: e.clientY });
      const boardEl = boardRef.current;
      if (!boardEl) { dragHoverRef.current = null; setHoverCell(null); return; }
      const rect = boardEl.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
        dragHoverRef.current = null; setHoverCell(null); return;
      }
      const cellSize = rect.width / GRID;
      const col = Math.min(GRID - 1, Math.max(0, Math.floor(x / cellSize)));
      const row = Math.min(GRID - 1, Math.max(0, Math.floor(y / cellSize)));
      const cellIdx = row * GRID + col;
      dragHoverRef.current = cellIdx;
      setHoverCell(cellIdx);
    }
    function onUp() {
      setIsDragging(false);
      const cell = dragHoverRef.current;
      dragHoverRef.current = null;
      setHoverCell(null);
      if (cell !== null) {
        placePieceAt(dragIdx, cell);
      } else {
        setSelectedIdx((prev) => (prev === dragIdx ? null : dragIdx));
        setDragIdx(null);
      }
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging]);

  function placePieceAt(pieceIdx, cellIdx) {
    if (phase !== 'playing') return;
    const piece = tray[pieceIdx];
    if (!piece) return;
    const row = Math.floor(cellIdx / GRID);
    const col = cellIdx % GRID;
    if (!canPlaceAt(piece.cells, board, row, col)) return;

    const placedBoard = [...board];
    for (const [dr, dc] of piece.cells) {
      placedBoard[(row + dr) * GRID + (col + dc)] = piece.color;
    }

    const full = findFullLines(placedBoard);
    const gained = Math.round(piece.cells.length * (effectiveTarget * cellPointsPct / 100));
    const comboBonus = full.lines > 0 ? Math.round(full.lines * (effectiveTarget * comboBasePct / 100) * (1 + comboGrowth * (full.lines - 1))) : 0;
    const totalGain = gained + comboBonus;
    const newScore = score + totalGain;

    const nextTray = [...tray];
    nextTray[pieceIdx] = null;
    setSelectedIdx(null);
    setDragIdx(null);
    setHoverCell(null);
    setScore(newScore);
    setScorePopup({ id: Date.now(), text: `+${totalGain}` });
    if (full.lines >= 2) {
      setComboBanner({ id: Date.now() + 1, text: `COMBO x${full.lines}!` });
    }

    if (full.lines > 0) {
      setBoard(placedBoard);
      setFlashing(full.cells);
      setClearBurst({ id: Date.now() + 2, big: full.lines >= 2 });
      setTimeout(() => {
        const cleared = placedBoard.map((v, i) => (full.cells.has(i) ? null : v));
        setBoard(cleared);
        setFlashing(new Set());
        setClearBurst(null);
        finishTurn(nextTray, cleared, newScore);
      }, 300);
    } else {
      setBoard(placedBoard);
      finishTurn(nextTray, placedBoard, newScore);
    }
  }

  function handleCellClick(cellIdx) {
    if (phase !== 'playing' || selectedIdx === null) return;
    placePieceAt(selectedIdx, cellIdx);
  }

  function finishTurn(nextTray, currentBoard, currentScore) {
    let finalTray = nextTray;
    if (finalTray.every((p) => p === null)) {
      finalTray = spawnTray(activeWeights);
      setTrayKey((k) => k + 1);
      setRotationUsed(false);
    }
    setTray(finalTray);

    const stuck = finalTray.every((p) => p === null || !hasAnyValidPlacement(p.cells, currentBoard));
    if (stuck) {
      finalizeRound(currentScore, 'locked');
    }
  }

  function runSimulation() {
    setSimulating(true);
    setSimResult(null);
    setTimeout(() => {
      const res = simulateRTP(weights, gamma, maxWinCap, effectiveTarget, simTrials, cellPointsPct, comboBasePct, comboGrowth);
      setSimResult(res);
      setSimulating(false);
    }, 30);
  }

  function applyPreset(name) {
    setWeights(WEIGHT_PRESETS[name]);
  }

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Inter:wght@400;500;600&display=swap');
        @keyframes flashPulse {
          0% { filter: brightness(1); transform: scale(1); }
          50% { filter: brightness(2.6); transform: scale(1.12); }
          100% { filter: brightness(1); transform: scale(1); }
        }
        @keyframes floatUp {
          0% { transform: translateY(0); opacity: 0; }
          15% { opacity: 1; }
          100% { transform: translateY(-46px); opacity: 0; }
        }
        @keyframes bannerPop {
          0% { transform: scale(0.6) translateY(6px); opacity: 0; }
          20% { transform: scale(1.08) translateY(0); opacity: 1; }
          35% { transform: scale(1) translateY(0); opacity: 1; }
          100% { transform: scale(1) translateY(-10px); opacity: 0; }
        }
        @keyframes ambientPulse {
          0%, 100% { transform: scale(1); opacity: 0.55; }
          50% { transform: scale(1.15); opacity: 0.85; }
        }
        @keyframes ringBurst {
          0% { transform: scale(0.3); opacity: 0.9; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes pieceIn {
          0% { opacity: 0; transform: translateY(10px) scale(0.85); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes selectedPulse {
          0%, 100% { box-shadow: 0 0 0 2px var(--glow), 0 0 14px var(--glow); }
          50% { box-shadow: 0 0 0 2px var(--glow), 0 0 28px var(--glow); }
        }
        @keyframes dangerPulse {
          0%, 100% { box-shadow: 0 0 0 2px rgba(255,64,129,0.6), 0 0 20px rgba(255,64,129,0.4); }
          50% { box-shadow: 0 0 0 3px rgba(255,64,129,0.95), 0 0 36px rgba(255,64,129,0.7); }
        }
        .selected-glow { animation: selectedPulse 1.3s ease-in-out infinite; }
        .board-danger { animation: dangerPulse 0.9s ease-in-out infinite; }
        .cell-flash { animation: flashPulse 0.3s ease-in-out; }
        .score-popup { animation: floatUp 0.9s ease-out forwards; }
        .combo-banner { animation: bannerPop 1.1s ease-out forwards; }
        .ambient-blob { animation: ambientPulse 7s ease-in-out infinite; }
        .clear-burst { animation: ringBurst 0.5s ease-out forwards; }
        .piece-in { animation: pieceIn 0.32s ease-out both; }
        @media (prefers-reduced-motion: reduce) {
          .cell-flash, .score-popup, .combo-banner, .ambient-blob, .clear-burst, .piece-in, .selected-glow, .board-danger { animation: none; }
        }
        .bw-btn { transition: transform 0.12s ease, filter 0.12s ease, opacity 0.12s ease; }
        .bw-btn:active { transform: scale(0.96); }
        .piece-card { transition: transform 0.12s ease, box-shadow 0.12s ease, border-color 0.12s ease; }
        .piece-card:hover { transform: translateY(-2px); }
        .cell-el { transition: background 0.14s ease, box-shadow 0.14s ease; }
      `}</style>

      <div className="ambient-blob" style={styles.ambientBlob1} />
      <div className="ambient-blob" style={{ ...styles.ambientBlob2, animationDelay: '2.2s' }} />
      <div className="ambient-blob" style={{ ...styles.ambientBlob3, animationDelay: '4s' }} />
      <div style={styles.gridPattern} />

      <div style={styles.content}>
        <div style={styles.topBar}>
          <div>
            <div style={styles.brandEyebrow}>PROTÓTIPO</div>
            <h1 style={styles.brandTitle}>Block Win</h1>
          </div>
          <button className="bw-btn" style={styles.adminToggle} onClick={() => setAdminOpen(true)} aria-label="Painel interno">
            <Settings size={18} color="#0D1B3E" />
          </button>
        </div>

        {boostRounds > 0 && gamesPlayed < boostRounds && (
          <div style={styles.boostBadge}>
            Modo boost ativo — partida {gamesPlayed + 1} de {boostRounds} com peças fáceis (ignora os pesos do painel)
          </div>
        )}

        {roundHistory.length > 0 && (
          <div style={styles.historyStrip}>
            {roundHistory.map((h) => (
              <div
                key={h.id}
                style={{
                  ...styles.historyPill,
                  background: h.multiplier >= 1 ? 'rgba(40,199,111,0.18)' : 'rgba(255,64,129,0.18)',
                  color: h.multiplier >= 1 ? '#28C76F' : '#FF4081',
                  borderColor: h.multiplier >= 1 ? '#28C76F55' : '#FF408155',
                }}
              >
                {h.multiplier.toFixed(2)}x
              </div>
            ))}
          </div>
        )}

        {phase === 'betting' && (
          <div style={styles.card}>
            <p style={styles.sectionLabel}>Escolha o valor da aposta</p>
            <div style={styles.betGrid}>
              {BETS.map((b) => (
                <button
                  key={b}
                  className="bw-btn"
                  onClick={() => setBet(b)}
                  style={{ ...styles.betChip, ...(bet === b ? styles.betChipActive : {}) }}
                >
                  R$ {b}
                </button>
              ))}
            </div>
            <div style={styles.betSummary}>
              <div>
                <div style={styles.summaryLabel}>Meta de pontos</div>
                <div style={styles.summaryValue}>{effectiveTarget}</div>
              </div>
              <div>
                <div style={styles.summaryLabel}>Prêmio máximo</div>
                <div style={{ ...styles.summaryValue, color: '#FBC02D' }}>R$ {(bet * maxWinCap).toFixed(2)}</div>
              </div>
            </div>
            <button className="bw-btn" style={styles.primaryBtn} onClick={startGame}>
              <PlayCircle size={20} /> Entendi, bora jogar
            </button>
          </div>
        )}

        {phase !== 'betting' && (
          <>
            <div style={styles.hud}>
              <div style={styles.ringCard}>
                <svg width="64" height="64" viewBox="0 0 64 64">
                  <defs>
                    <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00D2FF" />
                      <stop offset="100%" stopColor="#FF4081" />
                    </linearGradient>
                  </defs>
                  <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="7" />
                  <circle
                    cx="32" cy="32" r="26" fill="none" stroke="url(#ringGrad)" strokeWidth="7"
                    strokeLinecap="round" strokeDasharray={2 * Math.PI * 26}
                    strokeDashoffset={2 * Math.PI * 26 * (1 - progressPct / 100)}
                    style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                    transform="rotate(-90 32 32)"
                  />
                </svg>
                <div>
                  <div style={styles.summaryLabel}>Pontuação</div>
                  <div style={styles.hudScore}>{score} <span style={{ color: '#8FA6D9', fontWeight: 600, fontSize: 14 }}>/ {effectiveTarget}</span></div>
                </div>
              </div>
              <div style={styles.hudItem}>
                <div style={styles.summaryLabel}>Retorno estimado</div>
                <div style={{ ...styles.hudScore, color: '#28C76F' }}>{currentMultiplier.toFixed(2)}x</div>
              </div>
            </div>

            {phase === 'playing' && (
              <button
                className="bw-btn"
                onClick={handleCashOut}
                disabled={!cashoutEligible}
                style={{ ...styles.cashoutBtn, opacity: cashoutEligible ? 1 : 0.45 }}
              >
                <Wallet size={16} />
                {cashoutEligible
                  ? `Sacar agora — R$ ${cashoutPayout.toFixed(2)} (${currentMultiplier.toFixed(2)}x)`
                  : `Saque libera aos ${Math.round(effectiveTarget * (minCashoutPct / 100))} pts`}
              </button>
            )}

            <div
              className={dangerActive ? 'board-danger' : ''}
              style={{
                ...styles.boardWrap,
                boxShadow: dangerActive ? undefined : `0 0 0 2px ${boardBorderColor}55, 0 0 22px ${boardBorderColor}35`,
              }}
            >
              {dangerActive && <div style={styles.dangerTag}>Poucas opções!</div>}
              {clearBurst && (
                <div
                  key={clearBurst.id}
                  className="clear-burst"
                  style={{
                    ...styles.clearBurst,
                    background: clearBurst.big
                      ? 'radial-gradient(circle, rgba(255,64,129,0.5), transparent 70%)'
                      : 'radial-gradient(circle, rgba(0,210,255,0.4), transparent 70%)',
                  }}
                />
              )}
              {comboBanner && (
                <div key={comboBanner.id} className="combo-banner" style={styles.comboBanner}>
                  {comboBanner.text}
                </div>
              )}
              {scorePopup && (
                <div key={scorePopup.id} className="score-popup" style={styles.scorePopup}>
                  {scorePopup.text}
                </div>
              )}
              <div style={styles.board} ref={boardRef}>
                {board.map((color, i) => {
                  const inFootprint = footprintCells.has(i);
                  let bg = 'rgba(255,255,255,0.05)';
                  let shadow = 'none';
                  if (color) {
                    bg = `linear-gradient(135deg, ${lighten(color, 50)}, ${color})`;
                    shadow = `inset 0 0 0 1px rgba(255,255,255,0.45), inset 0 -3px 5px rgba(0,0,0,0.28), 0 0 12px ${color}90`;
                  }
                  if (inFootprint) {
                    bg = footprintValid ? 'rgba(40,199,111,0.5)' : 'rgba(255,64,129,0.5)';
                    shadow = `inset 0 0 0 2px ${footprintValid ? '#28C76F' : '#FF4081'}`;
                  }
                  return (
                    <div
                      key={i}
                      onClick={() => handleCellClick(i)}
                      onMouseEnter={() => setHoverCell(i)}
                      onMouseLeave={() => setHoverCell((h) => (h === i ? null : h))}
                      className={`cell-el ${flashing.has(i) ? 'cell-flash' : ''}`}
                      style={{
                        ...styles.cell,
                        background: bg,
                        boxShadow: shadow,
                        cursor: phase === 'playing' && activeIdx !== null ? 'pointer' : 'default',
                      }}
                    />
                  );
                })}
              </div>
            </div>

            {phase === 'playing' && (
              <>
                <div style={styles.rotateHint}>
                  Giro disponível nesta rodada: <b>{rotationUsed ? '0' : '1'}/1</b>
                </div>
                <div style={styles.trayRow}>
                  {tray.map((piece, idx) => (
                    <div
                      key={piece ? `${trayKey}-${idx}` : `empty-${idx}`}
                      className="piece-card piece-in"
                      style={{
                        animationDelay: `${idx * 0.06}s`,
                        position: 'relative',
                        touchAction: 'none',
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                        WebkitTouchCallout: 'none',
                        cursor: piece ? 'grab' : 'default',
                      }}
                      onPointerDown={(e) => handleDragStart(e, idx)}
                      onDragStart={(e) => e.preventDefault()}
                    >
                      <div
                        className={activeIdx === idx && piece ? 'selected-glow' : ''}
                        style={{
                          ...styles.pieceCardInner,
                          opacity: piece ? 1 : 0.25,
                          ...(piece ? { borderColor: `${piece.color}66`, boxShadow: `0 0 10px ${piece.color}55` } : {}),
                          ...(activeIdx === idx && piece
                            ? { '--glow': piece.color, borderColor: piece.color, boxShadow: `0 0 0 2px ${piece.color}, 0 0 20px ${piece.color}` }
                            : {}),
                        }}
                      >
                        {piece && <MiniPiece cells={piece.cells} color={piece.color} />}
                      </div>
                      {piece && (
                        <button
                          onClick={(e) => { e.stopPropagation(); rotatePiece(idx); }}
                          onPointerDown={(e) => e.stopPropagation()}
                          disabled={rotationUsed}
                          style={{ ...styles.rotateBtn, opacity: rotationUsed ? 0.35 : 1, cursor: rotationUsed ? 'not-allowed' : 'pointer' }}
                          aria-label="Girar peça"
                        >
                          <RotateCw size={11} color="#0D1B3E" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {isDragging && dragIdx !== null && tray[dragIdx] && (
              <div
                style={{
                  position: 'fixed', left: dragPos.x, top: dragPos.y,
                  transform: 'translate(-50%, -50%) scale(1.3)',
                  pointerEvents: 'none', zIndex: 50, opacity: 0.85,
                }}
              >
                <MiniPiece cells={tray[dragIdx].cells} color={tray[dragIdx].color} />
              </div>
            )}

            {phase === 'ended' && result && (
              <div style={styles.resultCard}>
                <div style={styles.summaryLabel}>{result.reason === 'cashout' ? 'Você sacou' : 'Tabuleiro travou'}</div>
                <div style={styles.resultMultiplier}>{result.multiplier.toFixed(2)}x</div>
                <div style={styles.summaryValue}>Retorno: R$ {result.payout.toFixed(2)} (aposta R$ {bet.toFixed(2)})</div>
                <button className="bw-btn" style={styles.primaryBtn} onClick={() => setPhase('betting')}>
                  <RotateCcw size={18} /> Jogar novamente
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {adminOpen && (
        <div style={styles.adminOverlay}>
          <div style={styles.adminPanel}>
            <div style={styles.adminHeader}>
              <span style={styles.adminTitle}>Painel interno</span>
              <button onClick={() => setAdminOpen(false)} style={styles.iconBtn}>
                <X size={18} color="#fff" />
              </button>
            </div>
            <p style={styles.adminNote}>
              RNG por pesos, sorteado antes de cada rodada — nenhum parâmetro aqui lê ou reage ao tabuleiro de uma partida em andamento. A meta por % de aposta é a mesma regra pra todo mundo que apostar aquele valor, não uma decisão individual.
            </p>

            <div style={styles.adminSection}>
              <div style={styles.adminSectionTitle}>Pesos do pool de peças (0–100, controle absoluto)</div>
              <div style={styles.presetRow}>
                <button className="bw-btn" style={styles.presetBtn} onClick={() => applyPreset('facil')}>Fácil</button>
                <button className="bw-btn" style={styles.presetBtn} onClick={() => applyPreset('medio')}>Médio</button>
                <button className="bw-btn" style={styles.presetBtn} onClick={() => applyPreset('dificil')}>Difícil</button>
                <button className="bw-btn" style={styles.presetBtn} onClick={() => applyPreset('extremo')}>Extremo</button>
              </div>
              {Object.keys(SHAPES).map((key) => (
                <div key={key} style={styles.sliderRow}>
                  <span style={styles.sliderLabel}>{SHAPE_LABELS[key]}</span>
                  <input type="range" min="0" max="100" value={weights[key]}
                    onChange={(e) => setWeights({ ...weights, [key]: Number(e.target.value) })} style={styles.slider} />
                  <span style={styles.sliderValue}>{weights[key]}</span>
                </div>
              ))}
            </div>

            <div style={styles.adminSection}>
              <div style={styles.adminSectionTitle}>Meta de pontos</div>
              <label style={styles.toggleRow}>
                <input type="checkbox" checked={betScalingEnabled} onChange={(e) => setBetScalingEnabled(e.target.checked)} />
                <span style={styles.sliderLabel}>Meta variável (% do valor apostado)</span>
              </label>
              {betScalingEnabled ? (
                <div style={styles.sliderRow}>
                  <span style={styles.sliderLabel}>Pontos por R$1 apostado</span>
                  <input type="range" min="10" max="1000" step="10" value={pointsPerReal}
                    onChange={(e) => setPointsPerReal(Number(e.target.value))} style={styles.slider} />
                  <span style={styles.sliderValue}>{pointsPerReal}</span>
                </div>
              ) : (
                <div style={styles.sliderRow}>
                  <span style={styles.sliderLabel}>Meta fixa</span>
                  <input type="range" min="100" max="20000" step="100" value={pointsTarget}
                    onChange={(e) => setPointsTarget(Number(e.target.value))} style={styles.slider} />
                  <span style={styles.sliderValue}>{pointsTarget}</span>
                </div>
              )}
              <div style={styles.simCaveat}>
                Meta pra aposta atual (R$ {bet}): <b>{effectiveTarget} pts</b>. Como os pesos das peças não mudam com a aposta, meta mais alta = menor chance estatística de bater a meta nesse valor de ticket.
              </div>
            </div>

            <div style={styles.adminSection}>
              <div style={styles.adminSectionTitle}>Pontuação &amp; combos (% da meta — escala com a aposta)</div>
              <div style={styles.sliderRow}>
                <span style={styles.sliderLabel}>% da meta por célula</span>
                <input type="range" min="0.5" max="10" step="0.1" value={cellPointsPct}
                  onChange={(e) => setCellPointsPct(Number(e.target.value))} style={styles.slider} />
                <span style={styles.sliderValue}>{cellPointsPct.toFixed(1)}%</span>
              </div>
              <div style={styles.sliderRow}>
                <span style={styles.sliderLabel}>% da meta por linha</span>
                <input type="range" min="0.5" max="15" step="0.1" value={comboBasePct}
                  onChange={(e) => setComboBasePct(Number(e.target.value))} style={styles.slider} />
                <span style={styles.sliderValue}>{comboBasePct.toFixed(1)}%</span>
              </div>
              <div style={styles.sliderRow}>
                <span style={styles.sliderLabel}>Crescimento por linha extra</span>
                <input type="range" min="0" max="3" step="0.1" value={comboGrowth}
                  onChange={(e) => setComboGrowth(Number(e.target.value))} style={styles.slider} />
                <span style={styles.sliderValue}>{comboGrowth.toFixed(1)}</span>
              </div>
              <div style={styles.simCaveat}>
                Pra aposta atual (meta = {effectiveTarget} pts): 1 célula = {Math.round(effectiveTarget * cellPointsPct / 100)} pts · limpar 2 linhas de uma vez = {Math.round(2 * (effectiveTarget * comboBasePct / 100) * (1 + comboGrowth * 1))} pts. Como isso é % da meta, a proporção fica igual pra qualquer valor de aposta.
              </div>
            </div>

            <div style={styles.adminSection}>
              <div style={styles.adminSectionTitle}>Curva de prêmio</div>
              <div style={styles.sliderRow}>
                <span style={styles.sliderLabel}>Gamma (γ)</span>
                <input type="range" min="0.5" max="5" step="0.1" value={gamma}
                  onChange={(e) => setGamma(Number(e.target.value))} style={styles.slider} />
                <span style={styles.sliderValue}>{gamma.toFixed(1)}</span>
              </div>
              <div style={styles.sliderRow}>
                <span style={styles.sliderLabel}>Max Win Cap</span>
                <input type="range" min="1" max="50" value={maxWinCap}
                  onChange={(e) => setMaxWinCap(Number(e.target.value))} style={styles.slider} />
                <span style={styles.sliderValue}>{maxWinCap}x</span>
              </div>
              <div style={styles.sliderRow}>
                <span style={styles.sliderLabel}>Rodadas com boost p/ novos users</span>
                <input type="range" min="0" max="10" value={boostRounds}
                  onChange={(e) => setBoostRounds(Number(e.target.value))} style={styles.slider} />
                <span style={styles.sliderValue}>{boostRounds}</span>
              </div>
              <div style={styles.simCaveat}>
                Partidas jogadas nesta sessão: <b>{gamesPlayed}</b>
                {boostRounds > 0 && gamesPlayed < boostRounds ? ' — boost ainda ativo, os pesos acima não valem até essa contagem passar.' : ' — pesos do painel valendo normalmente.'}
              </div>
              <button className="bw-btn" style={{ ...styles.presetBtn, marginTop: 8 }} onClick={() => setGamesPlayed(0)}>
                Resetar contador de partidas
              </button>
            </div>

            <div style={styles.adminSection}>
              <div style={styles.adminSectionTitle}>Saque antecipado</div>
              <label style={styles.toggleRow}>
                <input type="checkbox" checked={allowEarlyCashout} onChange={(e) => setAllowEarlyCashout(e.target.checked)} />
                <span style={styles.sliderLabel}>Permitir saque antes do fim da rodada</span>
              </label>
              <div style={styles.sliderRow}>
                <span style={styles.sliderLabel}>Libera saque a partir de</span>
                <input type="range" min="0" max="90" value={minCashoutPct}
                  onChange={(e) => setMinCashoutPct(Number(e.target.value))} style={styles.slider} />
                <span style={styles.sliderValue}>{minCashoutPct}%</span>
              </div>
            </div>

            <div style={styles.adminSection}>
              <div style={styles.adminSectionTitle}>Estimativa de RTP (simulação simplificada)</div>
              <div style={styles.sliderRow}>
                <span style={styles.sliderLabel}>Nº de partidas simuladas</span>
                <input type="range" min="50" max="300" step="10" value={simTrials}
                  onChange={(e) => setSimTrials(Number(e.target.value))} style={styles.slider} />
                <span style={styles.sliderValue}>{simTrials}</span>
              </div>
              <button className="bw-btn" style={styles.simBtn} onClick={runSimulation} disabled={simulating}>
                {simulating ? 'Simulando…' : `Rodar ${simTrials} partidas simuladas (aposta atual: R$${bet})`}
              </button>
              {simResult && (
                <div style={styles.simResult}>
                  <div>RTP implícito: <b>{simResult.impliedRTP.toFixed(1)}%</b></div>
                  <div>Rodadas com retorno ≥ 1x: <b>{simResult.winRate.toFixed(1)}%</b></div>
                  <div style={styles.simCaveat}>
                    Jogador simulado encaixa na 1ª posição válida — estimativa conservadora, não é o motor final de produção.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniPiece({ cells, color }) {
  const maxR = Math.max(...cells.map((c) => c[0])) + 1;
  const maxC = Math.max(...cells.map((c) => c[1])) + 1;
  const size = 14;
  return (
    <div style={{ position: 'relative', width: maxC * size, height: maxR * size }}>
      {cells.map(([r, c], i) => (
        <div key={i} style={{
          position: 'absolute', top: r * size, left: c * size,
          width: size - 2, height: size - 2,
          background: `linear-gradient(135deg, ${lighten(color, 50)}, ${color})`,
          borderRadius: 4,
          boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.5), inset 0 -2px 3px rgba(0,0,0,0.3), 0 0 8px ${color}90`,
        }} />
      ))}
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh', position: 'relative', overflow: 'hidden',
    background: 'linear-gradient(160deg, #0D1B3E 0%, #16305F 55%, #1A4B8E 100%)',
    color: '#EAF0FF', fontFamily: "'Inter', sans-serif",
  },
  gridPattern: {
    position: 'absolute', inset: 0, opacity: 0.5, pointerEvents: 'none',
    backgroundImage: 'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
    backgroundSize: '26px 26px',
  },
  ambientBlob1: {
    position: 'absolute', top: -80, left: -60, width: 260, height: 260, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(0,210,255,0.35), transparent 70%)', filter: 'blur(10px)', pointerEvents: 'none',
  },
  ambientBlob2: {
    position: 'absolute', bottom: -100, right: -80, width: 300, height: 300, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(255,64,129,0.3), transparent 70%)', filter: 'blur(10px)', pointerEvents: 'none',
  },
  ambientBlob3: {
    position: 'absolute', top: '38%', left: '55%', width: 220, height: 220, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(158,87,229,0.22), transparent 70%)', filter: 'blur(14px)', pointerEvents: 'none',
  },
  content: { position: 'relative', zIndex: 1, padding: '20px 16px 40px', maxWidth: 480, margin: '0 auto' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  brandEyebrow: { fontSize: 11, letterSpacing: 2, color: '#8FA6D9', fontWeight: 600 },
  brandTitle: { fontFamily: "'Baloo 2', sans-serif", fontSize: 28, fontWeight: 800, margin: 0, color: '#fff' },
  boostBadge: { background: 'rgba(251,192,45,0.15)', border: '1px solid #FBC02D', color: '#FBC02D', fontSize: 11, fontWeight: 600, padding: '6px 10px', borderRadius: 8, marginBottom: 14, textAlign: 'center' },
  historyStrip: { display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto', paddingBottom: 2 },
  historyPill: { flexShrink: 0, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, border: '1px solid' },
  dangerTag: { position: 'absolute', top: 8, left: 8, background: 'rgba(255,64,129,0.9)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 8, zIndex: 6, pointerEvents: 'none' },
  rotateBtn: { position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#FBC02D', border: '2px solid #0B152F', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.4)', padding: 0 },
  rotateHint: { fontSize: 11, color: '#8FA6D9', textAlign: 'center', marginBottom: 8 },
  adminToggle: { width: 36, height: 36, borderRadius: 10, border: 'none', background: '#FBC02D', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  card: { background: 'rgba(255,255,255,0.06)', borderRadius: 20, padding: 20, border: '1px solid rgba(255,255,255,0.1)' },
  sectionLabel: { fontSize: 13, color: '#AEC0EE', margin: '0 0 12px', fontWeight: 600 },
  betGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 },
  betChip: { padding: '10px 0', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.04)', color: '#EAF0FF', fontWeight: 600, fontSize: 14, cursor: 'pointer' },
  betChipActive: { background: '#28C76F', borderColor: '#28C76F', color: '#06210F' },
  betSummary: { display: 'flex', justifyContent: 'space-between', marginBottom: 18, padding: '12px 4px', borderTop: '1px solid rgba(255,255,255,0.08)' },
  summaryLabel: { fontSize: 11, color: '#8FA6D9', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { fontSize: 18, fontWeight: 700, color: '#fff', marginTop: 2 },
  primaryBtn: { width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', background: '#28C76F', color: '#06210F', fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' },
  hud: { display: 'flex', gap: 12, marginBottom: 12 },
  ringCard: { flex: 1.2, background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 },
  hudItem: { flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: '10px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  hudScore: { fontSize: 20, fontWeight: 800, color: '#fff' },
  cashoutBtn: { width: '100%', padding: '10px 0', borderRadius: 12, border: '1px solid #FBC02D', background: 'rgba(251,192,45,0.12)', color: '#FBC02D', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', marginBottom: 12 },
  boardWrap: { position: 'relative', background: 'rgba(0,0,0,0.25)', borderRadius: 18, padding: 8, marginBottom: 14, overflow: 'hidden', transition: 'box-shadow 0.4s ease' },
  board: { display: 'grid', gridTemplateColumns: `repeat(${GRID}, 1fr)`, gap: 3, aspectRatio: '1 / 1' },
  cell: { borderRadius: 4, aspectRatio: '1 / 1' },
  clearBurst: { position: 'absolute', top: '50%', left: '50%', width: 140, height: 140, marginTop: -70, marginLeft: -70, borderRadius: '50%', zIndex: 4, pointerEvents: 'none' },
  scorePopup: { position: 'absolute', top: '40%', left: '50%', transform: 'translateX(-50%)', fontFamily: "'Baloo 2', sans-serif", fontSize: 26, fontWeight: 800, color: '#FBC02D', textShadow: '0 2px 12px rgba(0,0,0,0.5)', zIndex: 5, pointerEvents: 'none' },
  comboBanner: { position: 'absolute', top: '18%', left: '50%', transform: 'translateX(-50%)', fontFamily: "'Baloo 2', sans-serif", fontSize: 20, fontWeight: 800, color: '#fff', background: 'linear-gradient(90deg,#FF4081,#9E57E5)', padding: '4px 16px', borderRadius: 20, zIndex: 6, pointerEvents: 'none', whiteSpace: 'nowrap' },
  trayRow: { display: 'flex', justifyContent: 'center', gap: 14, marginBottom: 8 },
  pieceCardInner: { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 12, padding: 10, minWidth: 64, minHeight: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  resultCard: { background: 'rgba(255,255,255,0.06)', borderRadius: 20, padding: 24, textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' },
  resultMultiplier: { fontFamily: "'Baloo 2', sans-serif", fontSize: 40, fontWeight: 800, color: '#FBC02D', margin: '8px 0' },
  adminOverlay: { position: 'fixed', inset: 0, background: 'rgba(5,10,25,0.7)', display: 'flex', alignItems: 'flex-end', zIndex: 20 },
  adminPanel: { width: '100%', maxWidth: 480, margin: '0 auto', maxHeight: '85%', overflowY: 'auto', background: '#0B152F', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, border: '1px solid rgba(255,255,255,0.1)' },
  adminHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  adminTitle: { fontFamily: "'Baloo 2', sans-serif", fontSize: 18, fontWeight: 700, color: '#fff' },
  iconBtn: { background: 'transparent', border: 'none', cursor: 'pointer' },
  adminNote: { fontSize: 12, color: '#8FA6D9', marginBottom: 16, lineHeight: 1.4 },
  adminSection: { marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.08)' },
  adminSectionTitle: { fontSize: 12, fontWeight: 700, color: '#FBC02D', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  presetRow: { display: 'flex', gap: 8, marginBottom: 12 },
  presetBtn: { flex: 1, padding: '6px 0', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: '#EAF0FF', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  sliderRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  toggleRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, cursor: 'pointer' },
  sliderLabel: { fontSize: 12, color: '#EAF0FF', width: 150, flexShrink: 0 },
  slider: { flex: 1 },
  sliderValue: { fontSize: 12, color: '#AEC0EE', width: 32, textAlign: 'right' },
  simBtn: { width: '100%', padding: '10px 0', borderRadius: 10, border: 'none', background: '#00D2FF', color: '#06210F', fontWeight: 700, fontSize: 13, cursor: 'pointer' },
  simResult: { marginTop: 12, fontSize: 13, color: '#EAF0FF', lineHeight: 1.6 },
  simCaveat: { fontSize: 11, color: '#8FA6D9', marginTop: 6, fontStyle: 'italic' },
};
