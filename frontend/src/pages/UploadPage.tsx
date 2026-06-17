import React, { useCallback, useState } from 'react';
import { Upload, Scan, Palette, Eye, X, ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useSessionStore } from '../store/useSessionStore';
import { useToast } from '../components/ui/Toast';
import { Logo } from '../components/ui/Logo';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';

const STEPS = [
  {
    num: '01',
    icon: Upload,
    title: 'Upload Photo',
    desc: 'Snap or upload a clear photo of your house exterior.',
  },
  {
    num: '02',
    icon: Scan,
    title: 'AI Detection',
    desc: 'Our AI identifies walls, roof, windows, and more.',
  },
  {
    num: '03',
    icon: Palette,
    title: 'Choose Materials',
    desc: 'Pick premium finishes and colors for each area.',
  },
  {
    num: '04',
    icon: Eye,
    title: 'Preview & Estimate',
    desc: 'See your redesign and get an accurate cost breakdown.',
  },
];

export const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const setSession = useSessionStore((state) => state.setSession);
  const { showToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [projectTitle, setProjectTitle] = useState('');
  const [preview, setPreview] = useState<{ url: string; name: string; size: string } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const resetModal = () => {
    setPreview(null);
    setSelectedFile(null);
    setProjectTitle('');
    setIsDragging(false);
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Please upload a valid image file.', 'error');
      return;
    }
    setSelectedFile(file);
    setPreview({
      url: URL.createObjectURL(file),
      name: file.name,
      size: `${(file.size / (1024 * 1024)).toFixed(1)}MB`,
    });
  };

  const processUpload = useCallback(async () => {
    if (!selectedFile) {
      showToast('Please upload a house photo first.', 'info');
      return;
    }
    try {
      setLoading(true);
      const sessionRes = await api.post('/session');
      const sessionId = sessionRes.data.session_id;

      const formData = new FormData();
      formData.append('file', selectedFile);
      await api.post(`/session/${sessionId}/upload`, formData);

      const updatedSessionRes = await api.get(`/session/${sessionId}`);
      setSession(updatedSessionRes.data);

      showToast('Project started! Running detection...', 'success');
      setModalOpen(false);
      resetModal();
      navigate(`/detect/${sessionId}`);
    } catch (error) {
      console.error('Upload failed', error);
      showToast('Failed to upload image. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedFile, navigate, setSession, showToast]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const clearPreview = () => {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
    setSelectedFile(null);
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="border-b border-border bg-surface/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Logo />
          <Button size="sm" onClick={() => setModalOpen(true)}>
            Get Started
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-20 text-center animate-slide-up">
        <div className="absolute inset-x-0 top-0 h-64 bg-gradient-hero pointer-events-none -z-10" />
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-muted border border-accent/20 text-accent text-xs font-semibold tracking-wide mb-6">
          AI-Powered Exterior Design
        </div>
        <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-semibold text-charcoal leading-tight tracking-tight">
          Reimagine Your
          <br />
          <span className="text-primary">Home&apos;s Exterior</span>
        </h1>
        <p className="mt-6 text-muted text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
          Upload a photo, let AI detect architectural regions, apply premium materials,
          and get an accurate renovation estimate — all in minutes.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button size="lg" onClick={() => setModalOpen(true)}>
            Start Your Project
          </Button>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-surface-muted/70 border-y border-border py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-charcoal">
              How It Works
            </h2>
            <p className="mt-3 text-muted">Four simple steps to your dream exterior</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.num}
                  style={{ animationDelay: `${i * 80}ms` }}
                  className="group bg-white rounded-2xl p-6 border border-border hover:border-primary/30 hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 animate-slide-up"
                >
                  <span className="text-xs font-semibold text-accent tracking-widest">{step.num}</span>
                  <div className="mt-4 w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors duration-300">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="mt-4 font-semibold text-charcoal">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted leading-relaxed">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Upload Modal */}
      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); resetModal(); }}
        title="New Renovation Project"
      >
        <div className="space-y-5 mt-2">
          <div>
            <label className="block text-sm font-medium text-muted mb-1.5">
              Project Title <span className="text-slate-400">(optional)</span>
            </label>
            <input
              type="text"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              placeholder="My Dream Renovation"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-charcoal placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/40 transition-all duration-200"
            />
          </div>

          {preview ? (
            <div className="relative rounded-xl overflow-hidden border border-border animate-scale-in">
              <img src={preview.url} alt="Preview" className="w-full h-48 object-cover" />
              <button
                onClick={clearPreview}
                className="absolute top-2 right-2 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow-sm hover:bg-white transition-colors"
              >
                <X className="w-4 h-4 text-charcoal" />
              </button>
              <div className="flex items-center gap-2 px-3 py-2 bg-surface-muted text-xs text-muted">
                <ImageIcon className="w-3.5 h-3.5" />
                {preview.name} · {preview.size}
              </div>
            </div>
          ) : (
            <label
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              className={`
                flex flex-col items-center justify-center w-full py-10 px-4
                border-2 border-dashed rounded-xl cursor-pointer
                transition-all duration-300
                ${isDragging
                  ? 'border-primary bg-primary/5 scale-[1.01]'
                  : 'border-slate-300 bg-surface hover:border-accent hover:bg-accent-muted/40'
                }
              `}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                <Upload className="w-6 h-6 text-primary" />
              </div>
              <p className="font-medium text-charcoal text-sm">
                {isDragging ? 'Drop your photo here' : 'Drop your house photo here, or click to browse'}
              </p>
              <p className="text-xs text-muted mt-1">JPG, PNG, or WebP — max 20MB</p>
              <input
                type="file"
                className="hidden"
                accept="image/jpeg, image/png, image/webp"
                onChange={onFileChange}
              />
            </label>
          )}

          <div className="bg-surface-muted rounded-xl p-4 border border-border">
            <p className="text-xs font-semibold text-charcoal mb-2">Tips for best results:</p>
            <ul className="text-xs text-muted space-y-1 list-disc list-inside">
              <li>Use a clear, well-lit photo of the full exterior</li>
              <li>Shoot from the front at eye level</li>
              <li>Avoid heavy shadows or obstructions</li>
            </ul>
          </div>

          <Button
            fullWidth
            size="lg"
            loading={loading}
            onClick={processUpload}
            disabled={!selectedFile}
          >
            Upload & Start Project
          </Button>
        </div>
      </Modal>
    </div>
  );
};
