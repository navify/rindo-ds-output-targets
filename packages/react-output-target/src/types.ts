/**
 * An output target configuration interface used to configure Rindo to properly generate the bindings necessary to use
 * Rindo components in a React application
 */
export interface OutputTargetReact {
  componentCorePackage?: string;
  proxiesFile: string;
  excludeComponents?: string[];
  loaderDir?: string;
  includePolyfills?: boolean;
  includeDefineCustomElements?: boolean;
  includeImportCustomElements?: boolean;
  customElementsDir?: string;
}

/**
 * Describes the fields of a package.json file necessary to generate the Rindo-React bindings
 */
export interface PackageJSON {
  types: string;
}
