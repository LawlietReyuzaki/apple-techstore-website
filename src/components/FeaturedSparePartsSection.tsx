import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SparePartCard } from "./SparePartCard";
import { SectionHeader } from "./SectionHeader";
import { Wrench } from "lucide-react";
import { Skeleton } from "./ui/skeleton";

const SECTION_SIZE = 8;
const PART_SELECT = `
  *,
  phone_models (
    name,
    spare_parts_brands (
      name
    )
  ),
  part_categories (
    name
  )
`;

export const FeaturedSparePartsSection = () => {
  const { data: spareParts, isLoading } = useQuery({
    queryKey: ['featured-spare-parts', SECTION_SIZE],
    queryFn: async () => {
      // Featured parts first…
      const { data: featured, error } = await supabase
        .from('spare_parts')
        .select(PART_SELECT)
        .eq('visible', true)
        .eq('featured', true)
        .order('created_at', { ascending: false })
        .limit(SECTION_SIZE);
      if (error) throw error;

      // Only show parts whose photo is on the cloud bucket (local-disk paths are lost on redeploy)
      const hasPhoto = (p: any) => Array.isArray(p.images) && p.images.some((i: string) => /^https?:\/\//.test(i));
      const list = (featured || []).filter(hasPhoto);
      if (list.length >= SECTION_SIZE) return list;

      // …then fill the section with the newest parts (the API already ranks
      // parts that have a photo ahead of ones without)
      const { data: latest } = await supabase
        .from('spare_parts')
        .select(PART_SELECT)
        .eq('visible', true)
        .order('created_at', { ascending: false })
        .limit(SECTION_SIZE * 2);
      const seen = new Set(list.map((p: any) => p.id));
      for (const p of latest || []) {
        if (list.length >= SECTION_SIZE) break;
        if (!seen.has(p.id) && hasPhoto(p)) list.push(p);
      }
      return list;
    },
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <section>
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="aspect-[3/4] w-full rounded-xl" />)}
        </div>
      </section>
    );
  }

  if (!spareParts || spareParts.length === 0) {
    return null;
  }

  return (
    <section>
      <SectionHeader icon={Wrench} title="Spare Parts & Repair Parts" subtitle="Genuine replacement parts for all major brands"
        to="/parts" cta="All part types" />
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
        {spareParts.map((part) => (
          <SparePartCard key={part.id} part={part} />
        ))}
      </div>
    </section>
  );
};
