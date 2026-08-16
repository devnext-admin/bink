import React, { useMemo } from 'react';
import { Platform, View } from 'react-native';
import type { Venue } from '@bink/shared/lib/types';
import { BText } from '@bink/shared/components/ui/text';
import { useI18n } from '@bink/shared/lib/i18n';
import { colors, radius } from '@bink/shared/lib/theme';

/**
 * Interactive results map (web only): OpenStreetMap tiles via Leaflet in a
 * sandboxed iframe. Native app keeps the list view.
 */
export function SearchMap({ venues, center }: { venues: Venue[]; center: { lat: number; lng: number } | null }) {
  const { t } = useI18n();
  const html = useMemo(() => {
    const pins = venues
      .filter((v) => v.lat != null && v.lng != null)
      .map((v) => ({
        lat: v.lat,
        lng: v.lng,
        name: v.name.replace(/"/g, '\\"'),
        slug: v.slug,
        rating: v.rating_avg.toFixed(1),
        area: `${v.area}, ${v.city}`.replace(/"/g, '\\"'),
      }));
    const c = center ?? (pins[0] ? { lat: pins[0].lat, lng: pins[0].lng } : { lat: 24.7136, lng: 46.6753 });
    return `<!doctype html><html><head><meta charset="utf-8"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#m{margin:0;height:100%;width:100%}
.pop a{color:#FF385C;font-weight:700;text-decoration:none;font-family:sans-serif}
.pop b{font-family:sans-serif}.pop small{color:#545A62;font-family:sans-serif}</style>
</head><body><div id="m"></div><script>
var map=L.map('m').setView([${c.lat},${c.lng}],11);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap'}).addTo(map);
var pins=${JSON.stringify(pins)};
var group=[];
pins.forEach(function(p){
  var mk=L.marker([p.lat,p.lng]).addTo(map);
  mk.bindPopup('<div class="pop"><b>'+p.name+'</b> \u2605 '+p.rating+'<br/><small>'+p.area+'</small><br/><a href="/venue/'+p.slug+'" target="_top">${'${""}'}Open</a></div>'.replace('${'${""}'}Open','Open'));
  group.push(mk);
});
if(group.length>1){map.fitBounds(L.featureGroup(group).getBounds().pad(0.2));}
</script></body></html>`;
  }, [venues, center?.lat, center?.lng]);

  if (Platform.OS !== 'web') {
    return (
      <View style={{ padding: 24, alignItems: 'center' }}>
        <BText variant="small">{t('The map view is available on the web.')}</BText>
      </View>
    );
  }

  return (
    <View style={{ height: 560, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.divider }}>
      {React.createElement('iframe', {
        srcDoc: html,
        style: { border: 0, width: '100%', height: '100%' },
        title: 'map',
      })}
    </View>
  );
}
