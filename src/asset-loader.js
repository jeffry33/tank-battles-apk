import * as pc from 'playcanvas';

// Loads a local GLB container from /public and returns a renderable entity.
// Keep GLBs in public/assets so Vite copies them unchanged into the production build.
export function loadGlbEntity(app, url, name = 'Imported GLB') {
  return new Promise((resolve, reject) => {
    const asset = new pc.Asset(name, 'container', { url });
    const cleanup = () => {
      asset.off('load', onLoad);
      asset.off('error', onError);
    };
    const onLoad = () => {
      cleanup();
      try {
        const entity = asset.resource.instantiateRenderEntity();
        entity.name = name;
        resolve(entity);
      } catch (error) {
        reject(error);
      }
    };
    const onError = error => {
      cleanup();
      reject(error instanceof Error ? error : new Error('Failed to load GLB: ' + url));
    };
    asset.once('load', onLoad);
    asset.once('error', onError);
    app.assets.add(asset);
    app.assets.load(asset);
  });
}

export function findEntityByName(root, targetName) {
  if (root.name === targetName) return root;
  for (const child of root.children) {
    const found = findEntityByName(child, targetName);
    if (found) return found;
  }
  return null;
}
