import worldMap from "@svg-maps/world";

export { worldMap };

export const WORLD_COUNTRY_OPTIONS = worldMap.locations.map((location) => ({
  id: location.id.toUpperCase(),
  name: location.name,
}));
