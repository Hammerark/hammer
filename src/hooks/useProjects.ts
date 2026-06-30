import { useState, useEffect } from 'react';
import { Project, projects as staticProjects } from '../data/projects';
import { sanityClient } from '../sanityClient';

export function useProjects() {
  const [allProjects, setAllProjects] = useState<Project[]>(staticProjects);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSanityProjects = async () => {
      try {
        const query = `*[_type == "portfolio" && defined(lat) && defined(lng)] {
          _id,
          name,
          location,
          year,
          category,
          description,
          "imageUrl": mainImage.asset->url,
          lat,
          lng
        }`;
        const sanityData = await sanityClient.fetch(query);
        
        // Map Sanity data to the Project interface
        const mappedProjects: Project[] = sanityData.map((doc: any) => ({
          id: doc._id,
          name: doc.name,
          location: doc.location || "Oslo",
          year: doc.year || 2024,
          category: doc.category || "Bolig",
          description: doc.description || "",
          image: doc.imageUrl || "", // Fallback to empty string if no main image
          lat: Number(doc.lat),
          lng: Number(doc.lng),
        }));

        setAllProjects([...staticProjects, ...mappedProjects]);
      } catch (error) {
        console.error("Failed to fetch sanity projects:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSanityProjects();
  }, []);

  return { projects: allProjects, isLoading };
}
