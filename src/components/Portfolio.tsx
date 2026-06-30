import React, { useState } from "react";
import { Project } from "../data/projects";
import { ArrowRight } from "lucide-react";
import hammerLogo from "../assets/images/Hammer_logo_sort_F41.png";
import { motion } from "motion/react";
import { triggerHaptic } from "../utils";

const CATEGORIES = ["ALLE", "BOLIG", "NÆRING", "OFFENTLIG"];

const getFilterMatch = (proj: Project, filter: string) => {
  if (filter === "ALLE") return true;
  const cat = proj.category.toLowerCase();
  if (filter === "BOLIG") return cat.includes("residential") || cat.includes("multi-family") || cat.includes("renovation");
  if (filter === "OFFENTLIG") return cat.includes("public") || cat.includes("cultural");
  if (filter === "NÆRING") return cat.includes("commercial") || cat.includes("mixed use");
  return true;
};

interface PortfolioProps {
  projects: Project[];
  onSelectProject: (project: Project) => void;
  selectedProject: Project | null;
}

export const Portfolio: React.FC<PortfolioProps> = ({ projects, onSelectProject, selectedProject }) => {
  const [activeFilter, setActiveFilter] = useState("ALLE");
  const [showAll, setShowAll] = useState(false);

  const displayedProjects = showAll 
    ? projects.filter(p => getFilterMatch(p, activeFilter))
    : projects.slice(0, 4);

  const rows = [];
  for (let i = 0; i < displayedProjects.length; i += 2) {
    rows.push(displayedProjects.slice(i, i + 2));
  }

  return (
    <div className="pt-24 pb-16 md:pt-32 md:pb-24 px-4 sm:px-6 md:px-12 w-full min-h-screen flex flex-col justify-between">
      <div className="w-full flex flex-col items-start">
        {/* Category Filter Bar */}
        {showAll ? (
          <div className="flex gap-6 md:gap-10 mb-12 border-b border-neutral-300 w-full overflow-x-auto no-scrollbar">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => {
                  triggerHaptic();
                  setActiveFilter(cat);
                }}
                className={`pb-3 text-xs md:text-sm tracking-widest font-sans font-medium transition-all uppercase whitespace-nowrap ${
                  activeFilter === cat 
                    ? "text-neutral-900 border-b-2 border-neutral-900" 
                    : "text-neutral-400 hover:text-neutral-600 border-b-2 border-transparent"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex justify-between items-end w-full mb-12 border-b border-neutral-300 pb-3">
            <h2 className="text-sm md:text-base tracking-widest font-sans font-medium uppercase text-neutral-900">Utvalgt</h2>
          </div>
        )}

        <div className="flex flex-col gap-16 w-full mb-16 md:mb-20">
          {rows.map((row, rowIdx) => {
            const isRowEven = rowIdx % 2 === 0;
            return (
              <div key={`row-${rowIdx}`} className="flex flex-col md:flex-row gap-8 md:gap-12 w-full">
                {row.map((project, itemIdx) => {
                  const isLeftItem = itemIdx === 0;
                  const is40 = isRowEven ? isLeftItem : !isLeftItem;
                  
                  return (
                    <div 
                      key={`${project.id}-${itemIdx}`} 
                      className={`flex flex-col group cursor-pointer w-full ${is40 ? "md:w-2/5" : "md:w-3/5"}`}
                      onClick={() => {
                        triggerHaptic();
                        onSelectProject(project);
                      }}
                    >
                      <div className={`w-full aspect-[4/3] ${is40 ? "md:aspect-[4/3]" : "md:aspect-[2/1]"} overflow-hidden mb-4 bg-white`}>
                        {project.image ? (
                          <motion.img
                            layoutId={`project-image-${project.id}`}
                            transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
                            src={project.image}
                            alt={project.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-white" />
                        )}
                      </div>
                      <div className="flex items-center justify-between font-sans">
                        <span className="text-sm md:text-base font-light tracking-wide group-hover:underline underline-offset-4">
                          {project.name}
                        </span>
                        <span className="text-sm font-light tracking-wide flex items-center gap-1 group-hover:underline underline-offset-4 transition-all">
                          Les mer <ArrowRight className="w-4 h-4 ml-1" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        
        {!showAll && (
          <div className="w-full flex justify-center mb-32 md:mb-40">
            <button 
              onClick={() => {
                triggerHaptic();
                setShowAll(true);
              }}
              className="text-sm font-light tracking-wide flex items-center gap-1 hover:underline underline-offset-4 transition-all"
            >
              Se alle prosjekter <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        )}
      </div>

      {/* Minimal Footer matching the design */}
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
