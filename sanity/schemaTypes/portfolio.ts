import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'portfolio',
  title: 'Portefølje (Prosjekt)',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Prosjektnavn',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'URL-slug',
      type: 'slug',
      options: {
        source: 'name',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'location',
      title: 'Sted / Adresse',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'year',
      title: 'Ferdigstilt år',
      type: 'number',
      validation: (Rule) => Rule.required().min(1900).max(2100),
    }),
    defineField({
      name: 'category',
      title: 'Kategori',
      type: 'string',
      options: {
        list: [
          { title: 'Bolig', value: 'Bolig' },
          { title: 'Næring', value: 'Næring' },
          { title: 'Offentlig', value: 'Offentlig' },
          { title: 'Oppdrag', value: 'Oppdrag' },
          { title: 'Sted', value: 'Sted' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Beskrivelse',
      type: 'text',
      description: 'En detaljert beskrivelse av prosjektet.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'mainImage',
      title: 'Hovedbilde (Cover)',
      type: 'image',
      options: {
        hotspot: true,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'media',
      title: 'Mediegalleri (Dra og slipp)',
      type: 'array',
      description: 'Dra og slipp bilder eller videoer for å arrangere galleriet.',
      of: [
        {
          type: 'image',
          title: 'Bilde',
          options: {
            hotspot: true,
          },
          fields: [
            {
              name: 'layout',
              title: 'Visningslayout',
              type: 'string',
              options: {
                list: [
                  { title: 'Full bredde', value: 'full' },
                  { title: 'Halv bredde', value: 'half' },
                ],
              },
              initialValue: 'full',
            },
            {
              name: 'alt',
              title: 'Alternativ tekst (for universell utforming/SEO)',
              type: 'string',
            },
          ],
        },
        {
          type: 'file',
          title: 'Video',
          name: 'video',
          options: {
            accept: 'video/*',
          },
          fields: [
            {
              name: 'caption',
              title: 'Bildetekst / Tittel',
              type: 'string',
            },
          ],
        },
      ],
      options: {
        layout: 'grid',
      },
    }),
    defineField({
      name: 'mapPos',
      title: 'Kartposisjon (3D koordinater)',
      type: 'object',
      fields: [
        { name: 'x', type: 'number', title: 'X-koordinat' },
        { name: 'y', type: 'number', title: 'Y-koordinat' },
        { name: 'z', type: 'number', title: 'Z-koordinat' },
      ],
      initialValue: {
        x: 0,
        y: 0,
        z: 0,
      },
    }),
    defineField({
      name: 'teamMembers',
      title: 'Prosjektmedarbeidere',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'teamMember' }] }],
    }),
  ],
});
