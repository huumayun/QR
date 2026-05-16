function generateQR() {
  const content = getQRContent();
  const canvas = document.getElementById('qr-canvas');
  const placeholder = document.getElementById('qr-placeholder');
  const logoOverlay = document.getElementById('logo-overlay');

  if (!content) {
    canvas.style.display = 'none';
    placeholder.style.display = 'flex';
    logoOverlay.style.display = 'none';
    return;
  }

  placeholder.style.display = 'none';
  canvas.style.display = 'block';

  let ecl = state.ecLevel;
  if (state.logoDataUrl) {
    ecl = 'H';
  }

  const dummy = document.createElement('div');
  const qrObj = new QRCode(dummy, {
    text: content,
    width: 256,
    height: 256,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel[ecl]
  });

  const qrModel = qrObj._oQRCode;
  if(!qrModel) {
    // Fallback: try to find it on the dummy children if the instance doesn't have it directly
    const rawQr = dummy.querySelector('canvas') || dummy.querySelector('table');
    if (rawQr && rawQr._oQRCode) {
       // but typically it's on the instance in standard qrcode.js
    }
    return;
  }
  const count = qrModel.moduleCount;

  const realSize = state.size;
  const margin = state.margin;
  const dotSize = Math.floor((realSize - (margin * 2)) / count);
  const actualSize = (dotSize * count) + (margin * 2);

  canvas.width = actualSize;
  canvas.height = actualSize;
  const ctx = canvas.getContext('2d');

  // Background
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!state.transparent) {
    ctx.fillStyle = state.bgColor;
    if (state.bgShape === 'rounded') {
      const r = canvas.width * 0.1;
      ctx.beginPath();
      drawRoundedRect(ctx, 0, 0, canvas.width, canvas.height, r, r, r, r);
      ctx.fill();
    } else if (state.bgShape === 'extra') {
      const r = canvas.width * 0.2;
      ctx.beginPath();
      drawRoundedRect(ctx, 0, 0, canvas.width, canvas.height, r, r, r, r);
      ctx.fill();
    } else {
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  ctx.fillStyle = state.fgColor;

  // Alignment Pattern Detector (bottom-right area typically)
  // Finder patterns are at (0,0), (count-7,0), (0,count-7) - each 7x7
  function isFinder(r, c) {
    return (r < 7 && c < 7) || (r < 7 && c >= count - 7) || (r >= count - 7 && c < 7);
  }

  function isAlignment(r, c) {
    if (isFinder(r, c)) return false;
    // VERY simplified alignment pattern protection:
    // Alignment patterns are 5x5.
    // If we are deep enough in the QR code (version 2+), there are alignment patterns.
    // Real detection requires knowing the exact coordinates, but we can just use the standard
    // qrcode library's data or do a heuristic. For now, let's treat anything that is dark and isolated?
    // Actually, qrcode library doesn't expose alignment centers directly.
    return false; // Skip complex alignment detection for now, focus on Finders + Body.
  }

  // Logo Clearance
  let clearStart = -1;
  let clearEnd = -1;
  if (state.logoDataUrl) {
    const clearModules = Math.floor(count * (state.logoSize / 100));
    const center = Math.floor(count / 2);
    clearStart = center - Math.floor(clearModules / 2);
    clearEnd = center + Math.ceil(clearModules / 2);
  }

  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (state.logoDataUrl && r >= clearStart && r <= clearEnd && c >= clearStart && c <= clearEnd) {
        continue;
      }

      const isDark = qrModel.isDark(r, c);
      if (!isDark) continue;

      const x = margin + c * dotSize;
      const y = margin + r * dotSize;

      // Draw Finders Custom
      if (isFinder(r, c)) {
        // Finders are drawn separately to allow custom shapes
        continue;
      }

      // Draw Body
      ctx.beginPath();
      
      const top = r > 0 && qrModel.isDark(r - 1, c);
      const bottom = r < count - 1 && qrModel.isDark(r + 1, c);
      const left = c > 0 && qrModel.isDark(r, c - 1);
      const right = c < count - 1 && qrModel.isDark(r, c + 1);

      if (state.dotStyle === 'square') {
        ctx.rect(x, y, dotSize, dotSize);
      } else if (state.dotStyle === 'dots') {
        ctx.arc(x + dotSize/2, y + dotSize/2, dotSize/2 * 0.9, 0, Math.PI * 2);
      } else if (state.dotStyle === 'rounded' || state.dotStyle === 'extra-rounded' || state.dotStyle === 'classy') {
        let rVal = state.dotStyle === 'extra-rounded' ? dotSize / 2 : dotSize / 3;
        if (state.dotStyle === 'classy') rVal = dotSize / 2;
        
        let tl = rVal, tr = rVal, br = rVal, bl = rVal;
        
        if (state.dotStyle === 'classy') {
          if (top || left) tl = 0;
          if (top || right) tr = 0;
          if (bottom || right) br = 0;
          if (bottom || left) bl = 0;
        } else {
          if (top && left) tl = 0;
          if (top && right) tr = 0;
          if (bottom && right) br = 0;
          if (bottom && left) bl = 0;
        }
        drawRoundedRect(ctx, x, y, dotSize, dotSize, tl, tr, br, bl);
      } else if (state.dotStyle === 'diamond') {
        ctx.moveTo(x + dotSize/2, y);
        ctx.lineTo(x + dotSize, y + dotSize/2);
        ctx.lineTo(x + dotSize/2, y + dotSize);
        ctx.lineTo(x, y + dotSize/2);
      } else if (state.dotStyle === 'star') {
        ctx.moveTo(x + dotSize/2, y);
        ctx.quadraticCurveTo(x + dotSize/2, y + dotSize/2, x + dotSize, y + dotSize/2);
        ctx.quadraticCurveTo(x + dotSize/2, y + dotSize/2, x + dotSize/2, y + dotSize);
        ctx.quadraticCurveTo(x + dotSize/2, y + dotSize/2, x, y + dotSize/2);
        ctx.quadraticCurveTo(x + dotSize/2, y + dotSize/2, x + dotSize/2, y);
      } else if (state.dotStyle === 'cross') {
        const thick = dotSize / 3;
        const off = (dotSize - thick) / 2;
        ctx.rect(x + off, y, thick, dotSize);
        ctx.rect(x, y + off, dotSize, thick);
      } else if (state.dotStyle === 'heart') {
        const d = dotSize;
        ctx.moveTo(x + d/2, y + d*0.3);
        ctx.bezierCurveTo(x + d/2, y, x, y, x, y + d*0.4);
        ctx.bezierCurveTo(x, y + d*0.7, x + d/2, y + d*0.9, x + d/2, y + d);
        ctx.bezierCurveTo(x + d/2, y + d*0.9, x + d, y + d*0.7, x + d, y + d*0.4);
        ctx.bezierCurveTo(x + d, y, x + d/2, y, x + d/2, y + d*0.3);
      } else if (state.dotStyle === 'hexagon') {
        const d = dotSize;
        ctx.moveTo(x + d*0.25, y);
        ctx.lineTo(x + d*0.75, y);
        ctx.lineTo(x + d, y + d*0.5);
        ctx.lineTo(x + d*0.75, y + d);
        ctx.lineTo(x + d*0.25, y + d);
        ctx.lineTo(x, y + d*0.5);
      } else if (state.dotStyle === 'triangle') {
        ctx.moveTo(x + dotSize/2, y);
        ctx.lineTo(x + dotSize, y + dotSize);
        ctx.lineTo(x, y + dotSize);
      } else if (state.dotStyle === 'triangle-down') {
        ctx.moveTo(x, y);
        ctx.lineTo(x + dotSize, y);
        ctx.lineTo(x + dotSize/2, y + dotSize);
      } else if (state.dotStyle === 'dash') {
        ctx.rect(x, y + dotSize*0.3, dotSize, dotSize*0.4);
      } else if (state.dotStyle === 'dash-v') {
        ctx.rect(x + dotSize*0.3, y, dotSize*0.4, dotSize);
      } else if (state.dotStyle === 'plus') {
        const t = dotSize * 0.2;
        const off = (dotSize - t)/2;
        ctx.rect(x + off, y, t, dotSize);
        ctx.rect(x, y + off, dotSize, t);
      } else if (state.dotStyle === 'x-shape') {
        ctx.save();
        ctx.translate(x + dotSize/2, y + dotSize/2);
        ctx.rotate(Math.PI/4);
        const t = dotSize * 0.2;
        ctx.rect(-t/2, -dotSize/2, t, dotSize);
        ctx.rect(-dotSize/2, -t/2, dotSize, t);
        ctx.restore();
      } else if (state.dotStyle === 'octagon') {
        const d = dotSize;
        const o = d * 0.3;
        ctx.moveTo(x + o, y);
        ctx.lineTo(x + d - o, y);
        ctx.lineTo(x + d, y + o);
        ctx.lineTo(x + d, y + d - o);
        ctx.lineTo(x + d - o, y + d);
        ctx.lineTo(x + o, y + d);
        ctx.lineTo(x, y + d - o);
        ctx.lineTo(x, y + o);
      } else if (state.dotStyle === 'spikes') {
        const d = dotSize;
        ctx.moveTo(x + d/2, y);
        ctx.lineTo(x + d*0.6, y + d*0.4);
        ctx.lineTo(x + d, y + d/2);
        ctx.lineTo(x + d*0.6, y + d*0.6);
        ctx.lineTo(x + d/2, y + d);
        ctx.lineTo(x + d*0.4, y + d*0.6);
        ctx.lineTo(x, y + d/2);
        ctx.lineTo(x + d*0.4, y + d*0.4);
      } else if (state.dotStyle === 'flower') {
        const r = dotSize * 0.3;
        ctx.arc(x + dotSize*0.3, y + dotSize*0.3, r, 0, Math.PI*2);
        ctx.arc(x + dotSize*0.7, y + dotSize*0.3, r, 0, Math.PI*2);
        ctx.arc(x + dotSize*0.3, y + dotSize*0.7, r, 0, Math.PI*2);
        ctx.arc(x + dotSize*0.7, y + dotSize*0.7, r, 0, Math.PI*2);
      }
      
      ctx.fill();
    }
  }

  // Draw Finders
  drawFinder(ctx, margin, margin, dotSize, 7, state.eyeFrameShape, state.eyeBallShape); // Top Left
  drawFinder(ctx, margin + (count - 7) * dotSize, margin, dotSize, 7, state.eyeFrameShape, state.eyeBallShape); // Top Right
  drawFinder(ctx, margin, margin + (count - 7) * dotSize, dotSize, 7, state.eyeFrameShape, state.eyeBallShape); // Bottom Left

  // Overlay logo if exists
  if (state.logoDataUrl) {
    const logoImg = document.getElementById('logo-img');
    logoImg.src = state.logoDataUrl;
    logoOverlay.style.display = 'flex';
    logoOverlay.style.width = (state.logoSize * 1.5) + '%';
    logoOverlay.style.height = (state.logoSize * 1.5) + '%';
  } else {
    logoOverlay.style.display = 'none';
  }
}

function drawFinder(ctx, x, y, dotSize, size, frameShape, ballShape) {
  const fSize = dotSize * size;
  const centerOff = dotSize * 2;
  const innerSize = dotSize * 3;

  ctx.beginPath();
  
  if (frameShape === 'square') {
    ctx.rect(x, y, fSize, fSize);
    ctx.rect(x + dotSize, y + dotSize, fSize - dotSize*2, fSize - dotSize*2);
  } else if (frameShape === 'circle') {
    ctx.arc(x + fSize/2, y + fSize/2, fSize/2, 0, Math.PI*2);
    ctx.arc(x + fSize/2, y + fSize/2, fSize/2 - dotSize, 0, Math.PI*2, true);
  } else if (frameShape === 'rounded') {
    drawRoundedRect(ctx, x, y, fSize, fSize, dotSize*1.5, dotSize*1.5, dotSize*1.5, dotSize*1.5);
    drawRoundedRect(ctx, x + dotSize, y + dotSize, fSize - dotSize*2, fSize - dotSize*2, dotSize*0.5, dotSize*0.5, dotSize*0.5, dotSize*0.5, true);
  } else if (frameShape === 'leaf') {
    drawRoundedRect(ctx, x, y, fSize, fSize, dotSize*3, 0, dotSize*3, 0);
    drawRoundedRect(ctx, x + dotSize, y + dotSize, fSize - dotSize*2, fSize - dotSize*2, dotSize*2, 0, dotSize*2, 0, true);
  } else if (frameShape === 'shield') {
    ctx.moveTo(x, y);
    ctx.lineTo(x + fSize, y);
    ctx.lineTo(x + fSize, y + fSize*0.6);
    ctx.lineTo(x + fSize/2, y + fSize);
    ctx.lineTo(x, y + fSize*0.6);
    ctx.lineTo(x, y);
    const ix = x + dotSize;
    const iy = y + dotSize;
    const is = fSize - dotSize*2;
    ctx.moveTo(ix, iy);
    ctx.lineTo(ix + is, iy);
    ctx.lineTo(ix + is, iy + is*0.55);
    ctx.lineTo(ix + is/2, iy + is);
    ctx.lineTo(ix, iy + is*0.55);
    ctx.lineTo(ix, iy);
  } else if (frameShape === 'octagon') {
    const o = fSize * 0.3;
    ctx.moveTo(x + o, y);
    ctx.lineTo(x + fSize - o, y);
    ctx.lineTo(x + fSize, y + o);
    ctx.lineTo(x + fSize, y + fSize - o);
    ctx.lineTo(x + fSize - o, y + fSize);
    ctx.lineTo(x + o, y + fSize);
    ctx.lineTo(x, y + fSize - o);
    ctx.lineTo(x, y + o);
    const io = (fSize - dotSize*2) * 0.3;
    const ix = x + dotSize;
    const iy = y + dotSize;
    const is = fSize - dotSize*2;
    ctx.moveTo(ix + io, iy);
    ctx.lineTo(ix + is - io, iy);
    ctx.lineTo(ix + is, iy + io);
    ctx.lineTo(ix + is, iy + is - io);
    ctx.lineTo(ix + is - io, iy + is);
    ctx.lineTo(ix + io, iy + is);
    ctx.lineTo(ix, iy + is - io);
    ctx.lineTo(ix, iy + io);
  } else if (frameShape === 'hexagon') {
    ctx.moveTo(x + fSize*0.25, y);
    ctx.lineTo(x + fSize*0.75, y);
    ctx.lineTo(x + fSize, y + fSize*0.5);
    ctx.lineTo(x + fSize*0.75, y + fSize);
    ctx.lineTo(x + fSize*0.25, y + fSize);
    ctx.lineTo(x, y + fSize*0.5);
    const ix = x + dotSize;
    const iy = y + dotSize;
    const is = fSize - dotSize*2;
    ctx.moveTo(ix + is*0.25, iy);
    ctx.lineTo(ix + is*0.75, iy);
    ctx.lineTo(ix + is, iy + is*0.5);
    ctx.lineTo(ix + is*0.75, iy + is);
    ctx.lineTo(ix + is*0.25, iy + is);
    ctx.lineTo(ix, iy + is*0.5);
  } else if (frameShape === 'star') {
    ctx.moveTo(x + fSize/2, y);
    ctx.quadraticCurveTo(x + fSize/2, y + fSize/2, x + fSize, y + fSize/2);
    ctx.quadraticCurveTo(x + fSize/2, y + fSize/2, x + fSize/2, y + fSize);
    ctx.quadraticCurveTo(x + fSize/2, y + fSize/2, x, y + fSize/2);
    ctx.quadraticCurveTo(x + fSize/2, y + fSize/2, x + fSize/2, y);
    const ix = x + dotSize;
    const iy = y + dotSize;
    const is = fSize - dotSize*2;
    ctx.moveTo(ix + is/2, iy);
    ctx.quadraticCurveTo(ix + is/2, iy + is/2, ix + is, iy + is/2);
    ctx.quadraticCurveTo(ix + is/2, iy + is/2, ix + is/2, iy + is);
    ctx.quadraticCurveTo(ix + is/2, iy + is/2, ix, iy + is/2);
    ctx.quadraticCurveTo(ix + is/2, iy + is/2, ix + is/2, iy);
  }

  ctx.fill('evenodd');

  ctx.beginPath();
  if (ballShape === 'square') {
    ctx.rect(x + centerOff, y + centerOff, innerSize, innerSize);
  } else if (ballShape === 'circle') {
    ctx.arc(x + centerOff + innerSize/2, y + centerOff + innerSize/2, innerSize/2, 0, Math.PI*2);
  } else if (ballShape === 'rounded') {
    drawRoundedRect(ctx, x + centerOff, y + centerOff, innerSize, innerSize, dotSize, dotSize, dotSize, dotSize);
  } else if (ballShape === 'diamond') {
    ctx.moveTo(x + centerOff + innerSize/2, y + centerOff);
    ctx.lineTo(x + centerOff + innerSize, y + centerOff + innerSize/2);
    ctx.lineTo(x + centerOff + innerSize/2, y + centerOff + innerSize);
    ctx.lineTo(x + centerOff, y + centerOff + innerSize/2);
  } else if (ballShape === 'leaf') {
    drawRoundedRect(ctx, x + centerOff, y + centerOff, innerSize, innerSize, dotSize*1.5, 0, dotSize*1.5, 0);
  } else if (ballShape === 'hexagon') {
    const ix = x + centerOff;
    const iy = y + centerOff;
    const is = innerSize;
    ctx.moveTo(ix + is*0.25, iy);
    ctx.lineTo(ix + is*0.75, iy);
    ctx.lineTo(ix + is, iy + is*0.5);
    ctx.lineTo(ix + is*0.75, iy + is);
    ctx.lineTo(ix + is*0.25, iy + is);
    ctx.lineTo(ix, iy + is*0.5);
  } else if (ballShape === 'star') {
    const ix = x + centerOff;
    const iy = y + centerOff;
    const is = innerSize;
    ctx.moveTo(ix + is/2, iy);
    ctx.quadraticCurveTo(ix + is/2, iy + is/2, ix + is, iy + is/2);
    ctx.quadraticCurveTo(ix + is/2, iy + is/2, ix + is/2, iy + is);
    ctx.quadraticCurveTo(ix + is/2, iy + is/2, ix, iy + is/2);
    ctx.quadraticCurveTo(ix + is/2, iy + is/2, ix + is/2, iy);
  } else if (ballShape === 'plus') {
    const ix = x + centerOff;
    const iy = y + centerOff;
    const is = innerSize;
    const t = is * 0.4;
    const o = (is - t)/2;
    ctx.rect(ix + o, iy, t, is);
    ctx.rect(ix, iy + o, is, t);
  }
  ctx.fill();
}

function drawRoundedRect(ctx, x, y, w, h, tl, tr, br, bl, reverse=false) {
  if (reverse) {
    ctx.moveTo(x, y + tl);
    ctx.lineTo(x, y + h - bl);
    ctx.quadraticCurveTo(x, y + h, x + bl, y + h);
    ctx.lineTo(x + w - br, y + h);
    ctx.quadraticCurveTo(x + w, y + h, x + w, y + h - br);
    ctx.lineTo(x + w, y + tr);
    ctx.quadraticCurveTo(x + w, y, x + w - tr, y);
    ctx.lineTo(x + tl, y);
    ctx.quadraticCurveTo(x, y, x, y + tl);
  } else {
    ctx.moveTo(x + tl, y);
    ctx.lineTo(x + w - tr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
    ctx.lineTo(x + w, y + h - br);
    ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
    ctx.lineTo(x + bl, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
    ctx.lineTo(x, y + tl);
    ctx.quadraticCurveTo(x, y, x + tl, y);
  }
}
