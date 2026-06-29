import React from "react";
import { Project } from "../data/projects";
import hammerLogo from "../assets/images/Hammer_logo_sort_F41.png";

import kontor1 from "../assets/images/Kontor/Shotby_lucas,HammerArk,kontoret,1-1.jpg";
import kontor7 from "../assets/images/Kontor/Shotby_lucas,HammerArk,kontoret,7-1.jpg";
import kontor8 from "../assets/images/Kontor/Shotby_lucas,HammerArk,kontoret,8-1.jpg";

interface OmOssProps {
  onSelectProject?: (project: Project) => void;
}

export const OmOss: React.FC<OmOssProps> = () => {
  const officeImages = [kontor1, kontor7, kontor8];

  return (
    <div className="pt-32 pb-16 md:pt-40 md:pb-24 px-4 sm:px-6 md:px-12 bg-[#fffbf0] text-neutral-900 w-full min-h-screen flex flex-col justify-between">
      <div className="w-full flex flex-col items-start">
        <h1 className="font-sans font-light text-xl md:text-2xl lg:text-[29px] leading-snug md:leading-snug max-w-4xl mb-24 md:mb-32">
          Hammer Arkitekter ble grunnlagt i 2014 med mål om å kombinere faglig presisjon med personlig tillit. Vi spesialiserer oss på transformasjon og fornyelse og skaper steder man vil være.
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full mb-32 md:mb-40">
          {officeImages.map((img, idx) => (
            <div 
              key={`office-img-${idx}`} 
              className="flex flex-col w-full"
            >
              <div className="w-full aspect-[4/5] overflow-hidden bg-white">
                <img
                  src={img}
                  alt={`Hammer Arkitekter Kontor ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="w-full mb-32 md:mb-48">
          <h2 className="font-sans text-xl md:text-2xl mb-6">Om oss</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 font-sans font-light text-sm md:text-base lg:text-[19px] leading-relaxed">
            <p>
              Hammer arkitekter er et kommersielt rettet arkitektkontor med mer enn 10 års erfaring. Vi kombinerer solid fagkompetanse med tydelig forretningsforståelse, og utvikler løsninger som er både arkitektonisk gjennomarbeidet og økonomisk bærekraftige. Vår tilnærming er pragmatisk og løsningsorientert, med fokus på å skape verdi for oppdragsgiver i hvert enkelt prosjekt.
            </p>
            <p>
              Hammer har som mål å etablere varige kunderelasjoner, og legger til grunn at dette forutsetter jevn kvalitet i alle leveranser – uavhengig av prosjektets størrelse og kompleksitet. For oss er hvert oppdrag en del av et langsiktig samarbeid, og vi arbeider med samme fokus og gjennomføringsevne i alle faser.
            </p>
          </div>
        </div>
      </div>

      {/* Minimal Footer built into OmOss matching the design */}
      <footer className="w-full grid grid-cols-1 md:grid-cols-2 gap-x-8 lg:gap-x-12 items-end font-sans font-medium text-xs md:text-sm">
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
              +47 932 55 805<br />
              <a href="mailto:post@haark.no" className="hover:opacity-80 hover:underline underline-offset-4 transition-all">post@haark.no</a>
            </div>
          </div>
          
          <div className="whitespace-nowrap pb-1">
            Org: 913 307 828 MVA
          </div>
        </div>
      </footer>
    </div>
  );
};
