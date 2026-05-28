import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FaTimes, FaFont, FaImage, FaVideo, FaPlus, FaTrash, FaPen } from 'react-icons/fa';
import useStatusStore from '../../store/useStatusStore';

const CW = 400;
const CH = 600;
const HANDLE_R = 14;

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

  const [step, setStep] = useState('choose');

  // ── Text status ──────────────────────────────────────────────────
  const [textContent, setTextContent] = useState('');
  const [bgIdx, setBgIdx] = useState(0);
  const [textColor, setTextColor] = useState('#ffffff');
  const [textSize, setTextSize] = useState(28);

  // ── Single photo ─────────────────────────────────────────────────
  const [photoFile, setPhotoFile] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const singleFileRef = useRef(null);
  const photoContainerRef = useRef(null);
  const singleImgRef = useRef(null);

  // Multiple text overlays: [{id, text, color, size, x, y}]
  const [overlayItems, setOverlayItems] = useState([]);
  const [activeOverlayId, setActiveOverlayId] = useState(null);
  const [overlayInputMode, setOverlayInputMode] = useState(false);
  const [overlayEditId, setOverlayEditId] = useState(null);
  const [overlayInputText, setOverlayInputText] = useState('');
  const [overlayInputColor, setOverlayInputColor] = useState('#ffffff');
  const [overlayInputSize, setOverlayInputSize] = useState(28);

  // ── Collage canvas ───────────────────────────────────────────────
  const collageCanvasRef = useRef(null);
  const itemsRef = useRef([]);         // image items
  const textItemsRef = useRef([]);     // text items on canvas
  const selectedIdRef = useRef(null);
  const selectedTypeRef = useRef(null); // 'image' | 'text'
  const collageDragRef = useRef(null);
  const rafRef = useRef(null);
  const [selectedCollageId, setSelectedCollageId] = useState(null);
  const [selectedCollageType, setSelectedCollageType] = useState(null); // 'image' | 'text'
  const collageFileRef = useRef(null);
  const [collageTextMode, setCollageTextMode] = useState(false);
  const [collageTextEditId, setCollageTextEditId] = useState(null);
  const [collageTextInput, setCollageTextInput] = useState('');
  const [collageTextColor, setCollageTextColor] = useState('#ffffff');
  const [collageTextSize, setCollageTextSize] = useState(32);

  // ── Video ────────────────────────────────────────────────────────
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const videoFileRef = useRef(null);

  // ── Collage canvas engine ────────────────────────────────────────

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
      if (item.id === selectedIdRef.current && selectedTypeRef.current === 'image') {
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 2;
        ctx.strokeRect(item.x, item.y, item.w, item.h);
        ctx.fillStyle = 'white';
        getHandles(item).forEach((h) => ctx.fillRect(h.x - 6, h.y - 6, 12, 12));
      }
      ctx.restore();
    });

    textItemsRef.current.forEach((t) => {
      ctx.save();
      ctx.font = `bold ${t.size}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur = 6;
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
      const w = ctx.measureText(t.text).width;
      t._w = w;
      t._h = t.size;
      if (t.id === selectedIdRef.current && selectedTypeRef.current === 'text') {
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(t.x - w / 2 - 6, t.y - t.size / 2 - 4, w + 12, t.size + 8);
        ctx.setLineDash([]);
      }
      ctx.restore();
    });
  }, []);

  useEffect(() => {
    if (step === 'collage') requestAnimationFrame(redraw);
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

    // Resize handles on selected image
    if (selectedIdRef.current && selectedTypeRef.current === 'image') {
      const sel = itemsRef.current.find((i) => i.id === selectedIdRef.current);
      if (sel) {
        for (const h of getHandles(sel)) {
          if (Math.abs(pos.x - h.x) <= HANDLE_R && Math.abs(pos.y - h.y) <= HANDLE_R) {
            collageDragRef.current = { type: 'resize', handle: h.type, startPos: pos, startItem: { ...sel } };
            return;
          }
        }
      }
    }

    // Hit-test text items first (they sit on top)
    for (let i = textItemsRef.current.length - 1; i >= 0; i--) {
      const t = textItemsRef.current[i];
      const hw = (t._w || t.text.length * t.size * 0.55) / 2;
      const hh = (t._h || t.size) / 2 + 4;
      if (pos.x >= t.x - hw - 6 && pos.x <= t.x + hw + 6 && pos.y >= t.y - hh && pos.y <= t.y + hh) {
        selectedIdRef.current = t.id;
        selectedTypeRef.current = 'text';
        setSelectedCollageId(t.id);
        setSelectedCollageType('text');
        collageDragRef.current = { type: 'move-text', startPos: pos, startItem: { ...t } };
        redraw();
        return;
      }
    }

    // Hit-test image items
    for (let i = itemsRef.current.length - 1; i >= 0; i--) {
      const item = itemsRef.current[i];
      if (pos.x >= item.x && pos.x <= item.x + item.w && pos.y >= item.y && pos.y <= item.y + item.h) {
        selectedIdRef.current = item.id;
        selectedTypeRef.current = 'image';
        setSelectedCollageId(item.id);
        setSelectedCollageType('image');
        collageDragRef.current = { type: 'move', startPos: pos, startItem: { ...item } };
        itemsRef.current = [...itemsRef.current.filter((x) => x.id !== item.id), item];
        redraw();
        return;
      }
    }

    selectedIdRef.current = null;
    selectedTypeRef.current = null;
    setSelectedCollageId(null);
    setSelectedCollageType(null);
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

    if (collageDragRef.current.type === 'move-text') {
      const t = textItemsRef.current.find((i) => i.id === si.id);
      if (t) { t.x = si.x + dx; t.y = si.y + dy; }
    } else {
      const item = itemsRef.current.find((i) => i.id === si.id);
      if (!item) return;
      if (collageDragRef.current.type === 'move') {
        item.x = si.x + dx; item.y = si.y + dy;
      } else {
        const h = collageDragRef.current.handle;
        if (h === 'br') { item.w = Math.max(40, si.w + dx); item.h = Math.max(40, si.h + dy); }
        else if (h === 'bl') { const nw = Math.max(40, si.w - dx); item.x = si.x + si.w - nw; item.w = nw; item.h = Math.max(40, si.h + dy); }
        else if (h === 'tr') { item.w = Math.max(40, si.w + dx); const nh = Math.max(40, si.h - dy); item.y = si.y + si.h - nh; item.h = nh; }
        else if (h === 'tl') { const nw = Math.max(40, si.w - dx); const nh = Math.max(40, si.h - dy); item.x = si.x + si.w - nw; item.y = si.y + si.h - nh; item.w = nw; item.h = nh; }
      }
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
      const id = `img-${Date.now()}-${Math.random()}`;
      itemsRef.current = [...itemsRef.current, { id, img, x: (CW - w) / 2, y: (CH - h) / 2, w, h }];
      selectedIdRef.current = id;
      selectedTypeRef.current = 'image';
      setSelectedCollageId(id);
      setSelectedCollageType('image');
      requestAnimationFrame(redraw);
    };
    img.src = url;
  };

  const openCollageTextEdit = () => {
    const t = textItemsRef.current.find((item) => item.id === selectedCollageId);
    if (!t) return;
    setCollageTextEditId(t.id);
    setCollageTextInput(t.text);
    setCollageTextColor(t.color);
    setCollageTextSize(t.size);
    setCollageTextMode(true);
  };

  const confirmCollageText = () => {
    if (!collageTextInput.trim()) { setCollageTextMode(false); setCollageTextEditId(null); return; }
    if (collageTextEditId) {
      const t = textItemsRef.current.find((item) => item.id === collageTextEditId);
      if (t) { t.text = collageTextInput; t.color = collageTextColor; t.size = collageTextSize; }
      selectedIdRef.current = collageTextEditId;
      selectedTypeRef.current = 'text';
      setSelectedCollageId(collageTextEditId);
      setSelectedCollageType('text');
      setCollageTextEditId(null);
    } else {
      const id = `txt-${Date.now()}`;
      textItemsRef.current = [
        ...textItemsRef.current,
        { id, text: collageTextInput, color: collageTextColor, size: collageTextSize, x: CW / 2, y: CH / 2 },
      ];
      selectedIdRef.current = id;
      selectedTypeRef.current = 'text';
      setSelectedCollageId(id);
      setSelectedCollageType('text');
    }
    setCollageTextMode(false);
    setCollageTextInput('');
    requestAnimationFrame(redraw);
  };

  const deleteSelectedCollageItem = () => {
    if (selectedTypeRef.current === 'text') {
      textItemsRef.current = textItemsRef.current.filter((t) => t.id !== selectedIdRef.current);
    } else {
      itemsRef.current = itemsRef.current.filter((i) => i.id !== selectedIdRef.current);
    }
    selectedIdRef.current = null;
    selectedTypeRef.current = null;
    setSelectedCollageId(null);
    setSelectedCollageType(null);
    redraw();
  };

  // ── Single photo overlay drag ────────────────────────────────────

  const handleOverlayDragStart = (e, id) => {
    if (e.type === 'touchstart') e.preventDefault();
    const container = photoContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const src0 = e.touches ? e.touches[0] : e;
    const startX = src0.clientX;
    const startY = src0.clientY;
    const item = overlayItems.find((o) => o.id === id);
    if (!item) return;
    const startPos = { x: item.x, y: item.y };

    const handleMove = (e2) => {
      const src = e2.touches ? e2.touches[0] : e2;
      const dx = ((src.clientX - startX) / rect.width) * 100;
      const dy = ((src.clientY - startY) / rect.height) * 100;
      setOverlayItems((prev) =>
        prev.map((o) =>
          o.id === id
            ? { ...o, x: Math.max(5, Math.min(95, startPos.x + dx)), y: Math.max(5, Math.min(95, startPos.y + dy)) }
            : o,
        ),
      );
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

  const openAddOverlay = () => {
    setOverlayEditId(null);
    setOverlayInputText('');
    setOverlayInputColor('#ffffff');
    setOverlayInputSize(28);
    setOverlayInputMode(true);
  };

  const openEditOverlay = (id) => {
    const item = overlayItems.find((o) => o.id === id);
    if (!item) return;
    setOverlayEditId(id);
    setOverlayInputText(item.text);
    setOverlayInputColor(item.color);
    setOverlayInputSize(item.size);
    setOverlayInputMode(true);
  };

  const confirmOverlayInput = () => {
    if (!overlayInputText.trim()) { setOverlayInputMode(false); return; }
    if (overlayEditId) {
      setOverlayItems((prev) =>
        prev.map((o) =>
          o.id === overlayEditId
            ? { ...o, text: overlayInputText, color: overlayInputColor, size: overlayInputSize }
            : o,
        ),
      );
    } else {
      const id = `ov-${Date.now()}`;
      setOverlayItems((prev) => [
        ...prev,
        { id, text: overlayInputText, color: overlayInputColor, size: overlayInputSize, x: 50, y: 50 },
      ]);
      setActiveOverlayId(id);
    }
    setOverlayInputMode(false);
    setOverlayEditId(null);
  };

  const deleteOverlay = (id) => {
    setOverlayItems((prev) => prev.filter((o) => o.id !== id));
    if (activeOverlayId === id) setActiveOverlayId(null);
  };

  // ── Submit ───────────────────────────────────────────────────────

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
      else line = test;
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
    if (overlayItems.length === 0) {
      await createStatus({ file: photoFile, content: '' });
      onClose();
      return;
    }
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

    overlayItems.forEach((overlay) => {
      const containerRelX = (overlay.x / 100) * containerRect.width;
      const containerRelY = (overlay.y / 100) * containerRect.height;
      const imgRelX = containerRelX - (imgRect.left - containerRect.left);
      const imgRelY = containerRelY - (imgRect.top - containerRect.top);
      const canvasX = imgRelX * scaleX;
      const canvasY = imgRelY * scaleY;
      const scaledFont = overlay.size * scaleX;
      ctx.fillStyle = overlay.color;
      ctx.font = `bold ${scaledFont}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = scaledFont * 0.2;
      ctx.fillText(overlay.text, canvasX, canvasY);
    });

    await submitAsImageFromCanvas(canvas);
  };

  const handleSubmitCollage = async () => {
    const canvas = collageCanvasRef.current;
    if (!canvas || itemsRef.current.length === 0) return;
    selectedIdRef.current = null;
    selectedTypeRef.current = null;
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

  const bgStyle = { background: `linear-gradient(135deg, ${TEXT_BGS[bgIdx].join(', ')})` };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-black">

      {/* ── CHOOSE ─────────────────────────────────────────────────── */}
      {step === 'choose' && (
        <div
          className="flex-1 flex flex-col p-6"
          style={{ background: 'linear-gradient(160deg, #0f0c29 0%, #302b63 55%, #24243e 100%)' }}
        >
          <div className="flex justify-end">
            <button onClick={onClose} className="p-2 rounded-full bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition">
              <FaTimes className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center gap-10">
            <div className="flex flex-col items-center gap-3">
              <div
                className="w-18 h-18 rounded-full flex items-center justify-center shadow-2xl"
                style={{ background: 'linear-gradient(135deg, #25d366, #128c7e)', width: 72, height: 72, boxShadow: '0 0 40px rgba(37,211,102,0.35)' }}
              >
                <FaPlus className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-white text-2xl font-bold tracking-tight">New Status</h2>
              <p className="text-white/40 text-sm">Share a moment with your friends</p>
            </div>

            <div className="w-full max-w-sm flex flex-col gap-3">
              <button
                onClick={() => setStep('text')}
                className="flex items-center gap-4 p-5 rounded-2xl text-white transition active:scale-[0.97]"
                style={{ background: 'linear-gradient(135deg, #833ab4, #fd1d1d)', boxShadow: '0 4px 20px rgba(131,58,180,0.35)' }}
              >
                <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <FaFont className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-base leading-tight">Text</p>
                  <p className="text-xs text-white/60 mt-0.5">Write what's on your mind</p>
                </div>
              </button>

              <button
                onClick={() => setStep('photo-type')}
                className="flex items-center gap-4 p-5 rounded-2xl text-white transition active:scale-[0.97]"
                style={{ background: 'linear-gradient(135deg, #11998e, #38ef7d)', boxShadow: '0 4px 20px rgba(17,153,142,0.35)' }}
              >
                <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <FaImage className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-base leading-tight">Photo</p>
                  <p className="text-xs text-white/60 mt-0.5">Single photo or collage</p>
                </div>
              </button>

              <button
                onClick={() => videoFileRef.current?.click()}
                className="flex items-center gap-4 p-5 rounded-2xl text-white transition active:scale-[0.97]"
                style={{ background: 'linear-gradient(135deg, #f7971e, #ffd200)', boxShadow: '0 4px 20px rgba(247,151,30,0.35)' }}
              >
                <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <FaVideo className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-base leading-tight">Video</p>
                  <p className="text-xs text-white/60 mt-0.5">Share a short video clip</p>
                </div>
                <input ref={videoFileRef} type="file" accept="video/*" className="hidden"
                  onChange={(e) => {
                    const f = e.target.files[0];
                    if (f) { setVideoFile(f); setVideoUrl(URL.createObjectURL(f)); setStep('video'); }
                  }} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PHOTO TYPE ─────────────────────────────────────────────── */}
      {step === 'photo-type' && (
        <div
          className="flex-1 flex flex-col relative"
          style={{ background: 'linear-gradient(160deg, #141e30 0%, #243b55 100%)' }}
        >
          <button onClick={() => setStep('choose')}
            className="absolute top-4 left-4 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition">
            <FaTimes className="h-4 w-4" />
          </button>

          <div className="flex-1 flex flex-col items-center justify-center gap-8 p-6">
            <div className="text-center">
              <h2 className="text-white text-xl font-bold">Choose Photo Style</h2>
              <p className="text-white/40 text-sm mt-1">How do you want to share?</p>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
              <button
                onClick={() => singleFileRef.current?.click()}
                className="flex flex-col items-center gap-3 p-7 rounded-2xl text-white transition active:scale-95"
                style={{ background: 'linear-gradient(135deg, #2193b0, #6dd5ed)', boxShadow: '0 4px 20px rgba(33,147,176,0.4)' }}
              >
                <FaImage className="h-8 w-8" />
                <span className="text-sm font-bold">Single Photo</span>
                <input ref={singleFileRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => {
                    const f = e.target.files[0];
                    if (f) { setPhotoFile(f); setPhotoUrl(URL.createObjectURL(f)); setStep('single-photo'); }
                  }} />
              </button>

              <button
                onClick={() => setStep('collage')}
                className="flex flex-col items-center gap-3 p-7 rounded-2xl text-white transition active:scale-95"
                style={{ background: 'linear-gradient(135deg, #ee0979, #ff6a00)', boxShadow: '0 4px 20px rgba(238,9,121,0.4)' }}
              >
                <div className="grid grid-cols-2 gap-0.5 w-8 h-8">
                  {[0, 1, 2, 3].map((i) => <div key={i} className="bg-white/80 rounded-sm" />)}
                </div>
                <span className="text-sm font-bold">Collage</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TEXT EDITOR ────────────────────────────────────────────── */}
      {step === 'text' && (
        <div className="flex-1 flex flex-col relative" style={bgStyle}>
          <button onClick={() => setStep('choose')}
            className="absolute top-4 left-4 z-10 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition">
            <FaTimes className="h-4 w-4" />
          </button>

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

          <div className="px-6 pb-1">
            <input type="range" min={16} max={48} value={textSize}
              onChange={(e) => setTextSize(Number(e.target.value))}
              className="w-full accent-white" />
          </div>

          <div className="flex gap-2 px-4 pb-2 overflow-x-auto">
            {TEXT_COLORS.map((c) => (
              <button key={c} onClick={() => setTextColor(c)}
                style={{ background: c }}
                className={`w-8 h-8 rounded-full shrink-0 border-2 transition-transform ${textColor === c ? 'border-white scale-110' : 'border-transparent'}`} />
            ))}
          </div>

          <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
            {TEXT_BGS.map((bg, i) => (
              <button key={i} onClick={() => setBgIdx(i)}
                style={{ background: `linear-gradient(135deg, ${bg.join(', ')})` }}
                className={`w-10 h-10 rounded-full shrink-0 border-2 transition-transform ${bgIdx === i ? 'border-white scale-110' : 'border-white/30'}`} />
            ))}
          </div>

          <div className="px-4 pb-6 pt-1">
            <button onClick={handleSubmitText} disabled={!textContent.trim() || loading}
              className="w-full py-3.5 disabled:opacity-40 text-white font-bold rounded-full transition"
              style={{ background: 'linear-gradient(135deg, #25d366, #128c7e)' }}>
              {loading ? 'Sharing...' : 'Share Status'}
            </button>
          </div>
        </div>
      )}

      {/* ── SINGLE PHOTO EDITOR ────────────────────────────────────── */}
      {step === 'single-photo' && photoUrl && (
        <div className="flex-1 flex flex-col bg-black">
          {/* Top bar: close · text count · add text · share */}
          <div className="flex items-center justify-between px-4 py-3 shrink-0">
            <button
              onClick={() => { setStep('photo-type'); setPhotoFile(null); setPhotoUrl(null); setOverlayItems([]); setActiveOverlayId(null); }}
              className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition">
              <FaTimes className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2">
              {overlayItems.length > 0 && (
                <span className="text-white/50 text-xs bg-white/10 px-2.5 py-1 rounded-full">
                  {overlayItems.length} text{overlayItems.length > 1 ? 's' : ''}
                </span>
              )}
              <button onClick={openAddOverlay}
                className="p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition">
                <FaFont className="h-4 w-4" />
              </button>
            </div>

            <button onClick={handleSubmitSinglePhoto} disabled={loading}
              className="px-5 py-2 disabled:opacity-40 text-white font-bold rounded-full text-sm transition active:scale-95"
              style={{ background: 'linear-gradient(135deg, #25d366, #128c7e)' }}>
              {loading ? '...' : 'Share'}
            </button>
          </div>

          {/* Image area */}
          <div
            ref={photoContainerRef}
            className="flex-1 min-h-0 relative flex items-center justify-center overflow-hidden"
            onMouseDown={() => setActiveOverlayId(null)}
            onTouchStart={() => setActiveOverlayId(null)}
          >
            <img ref={singleImgRef} src={photoUrl} alt="status"
              className="max-w-full max-h-full object-contain select-none pointer-events-none" />

            {overlayItems.map((overlay) => (
              <div
                key={overlay.id}
                className="absolute cursor-move select-none z-10"
                style={{
                  left: `${overlay.x}%`,
                  top: `${overlay.y}%`,
                  transform: 'translate(-50%, -50%)',
                  outline: activeOverlayId === overlay.id ? '2px dashed rgba(255,255,255,0.7)' : 'none',
                  outlineOffset: 6,
                  borderRadius: 4,
                  padding: '0 4px',
                }}
                onMouseDown={(e) => { e.stopPropagation(); setActiveOverlayId(overlay.id); handleOverlayDragStart(e, overlay.id); }}
                onTouchStart={(e) => { e.stopPropagation(); setActiveOverlayId(overlay.id); handleOverlayDragStart(e, overlay.id); }}
                onClick={(e) => e.stopPropagation()}
              >
                <p style={{ color: overlay.color, fontSize: overlay.size, textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}
                  className="font-bold whitespace-nowrap">
                  {overlay.text}
                </p>

                {activeOverlayId === overlay.id && (
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                    <button
                      onMouseDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); openEditOverlay(overlay.id); }}
                      className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-lg"
                    >
                      <FaPen className="h-2.5 w-2.5" />
                    </button>
                    <button
                      onMouseDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); deleteOverlay(overlay.id); }}
                      className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg"
                    >
                      <FaTrash className="h-2.5 w-2.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Text overlay input modal */}
          {overlayInputMode && (
            <div className="absolute inset-0 z-30 bg-black/90 flex flex-col items-center justify-center px-6 gap-5">
              <p className="text-white/50 text-xs uppercase tracking-widest font-semibold">
                {overlayEditId ? 'Edit Text' : 'Add Text'}
              </p>
              <input
                value={overlayInputText}
                onChange={(e) => setOverlayInputText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') confirmOverlayInput(); }}
                placeholder="Type your text..."
                style={{ color: overlayInputColor, fontSize: Math.min(overlayInputSize, 32) }}
                className="w-full bg-transparent text-center font-bold border-b-2 border-white/20 outline-none py-2 placeholder-white/30"
                autoFocus
              />
              <div className="flex gap-2 flex-wrap justify-center">
                {TEXT_COLORS.map((c) => (
                  <button key={c} onClick={() => setOverlayInputColor(c)}
                    style={{ background: c }}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${overlayInputColor === c ? 'border-white scale-110' : 'border-transparent'}`} />
                ))}
              </div>
              <div className="w-full">
                <p className="text-white/40 text-xs mb-1 text-center">Size</p>
                <input type="range" min={16} max={56} value={overlayInputSize}
                  onChange={(e) => setOverlayInputSize(Number(e.target.value))}
                  className="w-full accent-white" />
              </div>
              <div className="flex gap-3 w-full">
                <button onClick={() => { setOverlayInputMode(false); setOverlayEditId(null); }}
                  className="flex-1 py-3 rounded-full border border-white/20 text-white/60 text-sm font-semibold hover:border-white/40 transition">
                  Cancel
                </button>
                <button onClick={confirmOverlayInput}
                  className="flex-1 py-3 rounded-full bg-white text-black text-sm font-bold transition active:scale-95">
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── COLLAGE EDITOR ─────────────────────────────────────────── */}
      {step === 'collage' && (
        <div className="flex-1 flex flex-col bg-[#111]">
          <div className="flex items-center justify-between px-4 py-3 shrink-0">
            <button onClick={() => { setStep('photo-type'); itemsRef.current = []; textItemsRef.current = []; selectedIdRef.current = null; selectedTypeRef.current = null; setSelectedCollageId(null); }}
              className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition">
              <FaTimes className="h-4 w-4" />
            </button>
            <p className="text-white/50 text-xs">Drag to move · corner handles to resize</p>
            <button onClick={handleSubmitCollage} disabled={itemsRef.current.length === 0 || loading}
              className="px-5 py-2 disabled:opacity-40 text-white font-bold rounded-full text-sm transition active:scale-95"
              style={{ background: 'linear-gradient(135deg, #25d366, #128c7e)' }}>
              {loading ? '...' : 'Share'}
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center overflow-hidden px-2">
            <canvas
              ref={collageCanvasRef}
              width={CW} height={CH}
              className="rounded-xl shadow-2xl"
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

          <div className="flex items-center gap-2 px-4 py-3 shrink-0 flex-wrap">
            <button onClick={() => collageFileRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-sm transition active:scale-95">
              <FaImage className="h-3.5 w-3.5" />
              Add Image
            </button>
            <button onClick={() => { setCollageTextInput(''); setCollageTextColor('#ffffff'); setCollageTextSize(32); setCollageTextMode(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-sm transition active:scale-95">
              <FaFont className="h-3.5 w-3.5" />
              Add Text
            </button>
            {selectedCollageId && selectedCollageType === 'text' && (
              <button onClick={openCollageTextEdit}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 rounded-full text-sm transition active:scale-95">
                <FaPen className="h-3.5 w-3.5" />
                Edit Text
              </button>
            )}
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

          {itemsRef.current.length === 0 && !collageTextMode && (
            <p className="text-white/25 text-xs text-center pb-4">Tap "Add Image" to get started</p>
          )}

          {/* Collage text input modal */}
          {collageTextMode && (
            <div className="absolute inset-0 z-30 bg-black/90 flex flex-col items-center justify-center px-6 gap-5">
              <p className="text-white/50 text-xs uppercase tracking-widest font-semibold">
                {collageTextEditId ? 'Edit Text' : 'Add Text to Canvas'}
              </p>
              <input
                value={collageTextInput}
                onChange={(e) => setCollageTextInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') confirmCollageText(); }}
                placeholder="Type your text..."
                style={{ color: collageTextColor, fontSize: Math.min(collageTextSize, 32) }}
                className="w-full bg-transparent text-center font-bold border-b-2 border-white/20 outline-none py-2 placeholder-white/30"
                autoFocus
              />
              <div className="flex gap-2 flex-wrap justify-center">
                {TEXT_COLORS.map((c) => (
                  <button key={c} onClick={() => setCollageTextColor(c)}
                    style={{ background: c }}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${collageTextColor === c ? 'border-white scale-110' : 'border-transparent'}`} />
                ))}
              </div>
              <div className="w-full">
                <p className="text-white/40 text-xs mb-1 text-center">Size</p>
                <input type="range" min={18} max={72} value={collageTextSize}
                  onChange={(e) => setCollageTextSize(Number(e.target.value))}
                  className="w-full accent-white" />
              </div>
              <div className="flex gap-3 w-full">
                <button onClick={() => { setCollageTextMode(false); setCollageTextEditId(null); }}
                  className="flex-1 py-3 rounded-full border border-white/20 text-white/60 text-sm font-semibold hover:border-white/40 transition">
                  Cancel
                </button>
                <button onClick={confirmCollageText}
                  className="flex-1 py-3 rounded-full bg-white text-black text-sm font-bold transition active:scale-95">
                  {collageTextEditId ? 'Update' : 'Add'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── VIDEO EDITOR ───────────────────────────────────────────── */}
      {step === 'video' && videoUrl && (
        <div className="flex-1 flex flex-col bg-black relative">
          <button onClick={() => { setStep('choose'); setVideoFile(null); setVideoUrl(null); }}
            className="absolute top-4 left-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition">
            <FaTimes className="h-4 w-4" />
          </button>
          <div className="flex-1 flex items-center justify-center">
            <video src={videoUrl} controls className="max-w-full max-h-full" />
          </div>
          <div className="p-4">
            <button onClick={handleSubmitVideo} disabled={loading}
              className="w-full py-3.5 disabled:opacity-40 text-white font-bold rounded-full transition"
              style={{ background: 'linear-gradient(135deg, #25d366, #128c7e)' }}>
              {loading ? 'Uploading...' : 'Share Status'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusCreator;
