import React from "react";
import { Instagram, Mail, MapPin, Phone, ArrowUp } from "lucide-react";
import { PageId } from "./Header";
import hammerLogo from "../assets/images/Hammer_logo_sort_F41.png";
import { triggerHaptic } from "../utils";

interface FooterProps {
  onPageChange: (page: PageId) => void;
}

export const Footer: React.FC<FooterProps> = ({ onPageChange }) => {
  const scrollToTop = () => {
    triggerHaptic();
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  return (
    <footer className="bg-neutral-950 text-neutral-200 border-t border-neutral-800 px-6 md:px-12 py-20 md:py-28 select-none">
      <div className="w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-24 pb-16 border-b border-neutral-800/60">
          
          {/* Column 1: Wordmark & social */}
          <div className="lg:col-span-5">
            <button
              onClick={() => {
                triggerHaptic();
                onPageChange("hjem");
              }}
              className="cursor-pointer hover:opacity-80 transition-opacity focus:outline-none"
            >
              <img
                src={hammerLogo}
                alt="HAMMER ARKITEKTER"
                className="h-9 md:h-[53px] w-auto object-contain invert brightness-0 object-left"
                referrerPolicy="no-referrer"
              />
            </button>
            <p className="mt-6 text-neutral-400 text-xs leading-relaxed max-w-sm">
              Besøk oss i våre åpne studioer eller ta kontakt for en uforpliktende samtale om ditt fremtidige prosjekt.
            </p>
            
            <div className="flex gap-4 mt-8">
              <a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noreferrer" 
                className="w-10 h-10 rounded-full border border-neutral-800 hover:border-neutral-500 hover:text-white transition-all flex items-center justify-center text-neutral-400 cursor-pointer"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a 
                href="mailto:post@haark.no" 
                className="w-10 h-10 rounded-full border border-neutral-800 hover:border-neutral-500 hover:text-white transition-all flex items-center justify-center text-neutral-400 cursor-pointer"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Column 2: Location & Contact */}
          <div className="lg:col-span-4 flex flex-col gap-6 text-xs text-neutral-400 tracking-wider">
            <div className="text-[10px] font-mono tracking-widest text-neutral-600 uppercase">LOCATION & INFORMATION</div>
            
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-neutral-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-white">Hammer Arkitekter AS</div>
                <div className="mt-1 leading-relaxed">Gøteborggata 38<br />0566 Oslo, Norway</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-neutral-500 flex-shrink-0" />
              <a href="tel:+4722550000" className="hover:text-white transition-colors">+47 22 55 00 00</a>
            </div>

            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-neutral-500 flex-shrink-0" />
              <a href="mailto:post@haark.no" className="hover:text-white transition-colors">post@haark.no</a>
            </div>
          </div>

          {/* Column 3: Navigation */}
          <div className="lg:col-span-3 flex flex-col justify-between">
            <div className="text-[10px] font-mono tracking-widest text-neutral-600 uppercase mb-4 md:mb-0">NAVIGASJON</div>
            <ul className="flex flex-col gap-2.5 text-xs text-neutral-400 tracking-wider">
              <li>
                <button 
                  onClick={() => {
                    triggerHaptic();
                    onPageChange("hjem");
                  }} 
                  className="hover:text-white transition-colors cursor-pointer text-left focus:outline-none"
                >
                  Hjem (Kartsøker)
                </button>
              </li>
              <li>
                <button 
                  onClick={() => {
                    triggerHaptic();
                    onPageChange("prosjekter");
                  }} 
                  className="hover:text-white transition-colors cursor-pointer text-left focus:outline-none"
                >
                  Prosjekter (Arkiv)
                </button>
              </li>
              <li>
                <button 
                  onClick={() => {
                    triggerHaptic();
                    onPageChange("om-oss");
                  }} 
                  className="hover:text-white transition-colors cursor-pointer text-left focus:outline-none"
                >
                  Om oss
                </button>
              </li>
              <li>
                <button 
                  onClick={() => {
                    triggerHaptic();
                    onPageChange("kontakt");
                  }} 
                  className="hover:text-white transition-colors cursor-pointer text-left focus:outline-none"
                >
                  Kontakt
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-8 text-[10px] font-mono text-neutral-600 uppercase tracking-widest">
          <div>© {new Date().getFullYear()} Hammer Arkitekter AS. ALL RIGHTS RESERVED.</div>
          <div className="mt-2 sm:mt-0 flex items-center gap-2">
            <span>DESIGNED FOR QUALITY AND LONGEVITY</span>
            <span>•</span>
            <button 
              onClick={scrollToTop}
              className="hover:text-white flex items-center gap-1 cursor-pointer focus:outline-none"
            >
              TOPP <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
