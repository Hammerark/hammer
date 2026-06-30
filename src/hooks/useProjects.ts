import { useState, useEffect } from 'react';
import { Project, projects as staticProjects } from '../data/projects';
import { sanityClient } from '../sanityClient';

export function useProjects() {
  const [allProjects, setAllProjects] = useState<Project[]>(staticProjects);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSanityProjects = async () => {
      try {
        const query = `*[_type == "portfolio"] {
          _id,
          name,
          location,
          year,
          category,
          description,
          "imageUrl": mainImage.asset->url,
          lat,
          lng,
          latitude,
          longitude
        }`;
        const sanityData = await sanityClient.fetch(query);
        console.log('Sanity markers found:', sanityData);
        
        // Map Sanity data to the Project interface
        const mappedProjects: Project[] = sanityData
          .filter((doc: any) => {
            const hasLat = doc.lat !== undefined || doc.latitude !== undefined;
            const hasLng = doc.lng !== undefined || doc.longitude !== undefined;
            return hasLat && hasLng;
          })
          .map((doc: any) => {
            const rawLat = doc.lat !== undefined ? doc.lat : doc.latitude;
            const rawLng = doc.lng !== undefined ? doc.lng : doc.longitude;
            const parsedLat = Number(rawLat);
            const parsedLng = Number(rawLng);

            return {
              id: doc._id,
              name: doc.name,
              location: doc.location || "Oslo",
              year: doc.year || 2024,
              category: doc.category || "Bolig",
              description: doc.description || "",
              image: doc.imageUrl || "", 
              lat: !isNaN(parsedLat) ? parsedLat : 59.9139,
              lng: !isNaN(parsedLng) ? parsedLng : 10.7522,
            };
          });

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
