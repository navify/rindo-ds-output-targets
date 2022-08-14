import type { Config, OutputTargetCustom } from '@rindo/core/internal';
import { normalizePath } from './utils';
import type { OutputTargetKdu } from './types';
import { kduProxyOutput } from './output-kdu';
import path from 'path';

export const kduOutputTarget = (outputTarget: OutputTargetKdu): OutputTargetCustom => ({
  type: 'custom',
  name: 'kdu-library',
  validate(config) {
    return normalizeOutputTarget(config, outputTarget);
  },
  async generator(config, compilerCtx, buildCtx) {
    const timespan = buildCtx.createTimeSpan(`generate kdu started`, true);

    await kduProxyOutput(config, compilerCtx, outputTarget, buildCtx.components);

    timespan.finish(`generate kdu finished`);
  },
});

export function normalizeOutputTarget(config: Config, outputTarget: any) {
  const results: OutputTargetKdu = {
    ...outputTarget,
    excludeComponents: outputTarget.excludeComponents || [],
    componentModels: outputTarget.componentModels || [],
    includePolyfills: outputTarget.includePolyfills ?? true,
    includeDefineCustomElements: outputTarget.includeDefineCustomElements ?? true
  };

  if (config.rootDir == null) {
    throw new Error('rootDir is not set and it should be set by rindo itself');
  }
  if (outputTarget.proxiesFile == null) {
    throw new Error('proxiesFile is required');
  }
  if (outputTarget.includeDefineCustomElements && outputTarget.includeImportCustomElements) {
    throw new Error('includeDefineCustomElements cannot be used at the same time as includeImportCustomElements since includeDefineCustomElements is used for lazy loading components. Set `includeDefineCustomElements: false` in your Kdu output target config to resolve this.');
  }

  if (outputTarget.includeImportCustomElements && outputTarget.includePolyfills) {
    throw new Error('includePolyfills cannot be used at the same time as includeImportCustomElements. Set `includePolyfills: false` in your Kdu output target config to resolve this.')
  }

  if (outputTarget.directivesProxyFile && !path.isAbsolute(outputTarget.directivesProxyFile)) {
    results.proxiesFile = normalizePath(path.join(config.rootDir, outputTarget.proxiesFile));
  }

  return results;
}
