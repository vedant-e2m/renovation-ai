import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, DollarSign, Hammer, Package } from 'lucide-react';
import { useSessionStore } from '../store/useSessionStore';
import { AppLayout } from '../components/layout/AppLayout';
import { Button } from '../components/ui/Button';
import { LoadingState } from '../components/ui/LoadingState';
import { useToast } from '../components/ui/Toast';
import { api } from '../services/api';

export const EstimatePage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { session, setSession } = useSessionStore();
  const { showToast } = useToast();
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    if (session?.estimate) return;

    const loadEstimate = async () => {
      await api.get(`/session/${sessionId}/estimate`);
      const res = await api.get(`/session/${sessionId}`);
      setSession(res.data);
    };

    loadEstimate().catch(console.error);
  }, [session, sessionId, setSession]);

  const handleDownloadPDF = async () => {
    if (!sessionId) return;
    try {
      setDownloading(true);
      const response = await api.post(`/session/${sessionId}/report`, {}, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `renovation_report_${sessionId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast('Report downloaded!', 'success');
    } catch (error) {
      showToast('Failed to download report.', 'error');
    } finally {
      setDownloading(false);
    }
  };

  if (!session || !session.estimate) {
    return (
      <AppLayout currentStep="estimate" title="Cost Estimate" sessionId={sessionId}>
        <LoadingState message="Loading estimate..." />
      </AppLayout>
    );
  }

  const { items, summary } = session.estimate;
  const itemList = Object.values(items);

  return (
    <AppLayout
      currentStep="estimate"
      title="Cost Estimate"
      subtitle="Detailed breakdown of your renovation costs"
      showBack
      onBack={() => navigate(`/visualize/${sessionId}`)}
      sessionId={sessionId}
      actions={
        <Button onClick={handleDownloadPDF} loading={downloading} icon={!downloading ? <Download className="w-4 h-4" /> : undefined}>
          {downloading ? 'Generating...' : 'Download PDF'}
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        {[
          { label: 'Material Cost', value: summary.total_material_cost, icon: Package },
          { label: 'Labor Cost', value: summary.total_labor_cost, icon: Hammer },
          { label: 'Grand Total', value: summary.grand_total, icon: DollarSign, highlight: true },
        ].map(({ label, value, icon: Icon, highlight }) => (
          <div
            key={label}
            className={`p-5 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover
              ${highlight ? 'bg-gradient-primary text-white border-primary shadow-primary-lg' : 'bg-white border-border shadow-card'}
            `}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${highlight ? 'bg-white/20' : 'bg-primary/10'}`}>
                <Icon className={`w-5 h-5 ${highlight ? 'text-white' : 'text-primary'}`} />
              </div>
              <div>
                <p className={`text-xs font-medium ${highlight ? 'text-white/80' : 'text-muted'}`}>{label}</p>
                <p className={`text-xl font-bold ${highlight ? 'text-white' : 'text-charcoal'}`}>${value.toFixed(2)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-3/4 bg-white rounded-2xl border border-border overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted text-muted text-xs uppercase tracking-wider">
                  <th className="px-5 py-3.5 font-semibold">Component</th>
                  <th className="px-5 py-3.5 font-semibold">Material</th>
                  <th className="px-5 py-3.5 font-semibold">Qty</th>
                  <th className="px-5 py-3.5 font-semibold text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {itemList.map((item: any, idx) => (
                  <tr key={idx} className="hover:bg-primary/5 transition-colors duration-150">
                    <td className="px-5 py-3.5 font-medium text-charcoal">{item.component_label}</td>
                    <td className="px-5 py-3.5 text-muted">{item.material_name}</td>
                    <td className="px-5 py-3.5 text-muted">{item.quantity} {item.unit}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-charcoal">${item.total_cost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="w-full lg:w-1/4">
          <div className="bg-gradient-primary p-6 rounded-2xl text-white sticky top-24 shadow-primary-lg">
            <h2 className="font-serif text-lg font-semibold mb-5 opacity-90">Summary</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="opacity-75">Materials</span><span className="font-semibold">${summary.total_material_cost.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="opacity-75">Labor</span><span className="font-semibold">${summary.total_labor_cost.toFixed(2)}</span></div>
              <div className="pt-3 border-t border-white/20 flex justify-between items-end">
                <span className="font-semibold">Grand Total</span>
                <span className="font-serif text-2xl font-bold">${summary.grand_total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
