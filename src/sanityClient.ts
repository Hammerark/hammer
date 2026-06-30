import { createClient } from '@sanity/client';

export const sanityClient = createClient({
  projectId: 'f8umz675',
  dataset: 'production',
  useCdn: true,
  apiVersion: '2023-05-03',
});
