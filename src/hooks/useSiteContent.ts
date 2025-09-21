import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export const useSiteContent = (contentIds: string[]) => {
  const [content, setContent] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const { data, error } = await supabase
          .from('site_content')
          .select('*')
          .in('content_id', contentIds);

        if (error) {
          console.error('Error fetching site content:', error);
          return;
        }

        const contentMap: Record<string, string> = {};
        data.forEach(item => {
          contentMap[item.content_id] = item.content_text;
        });

        setContent(contentMap);
      } catch (error) {
        console.error('Unexpected error fetching site content:', error);
      } finally {
        setLoading(false);
      }
    };

    if (contentIds.length > 0) {
      fetchContent();
    } else {
      setLoading(false);
    }
  }, [contentIds.join(',')]);

  return { content, loading };
};