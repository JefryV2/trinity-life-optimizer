import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import Svg, { Line } from 'react-native-svg';

import { AppText } from '@/components/ui/app-text';
import { useTheme } from '@/theme';

export type RoutePoint = { lat: number; lng: number };

const MAX_DRAWN_POINTS = 240;

/**
 * Keyless dark map: OpenStreetMap raster tiles in a WebView, inverted with a
 * CSS filter so the streets sit on the app's near-black, and the route drawn
 * in lime above the tile pane so the filter never touches it.
 */
const MAP_HTML = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html, body { height: 100%; margin: 0; background: #101012; }
  #map { height: 100%; width: 100%; background: #101012; }
  * { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; }
  .leaflet-container { background: #101012; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  .leaflet-tile-pane { filter: invert(1) hue-rotate(180deg) brightness(0.86) contrast(1.08) saturate(0.6); }
  .leaflet-control-attribution { background: rgba(7,7,8,0.72) !important; color: #7A7A83 !important; font-size: 8px !important; line-height: 1.2 !important; padding: 3px 6px !important; border-radius: 5px !important; border: 0 !important; }
  .leaflet-control-attribution a { color: #8A8A92 !important; }
  .route-casing { stroke: #070708; stroke-width: 7; fill: none; stroke-linecap: round; stroke-linejoin: round; }
  .route-line { stroke: #C6F24E; stroke-width: 3.5; fill: none; stroke-linecap: round; stroke-linejoin: round; }
  .dot-start { fill: #C6F24E; stroke: #070708; stroke-width: 3; }
  .dot-end { fill: #EDEDEF; stroke: #C6F24E; stroke-width: 2.5; }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var map = L.map('map', {
    zoomControl: false,
    attributionControl: false,
    dragging: false,
    touchZoom: false,
    doubleClickZoom: false,
    scrollWheelZoom: false,
    boxZoom: false,
    keyboard: false
  });
  map.setView([20, 0], 2);
  L.control.attribution({ prefix: false }).addTo(map);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  var routeLayer = L.layerGroup().addTo(map);

  window.setRoute = function (segments) {
    routeLayer.clearLayers();
    var all = [];
    for (var i = 0; i < segments.length; i++) {
      var segment = segments[i];
      if (segment.length > 1) {
        var latlngs = segment.map(function (point) { return [point.lat, point.lng]; });
        L.polyline(latlngs, { className: 'route-casing', interactive: false }).addTo(routeLayer);
        L.polyline(latlngs, { className: 'route-line', interactive: false }).addTo(routeLayer);
      }
      all = all.concat(segment);
    }
    if (!all.length) return;
    var first = all[0];
    var last = all[all.length - 1];
    L.circleMarker([first.lat, first.lng], { radius: 5, className: 'dot-start', interactive: false }).addTo(routeLayer);
    if (all.length > 1) {
      L.circleMarker([last.lat, last.lng], { radius: 5, className: 'dot-end', interactive: false }).addTo(routeLayer);
      var bounds = L.latLngBounds(all.map(function (point) { return [point.lat, point.lng]; }));
      map.fitBounds(bounds, { padding: [26, 26], animate: false });
    } else {
      map.setView([first.lat, first.lng], 17, { animate: false });
    }
  };
</script>
</body>
</html>`;

const thin = <T,>(points: T[]) => {
  if (points.length <= MAX_DRAWN_POINTS) return points;
  const step = Math.ceil(points.length / MAX_DRAWN_POINTS);
  return points.filter((_, index) => index % step === 0 || index === points.length - 1);
};

export const RouteMap = ({
  segments,
  height = 220,
}: {
  segments: RoutePoint[][];
  height?: number;
}) => {
  const { colors } = useTheme();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const webRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [width, setWidth] = useState(0);
  const source = useMemo(() => ({ html: MAP_HTML }), []);
  const hasPoints = segments.some((segment) => segment.length > 0);

  const sendRoute = useCallback(() => {
    if (!hasPoints) return;
    const payload = segments.map((segment) => thin(segment)).filter((segment) => segment.length > 0);
    webRef.current?.injectJavaScript(
      `window.setRoute(${JSON.stringify(payload)}); true;`,
    );
  }, [segments, hasPoints]);

  useEffect(() => {
    if (ready && hasPoints) sendRoute();
  }, [ready, hasPoints, sendRoute]);

  return (
    <View
      onLayout={(event) => setWidth(Math.round(event.nativeEvent.layout.width))}
      accessibilityLabel="Map of your walk"
      style={{
        height,
        borderRadius: 22,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceAlt,
        overflow: 'hidden',
      }}
    >
      {hasPoints ? (
        <View pointerEvents="none" style={{ flex: 1 }}>
          <WebView
            ref={webRef}
            source={source}
            onLoadStart={() => setReady(false)}
            onLoadEnd={() => {
              setReady(true);
              sendRoute();
            }}
            style={{ flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: 22 }}
            containerStyle={{ backgroundColor: colors.surfaceAlt, borderRadius: 22 }}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
            scrollEnabled={false}
            overScrollMode="never"
            bounces={false}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            setSupportMultipleWindows={false}
            androidLayerType="hardware"
            applicationNameForUserAgent="Auxo/1.0"
            userAgent="Auxo/1.0 (personal health app)"
          />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <Svg width="100%" height="100%" style={{ position: 'absolute' }}>
            {Array.from({ length: 7 }).map((_, index) => (
              <Line
                key={`v${index}`}
                x1={(width / 6) * index}
                y1={0}
                x2={(width / 6) * index}
                y2={height}
                stroke={colors.separator}
                strokeWidth={1}
                opacity={0.6}
              />
            ))}
            {Array.from({ length: 5 }).map((_, index) => (
              <Line
                key={`h${index}`}
                x1={0}
                y1={(height / 4) * index}
                x2={width}
                y2={(height / 4) * index}
                stroke={colors.separator}
                strokeWidth={1}
                opacity={0.6}
              />
            ))}
          </Svg>
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AppText variant="caption" tone="tertiary">
              Route
            </AppText>
          </View>
        </View>
      )}
    </View>
  );
};
