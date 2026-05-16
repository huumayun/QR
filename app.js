const state = {
  type: 'url',
  fgColor: '#1a1a2e',
  bgColor: '#ffffff',
  transparent: false,
  size: 1024,
  margin: 16,
  dotStyle: 'square',
  eyeFrameShape: 'square',
  eyeBallShape: 'square',
  ecLevel: 'M',
  format: 'png',
  logoDataUrl: null,
  logoSize: 20,
  bgShape: 'square',
  debounceTimer: null,
  frameLabel: ''
};

function showToast(msg, isSuccess=true) {
  const toast = document.getElementById('toast');
  const icon = document.getElementById('toast-icon');
  document.getElementById('toast-msg').textContent = msg;
  icon.className = 'toast-icon ' + (isSuccess ? 'success' : '');
  icon.textContent = isSuccess ? '✓' : '!';
  toast.className = 'toast show ' + (isSuccess ? 'success' : '');
  setTimeout(() => toast.className = 'toast', 3000);
}

function setType(type, btn) {
  state.type = type;
  document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.content-form').forEach(f => f.style.display = 'none');
  document.getElementById('form-' + type).style.display = 'block';
  generateQR();
}

function getQRContent() {
  switch(state.type){
    case 'url': return document.getElementById('qr-url-input')?.value.trim()||'';
    case 'text': return document.getElementById('qr-text-input')?.value||'';
    case 'email':{
      const e=document.getElementById('qr-email-input')?.value||'';
      const s=document.getElementById('qr-email-subject')?.value||'';
      const b=document.getElementById('qr-email-body')?.value||'';
      return e ? `mailto:${e}${s?'?subject='+encodeURIComponent(s):''}${b?(s?'&':'?')+'body='+encodeURIComponent(b):''}` : '';
    }
    case 'phone': return document.getElementById('qr-phone-input')?.value ? 'tel:'+document.getElementById('qr-phone-input').value.trim() : '';
    case 'sms':{
      const p=document.getElementById('qr-sms-phone')?.value||'';
      const m=document.getElementById('qr-sms-msg')?.value||'';
      return p ? `sms:${p}${m?'?body='+encodeURIComponent(m):''}` : '';
    }
    case 'wifi':{
      const s=document.getElementById('qr-wifi-ssid')?.value||'';
      const p=document.getElementById('qr-wifi-pass')?.value||'';
      const t=document.getElementById('qr-wifi-type')?.value||'WPA';
      return s ? `WIFI:T:${t};S:${s};P:${p};H:;;` : '';
    }
    case 'vcard':{
      const fn=document.getElementById('qr-vcard-fn')?.value||'';
      const ln=document.getElementById('qr-vcard-ln')?.value||'';
      const o=document.getElementById('qr-vcard-org')?.value||'';
      const p=document.getElementById('qr-vcard-phone')?.value||'';
      const e=document.getElementById('qr-vcard-email')?.value||'';
      const u=document.getElementById('qr-vcard-url')?.value||'';
      if(!fn&&!ln) return '';
      return `BEGIN:VCARD\nVERSION:3.0\nN:${ln};${fn}\nFN:${fn} ${ln}\nORG:${o}\nTEL:${p}\nEMAIL:${e}\nURL:${u}\nEND:VCARD`;
    }
    case 'location':{
      const lat=document.getElementById('qr-lat')?.value;
      const lng=document.getElementById('qr-lng')?.value;
      return lat&&lng ? `geo:${lat},${lng}` : '';
    }
    case 'event':{
      const n=document.getElementById('qr-event-name')?.value||'';
      const s=document.getElementById('qr-event-start')?.value?.replace(/[-:]/g,'')+'Z'||'';
      const e=document.getElementById('qr-event-end')?.value?.replace(/[-:]/g,'')+'Z'||'';
      const l=document.getElementById('qr-event-loc')?.value||'';
      return n ? `BEGIN:VEVENT\nSUMMARY:${n}\nDTSTART:${s}\nDTEND:${e}\nLOCATION:${l}\nEND:VEVENT` : '';
    }
    default: return '';
  }
}

function debounceGenerate() {
  clearTimeout(state.debounceTimer);
  state.debounceTimer = setTimeout(generateQR, 250);
}

function setEC(level, btn) {
  state.ecLevel = level;
  btn.parentElement.querySelectorAll('.tab-item').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  generateQR();
}

function updateFgColor(color) {
  state.fgColor = color;
  document.getElementById('fg-color').value = color;
  document.getElementById('fg-swatch').style.background = color;
  document.querySelectorAll('.preset-color').forEach(b => b.classList.remove('active'));
  generateQR();
}

function updateBgColor(color) {
  state.bgColor = color;
  document.getElementById('bg-color').value = color;
  document.getElementById('bg-swatch').style.background = color;
  generateQR();
}

function toggleTransparent(isTrans) {
  state.transparent = isTrans;
  document.getElementById('bg-solid-btn').classList.toggle('active', !isTrans);
  document.getElementById('bg-trans-btn').classList.toggle('active', isTrans);
  generateQR();
}

function setDotStyle(style, btn) {
  state.dotStyle = style;
  document.querySelectorAll('#body-shape-grid .style-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  generateQR();
}

function setBgShape(shape, btn) {
  state.bgShape = shape;
  document.querySelectorAll('#bg-shape-grid .style-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  generateQR();
}

function setEyeFrameShape(style, btn) {
  state.eyeFrameShape = style;
  document.querySelectorAll('#eye-frame-grid .style-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  generateQR();
}

function setEyeBallShape(style, btn) {
  state.eyeBallShape = style;
  document.querySelectorAll('#eye-ball-grid .style-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  generateQR();
}

function updateFrameLabel() {
  state.frameLabel = document.getElementById('frame-label-text').value;
  const labelEl = document.getElementById('qr-preview-label');
  if (state.frameLabel) {
    labelEl.textContent = state.frameLabel;
    labelEl.style.display = 'block';
  } else {
    labelEl.style.display = 'none';
  }
}

function handleLogoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    state.logoDataUrl = event.target.result;
    document.getElementById('logo-upload-text').style.display = 'none';
    document.getElementById('logo-preview-box').style.display = 'flex';
    document.getElementById('logo-preview-img').src = state.logoDataUrl;
    document.getElementById('logo-controls').style.display = 'block';
    generateQR();
  };
  reader.readAsDataURL(file);
}

function updateLogoSize(val) {
  state.logoSize = parseInt(val);
  document.getElementById('logo-size-val').textContent = val + '%';
  generateQR();
}

function removeLogo() {
  state.logoDataUrl = null;
  document.getElementById('logo-input').value = '';
  document.getElementById('logo-upload-text').style.display = 'block';
  document.getElementById('logo-preview-box').style.display = 'none';
  document.getElementById('logo-controls').style.display = 'none';
  generateQR();
}

function downloadFile(format) {
  const canvas = document.getElementById('qr-canvas');
  if (canvas.style.display === 'none') {
    showToast('Please generate a QR code first', false);
    return;
  }
  
  document.getElementById('dl-menu').style.display = 'none';

  if (format === 'png' || format === 'webp') {
    const link = document.createElement('a');
    link.download = `qrcraft.${format}`;
    link.href = canvas.toDataURL(`image/${format}`, 1.0);
    link.click();
    showToast(`${format.toUpperCase()} Downloaded`);
  } 
  else if (format === 'jpg') {
    // JPG doesn't support transparency, fill white if transparent
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tCtx = tempCanvas.getContext('2d');
    if (state.transparent) {
      tCtx.fillStyle = '#ffffff';
      tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    }
    tCtx.drawImage(canvas, 0, 0);
    
    const link = document.createElement('a');
    link.download = 'qrcraft.jpg';
    link.href = tempCanvas.toDataURL('image/jpeg', 1.0);
    link.click();
    showToast('JPG Downloaded');
  }
  else if (format === 'pdf') {
    if (!window.jspdf) {
      showToast('PDF generator loading...', false);
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: [canvas.width, canvas.height]
    });
    
    // Fill white background if transparent
    if (state.transparent) {
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, canvas.width, canvas.height, 'F');
    }
    
    doc.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width, canvas.height);
    doc.save('qrcraft.pdf');
    showToast('PDF Downloaded');
  }
  else if (format === 'svg') {
    // Generate SVG string by embedding the high-res canvas
    const dataUrl = canvas.toDataURL('image/png');
    const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}">
      <image href="${dataUrl}" width="${canvas.width}" height="${canvas.height}" />
    </svg>`;
    const blob = new Blob([svgStr], {type: 'image/svg+xml;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'qrcraft.svg';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    showToast('SVG Downloaded');
  }
}

function copyToClipboard() {
  const canvas = document.getElementById('qr-canvas');
  if (canvas.style.display === 'none') {
    showToast('Please generate a QR code first', false);
    return;
  }
  canvas.toBlob(blob => {
    if(!blob) return;
    const item = new ClipboardItem({ "image/png": blob });
    navigator.clipboard.write([item]).then(() => {
      showToast('Image copied to clipboard');
    }).catch(err => {
      showToast('Failed to copy image', false);
    });
  });
}

// Close download menu when clicking outside
document.addEventListener('click', (e) => {
  const dropdownWrap = document.getElementById('download-dropdown-wrap');
  const dlMenu = document.getElementById('dl-menu');
  if (dlMenu && dropdownWrap && !dropdownWrap.contains(e.target)) {
    dlMenu.style.display = 'none';
  }
});

// Initial draw
setTimeout(generateQR, 500);
