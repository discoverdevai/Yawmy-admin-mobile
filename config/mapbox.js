import Mapbox from '@rnmapbox/maps';

// Public access token (reused from the Rusher project). The download token
// (sk…) lives in the @rnmapbox/maps plugin config in app.json.
export const MAPBOX_ACCESS_TOKEN =
  'REPLACE_WITH_MAPBOX_PUBLIC_TOKEN';

Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

export default Mapbox;
