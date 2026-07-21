// src/Components/PixelNo.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';

/**
 * Generates a THICK, BOLD pixel matrix for "NO".
 * Stroke width adapts to the grid size.
 */
function generateNoMatrix(rows, cols) {
  const matrix = Array.from({ length: rows }, () => Array(cols).fill(0));

  const top = Math.floor(rows * 0.1);
  const bottom = Math.floor(rows * 0.9);
  // Stroke width scales with grid size – between 3 and 8 pixels
  const stroke = Math.max(3, Math.min(8, Math.floor(rows * 0.08)));

  // ---- N ----
  const nLeft = Math.floor(cols * 0.1);
  const nRight = Math.floor(cols * 0.35);
  const nWidth = nRight - nLeft;

  for (let r = top; r <= bottom; r++) {
    // Left vertical (thick)
    for (let s = 0; s < stroke; s++) {
      const col = nLeft + s;
      if (col < cols) matrix[r][col] = 1;
    }
    // Right vertical (thick)
    for (let s = 0; s < stroke; s++) {
      const col = nRight - s;
      if (col >= 0) matrix[r][col] = 1;
    }
    // Diagonal (thick)
    const diagCol = nLeft + ((r - top) / (bottom - top)) * nWidth;
    for (let s = -Math.floor(stroke / 2); s <= Math.floor(stroke / 2); s++) {
      const col = Math.round(diagCol + s);
      if (col >= 0 && col < cols) matrix[r][col] = 1;
    }
  }

  // ---- O ----
  const oLeft = Math.floor(cols * 0.5);
  const oRight = Math.floor(cols * 0.75);

  // Top & bottom bars (thick horizontal)
  for (let c = oLeft; c <= oRight; c++) {
    for (let s = 0; s < stroke; s++) {
      if (top + s < rows) matrix[top + s][c] = 1;
      if (bottom - s >= 0) matrix[bottom - s][c] = 1;
    }
  }

  // Left & right bars (thick vertical)
  for (let r = top; r <= bottom; r++) {
    for (let s = 0; s < stroke; s++) {
      if (oLeft + s < cols) matrix[r][oLeft + s] = 1;
      if (oRight - s >= 0) matrix[r][oRight - s] = 1;
    }
  }

  return matrix;
}

/**
 * Shuffles an array in place (Fisher–Yates).
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

const PixelNo = ({
  rows = 30,          // More rows = taller
  cols = 60,          // More cols = wider (2:1 ratio looks great)
  pixelSize = 14,
  gap = 2,
  color = '#fbbf24',  // gold
  bgColor = '#0f0f1a', // dark background
  speed = 15,         // ms per pixel
  onComplete = () => {},
}) => {
  const matrix = useMemo(() => generateNoMatrix(rows, cols), [rows, cols]);

  const pixelList = useMemo(() => {
    const list = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        list.push({ row: r, col: c, filled: matrix[r][c] === 1 });
      }
    }
    return list;
  }, [matrix, rows, cols]);

  const onPixels = useMemo(() => pixelList.filter(p => p.filled), [pixelList]);

  const [revealed, setRevealed] = useState(() => new Array(pixelList.length).fill(false));
  const progressRef = useRef(0);
  const timerRef = useRef(null);

  const [order] = useState(() => {
    const indices = onPixels.map(p =>
      pixelList.findIndex(pp => pp.row === p.row && pp.col === p.col)
    );
    return shuffleArray(indices);
  });

  useEffect(() => {
    const total = order.length;
    if (total === 0) return;

    let count = 0;
    const step = () => {
      if (count >= total) {
        if (timerRef.current) clearTimeout(timerRef.current);
        onComplete();
        return;
      }
      const idx = order[count];
      setRevealed(prev => {
        const next = [...prev];
        next[idx] = true;
        return next;
      });
      count++;
      progressRef.current = count;
      timerRef.current = setTimeout(step, speed);
    };

    timerRef.current = setTimeout(step, speed);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [order, speed, onComplete]);

  const totalWidth = cols * (pixelSize + gap) - gap;
  const totalHeight = rows * (pixelSize + gap) - gap;

  return (
    <div
      style={{
        minHeight: '100vh',
        minWidth: '100vw',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: bgColor,
        margin: 0,
        padding: 0,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, ${pixelSize}px)`,
          gridTemplateRows: `repeat(${rows}, ${pixelSize}px)`,
          gap: `${gap}px`,
          width: totalWidth,
          height: totalHeight,
        }}
      >
        {pixelList.map((p, index) => {
          const isRevealed = revealed[index];
          const isFilled = p.filled;
          const show = isRevealed && isFilled;
          return (
            <div
              key={`${p.row}-${p.col}`}
              style={{
                width: pixelSize,
                height: pixelSize,
                backgroundColor: show ? color : 'transparent',
                transition: 'background-color 0.08s ease',
                borderRadius: '2px',
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

export default PixelNo;