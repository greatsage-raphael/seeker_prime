// FILE: src/components/CertificateView.tsx
// --------------------------------------------------------------------------

import React, { useRef, useState } from 'react';
import { Award, Download, Share2 } from 'lucide-react';
import { toPng, toJpeg } from 'html-to-image';
import jsPDF from 'jspdf';

interface CertificateViewProps {
  topicTitle: string;
  courseTitle?: string;
  userName: string;
  completionDate: string;
}

const CertificateView: React.FC<CertificateViewProps> = ({
  topicTitle,
  userName,
  completionDate,
}) => {
  const certificateContentRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const sanitizeFilename = (name: string) => name.replace(/[^a-z0-9_.-]/gi, '_').replace(/_{2,}/g, '_');

  const handleDownloadPNG = async () => {
    if (!certificateContentRef.current || isDownloading) return;
    setIsDownloading(true);
    
    try {
      const elementToCapture = certificateContentRef.current;
      const dataUrl = await toPng(elementToCapture, {
        quality: 1.0,
        pixelRatio: 3, 
        backgroundColor: '#000000',
      });

      const link = document.createElement('a');
      link.download = `Seeker_Certificate_${sanitizeFilename(topicTitle)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("PNG generation failed:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!certificateContentRef.current || isDownloading) return;
    setIsDownloading(true);
    
    try {
      const elementToCapture = certificateContentRef.current;
      const dataUrl = await toJpeg(elementToCapture, {
        quality: 1.0,
        pixelRatio: 3,
        backgroundColor: '#000000',
      });

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Seeker_Certificate_${sanitizeFilename(topicTitle)}.pdf`);
    } catch (error) {
      console.error('PDF generation failed:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="w-full animate-fade-in space-y-8">
      
      {/* CERTIFICATE DOCUMENT - Fixed Aspect Ratio */}
      <div className="relative overflow-hidden rounded-xl shadow-2xl max-w-4xl mx-auto">
        <div
          ref={certificateContentRef}
          className="relative text-center"
          style={{ 
            aspectRatio: '210/297', // A4 portrait ratio
            background: `
              radial-gradient(circle at 10% 20%, rgba(212, 175, 55, 0.03) 0%, transparent 40%),
              radial-gradient(circle at 90% 80%, rgba(212, 175, 55, 0.03) 0%, transparent 40%),
              linear-gradient(145deg, #000000 0%, #1a1a1a 50%, #000000 100%)
            `,
            border: '4px solid #d4af37',
            borderRadius: '0.75rem',
            boxShadow: `
              0 0 0 1px rgba(212, 175, 55, 0.2),
              0 20px 60px rgba(0, 0, 0, 0.8),
              inset 0 1px 0 rgba(212, 175, 55, 0.1)
            `,
            padding: '3rem 2rem'
          }}
        >
          {/* Gold Particles - More subtle */}
          <div className="absolute top-[10%] right-[15%] w-2 h-2 rotate-45 opacity-60" 
               style={{ background: '#d4af37' }} />
          <div className="absolute top-[15%] left-[18%] w-1.5 h-1.5 -rotate-45 opacity-50" 
               style={{ background: '#f4e5b1' }} />
          <div className="absolute bottom-[25%] right-[12%] w-1.5 h-1.5 rotate-12 opacity-55" 
               style={{ background: '#d4af37' }} />
          <div className="absolute bottom-[30%] left-[15%] w-2 h-2 rotate-90 opacity-45" 
               style={{ background: '#b8941f' }} />

          {/* Corner Ornaments */}
          <div className="absolute top-6 left-6 w-16 h-16 pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-0.5" 
                 style={{ background: 'linear-gradient(to right, #d4af37 0%, transparent 100%)' }} />
            <div className="absolute top-0 left-0 w-0.5 h-full" 
                 style={{ background: 'linear-gradient(to bottom, #d4af37 0%, transparent 100%)' }} />
            <div className="absolute top-0 left-0 w-2 h-2 bg-[#d4af37] transform rotate-45" />
          </div>
          
          <div className="absolute top-6 right-6 w-16 h-16 pointer-events-none">
            <div className="absolute top-0 right-0 w-full h-0.5" 
                 style={{ background: 'linear-gradient(to left, #d4af37 0%, transparent 100%)' }} />
            <div className="absolute top-0 right-0 w-0.5 h-full" 
                 style={{ background: 'linear-gradient(to bottom, #d4af37 0%, transparent 100%)' }} />
            <div className="absolute top-0 right-0 w-2 h-2 bg-[#d4af37] transform rotate-45" />
          </div>
          
          <div className="absolute bottom-6 left-6 w-16 h-16 pointer-events-none">
            <div className="absolute bottom-0 left-0 w-full h-0.5" 
                 style={{ background: 'linear-gradient(to right, #d4af37 0%, transparent 100%)' }} />
            <div className="absolute bottom-0 left-0 w-0.5 h-full" 
                 style={{ background: 'linear-gradient(to top, #d4af37 0%, transparent 100%)' }} />
            <div className="absolute bottom-0 left-0 w-2 h-2 bg-[#d4af37] transform rotate-45" />
          </div>
          
          <div className="absolute bottom-6 right-6 w-16 h-16 pointer-events-none">
            <div className="absolute bottom-0 right-0 w-full h-0.5" 
                 style={{ background: 'linear-gradient(to left, #d4af37 0%, transparent 100%)' }} />
            <div className="absolute bottom-0 right-0 w-0.5 h-full" 
                 style={{ background: 'linear-gradient(to top, #d4af37 0%, transparent 100%)' }} />
            <div className="absolute bottom-0 right-0 w-2 h-2 bg-[#d4af37] transform rotate-45" />
          </div>

          {/* Main Content - Properly Spaced */}
          <div className="relative z-10 h-full flex flex-col justify-between">
            
            {/* HEADER - 15% height */}
            <div className="pt-2">
              <h1 
                className="text-3xl sm:text-4xl lg:text-5xl uppercase leading-none mb-3"
                style={{ 
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 600,
                  color: '#d4af37',
                  letterSpacing: '0.2em',
                  textShadow: `
                    0 0 20px rgba(212, 175, 55, 0.4),
                    0 0 40px rgba(212, 175, 55, 0.2),
                    2px 2px 4px rgba(0, 0, 0, 0.5)
                  `
                }}
              >
                CERTIFICATE
              </h1>
              <div className="w-2 h-2 bg-[#d4af37] rotate-45 mx-auto mb-2" />
              <p 
                className="text-sm sm:text-base lg:text-lg uppercase"
                style={{ 
                  fontFamily: "'Cinzel', serif",
                  fontWeight: 300,
                  color: 'rgba(212, 175, 55, 0.85)',
                  letterSpacing: '0.3em',
                  textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                }}
              >
                OF COMPLETION
              </p>
            </div>

            {/* BODY - 70% height */}
            <div className="flex-1 flex flex-col justify-center py-4">
              
              <p 
                className="text-xs sm:text-sm uppercase mb-6"
                style={{ 
                  color: 'rgba(255, 255, 255, 0.8)',
                  letterSpacing: '0.2em',
                  fontWeight: 300
                }}
              >
                THIS CERTIFICATE IS<br/>AWARDED TO
              </p>
              
              <h2 
                className="text-3xl sm:text-5xl lg:text-6xl mb-8 px-4"
                style={{ 
                  fontFamily: "'Great Vibes', cursive",
                  color: '#d4af37',
                  fontWeight: 400,
                  textShadow: `
                    0 0 15px rgba(212, 175, 55, 0.5),
                    0 0 30px rgba(212, 175, 55, 0.3),
                    2px 2px 6px rgba(0, 0, 0, 0.4)
                  `,
                  lineHeight: 1.2
                }}
              >
                {userName}
              </h2>

              <div className="max-w-xl mx-auto mb-6 px-6">
                <p 
                  className="text-xs sm:text-sm leading-relaxed"
                  style={{ 
                    fontFamily: "'Lato', sans-serif",
                    color: 'rgba(255, 255, 255, 0.65)',
                    fontWeight: 300,
                    lineHeight: 1.5
                  }}
                >
                  For successfully demonstrating mastery and exceptional achievement in the comprehensive study of
                </p>
              </div>
              
              <h3 
                className="text-lg sm:text-xl lg:text-2xl uppercase max-w-lg mx-auto leading-tight px-8 mb-8"
                style={{ 
                  color: '#ffffff',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
                  lineHeight: 1.3
                }}
              >
                {topicTitle}
              </h3>

              {/* Gold Seal - Positioned in body */}
              <div className="mx-auto mb-4">
                <div className="relative w-16 h-16 sm:w-20 sm:h-20">
                  {/* Outer glow */}
                  <div className="absolute inset-0 rounded-full" 
                       style={{ 
                         background: 'radial-gradient(circle, rgba(212, 175, 55, 0.4) 0%, transparent 70%)',
                         filter: 'blur(8px)',
                         transform: 'scale(1.4)'
                       }} />
                  
                  {/* Outer ring */}
                  <div className="absolute inset-0 rounded-full border-[3px] z-10"
                       style={{ 
                         borderColor: '#d4af37',
                         background: `
                           radial-gradient(circle, #f4e5b1 0%, #d4af37 50%, #b8941f 100%)
                         `,
                         boxShadow: `
                           0 0 20px rgba(212, 175, 55, 0.6),
                           inset 0 2px 4px rgba(255, 255, 255, 0.3),
                           inset 0 -2px 4px rgba(0, 0, 0, 0.3)
                         `
                       }} />
                  
                  {/* Inner circle */}
                  <div className="absolute inset-2 rounded-full flex items-center justify-center z-20"
                       style={{ 
                         background: 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
                         boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)'
                       }}>
                    <Award className="w-6 h-6 sm:w-8 sm:h-8" style={{ color: '#1a1a1a' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* FOOTER - 15% height */}
            <div className="pb-2">
              {/* Signatures */}
              <div className="flex justify-between items-end max-w-3xl mx-auto px-4 mb-6">
                
                <div className="text-left flex-1">
                  <div className="h-px w-24 sm:w-32 mb-2" 
                       style={{ background: 'linear-gradient(to right, #d4af37 0%, transparent 100%)' }} />
                </div>

                <div className="text-center flex-1 px-2">
                  <p className="text-[7px] sm:text-[8px] uppercase tracking-widest mb-0.5" 
                     style={{ color: 'rgba(255, 255, 255, 0.35)', fontWeight: 700 }}>
                    Date Issued
                  </p>
                  <p className="text-xs" style={{ color: '#d4af37' }}>
                    {completionDate}
                  </p>
                </div>

                <div className="text-right flex-1">
                  <div className="h-px w-24 sm:w-32 mb-2 ml-auto" 
                       style={{ background: 'linear-gradient(to left, #d4af37 0%, transparent 100%)' }} />
                </div>
              </div>

              {/* Watermark */}
              <div className="text-[6px] sm:text-[7px] uppercase tracking-[0.3em]" 
                   style={{ color: 'rgba(255, 255, 255, 0.08)' }}>
                Seeker • Est. MMXXVI
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={handleDownloadPNG}
          disabled={isDownloading}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#d4af37] to-[#f4e5b1] text-black rounded-xl font-black uppercase text-xs tracking-widest hover:shadow-[0_0_20px_rgba(212,175,55,0.5)] transition-all shadow-lg active:scale-95 disabled:opacity-50"
        >
          <Download size={16} />
          {isDownloading ? 'Processing...' : 'Download Image'}
        </button>
        
        <button
          onClick={handleDownloadPDF}
          disabled={isDownloading}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-[#d4af37] border border-[#d4af37] rounded-xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all shadow-lg active:scale-95 disabled:opacity-50"
        >
          <Share2 size={16} />
          {isDownloading ? 'Processing...' : 'Download PDF'}
        </button>
      </div>
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Great+Vibes&family=Cinzel:wght@400;700&family=Lato:wght@300;400&display=swap');
        
        .marker-font { font-family: 'Permanent Marker', cursive; }
        .handwritten { font-family: 'Caveat', cursive; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default CertificateView;

// END OF FILE: components/CertificateView.tsx