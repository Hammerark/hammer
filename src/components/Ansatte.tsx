import React from "react";
import { PageId } from "./Header";
import hammerLogo from "../assets/images/Hammer_logo_sort_F41.png";

import imgHerman from "../assets/images/Portrett/Herman.jpg";
import imgZlatan from "../assets/images/Portrett/Zlatan.jpg";
import imgHaakon from "../assets/images/Portrett/Håkon.jpg";
import imgEsra from "../assets/images/Portrett/Esra.jpg";
import imgSindre from "../assets/images/Portrett/Sindre.jpg";
import imgAnja from "../assets/images/Portrett/Anja.jpg";
import imgAlex from "../assets/images/Portrett/Alex.jpg";
import imgDeimante from "../assets/images/Portrett/Deimante.jpg";
import imgHanna from "../assets/images/Portrett/Hanna.jpg";
import imgMartin from "../assets/images/Portrett/Martin.jpg";

interface Employee {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  image: string;
}

const employees: Employee[] = [
  {
    id: "1",
    name: "Herman Hammer",
    role: "Arkitekt / Daglig leder",
    email: "herman@haark.no",
    phone: "+47 932 55 805",
    image: imgHerman
  },
  {
    id: "2",
    name: "Zlatan Dikic",
    role: "Arkitekt / Partner",
    email: "zlatan@haark.no",
    phone: "+47 932 23 957",
    image: imgZlatan
  },
  {
    id: "3",
    name: "Haakon Hammer",
    role: "Jurist / Partner",
    email: "haakon@haark.no",
    phone: "+47 924 15 550",
    image: imgHaakon
  },
  {
    id: "4",
    name: "Esra Jørgensen",
    role: "Arkitekt",
    email: "esra@haark.no",
    phone: "+47 967 07 009",
    image: imgEsra
  },
  {
    id: "5",
    name: "Sindre Øian",
    role: "Arkitekt",
    email: "sindre@haark.no",
    phone: "+47 915 54 056",
    image: imgSindre
  },
  {
    id: "6",
    name: "Anja Piantino",
    role: "Arkitekt",
    email: "anja@haark.no",
    phone: "+47 977 11 586",
    image: imgAnja
  },
  {
    id: "7",
    name: "Alexander Vitali-Rosati",
    role: "Arkitekt",
    email: "alexander@haark.no",
    phone: "+47 993 24 812",
    image: imgAlex
  },
  {
    id: "8",
    name: "Deimante Kaupaite",
    role: "Saksbehandler",
    email: "deima@haark.no",
    phone: "+47 400 57 826",
    image: imgDeimante
  },
  {
    id: "9",
    name: "Hanna Aanensen",
    role: "Arkitekt",
    email: "hanna@haark.no",
    phone: "+47 938 09 956",
    image: imgHanna
  },
  {
    id: "10",
    name: "Martin Faraas Pedersen",
    role: "Praktikant / Arkitekturstudent",
    email: "martin@haark.no",
    phone: "+47 991 67 471",
    image: imgMartin
  }
];

interface AnsatteProps {
  onPageChange: (page: PageId) => void;
}

export const Ansatte: React.FC<AnsatteProps> = ({ onPageChange }) => {
  return (
    <div className="pt-32 md:pt-40 pb-24 px-4 sm:px-6 md:px-12 w-full min-h-screen">
      <div className="w-full">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-5 sm:gap-x-8 lg:gap-x-12 gap-y-10 lg:gap-y-16">
          {employees.map((emp) => (
            <div key={emp.id} className="flex flex-col">
              <div className="w-full aspect-[3/4] mb-3 bg-black/5 overflow-hidden">
                <img 
                  src={emp.image} 
                  alt={emp.name} 
                  className="w-full h-full object-cover grayscale-[20%]" 
                />
              </div>
              <div className="flex flex-col text-xs md:text-sm leading-snug">
                <span className="font-medium tracking-tight mb-0.5">{emp.name}</span>
                <span className="mb-1.5 font-light tracking-tight">{emp.role}</span>
                <a href={`mailto:${emp.email}`} className="font-light tracking-tight hover:underline underline-offset-4 transition-all mb-0.5">{emp.email}</a>
                <a href={`tel:${emp.phone.replace(/\s+/g, '')}`} className="font-light tracking-tight hover:underline underline-offset-4 transition-all">{emp.phone}</a>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-32 w-full">
        {/* Minimal Footer built into Ansatte matching OmOss */}
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
    </div>
  );
};
