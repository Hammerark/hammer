import React, { useEffect } from "react";
import { Project } from "../data/projects";
import { ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import stedIcon from "../assets/images/Ikoner/Sted.png";
import byggarIcon from "../assets/images/Ikoner/Byggar.png";
import boligIcon from "../assets/images/Ikoner/Bolig2.png";
import naeringIcon from "../assets/images/Ikoner/Næring2.png";
import offentligIcon from "../assets/images/Ikoner/Offentlig2.png";
import oppdragIcon from "../assets/images/Ikoner/Oppdrag.png";
import hammerLogo from "../assets/images/Hammer_logo_sort_F41.png";
import { PageId } from "./Header";
import { triggerHaptic } from "../utils";

interface ProjectDrawerProps {
  project: Project | null;
  onClose: () => void;
  onScrollToProject: (projectId: string) => void;
  onPageChange?: (page: PageId) => void;
}

export const ProjectDrawer: React.FC<ProjectDrawerProps> = ({
  project,
  onClose,
  onScrollToProject,
  onPageChange
}) => {
  useEffect(() => {
    if (project) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [project]);

  if (!project) return null;

  // We assign realistic mock technical specifications for the selected project
  // to convey the ultimate professional architectural tone
  const getSpecsForProject = (id: string) => {
    switch (id) {
      case "storengveien-65":
        return { size: "115 m²", status: "Ferdigstilt", client: "Storengveien AS", materials: "Ubehandlet malmfuru" };
      case "tjuvholmen-alle":
        return { size: "340 m²", status: "Ferdigstilt", client: "Tjuvholmen Utvikling", materials: "Eik spiler" };
      case "holmenveien-9":
        return { size: "950 m²", status: "Skisseprosjekt", client: "Holmenveien 9 AS", materials: "Kjerneved av furu" };
      case "kongens-gate-12":
        return { size: "4000 m²", status: "Ferdigstilt", client: "Kongens Gate 12 AS", materials: "Tre og stål" };
      case "kvernveien-9A":
        return { size: "145 m²", status: "Ferdigstilt", client: "Privat", materials: "Beiset gran" };
      case "pilestredet-7":
        return { size: "420 m²", status: "Under oppføring", client: "Pilestredet 7 AS", materials: "Stål" };
      case "ovre-smestadvei-1":
        return { size: "1600 m²", status: "Forprosjekt", client: "Smestad Eiendom", materials: "Massivtre" };
      case "tvetenveien-11":
        return { size: "210 m²", status: "Ferdigstilt", client: "Tvetenveien 11 AS", materials: "Kebony kledning" };
      case "vogts-gate-33":
        return { size: "90 m²", status: "Under oppføring", client: "Privat", materials: "Gran kledning" };
      default:
        return { size: "185 m²", status: "Ferdigstilt", client: `${project.name} AS`, materials: "Tre og betong" };
    }
  };

  const specs = getSpecsForProject(project.id);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
      className="fixed inset-0 z-40 bg-[#fffbf0] overflow-y-auto w-full h-full"
    >
      <div className="pt-24 md:pt-32 pb-24 px-4 sm:px-6 md:px-12 w-full min-h-screen flex flex-col justify-between">
        
        <div className="w-full flex flex-col lg:flex-row gap-10 lg:gap-16 xl:gap-20 flex-1">
          
          {/* Left Column */}
          <div className="w-full lg:w-[280px] xl:w-[320px] flex-shrink-0 flex flex-col font-sans">

            {/* Top Back Button */}
            <button 
              onClick={() => {
                triggerHaptic();
                onClose();
              }}
              className="group flex items-center gap-3 text-[17px] font-sans font-normal text-neutral-900 mb-20 md:mb-24 w-fit cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" strokeWidth={1} />
              <span className="relative">
                Tilbake
                <span className="absolute left-0 -bottom-1 h-[1px] bg-neutral-900 transition-all duration-300 ease-out w-0 group-hover:w-full" />
              </span>
            </button>
            
            <h1 className="text-[27px] md:text-[32px] leading-tight text-neutral-900 font-light tracking-tight mb-16">
              {project.name}
            </h1>

            <div className="flex flex-col gap-7 w-full text-[15px] font-sans font-normal tracking-wide text-neutral-900 mb-16">
              <div className="flex items-center gap-5">
                <div className="w-5 h-5 flex items-center justify-center">
                  <img src={stedIcon} alt="Sted" className="w-full h-full object-contain" />
                </div>
                <span>{project.location.split(',')[0]}</span>
              </div>
              
              <div className="flex items-center gap-5">
                <div className="w-5 h-5 flex items-center justify-center">
                  <img src={byggarIcon} alt="Byggeår" className="w-full h-full object-contain" />
                </div>
                <span>{project.year}&#8211;{project.year + 1}</span>
              </div>

              <div className="flex items-center gap-5">
                <div className="w-5 h-5 flex items-center justify-center">
                  <img 
                    src={project.category.toLowerCase().includes('bolig') || project.category.toLowerCase().includes('atriumhus') ? boligIcon : project.category.toLowerCase().includes('offentlig') || project.category.toLowerCase().includes('kultur') ? offentligIcon : naeringIcon} 
                    alt="Kategori" 
                    className="w-full h-full object-contain" 
                  />
                </div>
                <span>{project.id === "kongens-gate-12" ? "Kontor / rehabilitering" : project.category}</span>
              </div>
              
              <div className="flex items-center gap-5">
                <div className="w-5 h-5 flex items-center justify-center">
                  <img src={oppdragIcon} alt="Oppdrag" className="w-full h-full object-contain" />
                </div>
                <span>{specs.client}</span>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="flex-1 flex flex-col gap-8 md:gap-12 mt-8 lg:mt-0">
            {project.images && project.images.length > 0 ? (
              <div className="w-full h-auto flex flex-col gap-8 md:gap-12 lg:gap-16">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-start">
                  {project.images.map((img, idx) => {
                    const layout = project.imageLayouts ? project.imageLayouts[idx] : (idx === 0 ? 'full' : (idx % 3 === 0 ? 'full' : 'half'));
                    return (
                      <React.Fragment key={idx}>
                        <div className={`w-full bg-white ${layout === 'full' ? 'sm:col-span-2' : 'sm:col-span-1'}`}>
                          {idx === 0 ? (
                            <motion.img 
                              layoutId={`project-image-${project.id}`}
                              transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
                              src={img} 
                              alt={`${project.name} image ${idx + 1}`} 
                              className="w-full h-auto object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <img 
                              src={img} 
                              alt={`${project.name} image ${idx + 1}`} 
                              className="w-full h-auto object-cover"
                              referrerPolicy="no-referrer"
                            />
                          )}
                        </div>
                        {idx === 0 && project.description && (
                          <div className="sm:col-span-2 w-full max-w-2xl text-[16px] md:text-[18px] text-neutral-900 leading-[1.6] font-sans font-light mt-4 mb-4 md:mt-8 md:mb-8 pr-4">
                            {project.description}
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="w-full bg-white">
                {project.image ? (
                  <motion.img 
                    layoutId={`project-image-${project.id}`}
                    transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
                    src={project.image} 
                    alt={project.name} 
                    className="w-full h-auto object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full aspect-[4/3] bg-white" />
                )}
              </div>
            )}
          </div>

        </div>
        
        {/* Minimal Footer matching the design */}
        <footer className="w-full grid grid-cols-1 md:grid-cols-2 gap-x-8 lg:gap-x-12 items-end font-sans font-medium text-xs md:text-sm mt-24 md:mt-32">
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
    </motion.div>
  );
};
