import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FaTimes, FaFont, FaImage, FaVideo, FaPlus, FaTrash } from 'react-icons/fa';
import useStatusStore from '../../store/useStatusStore';

// Internal canvas size (portrait 2:3)
const CW = 400;
const CH = 600;
const HANDLE_R = 14; // hit radius for resize handles

const TEXT_BGS = [
  ['#833ab4', '#fd1d1d'],
  ['#0f0c29', '#302b63'],
  ['#11998e', '#38ef7d'],
  ['#f7971e', '#ffd200'],
  ['#ee0979', '#ff6a00'],
  ['#1a1a2e', '#c94b4b'],
  ['#2193b0', '#6dd5ed'],
  ['#373b44', '#4286f4'],
];

const TEXT_COLORS = ['#ffffff', '#000000', '#ffdd00', '#ff3b30', '#34c759', '#007aff', '#ff6b35'];

const StatusCreator = ({ onClose }) => {
  const { createStatus, loading } = useStatusStore();

  // ── Step ──────────────────────────────────────────────────────
  const [step, setStep] = useState('choose');

  // ── Text status ───────────────────────────────────────────────
  const [textContent, setTextContent] = useState('');
  const [bgIdx, setBgIdx] = useState(0);
  const [textColor, setTextColor] = useState('#ffffff');
  const [textSize, setTextSize] = useState(28);

  // ── Single photo ──────────────────────────────────────────────
  const [photoFile, setPhotoFile] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const singleFileRef = useRef(null);
  const photoContainerRef = useRef(null);
  const singleImgRef = useRef(null);

  // Text overlay
  const [overlayMode, setOverlayMode] = useState(false);
  const [overlayText, setOverlayText] = useState('');
  const [overlayColor, setOverlayColor] = useState('#ffffff');
  const [overlaySize, setOverlaySize] = useState(28);
  const [overlayPos, setOverlayPos] = useState({ x: 50, y: 50 }); // % of container

  // ── Collage ───────────────────────────────────────────────────
  const collageCanvasRef = useRef(null);
  const itemsRef = useRef([]);
  const selectedIdRef = useRef(null);
  const collageDragRef = useRef(null);
  const rafRef = useRef(null);
  const [selectedCollageId, setSelectedCollageId] = useState(null);
  const collageFileRef = useRef(null);

  // ── Video ─────────────────────────────────────────────────────
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const videoFileRef = useRef(null);

  // ─────────────────────────────────────────────────────────────
  // COLLAGE CANVAS
  // ─────────────────────────────────────────────────────────────

  const getHandles = (item) => [
    { type: 'tl', x: item.x, y: item.y },
    { type: 'tr', x: item.x + item.w, y: item.y },
    { type: 'bl', x: item.x, y: item.y + item.h },
    { type: 'br', x: item.x + item.w, y: item.y + item.h },
  ];

  const redraw = useCallback(() => {
    const canvas = collageCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, CW, CH);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, CW, CH);

    itemsRef.current.forEach((item) => {
      ctx.save();
      ctx.drawImage(item.img, item.x, item.y, item.w, item.h);
      if (item.id === selectedIdRef.current) {
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 2;
        ctx.strokeRect(item.x, item.y, item.w, item.h);
        ctx.fillStyle = 'white';
        getHandles(item).forEach((h) => {
          ctx.fillRect(h.x - 6, h.y - 6, 12, 12);
        });
      }
      ctx.restore();
    });
  }, []);

  useEffect(() => {
    if (step === 'collage') {
      requestAnimationFrame(redraw);
    }
  }, [step, redraw]);

  const getCanvasPos = (e) => {
    const canvas = collageCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return {
      x: ((src.clientX - rect.left) / rect.width) * CW,
      y: ((src.clientY - rect.top) / rect.height) * CH,
    };
  };

  const handleCollageDown = (e) => {
    e.preventDefault();
    const pos = getCanvasPos(e);

    if (selectedIdRef.current) {
      const sel = itemsRef.current.find((i) => i.id === selectedIdRef.current);
      if (sel) {
        for (const h of getHandles(sel)) {
          if (Math.abs(pos.x - h.x) <= HANDLE_R && Math.abs(pos.y - h.y) <= HANDLE_R) {
            collageDragRef.current = {
              type: 'resize', handle: h.type,
              startPos: pos, startItem: { ...sel },
            };
            return;
          }
        }
      }
    }

    for (let i = itemsRef.current.length - 1; i >= 0; i--) {
      const item = itemsRef.current[i];
      if (pos.x >= item.x && pos.x <= item.x + item.w && pos.y >= item.y && pos.y <= item.y + item.h) {
        selectedIdRef.current = item.id;
        setSelectedCollageId(item.id);
        collageDragRef.current = { type: 'move', startPos: pos, startItem: { ...item } };
        itemsRef.current = [...itemsRef.current.filter((x) => x.id !== item.id), item];
        redraw();
        return;
      }
    }

    selectedIdRef.current = null;
    setSelectedCollageId(null);
    collageDragRef.current = null;
    redraw();
  };

  const handleCollageMove = (e) => {
    if (!collageDragRef.current) return;
    e.preventDefault();
    const pos = getCanvasPos(e);
    const dx = pos.x - collageDragRef.current.startPos.x;
    const dy = pos.y - collageDragRef.current.startPos.y;
    const si = collageDragRef.current.startItem;
    const item = itemsRef.current.find((i) => i.id === si.id);
    if (!item) return;

    if (collageDragRef.current.type === 'move') {
      item.x = si.x + dx;
      item.y = si.y + dy;
    } else {
      const h = collageDragRef.current.handle;
      if (h === 'br') { item.w = Math.max(40, si.w + dx); item.h = Math.max(40, si.h + dy); }
      else if (h === 'bl') { const nw = Math.max(40, si.w - dx); item.x = si.x + si.w - nw; item.w = nw; item.h = Math.max(40, si.h + dy); }
      else if (h === 'tr') { item.w = Math.max(40, si.w + dx); const nh = Math.max(40, si.h - dy); item.y = si.y + si.h - nh; item.h = nh; }
      else if (h === 'tl') { const nw = Math.max(40, si.w - dx); const nh = Math.max(40, si.h - dy); item.x = si.x + si.w - nw; item.y = si.y + si.h - nh; item.w = nw; item.h = nh; }
    }

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(redraw);
  };

  const handleCollageUp = () => { collageDragRef.current = null; };

  const addCollageImage = (file) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const aspect = img.naturalWidth / img.naturalHeight;
      const w = Math.min(200, CW * 0.55);
      const h = w / aspect;
      const id = `${Date.now()}-${Math.random()}`;
      itemsRef.current = [
        ...itemsRef.current,
        { id, img, x: (CW - w) / 2, y: (CH - h) / 2, w, h },
      ];
      selectedIdRef.current = id;
      setSelectedCollageId(id);
      requestAnimationFrame(redraw);
    };
    img.src = url;
  };

  const deleteSelectedCollageItem = () => {
    itemsRef.current = itemsRef.current.filter((i) => i.id !== selectedIdRef.current);
    selectedIdRef.current = null;
    setSelectedCollageId(null);
    redraw();
  };

  // ─────────────────────────────────────────────────────────────
  // TEXT OVERLAY DRAG (single photo)
  // ─────────────────────────────────────────────────────────────

  const handleOverlayDragStart = (e) => {
    if (e.type === 'touchstart') e.preventDefault();
    const container = photoContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const src0 = e.touches ? e.touches[0] : e;
    const startX = src0.clientX;
    const startY = src0.clientY;
    const startPos = { ...overlayPos };

    const handleMove = (e2) => {
      const src = e2.touches ? e2.touches[0] : e2;
      const dx = ((src.clientX - startX) / rect.width) * 100;
      const dy = ((src.clientY - startY) / rect.height) * 100;
      setOverlayPos({
        x: Math.max(5, Math.min(95, startPos.x + dx)),
        y: Math.max(5, Math.min(95, startPos.y + dy)),
      });
    };
    const handleUp = () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleUp);
    };
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleUp);
  };

  // ─────────────────────────────────────────────────────────────
  // SUBMIT
  // ─────────────────────────────────────────────────────────────

  const submitAsImageFromCanvas = async (canvas) => {
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.92));
    const file = new File([blob], 'status.jpg', { type: 'image/jpeg' });
    await createStatus({ file, content: '' });
    onClose();
  };

  const handleSubmitText = async () => {
    if (!textContent.trim()) return;
    const canvas = document.createElement('canvas');
    canvas.width = CW; canvas.height = CH;
    const ctx = canvas.getContext('2d');
    const [c1, c2] = TEXT_BGS[bgIdx];
    const grad = ctx.createLinearGradient(0, 0, 0, CH);
    grad.addColorStop(0, c1); grad.addColorStop(1, c2);
    ctx.fillStyle = grad; ctx.fillRect(0, 0, CW, CH);
    ctx.fillStyle = textColor;
    ctx.font = `bold ${textSize}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 6;
    const maxW = CW - 60;
    const words = textContent.split(' ');
    const lines = []; let line = '';
    words.forEach((word) => {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = word; }
      else { line = test; }
    });
    lines.push(line);
    const lh = textSize * 1.5;
    const totalH = lines.length * lh;
    const startY = CH / 2 - totalH / 2 + lh / 2;
    lines.forEach((l, i) => ctx.fillText(l, CW / 2, startY + i * lh));
    await submitAsImageFromCanvas(canvas);
  };

  const handleSubmitSinglePhoto = async () => {
    if (!photoFile) return;
    if (!overlayText.trim()) {
      // No overlay, submit original file
      await createStatus({ file: photoFile, content: '' });
      onClose();
      return;
    }
    // Composite image + text overlay
    const imgEl = singleImgRef.current;
    if (!imgEl) return;
    const containerEl = photoContainerRef.current;
    const containerRect = containerEl.getBoundingClientRect();
    const imgRect = imgEl.getBoundingClientRect();

    const canvas = document.createElement('canvas');
    canvas.width = imgEl.naturalWidth; canvas.height = imgEl.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgEl, 0, 0);

    const scaleX = imgEl.naturalWidth / imgRect.width;
    const scaleY = imgEl.naturalHeight / imgRect.height;
    const containerRelX = (overlayPos.x / 100) * containerRect.width;
    const containerRelY = (overlayPos.y / 100) * containerRect.height;
    const imgRelX = containerRelX - (imgRect.left - containerRect.left);
    const imgRelY = containerRelY - (imgRect.top - containerRect.top);
    const canvasX = imgRelX * scaleX;
    const canvasY = imgRelY * scaleY;
    const scaledFont = overlaySize * scaleX;

    ctx.fillStyle = overlayColor;
    ctx.font = `bold ${scaledFont}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = scaledFont * 0.2;
    ctx.fillText(overlayText, canvasX, canvasY);

    await submitAsImageFromCanvas(canvas);
  };

  const handleSubmitCollage = async () => {
    const canvas = collageCanvasRef.current;
    if (!canvas || itemsRef.current.length === 0) return;
    selectedIdRef.current = null;
    setSelectedCollageId(null);
    redraw();
    await new Promise((r) => requestAnimationFrame(r));
    await submitAsImageFromCanvas(canvas);
  };

  const handleSubmitVideo = async () => {
    if (!videoFile) return;
    await createStatus({ file: videoFile, content: '' });
    onClose();
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER HELPERS
  // ─────────────────────────────────────────────────────────────

  const bgStyle = { background: `linear-gradient(135deg, ${TEXT_BGS[bgIdx].join(', ')})` };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-black">

      {/* ──────── CHOOSE ──────── */}
      {step === 'choose' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-10 p-6">
          <h2 className="text-white text-2xl font-bold tracking-tight">Create Status</h2>
          <div className="grid grid-cols-3 gap-5 w-full max-w-xs">
            <button onClick={() => setStep('text')}
              className="flex flex-col items-center gap-2 p-5 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition active:scale-95">
              <FaFont className="h-7 w-7" />
              <span className="text-xs font-semibold">Text</span>
            </button>
            <button onClick={() => setStep('photo-type')}
              className="flex flex-col items-center gap-2 p-5 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition active:scale-95">
              <FaImage className="h-7 w-7" />
              <span className="text-xs font-semibold">Photo</span>
            </button>
            <button onClick={() => videoFileRef.current?.click()}
              className="flex flex-col items-center gap-2 p-5 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition active:scale-95">
              <FaVideo className="h-7 w-7" />
              <span className="text-xs font-semibold">Video</span>
              <input ref={videoFileRef} type="file" accept="video/*" className="hidden"
                onChange={(e) => {
                  const f = e.target.files[0];
                  if (f) { setVideoFile(f); setVideoUrl(URL.createObjectURL(f)); setStep('video'); }
                }} />
            </button>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white/80 text-sm transition">Cancel</button>
        </div>
      )}

      {/* ──────── PHOTO TYPE ──────── */}
      {step === 'photo-type' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-8 p-6">
          <h2 className="text-white text-xl font-bold">Choose Type</h2>
          <div className="grid grid-cols-2 gap-5 w-full max-w-xs">
            <button onClick={() => singleFileRef.current?.click()}
              className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition active:scale-95">
              <FaImage className="h-8 w-8" />
              <span className="text-sm font-semibold">Single Photo</span>
              <input ref={singleFileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => {
                  const f = e.target.files[0];
                  if (f) { setPhotoFile(f); setPhotoUrl(URL.createObjectURL(f)); setStep('single-photo'); }
                }} />
            </button>
            <button onClick={() => setStep('collage')}
              className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition active:scale-95">
              <div className="grid grid-cols-2 gap-0.5 w-8 h-8">
                {[0,1,2,3].map((i) => <div key={i} className="bg-white/70 rounded-sm" />)}
              </div>
              <span className="text-sm font-semibold">Collage</span>
            </button>
          </div>
          <button onClick={() => setStep('choose')} className="text-white/40 hover:text-white/80 text-sm transition">Back</button>
        </div>
      )}

      {/* ──────── TEXT EDITOR ──────── */}
      {step === 'text' && (
        <div className="flex-1 flex flex-col relative" style={bgStyle}>
          <button onClick={() => setStep('choose')}
            className="absolute top-4 left-4 z-10 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition">
            <FaTimes className="h-4 w-4" />
          </button>

          {/* Text area */}
          <div className="flex-1 flex items-center justify-center px-8">
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="What's on your mind?"
              style={{ color: textColor, fontSize: textSize }}
              className="w-full bg-transparent text-center font-bold outline-none resize-none placeholder-white/40 leading-snug"
              rows={4}
              autoFocus
            />
          </div>

          {/* Font size */}
          <div className="px-6 pb-1">
            <input type="range" min={16} max={48} value={textSize}
              onChange={(e) => setTextSize(Number(e.target.value))}
              className="w-full accent-white" />
          </div>

          {/* Text colors */}
          <div className="flex gap-2 px-4 pb-2 overflow-x-auto">
            {TEXT_COLORS.map((c) => (
              <button key={c} onClick={() => setTextColor(c)}
                style={{ background: c }}
                className={`w-8 h-8 rounded-full shrink-0 border-2 transition-transform ${textColor === c ? 'border-white scale-110' : 'border-transparent'}`} />
            ))}
          </div>

          {/* Background gradients */}
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
            {TEXT_BGS.map((bg, i) => (
              <button key={i} onClick={() => setBgIdx(i)}
                style={{ background: `linear-gradient(135deg, ${bg.join(', ')})` }}
                className={`w-10 h-10 rounded-full shrink-0 border-2 transition-transform ${bgIdx === i ? 'border-white scale-110' : 'border-white/30'}`} />
            ))}
          </div>

          <div className="px-4 pb-6 pt-1">
            <button onClick={handleSubmitText} disabled={!textContent.trim() || loading}
              className="w-full py-3 bg-green-500 hover:bg-green-600 disabled:opacity-40 text-white font-bold rounded-full transition">
              {loading ? 'Sharing...' : 'Share Status'}
            </button>
          </div>
        </div>
      )}

      {/* ──────── SINGLE PHOTO EDITOR ──────── */}
      {step === 'single-photo' && photoUrl && (
        <div className="flex-1 flex flex-col bg-black relative">
          <button
            onClick={() => { setStep('photo-type'); setPhotoFile(null); setPhotoUrl(null); setOverlayText(''); setOverlayMode(false); }}
            className="absolute top-4 left-4 z-20 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition">
            <FaTimes className="h-4 w-4" />
          </button>

          {/* Tools */}
          <div className="absolute top-4 right-4 z-20 flex gap-2">
            <button onClick={() => setOverlayMode(true)}
              className="p-2.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition" title="Add Text">
              <FaFont className="h-4 w-4" />
            </button>
          </div>

          {/* Image container */}
          <div ref={photoContainerRef} className="flex-1 relative flex items-center justify-center overflow-hidden">
            <img ref={singleImgRef} src={photoUrl} alt="status"
              className="max-w-full max-h-full object-contain select-none pointer-events-none" />

            {/* Draggable text overlay */}
            {overlayText && (
              <div
                className="absolute cursor-move select-none z-10"
                style={{ left: `${overlayPos.x}%`, top: `${overlayPos.y}%`, transform: 'translate(-50%, -50%)' }}
                onMouseDown={handleOverlayDragStart}
                onTouchStart={handleOverlayDragStart}
              >
                <p style={{ color: overlayColor, fontSize: overlaySize, textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}
                  className="font-bold whitespace-nowrap px-2">
                  {overlayText}
                </p>
              </div>
            )}
          </div>

          <div className="p-4">
            <button onClick={handleSubmitSinglePhoto} disabled={loading}
              className="w-full py-3 bg-green-500 hover:bg-green-600 disabled:opacity-40 text-white font-bold rounded-full transition">
              {loading ? 'Sharing...' : 'Share Status'}
            </button>
          </div>

          {/* Text overlay input modal */}
          {overlayMode && (
            <div className="absolute inset-0 z-30 bg-black/85 flex flex-col items-center justify-center px-6 gap-6">
              <input
                value={overlayText}
                onChange={(e) => setOverlayText(e.target.value)}
                placeholder="Type your text..."
                style={{ color: overlayColor, fontSize: overlaySize }}
                className="w-full bg-transparent text-center font-bold border-b-2 border-white/30 outline-none py-2 placeholder-white/30"
                autoFocus
              />
              <div className="flex gap-2">
                {TEXT_COLORS.map((c) => (
                  <button key={c} onClick={() => setOverlayColor(c)}
                    style={{ background: c }}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${overlayColor === c ? 'border-white scale-110' : 'border-transparent'}`} />
                ))}
              </div>
              <input type="range" min={16} max={56} value={overlaySize}
                onChange={(e) => setOverlaySize(Number(e.target.value))}
                className="w-full accent-white" />
              <button onClick={() => setOverlayMode(false)}
                className="px-8 py-2.5 bg-white text-black font-bold rounded-full">
                Done
              </button>
            </div>
          )}
        </div>
      )}

      {/* ──────── COLLAGE EDITOR ──────── */}
      {step === 'collage' && (
        <div className="flex-1 flex flex-col bg-[#111]">
          <div className="flex items-center justify-between px-4 py-3 shrink-0">
            <button onClick={() => { setStep('photo-type'); itemsRef.current = []; selectedIdRef.current = null; setSelectedCollageId(null); }}
              className="text-white/60 hover:text-white transition">
              <FaTimes className="h-5 w-5" />
            </button>
            <h2 className="text-white font-semibold text-sm">Collage — drag to move, corner to resize</h2>
            <button onClick={handleSubmitCollage} disabled={itemsRef.current.length === 0 || loading}
              className="px-4 py-1.5 bg-green-500 hover:bg-green-600 disabled:opacity-40 text-white font-bold rounded-full text-sm transition">
              {loading ? '...' : 'Share'}
            </button>
          </div>

          {/* Canvas */}
          <div className="flex-1 flex items-center justify-center overflow-hidden px-2">
            <canvas
              ref={collageCanvasRef}
              width={CW} height={CH}
              className="rounded-xl"
              style={{ maxHeight: '68vh', width: 'auto', touchAction: 'none' }}
              onMouseDown={handleCollageDown}
              onMouseMove={handleCollageMove}
              onMouseUp={handleCollageUp}
              onMouseLeave={handleCollageUp}
              onTouchStart={handleCollageDown}
              onTouchMove={handleCollageMove}
              onTouchEnd={handleCollageUp}
            />
          </div>

          {/* Bottom tools */}
          <div className="flex items-center gap-3 px-4 py-4 shrink-0">
            <button onClick={() => collageFileRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-sm transition active:scale-95">
              <FaPlus className="h-3.5 w-3.5" />
              Add Image
            </button>
            {selectedCollageId && (
              <button onClick={deleteSelectedCollageItem}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-full text-sm transition active:scale-95">
                <FaTrash className="h-3.5 w-3.5" />
                Remove
              </button>
            )}
            <input ref={collageFileRef} type="file" accept="image/*" multiple className="hidden"
              onChange={(e) => { Array.from(e.target.files).forEach(addCollageImage); e.target.value = ''; }} />
          </div>

          {itemsRef.current.length === 0 && (
            <p className="text-white/30 text-xs text-center pb-4">Tap "Add Image" to get started</p>
          )}
        </div>
      )}

      {/* ──────── VIDEO EDITOR ──────── */}
      {step === 'video' && videoUrl && (
        <div className="flex-1 flex flex-col bg-black relative">
          <button onClick={() => { setStep('choose'); setVideoFile(null); setVideoUrl(null); }}
            className="absolute top-4 left-4 z-10 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition">
            <FaTimes className="h-4 w-4" />
          </button>
          <div className="flex-1 flex items-center justify-center">
            <video src={videoUrl} controls className="max-w-full max-h-full" />
          </div>
          <div className="p-4">
            <button onClick={handleSubmitVideo} disabled={loading}
              className="w-full py-3 bg-green-500 hover:bg-green-600 disabled:opacity-40 text-white font-bold rounded-full transition">
              {loading ? 'Uploading...' : 'Share Status'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusCreator;
