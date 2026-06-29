import React, { useState, useRef, useEffect } from "react";
import hammerLogo from "../assets/images/Hammer_logo_sort_F41.png";
import { motion } from "motion/react";
import { triggerHaptic } from "../utils";

export const Kontakt: React.FC<{ onPageChange?: (page: any, options?: { skipMapAnimation?: boolean }) => void }> = ({ onPageChange }) => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValid = isEmailValid && message.trim() !== "";

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) {
      window.location.href = `mailto:post@haark.no?subject=Forespørsel fra nettsiden&body=${encodeURIComponent(message)}%0D%0A%0D%0AAvsender: ${encodeURIComponent(email)}`;
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setEmail("");
        setMessage("");
      }, 3000);
    }
  };

  const navCategories = [
    { id: "hjem", label: "KART" },
    { id: "prosjekter", label: "PROSJEKTER" },
    { id: "ansatte", label: "ANSATTE" },
    { id: "om-oss", label: "OM OSS" }
  ];

  return (
    <div className="pt-24 md:pt-32 pb-8 px-4 sm:px-6 md:px-12 w-full min-h-screen flex flex-col justify-between">
      <div className="w-full flex-grow flex flex-col justify-center">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-x-8 lg:gap-x-12 items-center w-full">
          
          {/* Menu links on the left */}
          <div className="hidden md:flex flex-col items-start gap-4 md:gap-6">
            {navCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  triggerHaptic();
                  onPageChange && onPageChange(cat.id, cat.id === 'hjem' ? { skipMapAnimation: true } : undefined);
                }}
                className="relative text-left text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-[3.375rem] font-sans tracking-tight text-neutral-900 group whitespace-nowrap pb-2"
              >
                <div className="absolute left-0 bottom-0 h-[3px] bg-neutral-900 transition-all duration-300 ease-out w-0 group-hover:w-full" />
                {cat.label}
              </button>
            ))}
          </div>
          
          {/* Form on the right */}
          <div className="flex flex-col w-full">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="text-sm md:text-base font-light tracking-wide mb-8 md:mb-10 text-neutral-900"
            >
              Ta gjerne kontakt med oss via kontaktinformasjonen nedenfor!
            </motion.h2>
            
            <div className="w-full max-w-lg">
              {submitted ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="bg-neutral-900 text-white p-6 md:p-8 flex items-center justify-center min-h-[200px]"
                >
                  <p className="text-lg font-light tracking-wide text-center">Takk for din henvendelse! Vi tar kontakt innen kort tid.</p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-6 md:gap-8">
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
                    className="flex flex-col gap-2"
                  >
                    <label className="text-[10px] uppercase tracking-[0.2em] font-medium text-neutral-900">E-post</label>
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Din e-postadresse" 
                      className="bg-transparent border-b border-neutral-900 focus:border-black px-0 py-2 outline-none text-neutral-900 transition-colors font-sans placeholder-neutral-900/50 text-sm md:text-base"
                      required
                    />
                  </motion.div>
                  
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                    className="flex flex-col gap-2"
                  >
                    <label className="text-[10px] uppercase tracking-[0.2em] font-medium text-neutral-900">Forespørsel</label>
                    <textarea 
                      ref={textareaRef}
                      rows={1} 
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Skriv din henvendelse her..." 
                      className="bg-transparent border-b border-neutral-900 focus:border-black px-0 py-2 outline-none text-neutral-900 transition-colors resize-none font-sans placeholder-neutral-900/50 text-sm md:text-base overflow-hidden"
                      required
                    />
                  </motion.div>
                  
                  <motion.button 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
                    type="submit"
                    disabled={!isValid}
                    className="mt-4 self-start px-8 py-3 bg-transparent text-neutral-900 outline outline-1 outline-neutral-900 hover:bg-neutral-900 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium tracking-[0.2em] text-[10px] uppercase cursor-pointer"
                  >
                    Send forespørsel
                  </motion.button>
                </form>
              )}
            </div>
          </div>

        </div>
      </div>

      <div className="w-full mt-auto pt-16">
        {/* Minimal Footer built into Kontakt matching Ansatte */}
        <footer className="w-full grid grid-cols-1 md:grid-cols-2 gap-x-8 lg:gap-x-12 items-end font-sans font-medium text-xs md:text-sm text-neutral-900">
          <div className="mb-8 md:mb-0">
            <img 
              src={hammerLogo} 
              alt="Hammer Logo" 
              className="h-9 md:h-[53px] w-auto object-contain object-left shrink-0 -ml-[2px] md:-ml-[3px]" 
            />
          </div>
          
          <div className="flex flex-col xl:flex-row justify-between md:items-end gap-12 xl:gap-8">
            <div className="flex flex-col gap-6">
              <a href="https://maps.google.com/?q=Gøteborggata+38,+0566+Oslo" target="_blank" rel="noopener noreferrer" className="leading-snug hover:opacity-80 hover:underline underline-offset-4 transition-all block">
                Gøteborggata 38<br />
                0566 Oslo
              </a>
              <div className="leading-snug">
                <a href="tel:+4793255805" className="hover:underline underline-offset-4 transition-all">+47 932 55 805</a><br />
                <a href="mailto:post@haark.no" className="hover:underline underline-offset-4 transition-all">post@haark.no</a>
              </div>
            </div>
            
            <div className="whitespace-nowrap pb-1">
              Org: 913 307 828 MVA
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};
